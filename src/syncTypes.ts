/**
 * Shared contracts for the mob-programming sync control plane.
 *
 * This file is the single source of truth for all sync, proposal, and
 * operator-activity event types. Every downstream module (gitService,
 * worktreeManager, stateSyncCoordinator, syncLedger, mcpServer, agentScreen)
 * imports from here — never defines its own copy.
 */

// ── Sync state (per-operator workspace tracking) ────────────────────────────

/** Operator's workspace synchronisation state. */
export type SyncState = "idle" | "syncing" | "conflict" | "applying" | "error";

/** Snapshot of a single operator's workspace state relative to the user branch. */
export interface OperatorWorkspaceState {
  operatorId: string;
  operatorName: string;
  worktreePath: string;
  branchName: string;
  baseCommit: string;
  headCommit: string;
  mergeBase: string;
  syncState: SyncState;
  changedFiles: string[];
}

// ── Sync proposals ──────────────────────────────────────────────────────────

/** Lifecycle states for a sync proposal. */
export type SyncProposalStatus =
  | "pending_review"
  | "approved"
  | "rejected"
  | "conflict"
  | "applying"
  | "applied"
  | "failed_apply";

/** A proposal to merge operator changes into the user branch. */
export interface SyncProposal {
  id: string;
  operatorId: string;
  operatorName: string;
  baseCommit: string;
  headCommit: string;
  changedFiles: string[];
  conflictingFiles: string[];
  status: SyncProposalStatus;
  createdAt: number;
  decidedAt?: number;
  appliedAt?: number;
  error?: string;
}

// ── Status snapshot ─────────────────────────────────────────────────────────

/** Full snapshot of sync state across all operators. */
export interface SyncStatusSnapshot {
  userBranch: string;
  userHeadCommit: string;
  operators: OperatorWorkspaceState[];
  proposals: SyncProposal[];
  timestamp: number;
}

// ── Apply result ────────────────────────────────────────────────────────────

/** Result of applying an approved proposal. */
export interface ApplyResult {
  success: boolean;
  proposalId: string;
  mergeCommit?: string;
  error?: string;
  conflictFiles?: string[];
}

// ── Operator activity events ────────────────────────────────────────────────

/** Activity event type for the S-AS activity stream. */
export type OperatorActivityEventType =
  | "file_change"
  | "command"
  | "test"
  | "decision"
  | "sync"
  | "conflict"
  | "apply";

/** Structured activity event emitted by operators. */
export interface OperatorActivityEvent {
  type: OperatorActivityEventType;
  operatorId: string;
  operatorName: string;
  detail: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

// ── Ledger decision record ──────────────────────────────────────────────────

/** A recorded decision in the sync ledger (append-only). */
export interface LedgerDecisionRecord {
  proposalId: string;
  action: string;
  timestamp: number;
  actor?: string;
}
