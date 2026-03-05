/**
 * Tests for syncTypes.ts — compile-time contract validation + factory helpers.
 *
 * These tests primarily verify that the type contracts are well-formed and
 * that helper factory functions produce valid objects. The real value is
 * compile-time: if the interfaces change in a breaking way, these tests
 * will fail to compile before they fail to run.
 */

import type {
  SyncState,
  OperatorWorkspaceState,
  SyncProposalStatus,
  SyncProposal,
  SyncStatusSnapshot,
  ApplyResult,
  OperatorActivityEvent,
  OperatorActivityEventType,
  LedgerDecisionRecord,
} from "../src/syncTypes";

// ── Factory helpers (reusable across test suites) ───────────────────────────

export function makeOperatorWorkspaceState(
  overrides: Partial<OperatorWorkspaceState> = {}
): OperatorWorkspaceState {
  return {
    operatorId: "op-1",
    operatorName: "Alpha",
    worktreePath: "/repo/.drive/worktrees/op-1",
    branchName: "drive/op/op-1",
    baseCommit: "abc1234",
    headCommit: "def5678",
    mergeBase: "abc1234",
    syncState: "idle",
    changedFiles: [],
    ...overrides,
  };
}

export function makeSyncProposal(
  overrides: Partial<SyncProposal> = {}
): SyncProposal {
  return {
    id: "proposal-op-1-1700000000",
    operatorId: "op-1",
    operatorName: "Alpha",
    baseCommit: "abc1234",
    headCommit: "def5678",
    changedFiles: ["src/foo.ts"],
    conflictingFiles: [],
    status: "pending_review",
    createdAt: 1700000000,
    ...overrides,
  };
}

export function makeSyncStatusSnapshot(
  overrides: Partial<SyncStatusSnapshot> = {}
): SyncStatusSnapshot {
  return {
    userBranch: "main",
    userHeadCommit: "aaa1111",
    operators: [],
    proposals: [],
    timestamp: Date.now(),
    ...overrides,
  };
}

export function makeApplyResult(
  overrides: Partial<ApplyResult> = {}
): ApplyResult {
  return {
    success: true,
    proposalId: "proposal-op-1-1700000000",
    ...overrides,
  };
}

export function makeOperatorActivityEvent(
  overrides: Partial<OperatorActivityEvent> = {}
): OperatorActivityEvent {
  return {
    type: "file_change",
    operatorId: "op-1",
    operatorName: "Alpha",
    detail: "Modified src/foo.ts",
    timestamp: Date.now(),
    ...overrides,
  };
}

export function makeLedgerDecisionRecord(
  overrides: Partial<LedgerDecisionRecord> = {}
): LedgerDecisionRecord {
  return {
    proposalId: "proposal-op-1-1700000000",
    action: "approved",
    timestamp: Date.now(),
    ...overrides,
  };
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe("syncTypes contracts", () => {
  it("SyncState covers all expected values", () => {
    const states: SyncState[] = ["idle", "syncing", "conflict", "applying", "error"];
    expect(states).toHaveLength(5);
  });

  it("SyncProposalStatus covers all lifecycle states", () => {
    const statuses: SyncProposalStatus[] = [
      "pending_review",
      "approved",
      "rejected",
      "conflict",
      "applying",
      "applied",
      "failed_apply",
    ];
    expect(statuses).toHaveLength(7);
  });

  it("OperatorActivityEventType covers all event kinds", () => {
    const types: OperatorActivityEventType[] = [
      "file_change",
      "command",
      "test",
      "decision",
      "sync",
      "conflict",
      "apply",
    ];
    expect(types).toHaveLength(7);
  });

  it("makeOperatorWorkspaceState produces valid default", () => {
    const state = makeOperatorWorkspaceState();
    expect(state.operatorId).toBe("op-1");
    expect(state.syncState).toBe("idle");
    expect(state.changedFiles).toEqual([]);
  });

  it("makeOperatorWorkspaceState accepts overrides", () => {
    const state = makeOperatorWorkspaceState({
      operatorId: "op-99",
      syncState: "conflict",
      changedFiles: ["a.ts", "b.ts"],
    });
    expect(state.operatorId).toBe("op-99");
    expect(state.syncState).toBe("conflict");
    expect(state.changedFiles).toEqual(["a.ts", "b.ts"]);
  });

  it("makeSyncProposal produces valid default", () => {
    const p = makeSyncProposal();
    expect(p.status).toBe("pending_review");
    expect(p.conflictingFiles).toEqual([]);
    expect(p.changedFiles).toEqual(["src/foo.ts"]);
  });

  it("makeSyncProposal accepts status override", () => {
    const p = makeSyncProposal({ status: "approved", decidedAt: 170001 });
    expect(p.status).toBe("approved");
    expect(p.decidedAt).toBe(170001);
  });

  it("makeSyncStatusSnapshot produces valid default", () => {
    const snap = makeSyncStatusSnapshot();
    expect(snap.userBranch).toBe("main");
    expect(snap.operators).toEqual([]);
    expect(snap.proposals).toEqual([]);
  });

  it("makeApplyResult produces success by default", () => {
    const r = makeApplyResult();
    expect(r.success).toBe(true);
    expect(r.proposalId).toBeTruthy();
  });

  it("makeApplyResult can represent failure", () => {
    const r = makeApplyResult({
      success: false,
      error: "merge conflict",
      conflictFiles: ["src/index.ts"],
    });
    expect(r.success).toBe(false);
    expect(r.error).toBe("merge conflict");
    expect(r.conflictFiles).toEqual(["src/index.ts"]);
  });

  it("makeOperatorActivityEvent produces valid default", () => {
    const e = makeOperatorActivityEvent();
    expect(e.type).toBe("file_change");
    expect(e.operatorId).toBe("op-1");
  });

  it("makeLedgerDecisionRecord produces valid default", () => {
    const d = makeLedgerDecisionRecord();
    expect(d.action).toBe("approved");
    expect(d.proposalId).toBeTruthy();
  });

  it("SyncProposal optional fields are truly optional", () => {
    const p = makeSyncProposal();
    expect(p.decidedAt).toBeUndefined();
    expect(p.appliedAt).toBeUndefined();
    expect(p.error).toBeUndefined();
  });
});
