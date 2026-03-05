/**
 * Sync ledger — persistent storage for proposals and decisions.
 *
 * Storage layout under .drive/state-sync/:
 *   proposals.json  — array of SyncProposal objects (write-through)
 *   decisions.jsonl  — append-only JSONL of LedgerDecisionRecord
 *
 * The ledger is restart-safe: on init, it loads persisted state.
 * All mutations are write-through (immediate persist).
 */

import * as fs from "fs/promises";
import * as path from "path";
import type {
  SyncProposal,
  SyncProposalStatus,
  LedgerDecisionRecord,
} from "./syncTypes.js";

const PROPOSALS_FILE = "proposals.json";
const DECISIONS_FILE = "decisions.jsonl";

export class SyncLedger {
  private proposals: Map<string, SyncProposal> = new Map();
  private loaded = false;

  constructor(private stateDir: string) {}

  // ── Proposal CRUD ─────────────────────────────────────────────────────

  /** Save or update a proposal. */
  async saveProposal(proposal: SyncProposal): Promise<void> {
    await this.ensureLoaded();
    this.proposals.set(proposal.id, { ...proposal });
    await this.persistProposals();
  }

  /** Load all proposals from disk. Returns cached copy after first load. */
  async loadProposals(): Promise<SyncProposal[]> {
    await this.ensureLoaded();
    return [...this.proposals.values()];
  }

  /** Get a single proposal by ID. */
  async getProposal(id: string): Promise<SyncProposal | undefined> {
    await this.ensureLoaded();
    const p = this.proposals.get(id);
    return p ? { ...p } : undefined;
  }

  /** Update proposal status (and optional extra fields). */
  async updateProposalStatus(
    id: string,
    status: SyncProposalStatus,
    extra?: Partial<SyncProposal>
  ): Promise<SyncProposal | undefined> {
    await this.ensureLoaded();
    const proposal = this.proposals.get(id);
    if (!proposal) { return undefined; }

    proposal.status = status;
    if (extra) {
      Object.assign(proposal, extra);
    }
    await this.persistProposals();
    return { ...proposal };
  }

  // ── Decision history ──────────────────────────────────────────────────

  /** Append a decision to the append-only log. */
  async appendDecision(
    proposalId: string,
    action: string,
    timestamp: number,
    actor?: string
  ): Promise<void> {
    await this.ensureDir();
    const record: LedgerDecisionRecord = { proposalId, action, timestamp, actor };
    const line = JSON.stringify(record) + "\n";
    await fs.appendFile(path.join(this.stateDir, DECISIONS_FILE), line, "utf-8");
  }

  /** Read the full decision history. */
  async getDecisionHistory(): Promise<LedgerDecisionRecord[]> {
    try {
      const raw = await fs.readFile(
        path.join(this.stateDir, DECISIONS_FILE),
        "utf-8"
      );
      return raw
        .trim()
        .split("\n")
        .filter((line) => line.length > 0)
        .map((line) => JSON.parse(line) as LedgerDecisionRecord);
    } catch {
      return [];
    }
  }

  // ── Internal ──────────────────────────────────────────────────────────

  private async ensureDir(): Promise<void> {
    await fs.mkdir(this.stateDir, { recursive: true });
  }

  private async ensureLoaded(): Promise<void> {
    if (this.loaded) { return; }
    await this.ensureDir();
    try {
      const raw = await fs.readFile(
        path.join(this.stateDir, PROPOSALS_FILE),
        "utf-8"
      );
      const arr = JSON.parse(raw) as SyncProposal[];
      for (const p of arr) {
        this.proposals.set(p.id, p);
      }
    } catch {
      // File doesn't exist or is invalid — start fresh.
    }
    this.loaded = true;
  }

  private async persistProposals(): Promise<void> {
    await this.ensureDir();
    const arr = [...this.proposals.values()];
    await fs.writeFile(
      path.join(this.stateDir, PROPOSALS_FILE),
      JSON.stringify(arr, null, 2),
      "utf-8"
    );
  }
}
