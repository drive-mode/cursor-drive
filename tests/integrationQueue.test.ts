import { IntegrationQueue } from "../src/integrationQueue";
import type { StateSyncCoordinator } from "../src/stateSyncCoordinator";
import type { GitService, GitResult } from "../src/gitService";
import type { SyncLedger } from "../src/syncLedger";
import type { SyncProposal } from "../src/syncTypes";
import { makeSyncProposal } from "./syncTypes.test";

function success<T>(data: T): GitResult<T> {
  return { ok: true, data };
}

function failure<T>(error: string, stderr?: string): GitResult<T> {
  return { ok: false, error, stderr };
}

function makeCoordinator(proposals: Map<string, SyncProposal>): StateSyncCoordinator {
  return {
    getProposal: jest.fn(async (id: string) => {
      const p = proposals.get(id);
      return p ? { ...p } : undefined;
    }),
    markApplying: jest.fn(async (id: string) => {
      const p = proposals.get(id);
      if (!p || p.status !== "approved") return undefined;
      p.status = "applying";
      return { ...p };
    }),
    markApplied: jest.fn(async (id: string, _mergeCommit: string) => {
      const p = proposals.get(id);
      if (p) { p.status = "applied"; }
      return p ? { ...p } : undefined;
    }),
    markFailed: jest.fn(async (id: string, error: string) => {
      const p = proposals.get(id);
      if (p) { p.status = "failed_apply"; p.error = error; }
      return p ? { ...p } : undefined;
    }),
    computeSnapshot: jest.fn(),
    generateProposals: jest.fn(),
    approveProposal: jest.fn(),
    rejectProposal: jest.fn(),
    getActiveProposals: jest.fn(),
    pushActivityEvent: jest.fn(),
    getRecentEvents: jest.fn(),
  } as unknown as StateSyncCoordinator;
}

function makeGitService(overrides: Partial<GitService> = {}): GitService {
  return {
    mergeNoFf: jest.fn().mockResolvedValue(success("merge-commit-abc")),
    abortMerge: jest.fn().mockResolvedValue(success(undefined)),
    ...overrides,
  } as unknown as GitService;
}

function makeLedger(): SyncLedger {
  return {
    appendDecision: jest.fn(),
  } as unknown as SyncLedger;
}

describe("IntegrationQueue", () => {
  it("applies approved proposal and returns success", async () => {
    const proposals = new Map<string, SyncProposal>();
    proposals.set("p-1", makeSyncProposal({ id: "p-1", status: "approved", operatorId: "op-1" }));

    const coordinator = makeCoordinator(proposals);
    const git = makeGitService();
    const ledger = makeLedger();

    const queue = new IntegrationQueue(coordinator, git, ledger);
    const result = await queue.enqueue("p-1");

    expect(result.success).toBe(true);
    expect(result.mergeCommit).toBe("merge-commit-abc");
    expect(coordinator.markApplying).toHaveBeenCalledWith("p-1");
    expect(coordinator.markApplied).toHaveBeenCalledWith("p-1", "merge-commit-abc");
    expect(git.mergeNoFf).toHaveBeenCalledWith("drive/op/op-1");
  });

  it("returns error for nonexistent proposal", async () => {
    const coordinator = makeCoordinator(new Map());
    const git = makeGitService();
    const ledger = makeLedger();

    const queue = new IntegrationQueue(coordinator, git, ledger);
    const result = await queue.enqueue("nonexistent");

    expect(result.success).toBe(false);
    expect(result.error).toContain("not found");
  });

  it("returns error for unapproved proposal", async () => {
    const proposals = new Map<string, SyncProposal>();
    proposals.set("p-1", makeSyncProposal({ id: "p-1", status: "pending_review" }));

    const coordinator = makeCoordinator(proposals);
    const git = makeGitService();
    const ledger = makeLedger();

    const queue = new IntegrationQueue(coordinator, git, ledger);
    const result = await queue.enqueue("p-1");

    expect(result.success).toBe(false);
    expect(result.error).toContain("pending_review");
  });

  it("handles merge conflict gracefully", async () => {
    const proposals = new Map<string, SyncProposal>();
    proposals.set("p-1", makeSyncProposal({ id: "p-1", status: "approved", operatorId: "op-1" }));

    const coordinator = makeCoordinator(proposals);
    const git = makeGitService({
      mergeNoFf: jest.fn().mockResolvedValue(
        failure("merge conflict", "CONFLICT (content): Merge conflict in src/foo.ts")
      ),
      abortMerge: jest.fn().mockResolvedValue(success(undefined)),
    });
    const ledger = makeLedger();

    const queue = new IntegrationQueue(coordinator, git, ledger);
    const result = await queue.enqueue("p-1");

    expect(result.success).toBe(false);
    expect(result.error).toContain("merge conflict");
    expect(result.conflictFiles).toContain("src/foo.ts");
    expect(git.abortMerge).toHaveBeenCalled();
    expect(coordinator.markFailed).toHaveBeenCalled();
  });

  it("processes queue FIFO", async () => {
    const proposals = new Map<string, SyncProposal>();
    proposals.set("p-1", makeSyncProposal({ id: "p-1", status: "approved", operatorId: "op-1" }));
    proposals.set("p-2", makeSyncProposal({ id: "p-2", status: "approved", operatorId: "op-2" }));

    const mergeOrder: string[] = [];
    const coordinator = makeCoordinator(proposals);
    const git = makeGitService({
      mergeNoFf: jest.fn().mockImplementation((branch: string) => {
        mergeOrder.push(branch);
        return Promise.resolve(success(`merge-${branch}`));
      }),
      abortMerge: jest.fn().mockResolvedValue(success(undefined)),
    });
    const ledger = makeLedger();

    const queue = new IntegrationQueue(coordinator, git, ledger);

    const [r1, r2] = await Promise.all([
      queue.enqueue("p-1"),
      queue.enqueue("p-2"),
    ]);

    expect(r1.success).toBe(true);
    expect(r2.success).toBe(true);
    // FIFO order
    expect(mergeOrder[0]).toBe("drive/op/op-1");
    expect(mergeOrder[1]).toBe("drive/op/op-2");
  });

  it("failure does not block subsequent items", async () => {
    const proposals = new Map<string, SyncProposal>();
    proposals.set("p-1", makeSyncProposal({ id: "p-1", status: "approved", operatorId: "op-1" }));
    proposals.set("p-2", makeSyncProposal({ id: "p-2", status: "approved", operatorId: "op-2" }));

    const coordinator = makeCoordinator(proposals);
    let callCount = 0;
    const git = makeGitService({
      mergeNoFf: jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve(failure("conflict"));
        }
        return Promise.resolve(success("merge-ok"));
      }),
      abortMerge: jest.fn().mockResolvedValue(success(undefined)),
    });
    const ledger = makeLedger();

    const queue = new IntegrationQueue(coordinator, git, ledger);

    const [r1, r2] = await Promise.all([
      queue.enqueue("p-1"),
      queue.enqueue("p-2"),
    ]);

    expect(r1.success).toBe(false);
    expect(r2.success).toBe(true); // not blocked by p-1 failure
  });

  it("cancel removes pending item", async () => {
    const proposals = new Map<string, SyncProposal>();
    proposals.set("p-1", makeSyncProposal({ id: "p-1", status: "approved", operatorId: "op-1" }));
    proposals.set("p-2", makeSyncProposal({ id: "p-2", status: "approved", operatorId: "op-2" }));

    const coordinator = makeCoordinator(proposals);
    // Make first merge slow so p-2 stays pending
    const git = makeGitService({
      mergeNoFf: jest.fn().mockImplementation(() =>
        new Promise((resolve) => setTimeout(() => resolve(success("merge-abc")), 50))
      ),
      abortMerge: jest.fn().mockResolvedValue(success(undefined)),
    });
    const ledger = makeLedger();

    const queue = new IntegrationQueue(coordinator, git, ledger);

    const p1Promise = queue.enqueue("p-1");
    const p2Promise = queue.enqueue("p-2");

    // Cancel p-2 while p-1 is processing
    const cancelled = queue.cancel("p-2");
    expect(cancelled).toBe(true);

    const r2 = await p2Promise;
    expect(r2.success).toBe(false);
    expect(r2.error).toContain("Cancelled");

    const r1 = await p1Promise;
    expect(r1.success).toBe(true);
  });

  it("getQueueState reflects current state", async () => {
    const proposals = new Map<string, SyncProposal>();
    proposals.set("p-1", makeSyncProposal({ id: "p-1", status: "approved", operatorId: "op-1" }));

    const coordinator = makeCoordinator(proposals);
    const git = makeGitService();
    const ledger = makeLedger();

    const queue = new IntegrationQueue(coordinator, git, ledger);

    // Before any enqueue
    let state = queue.getQueueState();
    expect(state.processing).toBeNull();
    expect(state.pending).toEqual([]);
    expect(state.completed).toEqual([]);

    await queue.enqueue("p-1");

    state = queue.getQueueState();
    expect(state.processing).toBeNull();
    expect(state.completed).toContain("p-1");
  });
});
