import { StateSyncCoordinator } from "../src/stateSyncCoordinator";
import { OperatorRegistry } from "../src/operatorRegistry";
import { SyncLedger } from "../src/syncLedger";
import { makeSyncProposal, makeOperatorActivityEvent } from "./syncTypes.test";
import type { GitService, GitResult } from "../src/gitService";
import type { WorktreeManager, WorktreeAllocation } from "../src/worktreeManager";
import type { SyncProposal } from "../src/syncTypes";

// ── Mock factories ──────────────────────────────────────────────────────

function success<T>(data: T): GitResult<T> {
  return { ok: true, data };
}

function failure<T>(error: string): GitResult<T> {
  return { ok: false, error };
}

function makeGitService(overrides: Partial<GitService> = {}): GitService {
  return {
    getRepoRoot: jest.fn().mockResolvedValue(success("/repo")),
    getCurrentBranch: jest.fn().mockResolvedValue(success("main")),
    revParse: jest.fn().mockImplementation((ref: string) => {
      if (ref === "HEAD") return Promise.resolve(success("user-head-aaa"));
      return Promise.resolve(success(`head-of-${ref}`));
    }),
    getMergeBase: jest.fn().mockResolvedValue(success("merge-base-111")),
    listChangedFiles: jest.fn().mockResolvedValue(success([])),
    isDirty: jest.fn().mockResolvedValue(success(false)),
    createBranch: jest.fn().mockResolvedValue(success(undefined)),
    worktreeAdd: jest.fn().mockResolvedValue(success(undefined)),
    worktreeRemove: jest.fn().mockResolvedValue(success(undefined)),
    worktreeList: jest.fn().mockResolvedValue(success([])),
    cherryPick: jest.fn().mockResolvedValue(success(undefined)),
    mergeNoFf: jest.fn().mockResolvedValue(success("merge-commit")),
    abortMerge: jest.fn().mockResolvedValue(success(undefined)),
    deleteBranch: jest.fn().mockResolvedValue(success(undefined)),
    ...overrides,
  } as unknown as GitService;
}

function makeWorktreeManager(
  allocations: Map<string, WorktreeAllocation> = new Map()
): WorktreeManager {
  return {
    allocate: jest.fn(),
    release: jest.fn(),
    getAllocation: jest.fn((opId: string) => allocations.get(opId)),
    listAllocations: jest.fn(() => [...allocations.values()]),
    cleanup: jest.fn(),
  } as unknown as WorktreeManager;
}

function makeLedger(): SyncLedger {
  const proposals = new Map<string, SyncProposal>();
  return {
    saveProposal: jest.fn(async (p: SyncProposal) => { proposals.set(p.id, { ...p }); }),
    loadProposals: jest.fn(async () => [...proposals.values()]),
    getProposal: jest.fn(async (id: string) => {
      const p = proposals.get(id);
      return p ? { ...p } : undefined;
    }),
    updateProposalStatus: jest.fn(async (id: string, status: string, extra?: Partial<SyncProposal>) => {
      const p = proposals.get(id);
      if (!p) return undefined;
      p.status = status as SyncProposal["status"];
      if (extra) Object.assign(p, extra);
      return { ...p };
    }),
    appendDecision: jest.fn(),
    getDecisionHistory: jest.fn(async () => []),
  } as unknown as SyncLedger;
}

// ── Tests ───────────────────────────────────────────────────────────────

describe("StateSyncCoordinator", () => {
  describe("computeSnapshot", () => {
    it("returns snapshot with no operators when none have worktrees", async () => {
      const registry = new OperatorRegistry();
      registry.spawn("Alpha", "task");
      const git = makeGitService();
      const wt = makeWorktreeManager(); // empty allocations
      const ledger = makeLedger();

      const coordinator = new StateSyncCoordinator(git, registry, wt, ledger);
      const snap = await coordinator.computeSnapshot();

      expect(snap.userBranch).toBe("main");
      expect(snap.userHeadCommit).toBe("user-head-aaa");
      expect(snap.operators).toHaveLength(0);
    });

    it("includes operators with allocated worktrees", async () => {
      const registry = new OperatorRegistry();
      const op = registry.spawn("Alpha", "implement feature");

      const allocations = new Map<string, WorktreeAllocation>();
      allocations.set(op.id, {
        operatorId: op.id,
        worktreePath: "/repo/.drive/worktrees/op-1",
        branchName: "drive/op/op-1",
      });

      const git = makeGitService({
        revParse: jest.fn().mockImplementation((ref: string) => {
          if (ref === "HEAD") return Promise.resolve(success("user-head-aaa"));
          if (ref === "drive/op/op-1") return Promise.resolve(success("op-head-bbb"));
          return Promise.resolve(success("unknown"));
        }),
        getMergeBase: jest.fn().mockResolvedValue(success("merge-base-111")),
        listChangedFiles: jest.fn().mockResolvedValue(success(["src/foo.ts", "src/bar.ts"])),
      });

      const wt = makeWorktreeManager(allocations);
      const ledger = makeLedger();

      const coordinator = new StateSyncCoordinator(git, registry, wt, ledger);
      const snap = await coordinator.computeSnapshot();

      expect(snap.operators).toHaveLength(1);
      expect(snap.operators[0].operatorId).toBe(op.id);
      expect(snap.operators[0].headCommit).toBe("op-head-bbb");
      expect(snap.operators[0].mergeBase).toBe("merge-base-111");
      expect(snap.operators[0].changedFiles).toEqual(["src/foo.ts", "src/bar.ts"]);
    });

    it("is deterministic for same git state", async () => {
      const registry = new OperatorRegistry();
      const op = registry.spawn("Alpha", "task");

      const allocations = new Map<string, WorktreeAllocation>();
      allocations.set(op.id, {
        operatorId: op.id,
        worktreePath: "/repo/.drive/worktrees/op-1",
        branchName: "drive/op/op-1",
      });

      const git = makeGitService({
        listChangedFiles: jest.fn().mockResolvedValue(success(["src/a.ts"])),
      });
      const wt = makeWorktreeManager(allocations);
      const ledger = makeLedger();

      const coordinator = new StateSyncCoordinator(git, registry, wt, ledger);

      const snap1 = await coordinator.computeSnapshot();
      const snap2 = await coordinator.computeSnapshot();

      // Strip timestamps for comparison
      expect(snap1.userBranch).toBe(snap2.userBranch);
      expect(snap1.userHeadCommit).toBe(snap2.userHeadCommit);
      expect(snap1.operators.length).toBe(snap2.operators.length);
      expect(snap1.operators[0].changedFiles).toEqual(snap2.operators[0].changedFiles);
    });
  });

  describe("generateProposals", () => {
    it("creates proposal for operator with new commits", async () => {
      const registry = new OperatorRegistry();
      const op = registry.spawn("Alpha", "implement");

      const allocations = new Map<string, WorktreeAllocation>();
      allocations.set(op.id, {
        operatorId: op.id,
        worktreePath: "/repo/.drive/worktrees/op-1",
        branchName: "drive/op/op-1",
      });

      const git = makeGitService({
        revParse: jest.fn().mockImplementation((ref: string) => {
          if (ref === "HEAD") return Promise.resolve(success("user-head"));
          if (ref === "drive/op/op-1") return Promise.resolve(success("op-head-different"));
          return Promise.resolve(success("unknown"));
        }),
        getMergeBase: jest.fn().mockResolvedValue(success("merge-base")),
        listChangedFiles: jest.fn().mockImplementation((from: string, to: string) => {
          if (to === "HEAD") return Promise.resolve(success([])); // user has no changes
          return Promise.resolve(success(["src/feature.ts"]));
        }),
      });

      const wt = makeWorktreeManager(allocations);
      const ledger = makeLedger();

      const coordinator = new StateSyncCoordinator(git, registry, wt, ledger);
      const proposals = await coordinator.generateProposals();

      expect(proposals).toHaveLength(1);
      expect(proposals[0].operatorId).toBe(op.id);
      expect(proposals[0].status).toBe("pending_review");
      expect(proposals[0].changedFiles).toEqual(["src/feature.ts"]);
      expect(proposals[0].conflictingFiles).toEqual([]);
    });

    it("detects conflicting files", async () => {
      const registry = new OperatorRegistry();
      const op = registry.spawn("Alpha", "implement");

      const allocations = new Map<string, WorktreeAllocation>();
      allocations.set(op.id, {
        operatorId: op.id,
        worktreePath: "/repo/.drive/worktrees/op-1",
        branchName: "drive/op/op-1",
      });

      const git = makeGitService({
        revParse: jest.fn().mockImplementation((ref: string) => {
          if (ref === "HEAD") return Promise.resolve(success("user-head"));
          return Promise.resolve(success("op-head-different"));
        }),
        getMergeBase: jest.fn().mockResolvedValue(success("merge-base")),
        listChangedFiles: jest.fn().mockImplementation((_from: string, to: string) => {
          if (to === "HEAD") {
            // User changed these files
            return Promise.resolve(success(["src/shared.ts", "src/user-only.ts"]));
          }
          // Operator changed these files
          return Promise.resolve(success(["src/shared.ts", "src/op-only.ts"]));
        }),
      });

      const wt = makeWorktreeManager(allocations);
      const ledger = makeLedger();

      const coordinator = new StateSyncCoordinator(git, registry, wt, ledger);
      const proposals = await coordinator.generateProposals();

      expect(proposals).toHaveLength(1);
      expect(proposals[0].conflictingFiles).toEqual(["src/shared.ts"]);
      expect(proposals[0].status).toBe("conflict");
    });

    it("skips operators with no new commits", async () => {
      const registry = new OperatorRegistry();
      const op = registry.spawn("Alpha", "task");

      const allocations = new Map<string, WorktreeAllocation>();
      allocations.set(op.id, {
        operatorId: op.id,
        worktreePath: "/repo/.drive/worktrees/op-1",
        branchName: "drive/op/op-1",
      });

      const git = makeGitService({
        revParse: jest.fn().mockResolvedValue(success("same-commit")),
        getMergeBase: jest.fn().mockResolvedValue(success("same-commit")),
      });

      const wt = makeWorktreeManager(allocations);
      const ledger = makeLedger();

      const coordinator = new StateSyncCoordinator(git, registry, wt, ledger);
      const proposals = await coordinator.generateProposals();

      expect(proposals).toHaveLength(0);
    });

    it("skips operators that already have an active proposal", async () => {
      const registry = new OperatorRegistry();
      const op = registry.spawn("Alpha", "task");

      const allocations = new Map<string, WorktreeAllocation>();
      allocations.set(op.id, {
        operatorId: op.id,
        worktreePath: "/repo/.drive/worktrees/op-1",
        branchName: "drive/op/op-1",
      });

      const git = makeGitService({
        revParse: jest.fn().mockImplementation((ref: string) => {
          if (ref === "HEAD") return Promise.resolve(success("user-head"));
          return Promise.resolve(success("op-head-different"));
        }),
        getMergeBase: jest.fn().mockResolvedValue(success("merge-base")),
        listChangedFiles: jest.fn().mockResolvedValue(success(["src/a.ts"])),
      });

      const wt = makeWorktreeManager(allocations);
      const ledger = makeLedger();

      // Pre-populate an active proposal
      await ledger.saveProposal(makeSyncProposal({
        id: "existing",
        operatorId: op.id,
        status: "pending_review",
      }));

      const coordinator = new StateSyncCoordinator(git, registry, wt, ledger);
      const proposals = await coordinator.generateProposals();

      expect(proposals).toHaveLength(0);
    });
  });

  describe("proposal lifecycle", () => {
    it("approve transitions pending_review → approved", async () => {
      const registry = new OperatorRegistry();
      const git = makeGitService();
      const wt = makeWorktreeManager();
      const ledger = makeLedger();
      await ledger.saveProposal(makeSyncProposal({ id: "p-1", status: "pending_review" }));

      const coordinator = new StateSyncCoordinator(git, registry, wt, ledger);
      const result = await coordinator.approveProposal("p-1");

      expect(result?.status).toBe("approved");
      expect(result?.decidedAt).toBeDefined();
    });

    it("approve transitions conflict → approved", async () => {
      const registry = new OperatorRegistry();
      const git = makeGitService();
      const wt = makeWorktreeManager();
      const ledger = makeLedger();
      await ledger.saveProposal(makeSyncProposal({ id: "p-1", status: "conflict" }));

      const coordinator = new StateSyncCoordinator(git, registry, wt, ledger);
      const result = await coordinator.approveProposal("p-1");

      expect(result?.status).toBe("approved");
    });

    it("approve rejects invalid transitions", async () => {
      const registry = new OperatorRegistry();
      const git = makeGitService();
      const wt = makeWorktreeManager();
      const ledger = makeLedger();
      await ledger.saveProposal(makeSyncProposal({ id: "p-1", status: "applied" }));

      const coordinator = new StateSyncCoordinator(git, registry, wt, ledger);
      const result = await coordinator.approveProposal("p-1");

      expect(result).toBeUndefined();
    });

    it("reject transitions pending_review → rejected", async () => {
      const registry = new OperatorRegistry();
      const git = makeGitService();
      const wt = makeWorktreeManager();
      const ledger = makeLedger();
      await ledger.saveProposal(makeSyncProposal({ id: "p-1", status: "pending_review" }));

      const coordinator = new StateSyncCoordinator(git, registry, wt, ledger);
      const result = await coordinator.rejectProposal("p-1", "not needed");

      expect(result?.status).toBe("rejected");
      expect(result?.error).toBe("not needed");
    });

    it("returns undefined for nonexistent proposal", async () => {
      const registry = new OperatorRegistry();
      const git = makeGitService();
      const wt = makeWorktreeManager();
      const ledger = makeLedger();

      const coordinator = new StateSyncCoordinator(git, registry, wt, ledger);
      expect(await coordinator.approveProposal("nonexistent")).toBeUndefined();
      expect(await coordinator.rejectProposal("nonexistent")).toBeUndefined();
    });

    it("getActiveProposals filters terminal states", async () => {
      const registry = new OperatorRegistry();
      const git = makeGitService();
      const wt = makeWorktreeManager();
      const ledger = makeLedger();

      await ledger.saveProposal(makeSyncProposal({ id: "p-1", status: "pending_review" }));
      await ledger.saveProposal(makeSyncProposal({ id: "p-2", status: "approved" }));
      await ledger.saveProposal(makeSyncProposal({ id: "p-3", status: "applied" }));
      await ledger.saveProposal(makeSyncProposal({ id: "p-4", status: "rejected" }));

      const coordinator = new StateSyncCoordinator(git, registry, wt, ledger);
      const active = await coordinator.getActiveProposals();

      expect(active).toHaveLength(2);
      expect(active.map((p) => p.id).sort()).toEqual(["p-1", "p-2"]);
    });

    it("markApplying transitions approved → applying", async () => {
      const registry = new OperatorRegistry();
      const git = makeGitService();
      const wt = makeWorktreeManager();
      const ledger = makeLedger();
      await ledger.saveProposal(makeSyncProposal({ id: "p-1", status: "approved" }));

      const coordinator = new StateSyncCoordinator(git, registry, wt, ledger);
      const result = await coordinator.markApplying("p-1");
      expect(result?.status).toBe("applying");
    });

    it("markFailed records error and conflict files", async () => {
      const registry = new OperatorRegistry();
      const git = makeGitService();
      const wt = makeWorktreeManager();
      const ledger = makeLedger();
      await ledger.saveProposal(makeSyncProposal({ id: "p-1", status: "applying" }));

      const coordinator = new StateSyncCoordinator(git, registry, wt, ledger);
      const result = await coordinator.markFailed("p-1", "merge conflict", ["src/a.ts"]);
      expect(result?.status).toBe("failed_apply");
      expect(result?.error).toBe("merge conflict");
      expect(result?.conflictingFiles).toEqual(["src/a.ts"]);
    });
  });

  describe("activity events", () => {
    it("pushes and retrieves events", () => {
      const registry = new OperatorRegistry();
      const git = makeGitService();
      const wt = makeWorktreeManager();
      const ledger = makeLedger();

      const coordinator = new StateSyncCoordinator(git, registry, wt, ledger);

      coordinator.pushActivityEvent(makeOperatorActivityEvent({
        operatorId: "op-1",
        detail: "First",
      }));
      coordinator.pushActivityEvent(makeOperatorActivityEvent({
        operatorId: "op-2",
        detail: "Second",
      }));

      const events = coordinator.getRecentEvents(10);
      expect(events).toHaveLength(2);
      // Newest first
      expect(events[0].detail).toBe("Second");
      expect(events[1].detail).toBe("First");
    });

    it("filters by operatorId", () => {
      const registry = new OperatorRegistry();
      const git = makeGitService();
      const wt = makeWorktreeManager();
      const ledger = makeLedger();

      const coordinator = new StateSyncCoordinator(git, registry, wt, ledger);

      coordinator.pushActivityEvent(makeOperatorActivityEvent({ operatorId: "op-1", detail: "A" }));
      coordinator.pushActivityEvent(makeOperatorActivityEvent({ operatorId: "op-2", detail: "B" }));
      coordinator.pushActivityEvent(makeOperatorActivityEvent({ operatorId: "op-1", detail: "C" }));

      const events = coordinator.getRecentEvents(10, "op-1");
      expect(events).toHaveLength(2);
      expect(events.every((e) => e.operatorId === "op-1")).toBe(true);
    });

    it("respects limit", () => {
      const registry = new OperatorRegistry();
      const git = makeGitService();
      const wt = makeWorktreeManager();
      const ledger = makeLedger();

      const coordinator = new StateSyncCoordinator(git, registry, wt, ledger);

      for (let i = 0; i < 10; i++) {
        coordinator.pushActivityEvent(makeOperatorActivityEvent({ detail: `Event ${i}` }));
      }

      const events = coordinator.getRecentEvents(3);
      expect(events).toHaveLength(3);
    });
  });
});
