import * as path from "path";
import { WorktreeManager } from "../src/worktreeManager";
import type { GitService, GitResult } from "../src/gitService";

function success<T>(data?: T): GitResult<T> {
  return { ok: true, data: data as T };
}

function failure<T>(error: string): GitResult<T> {
  return { ok: false, error };
}

function makeGitService(overrides: Partial<GitService> = {}): GitService {
  return {
    getRepoRoot: jest.fn().mockResolvedValue(success("/repo")),
    getCurrentBranch: jest.fn().mockResolvedValue(success("main")),
    revParse: jest.fn().mockResolvedValue(success("abc123")),
    getMergeBase: jest.fn().mockResolvedValue(success("abc123")),
    listChangedFiles: jest.fn().mockResolvedValue(success([])),
    isDirty: jest.fn().mockResolvedValue(success(false)),
    createBranch: jest.fn().mockResolvedValue(success(undefined)),
    worktreeAdd: jest.fn().mockResolvedValue(success(undefined)),
    worktreeRemove: jest.fn().mockResolvedValue(success(undefined)),
    worktreeList: jest.fn().mockResolvedValue(success([])),
    cherryPick: jest.fn().mockResolvedValue(success(undefined)),
    mergeNoFf: jest.fn().mockResolvedValue(success("merge123")),
    abortMerge: jest.fn().mockResolvedValue(success(undefined)),
    deleteBranch: jest.fn().mockResolvedValue(success(undefined)),
    ...overrides,
  } as unknown as GitService;
}

describe("WorktreeManager", () => {
  describe("allocate", () => {
    it("creates branch and worktree with deterministic names", async () => {
      const git = makeGitService();
      const mgr = new WorktreeManager(git, "/repo");

      const alloc = await mgr.allocate("op-1");

      expect(alloc.operatorId).toBe("op-1");
      expect(alloc.branchName).toBe("drive/op/op-1");
      expect(alloc.worktreePath).toBe(path.join("/repo", ".drive", "worktrees", "op-1"));
      expect(git.createBranch).toHaveBeenCalledWith("drive/op/op-1", "HEAD");
      expect(git.worktreeAdd).toHaveBeenCalledWith(path.join("/repo", ".drive", "worktrees", "op-1"), "drive/op/op-1");
    });

    it("uses custom baseRef when provided", async () => {
      const git = makeGitService();
      const mgr = new WorktreeManager(git, "/repo");

      await mgr.allocate("op-2", "feature-branch");

      expect(git.createBranch).toHaveBeenCalledWith("drive/op/op-2", "feature-branch");
    });

    it("returns existing allocation if already allocated (idempotent)", async () => {
      const git = makeGitService();
      const mgr = new WorktreeManager(git, "/repo");

      const first = await mgr.allocate("op-1");
      const second = await mgr.allocate("op-1");

      expect(first).toEqual(second);
      // createBranch should only be called once
      expect(git.createBranch).toHaveBeenCalledTimes(1);
    });

    it("throws on branch creation failure", async () => {
      const git = makeGitService({
        createBranch: jest.fn().mockResolvedValue(failure("already exists")),
      });
      const mgr = new WorktreeManager(git, "/repo");

      await expect(mgr.allocate("op-1")).rejects.toThrow("Failed to create branch");
    });

    it("rolls back branch on worktree add failure", async () => {
      const git = makeGitService({
        worktreeAdd: jest.fn().mockResolvedValue(failure("disk full")),
      });
      const mgr = new WorktreeManager(git, "/repo");

      await expect(mgr.allocate("op-1")).rejects.toThrow("Failed to add worktree");
      expect(git.deleteBranch).toHaveBeenCalledWith("drive/op/op-1");
      expect(mgr.getAllocation("op-1")).toBeUndefined();
    });

    it("allocates multiple operators without conflict", async () => {
      const git = makeGitService();
      const mgr = new WorktreeManager(git, "/repo");

      const a = await mgr.allocate("op-1");
      const b = await mgr.allocate("op-2");

      expect(a.branchName).not.toBe(b.branchName);
      expect(a.worktreePath).not.toBe(b.worktreePath);
      expect(mgr.listAllocations()).toHaveLength(2);
    });
  });

  describe("release", () => {
    it("removes worktree and branch", async () => {
      const git = makeGitService();
      const mgr = new WorktreeManager(git, "/repo");

      await mgr.allocate("op-1");
      await mgr.release("op-1");

      expect(git.worktreeRemove).toHaveBeenCalledWith(path.join("/repo", ".drive", "worktrees", "op-1"));
      expect(git.deleteBranch).toHaveBeenCalledWith("drive/op/op-1");
      expect(mgr.getAllocation("op-1")).toBeUndefined();
    });

    it("is a no-op for unknown operator", async () => {
      const git = makeGitService();
      const mgr = new WorktreeManager(git, "/repo");

      await mgr.release("nonexistent");

      expect(git.worktreeRemove).not.toHaveBeenCalled();
    });
  });

  describe("listAllocations", () => {
    it("returns all current allocations", async () => {
      const git = makeGitService();
      const mgr = new WorktreeManager(git, "/repo");

      await mgr.allocate("op-1");
      await mgr.allocate("op-2");

      const allocs = mgr.listAllocations();
      expect(allocs).toHaveLength(2);
      expect(allocs.map((a) => a.operatorId).sort()).toEqual(["op-1", "op-2"]);
    });
  });

  describe("cleanup", () => {
    it("removes allocations not in active set", async () => {
      const git = makeGitService();
      const mgr = new WorktreeManager(git, "/repo");

      await mgr.allocate("op-1");
      await mgr.allocate("op-2");
      await mgr.allocate("op-3");

      // op-2 is still active; op-1 and op-3 are orphaned
      await mgr.cleanup(["op-2"]);

      expect(mgr.listAllocations()).toHaveLength(1);
      expect(mgr.getAllocation("op-2")).toBeDefined();
      expect(mgr.getAllocation("op-1")).toBeUndefined();
      expect(mgr.getAllocation("op-3")).toBeUndefined();
    });

    it("is a no-op when all allocations are active", async () => {
      const git = makeGitService();
      const mgr = new WorktreeManager(git, "/repo");

      await mgr.allocate("op-1");
      await mgr.cleanup(["op-1"]);

      expect(mgr.listAllocations()).toHaveLength(1);
    });
  });

  describe("concurrency guard", () => {
    it("serializes concurrent allocate calls (no duplicates)", async () => {
      const git = makeGitService({
        createBranch: jest.fn().mockImplementation(() =>
          new Promise((resolve) => setTimeout(() => resolve(success(undefined)), 10))
        ),
        worktreeAdd: jest.fn().mockResolvedValue(success(undefined)),
      });
      const mgr = new WorktreeManager(git, "/repo");

      // Fire two concurrent allocates for the same operator
      const [a, b] = await Promise.all([
        mgr.allocate("op-1"),
        mgr.allocate("op-1"),
      ]);

      expect(a).toEqual(b);
      // createBranch should only be called once due to serialization
      expect(git.createBranch).toHaveBeenCalledTimes(1);
    });

    it("serializes concurrent allocate calls for different operators", async () => {
      let callOrder: string[] = [];
      const git = makeGitService({
        createBranch: jest.fn().mockImplementation((_branch: string) => {
          callOrder.push(`create:${_branch}`);
          return Promise.resolve(success(undefined));
        }),
        worktreeAdd: jest.fn().mockImplementation((_path: string) => {
          callOrder.push(`add:${_path}`);
          return Promise.resolve(success(undefined));
        }),
      });
      const mgr = new WorktreeManager(git, "/repo");

      await Promise.all([
        mgr.allocate("op-1"),
        mgr.allocate("op-2"),
      ]);

      // Both should be allocated
      expect(mgr.listAllocations()).toHaveLength(2);
      // Operations should be interleaved per operator (create then add), not mixed
      // Because of serialization, op-1 fully completes before op-2 starts
      expect(callOrder[0]).toBe("create:drive/op/op-1");
      expect(callOrder[1]).toBe(`add:${path.join("/repo", ".drive", "worktrees", "op-1")}`);
      expect(callOrder[2]).toBe("create:drive/op/op-2");
      expect(callOrder[3]).toBe(`add:${path.join("/repo", ".drive", "worktrees", "op-2")}`);
    });
  });
});
