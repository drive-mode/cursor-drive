/**
 * State sync coordinator — snapshot computation, conflict heuristic, and
 * proposal lifecycle management.
 *
 * The coordinator is the brain of the mob-programming sync engine:
 *   1. computeSnapshot() — builds a SyncStatusSnapshot from git state
 *   2. generateProposals() — detects operator changes and creates proposals
 *   3. approve/reject/get — manages proposal lifecycle transitions
 *
 * All output is deterministic for the same git state.
 */

import { GitService } from "./gitService.js";
import { OperatorRegistry } from "./operatorRegistry.js";
import { WorktreeManager } from "./worktreeManager.js";
import { SyncLedger } from "./syncLedger.js";
import type {
  SyncStatusSnapshot,
  OperatorWorkspaceState,
  SyncProposal,
  SyncProposalStatus,
  OperatorActivityEvent,
} from "./syncTypes.js";

export class StateSyncCoordinator {
  /** In-memory activity event buffer (bounded, most recent first). */
  private activityEvents: OperatorActivityEvent[] = [];
  private readonly maxActivityEvents = 200;

  constructor(
    private gitService: GitService,
    private operatorRegistry: OperatorRegistry,
    private worktreeManager: WorktreeManager,
    private ledger: SyncLedger
  ) {}

  // ── Snapshot ──────────────────────────────────────────────────────────

  /**
   * Compute a full sync-status snapshot from current git state.
   *
   * For each active operator with an allocated worktree:
   *   - Resolve operator HEAD and merge-base with user HEAD
   *   - List changed files relative to merge-base
   *   - Report current syncState from registry
   */
  async computeSnapshot(): Promise<SyncStatusSnapshot> {
    const branchResult = await this.gitService.getCurrentBranch();
    const userBranch = branchResult.ok ? branchResult.data! : "unknown";

    const headResult = await this.gitService.revParse("HEAD");
    const userHeadCommit = headResult.ok ? headResult.data! : "unknown";

    const operators: OperatorWorkspaceState[] = [];
    const activeOps = this.operatorRegistry.getActive();

    for (const op of activeOps) {
      const alloc = this.worktreeManager.getAllocation(op.id);
      if (!alloc) { continue; }

      // Get operator HEAD
      const opHeadResult = await this.gitService.revParse(alloc.branchName);
      const opHead = opHeadResult.ok ? opHeadResult.data! : op.headCommit ?? "unknown";

      // Get merge-base
      const mergeBaseResult = await this.gitService.getMergeBase("HEAD", alloc.branchName);
      const mergeBase = mergeBaseResult.ok ? mergeBaseResult.data! : op.baseCommit ?? "unknown";

      // List changed files (operator changes since merge-base)
      let changedFiles: string[] = [];
      if (mergeBase !== opHead) {
        const changedResult = await this.gitService.listChangedFiles(mergeBase, alloc.branchName);
        if (changedResult.ok) { changedFiles = changedResult.data!; }
      }

      operators.push({
        operatorId: op.id,
        operatorName: op.name,
        worktreePath: alloc.worktreePath,
        branchName: alloc.branchName,
        baseCommit: mergeBase,
        headCommit: opHead,
        mergeBase,
        syncState: op.syncState ?? "idle",
        changedFiles,
      });
    }

    // Load proposals from ledger
    const proposals = await this.ledger.loadProposals();

    return {
      userBranch,
      userHeadCommit,
      operators,
      proposals,
      timestamp: Date.now(),
    };
  }

  // ── Proposal generation ───────────────────────────────────────────────

  /**
   * Generate proposals for operators that have uncommitted-to-user changes.
   *
   * For each operator with HEAD != merge-base (i.e., new commits):
   *   - Check for file intersection with user changes → conflictingFiles
   *   - Create a proposal with status pending_review if none exists
   */
  async generateProposals(): Promise<SyncProposal[]> {
    const snapshot = await this.computeSnapshot();
    const existingProposals = await this.ledger.loadProposals();
    const newProposals: SyncProposal[] = [];

    // Get user changed files since each operator's merge-base
    for (const opState of snapshot.operators) {
      // Skip operators with no new commits
      if (opState.headCommit === opState.mergeBase) { continue; }

      // Skip if an active proposal already exists for this operator
      const hasActive = existingProposals.some(
        (p) =>
          p.operatorId === opState.operatorId &&
          !["applied", "rejected", "failed_apply"].includes(p.status)
      );
      if (hasActive) { continue; }

      // Detect conflicts: files the user also changed since merge-base
      let conflictingFiles: string[] = [];
      const userChangedResult = await this.gitService.listChangedFiles(
        opState.mergeBase,
        "HEAD"
      );
      if (userChangedResult.ok) {
        const userFiles = new Set(userChangedResult.data!);
        conflictingFiles = opState.changedFiles.filter((f) => userFiles.has(f));
      }

      const proposal: SyncProposal = {
        id: `proposal-${opState.operatorId}-${Date.now()}`,
        operatorId: opState.operatorId,
        operatorName: opState.operatorName,
        baseCommit: opState.mergeBase,
        headCommit: opState.headCommit,
        changedFiles: opState.changedFiles,
        conflictingFiles,
        status: conflictingFiles.length > 0 ? "conflict" : "pending_review",
        createdAt: Date.now(),
      };

      await this.ledger.saveProposal(proposal);
      await this.ledger.appendDecision(proposal.id, "created", Date.now());
      newProposals.push(proposal);
    }

    return newProposals;
  }

  // ── Proposal lifecycle ────────────────────────────────────────────────

  /** Approve a proposal. Returns the updated proposal or undefined. */
  async approveProposal(proposalId: string): Promise<SyncProposal | undefined> {
    return this.transitionProposal(proposalId, "approved", ["pending_review", "conflict"]);
  }

  /** Reject a proposal. Returns the updated proposal or undefined. */
  async rejectProposal(proposalId: string, reason?: string): Promise<SyncProposal | undefined> {
    const extra: Partial<SyncProposal> = {};
    if (reason) { extra.error = reason; }
    return this.transitionProposal(proposalId, "rejected", ["pending_review", "conflict", "approved"], extra);
  }

  /** Get a proposal by ID. */
  async getProposal(proposalId: string): Promise<SyncProposal | undefined> {
    return this.ledger.getProposal(proposalId);
  }

  /** Get all proposals that are not in a terminal state. */
  async getActiveProposals(): Promise<SyncProposal[]> {
    const all = await this.ledger.loadProposals();
    return all.filter(
      (p) => !["applied", "rejected", "failed_apply"].includes(p.status)
    );
  }

  /** Mark a proposal as applying. Called by IntegrationQueue before merge attempt. */
  async markApplying(proposalId: string): Promise<SyncProposal | undefined> {
    return this.transitionProposal(proposalId, "applying", ["approved"]);
  }

  /** Mark a proposal as successfully applied. */
  async markApplied(
    proposalId: string,
    mergeCommit: string
  ): Promise<SyncProposal | undefined> {
    return this.transitionProposal(proposalId, "applied", ["applying"], {
      appliedAt: Date.now(),
    });
  }

  /** Mark a proposal as failed. */
  async markFailed(
    proposalId: string,
    error: string,
    conflictFiles?: string[]
  ): Promise<SyncProposal | undefined> {
    const extra: Partial<SyncProposal> = { error };
    if (conflictFiles) { extra.conflictingFiles = conflictFiles; }
    return this.transitionProposal(proposalId, "failed_apply", ["applying"], extra);
  }

  // ── Activity events ───────────────────────────────────────────────────

  /** Record an operator activity event. */
  pushActivityEvent(event: OperatorActivityEvent): void {
    this.activityEvents.unshift(event);
    if (this.activityEvents.length > this.maxActivityEvents) {
      this.activityEvents.length = this.maxActivityEvents;
    }
  }

  /** Get recent activity events, newest first. */
  getRecentEvents(limit = 50, operatorId?: string): OperatorActivityEvent[] {
    let events = this.activityEvents;
    if (operatorId) {
      events = events.filter((e) => e.operatorId === operatorId);
    }
    return events.slice(0, limit);
  }

  // ── Internal ──────────────────────────────────────────────────────────

  private async transitionProposal(
    proposalId: string,
    newStatus: SyncProposalStatus,
    validFromStatuses: SyncProposalStatus[],
    extra?: Partial<SyncProposal>
  ): Promise<SyncProposal | undefined> {
    const proposal = await this.ledger.getProposal(proposalId);
    if (!proposal) { return undefined; }
    if (!validFromStatuses.includes(proposal.status)) { return undefined; }

    const decidedExtra = {
      ...extra,
      decidedAt: Date.now(),
    };

    const updated = await this.ledger.updateProposalStatus(
      proposalId,
      newStatus,
      decidedExtra
    );
    if (updated) {
      await this.ledger.appendDecision(proposalId, newStatus, Date.now());
    }
    return updated;
  }
}
