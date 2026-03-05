/**
 * Integration queue — single-flight apply serializer.
 *
 * Ensures concurrent apply requests cannot race. Proposals are processed
 * FIFO with at most one active apply at a time (mutex via promise chain).
 *
 * Apply logic:
 *   1. Validate proposal is approved
 *   2. Mark proposal as applying
 *   3. Attempt merge of operator branch into user branch
 *   4. On success: mark applied, record merge commit
 *   5. On conflict/error: mark failed_apply, record error
 *   6. Move to next item (failure does not deadlock)
 */

import { StateSyncCoordinator } from "./stateSyncCoordinator.js";
import { GitService } from "./gitService.js";
import { SyncLedger } from "./syncLedger.js";
import type { ApplyResult } from "./syncTypes.js";

interface QueueItem {
  proposalId: string;
  resolve: (result: ApplyResult) => void;
}

export class IntegrationQueue {
  private pending: QueueItem[] = [];
  private processing: string | null = null;
  private completed: string[] = [];
  private lock: Promise<void> = Promise.resolve();

  constructor(
    private coordinator: StateSyncCoordinator,
    private gitService: GitService,
    private ledger: SyncLedger
  ) {}

  /**
   * Enqueue a proposal for application. Returns a promise that resolves
   * when the proposal has been processed (success or failure).
   */
  enqueue(proposalId: string): Promise<ApplyResult> {
    return new Promise<ApplyResult>((resolve) => {
      this.pending.push({ proposalId, resolve });
      this.processNext();
    });
  }

  /** Get current queue state for observability. */
  getQueueState(): {
    processing: string | null;
    pending: string[];
    completed: string[];
  } {
    return {
      processing: this.processing,
      pending: this.pending.map((i) => i.proposalId),
      completed: [...this.completed],
    };
  }

  /** Cancel a pending (not yet processing) proposal. Returns true if found and removed. */
  cancel(proposalId: string): boolean {
    const idx = this.pending.findIndex((i) => i.proposalId === proposalId);
    if (idx === -1) { return false; }
    const [removed] = this.pending.splice(idx, 1);
    removed.resolve({
      success: false,
      proposalId,
      error: "Cancelled before processing",
    });
    return true;
  }

  // ── Internal ──────────────────────────────────────────────────────────

  private processNext(): void {
    if (this.processing !== null) { return; } // already processing
    if (this.pending.length === 0) { return; } // nothing to do

    const item = this.pending.shift()!;
    this.processing = item.proposalId;

    // Chain through lock for safety
    this.lock = this.lock.then(async () => {
      try {
        const result = await this.applyProposal(item.proposalId);
        item.resolve(result);
      } catch (err) {
        item.resolve({
          success: false,
          proposalId: item.proposalId,
          error: err instanceof Error ? err.message : String(err),
        });
      } finally {
        this.completed.push(item.proposalId);
        this.processing = null;
        // Process next in queue
        this.processNext();
      }
    });
  }

  private async applyProposal(proposalId: string): Promise<ApplyResult> {
    // 1. Validate proposal is approved
    const proposal = await this.coordinator.getProposal(proposalId);
    if (!proposal) {
      return { success: false, proposalId, error: "Proposal not found" };
    }
    if (proposal.status !== "approved") {
      return {
        success: false,
        proposalId,
        error: `Proposal status is '${proposal.status}', expected 'approved'`,
      };
    }

    // 2. Mark as applying
    const applying = await this.coordinator.markApplying(proposalId);
    if (!applying) {
      return { success: false, proposalId, error: "Failed to transition to applying state" };
    }

    // 3. Attempt merge
    // Branch name is deterministic: drive/op/<operatorId>
    const branchName = `drive/op/${proposal.operatorId}`;
    const mergeResult = await this.gitService.mergeNoFf(branchName);

    if (!mergeResult.ok) {
      // Abort the failed merge
      await this.gitService.abortMerge();

      // Parse conflict files from error
      const conflictFiles = this.parseConflictFiles(mergeResult.stderr ?? mergeResult.error ?? "");

      await this.coordinator.markFailed(proposalId, mergeResult.error ?? "Merge failed", conflictFiles);
      return {
        success: false,
        proposalId,
        error: mergeResult.error ?? "Merge failed",
        conflictFiles,
      };
    }

    // 4. Success
    const mergeCommit = mergeResult.data!;
    await this.coordinator.markApplied(proposalId, mergeCommit);
    await this.ledger.appendDecision(proposalId, "applied", Date.now());

    return { success: true, proposalId, mergeCommit };
  }

  /** Extract file paths from merge conflict stderr. */
  private parseConflictFiles(stderr: string): string[] {
    const files: string[] = [];
    const re = /CONFLICT.*?:\s+.*?in\s+(\S+)/g;
    let match: RegExpExecArray | null;
    while ((match = re.exec(stderr)) !== null) {
      files.push(match[1]);
    }
    return files;
  }
}
