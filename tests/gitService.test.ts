import { GitService, parseWorktreeListPorcelain } from "../src/gitService";
import type { ExecFn } from "../src/gitService";

function makeExec(
  responses: Record<string, { stdout: string; stderr?: string } | Error>
): ExecFn {
  return async (_cmd: string, args: string[], _opts: { cwd: string }) => {
    const key = args.join(" ");
    for (const [pattern, value] of Object.entries(responses)) {
      if (key === pattern || key.startsWith(pattern)) {
        if (value instanceof Error) {
          throw Object.assign(value, { stderr: (value as Error & { stderr?: string }).stderr ?? "" });
        }
        return { stdout: value.stdout, stderr: value.stderr ?? "" };
      }
    }
    throw new Error(`Unexpected git command: git ${key}`);
  };
}

describe("GitService", () => {
  describe("getRepoRoot", () => {
    it("returns trimmed repo root on success", async () => {
      const exec = makeExec({
        "rev-parse --show-toplevel": { stdout: "/home/user/repo\n" },
      });
      const svc = new GitService("/home/user/repo", exec);
      const result = await svc.getRepoRoot();
      expect(result.ok).toBe(true);
      expect(result.data).toBe("/home/user/repo");
    });

    it("returns error on failure", async () => {
      const exec = makeExec({
        "rev-parse --show-toplevel": new Error("not a git repo"),
      });
      const svc = new GitService("/tmp/bad", exec);
      const result = await svc.getRepoRoot();
      expect(result.ok).toBe(false);
      expect(result.error).toContain("not a git repo");
    });
  });

  describe("getCurrentBranch", () => {
    it("returns current branch name", async () => {
      const exec = makeExec({
        "rev-parse --abbrev-ref HEAD": { stdout: "main\n" },
      });
      const svc = new GitService("/repo", exec);
      const result = await svc.getCurrentBranch();
      expect(result.ok).toBe(true);
      expect(result.data).toBe("main");
    });
  });

  describe("revParse", () => {
    it("resolves ref to commit hash", async () => {
      const exec = makeExec({
        "rev-parse HEAD": { stdout: "abc123def456\n" },
      });
      const svc = new GitService("/repo", exec);
      const result = await svc.revParse("HEAD");
      expect(result.ok).toBe(true);
      expect(result.data).toBe("abc123def456");
    });
  });

  describe("getMergeBase", () => {
    it("returns common ancestor", async () => {
      const exec = makeExec({
        "merge-base main feature": { stdout: "base111\n" },
      });
      const svc = new GitService("/repo", exec);
      const result = await svc.getMergeBase("main", "feature");
      expect(result.ok).toBe(true);
      expect(result.data).toBe("base111");
    });

    it("returns error when refs have no common ancestor", async () => {
      const exec = makeExec({
        "merge-base orphan1 orphan2": new Error("no merge base"),
      });
      const svc = new GitService("/repo", exec);
      const result = await svc.getMergeBase("orphan1", "orphan2");
      expect(result.ok).toBe(false);
    });
  });

  describe("listChangedFiles", () => {
    it("returns array of changed file paths", async () => {
      const exec = makeExec({
        "diff --name-only abc def": { stdout: "src/foo.ts\nsrc/bar.ts\n" },
      });
      const svc = new GitService("/repo", exec);
      const result = await svc.listChangedFiles("abc", "def");
      expect(result.ok).toBe(true);
      expect(result.data).toEqual(["src/foo.ts", "src/bar.ts"]);
    });

    it("returns empty array when no changes", async () => {
      const exec = makeExec({
        "diff --name-only abc abc": { stdout: "\n" },
      });
      const svc = new GitService("/repo", exec);
      const result = await svc.listChangedFiles("abc", "abc");
      expect(result.ok).toBe(true);
      expect(result.data).toEqual([]);
    });
  });

  describe("isDirty", () => {
    it("returns true when working tree has changes", async () => {
      const exec = makeExec({
        "status --porcelain": { stdout: " M src/foo.ts\n" },
      });
      const svc = new GitService("/repo", exec);
      const result = await svc.isDirty();
      expect(result.ok).toBe(true);
      expect(result.data).toBe(true);
    });

    it("returns false when working tree is clean", async () => {
      const exec = makeExec({
        "status --porcelain": { stdout: "" },
      });
      const svc = new GitService("/repo", exec);
      const result = await svc.isDirty();
      expect(result.ok).toBe(true);
      expect(result.data).toBe(false);
    });

    it("supports path-specific dirty check", async () => {
      const exec = makeExec({
        "status --porcelain -- src/foo.ts": { stdout: " M src/foo.ts\n" },
      });
      const svc = new GitService("/repo", exec);
      const result = await svc.isDirty("src/foo.ts");
      expect(result.ok).toBe(true);
      expect(result.data).toBe(true);
    });
  });

  describe("createBranch", () => {
    it("creates branch from ref", async () => {
      const exec = makeExec({
        "branch drive/op/op-1 HEAD": { stdout: "" },
      });
      const svc = new GitService("/repo", exec);
      const result = await svc.createBranch("drive/op/op-1", "HEAD");
      expect(result.ok).toBe(true);
    });

    it("returns error if branch already exists", async () => {
      const exec = makeExec({
        "branch drive/op/op-1 HEAD": new Error("already exists"),
      });
      const svc = new GitService("/repo", exec);
      const result = await svc.createBranch("drive/op/op-1", "HEAD");
      expect(result.ok).toBe(false);
      expect(result.error).toContain("already exists");
    });
  });

  describe("worktreeAdd", () => {
    it("adds worktree at path on branch", async () => {
      const exec = makeExec({
        "worktree add /repo/.drive/worktrees/op-1 drive/op/op-1": { stdout: "" },
      });
      const svc = new GitService("/repo", exec);
      const result = await svc.worktreeAdd("/repo/.drive/worktrees/op-1", "drive/op/op-1");
      expect(result.ok).toBe(true);
    });
  });

  describe("worktreeRemove", () => {
    it("removes worktree with force", async () => {
      const exec = makeExec({
        "worktree remove /repo/.drive/worktrees/op-1 --force": { stdout: "" },
      });
      const svc = new GitService("/repo", exec);
      const result = await svc.worktreeRemove("/repo/.drive/worktrees/op-1");
      expect(result.ok).toBe(true);
    });
  });

  describe("worktreeList", () => {
    it("parses porcelain output into entries", async () => {
      const porcelain = [
        "worktree /home/user/repo",
        "HEAD abc111",
        "branch refs/heads/main",
        "",
        "worktree /home/user/repo/.drive/worktrees/op-1",
        "HEAD def222",
        "branch refs/heads/drive/op/op-1",
        "",
      ].join("\n");

      const exec = makeExec({
        "worktree list --porcelain": { stdout: porcelain },
      });
      const svc = new GitService("/home/user/repo", exec);
      const result = await svc.worktreeList();
      expect(result.ok).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data![0]).toEqual({
        path: "/home/user/repo",
        branch: "main",
        head: "abc111",
      });
      expect(result.data![1]).toEqual({
        path: "/home/user/repo/.drive/worktrees/op-1",
        branch: "drive/op/op-1",
        head: "def222",
      });
    });
  });

  describe("mergeNoFf", () => {
    it("merges and returns new HEAD hash", async () => {
      const exec = makeExec({
        "merge --no-ff feature": { stdout: "" },
        "rev-parse HEAD": { stdout: "merge123\n" },
      });
      const svc = new GitService("/repo", exec);
      const result = await svc.mergeNoFf("feature");
      expect(result.ok).toBe(true);
      expect(result.data).toBe("merge123");
    });

    it("returns error on merge conflict", async () => {
      const exec = makeExec({
        "merge --no-ff feature": Object.assign(new Error("merge conflict"), {
          stderr: "CONFLICT (content): Merge conflict in src/foo.ts",
        }),
      });
      const svc = new GitService("/repo", exec);
      const result = await svc.mergeNoFf("feature");
      expect(result.ok).toBe(false);
      expect(result.error).toContain("merge conflict");
    });
  });

  describe("abortMerge", () => {
    it("aborts in-progress merge", async () => {
      const exec = makeExec({
        "merge --abort": { stdout: "" },
      });
      const svc = new GitService("/repo", exec);
      const result = await svc.abortMerge();
      expect(result.ok).toBe(true);
    });
  });

  describe("cherryPick", () => {
    it("cherry-picks a commit", async () => {
      const exec = makeExec({
        "cherry-pick abc123": { stdout: "" },
      });
      const svc = new GitService("/repo", exec);
      const result = await svc.cherryPick("abc123");
      expect(result.ok).toBe(true);
    });
  });

  describe("deleteBranch", () => {
    it("deletes branch with force", async () => {
      const exec = makeExec({
        "branch -D drive/op/op-1": { stdout: "" },
      });
      const svc = new GitService("/repo", exec);
      const result = await svc.deleteBranch("drive/op/op-1");
      expect(result.ok).toBe(true);
    });
  });
});

describe("parseWorktreeListPorcelain", () => {
  it("handles empty output", () => {
    expect(parseWorktreeListPorcelain("")).toEqual([]);
  });

  it("handles detached HEAD worktree", () => {
    const output = [
      "worktree /tmp/detached",
      "HEAD abc123",
      "detached",
      "",
    ].join("\n");
    const entries = parseWorktreeListPorcelain(output);
    expect(entries).toHaveLength(1);
    expect(entries[0].branch).toBe("");
    expect(entries[0].head).toBe("abc123");
  });

  it("strips refs/heads/ prefix from branch", () => {
    const output = [
      "worktree /repo",
      "HEAD aaa111",
      "branch refs/heads/feature/my-branch",
      "",
    ].join("\n");
    const entries = parseWorktreeListPorcelain(output);
    expect(entries[0].branch).toBe("feature/my-branch");
  });
});
