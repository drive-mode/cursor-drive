import { OperatorRegistry } from "../src/operatorRegistry";

describe("OperatorRegistry", () => {
  it("spawns first operator as foreground and next as background", () => {
    const registry = new OperatorRegistry();
    const alpha = registry.spawn("Alpha", "Main task");
    const beta = registry.spawn("Beta", "Side task");

    expect(alpha.status).toBe("active");
    expect(beta.status).toBe("background");
    expect(registry.getForeground()?.name).toBe("Alpha");
  });

  it("switches foreground by name", () => {
    const registry = new OperatorRegistry();
    registry.spawn("Alpha", "Main task");
    registry.spawn("Beta", "Side task");

    const switched = registry.switchTo("Beta");
    expect(switched?.name).toBe("Beta");
    expect(registry.getForeground()?.name).toBe("Beta");
  });

  it("pauses and resumes operators", () => {
    const registry = new OperatorRegistry();
    const alpha = registry.spawn("Alpha", "Main task");

    expect(registry.pause(alpha.id)).toBe(true);
    expect(registry.getActive()[0].status).toBe("paused");

    expect(registry.resume(alpha.id)).toBe(true);
    expect(registry.getActive()[0].status).toBe("active");
  });

  it("merges source operator memory into target", () => {
    const registry = new OperatorRegistry();
    const alpha = registry.spawn("Alpha", "Main task");
    const beta = registry.spawn("Beta", "Research task");
    registry.updateMemory(beta.id, "Found 3 options");

    const merged = registry.merge(beta.id, alpha.id);
    expect(merged).toBe(true);

    const target = registry.list().find((a) => a.id === alpha.id);
    const source = registry.list().find((a) => a.id === beta.id);

    expect(source?.status).toBe("merged");
    expect(target?.memory.some((entry) => entry.includes("Merged from Beta"))).toBe(true);
  });

  it("emits change events for state transitions", () => {
    const registry = new OperatorRegistry();
    const listener = jest.fn();
    registry.onDidChange(listener);

    const alpha = registry.spawn("Alpha", "Main task");
    registry.updateMemory(alpha.id, "note");
    registry.pause(alpha.id);
    registry.resume(alpha.id);
    registry.dismiss(alpha.id);

    expect(listener).toHaveBeenCalled();
    expect(listener.mock.calls.length).toBeGreaterThanOrEqual(5);
  });

  it("emits operatorCompleted when operator is dismissed", () => {
    const registry = new OperatorRegistry();
    const onCompleted = jest.fn();
    registry.events.on("operatorCompleted", onCompleted);

    const alpha = registry.spawn("Alpha", "Main task");
    registry.dismiss(alpha.id);

    expect(onCompleted).toHaveBeenCalledWith(alpha.id, "Main task");
  });

  it("assigns default name when spawn called without name", () => {
    const registry = new OperatorRegistry();
    const op = registry.spawn(undefined, "Task");
    expect(op.name).toBe("Alpha");
    const op2 = registry.spawn(undefined, "Task 2");
    expect(op2.name).toBe("Beta");
  });

  it("dismisses operator and excludes from getActive", () => {
    const registry = new OperatorRegistry();
    const alpha = registry.spawn("Alpha", "Main task");
    const beta = registry.spawn("Beta", "Side task");

    expect(registry.getActive().length).toBe(2);
    registry.dismiss(alpha.id);
    expect(registry.getActive().length).toBe(1);
    expect(registry.getActive()[0].name).toBe("Beta");
  });

  it("switchTo with invalid name or id returns undefined", () => {
    const registry = new OperatorRegistry();
    registry.spawn("Alpha", "Task");
    expect(registry.switchTo("nonexistent")).toBeUndefined();
    expect(registry.switchTo("operator-fake-id")).toBeUndefined();
  });

  it("emits operatorProgress and taskDelegated when explicitly called", () => {
    const registry = new OperatorRegistry();
    const alpha = registry.spawn("Alpha", "Task A");
    const beta = registry.spawn("Beta", "Task B");

    const onProgress = jest.fn();
    const onDelegated = jest.fn();
    registry.events.on("operatorProgress", onProgress);
    registry.events.on("taskDelegated", onDelegated);

    registry.emitProgress(alpha.id, "Reading file");
    registry.emitTaskDelegated(alpha.id, beta.id, "Subtask");

    expect(onProgress).toHaveBeenCalledWith(alpha.id, "Reading file");
    expect(onDelegated).toHaveBeenCalledWith(alpha.id, beta.id, "Subtask");
  });

  describe("depth-based permission preset", () => {
    it("top-level operator defaults to standard preset", () => {
      const registry = new OperatorRegistry();
      const alpha = registry.spawn("Alpha", "task");
      expect(alpha.depth).toBe(0);
      expect(alpha.permissionPreset).toBe("standard");
    });

    it("delegated operator defaults to readonly (depth 1)", () => {
      const registry = new OperatorRegistry();
      const alpha = registry.spawn("Alpha", "task");
      const child = registry.delegate(alpha.id, "Beta", "subtask");
      expect(child?.depth).toBe(1);
      expect(child?.permissionPreset).toBe("readonly");
      expect(child?.parentId).toBe(alpha.id);
    });

    it("child cannot exceed parent preset via cascade cap", () => {
      const registry = new OperatorRegistry();
      const alpha = registry.spawn("Alpha", "task", { preset: "standard" });
      // Try to spawn child as "full" — should be capped to "standard"
      const child = registry.spawn("Beta", "subtask", {
        parentId: alpha.id,
        preset: "full",
      });
      expect(child.permissionPreset).toBe("standard");
    });

    it("readonly parent caps child to readonly even if full requested", () => {
      const registry = new OperatorRegistry();
      const alpha = registry.spawn("Alpha", "task", { preset: "readonly" });
      const child = registry.spawn("Beta", "subtask", {
        parentId: alpha.id,
        preset: "full",
      });
      expect(child.permissionPreset).toBe("readonly");
    });

    it("effectivePreset walks ancestry chain", () => {
      const registry = new OperatorRegistry();
      // Alpha=standard → Beta=full (capped to standard) → Gamma=full (capped to standard)
      const alpha = registry.spawn("Alpha", "t1", { preset: "standard" });
      const beta = registry.spawn("Beta", "t2", { parentId: alpha.id, preset: "full" });
      const gamma = registry.spawn("Gamma", "t3", { parentId: beta.id, preset: "full" });
      expect(registry.effectivePreset(gamma.id)).toBe("standard");
    });
  });

  describe("cascade dismiss", () => {
    it("dismissing a parent also dismisses its children", () => {
      const registry = new OperatorRegistry();
      const alpha = registry.spawn("Alpha", "parent task");
      const child = registry.delegate(alpha.id, "Beta", "child task");
      expect(child).toBeDefined();

      registry.dismiss(alpha.id);

      expect(registry.list().find((o) => o.id === alpha.id)?.status).toBe("completed");
      expect(registry.list().find((o) => o.id === child!.id)?.status).toBe("completed");
    });

    it("emits operatorCompleted for cascaded children", () => {
      const registry = new OperatorRegistry();
      const onCompleted = jest.fn();
      registry.events.on("operatorCompleted", onCompleted);

      const alpha = registry.spawn("Alpha", "parent");
      const child = registry.delegate(alpha.id, "Beta", "child");
      jest.clearAllMocks();

      registry.dismiss(alpha.id);

      const ids = onCompleted.mock.calls.map((c) => c[0]);
      expect(ids).toContain(alpha.id);
      expect(ids).toContain(child!.id);
    });

    it("does not cascade to unrelated operators", () => {
      const registry = new OperatorRegistry();
      const alpha = registry.spawn("Alpha", "task A");
      const gamma = registry.spawn("Gamma", "task C"); // unrelated

      registry.dismiss(alpha.id);

      expect(registry.list().find((o) => o.id === gamma.id)?.status).not.toBe("completed");
    });
  });

  describe("spawn edge cases — parentId validation and name collisions", () => {
    it("spawn with invalid parentId warns and proceeds without parent", () => {
      const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
      const registry = new OperatorRegistry();
      const op = registry.spawn("Alpha", "task", { parentId: "nonexistent-id" });

      // Should succeed but without a parent reference
      expect(op).toBeDefined();
      expect(op.parentId).toBeUndefined();
      // Depth defaults to 0 (no parent), preset defaults to standard
      expect(op.depth).toBe(0);
      expect(op.permissionPreset).toBe("standard");
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("parentId"));
      warnSpy.mockRestore();
    });

    it("spawn with invalid parentId does not apply cascade cap", () => {
      const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
      const registry = new OperatorRegistry();
      // With a real parent of readonly, child would be capped to readonly.
      // With a fake parentId, no cap applied — preset stands as requested.
      const op = registry.spawn("Alpha", "task", { parentId: "fake-id", preset: "full" });
      expect(op.permissionPreset).toBe("full");
      warnSpy.mockRestore();
    });

    it("spawn with duplicate name (case-insensitive) gets a unique variant", () => {
      const registry = new OperatorRegistry();
      const first = registry.spawn("alpha", "task 1");
      const second = registry.spawn("Alpha", "task 2");

      expect(first.name).toBe("alpha");
      // Second should NOT be "Alpha" (collision); should get a variant
      expect(second.name).not.toBe("Alpha");
      expect(second.name.toLowerCase()).not.toBe(first.name.toLowerCase());
    });

    it("findByNameOrId returns correct operator after near-collision names", () => {
      const registry = new OperatorRegistry();
      const a = registry.spawn("alpha", "task 1");
      const b = registry.spawn("Alpha", "task 2");

      // Both operators are individually findable by their actual names
      const foundA = registry.findByNameOrId("alpha");
      expect(foundA?.id).toBe(a.id);
      // b's actual name is the deduplicated variant
      const foundB = registry.findByNameOrId(b.name);
      expect(foundB?.id).toBe(b.id);
    });

    it("nextAvailableName skips names already in nameToId (case-insensitive)", () => {
      const registry = new OperatorRegistry();
      // Manually occupy "alpha" (lowercase) as if a custom name was registered
      registry.spawn("alpha", "task");
      // nextAvailableName should skip "Alpha" since "alpha" is occupied
      const second = registry.spawn(undefined, "task 2");
      // Alpha is occupied, so second should be Beta
      expect(second.name).toBe("Beta");
    });
  });

  describe("workspace state (mob-programming metadata)", () => {
    it("operators start with undefined workspace fields", () => {
      const registry = new OperatorRegistry();
      const op = registry.spawn("Alpha", "task");
      expect(op.worktreePath).toBeUndefined();
      expect(op.branchName).toBeUndefined();
      expect(op.baseCommit).toBeUndefined();
      expect(op.headCommit).toBeUndefined();
      expect(op.syncState).toBeUndefined();
    });

    it("updateWorkspaceState sets workspace fields", () => {
      const registry = new OperatorRegistry();
      const op = registry.spawn("Alpha", "task");

      const updated = registry.updateWorkspaceState(op.id, {
        worktreePath: "/repo/.drive/worktrees/op-1",
        branchName: "drive/op/op-1",
        baseCommit: "abc123",
        headCommit: "def456",
        syncState: "idle",
      });

      expect(updated).toBe(true);
      const found = registry.findByNameOrId(op.id);
      expect(found?.worktreePath).toBe("/repo/.drive/worktrees/op-1");
      expect(found?.branchName).toBe("drive/op/op-1");
      expect(found?.baseCommit).toBe("abc123");
      expect(found?.headCommit).toBe("def456");
      expect(found?.syncState).toBe("idle");
    });

    it("updateWorkspaceState triggers change notification", () => {
      const registry = new OperatorRegistry();
      const op = registry.spawn("Alpha", "task");
      const listener = jest.fn();
      registry.onDidChange(listener);

      listener.mockClear(); // clear from spawn

      registry.updateWorkspaceState(op.id, { syncState: "syncing" });
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it("updateWorkspaceState allows partial updates", () => {
      const registry = new OperatorRegistry();
      const op = registry.spawn("Alpha", "task");

      registry.updateWorkspaceState(op.id, { baseCommit: "aaa" });
      registry.updateWorkspaceState(op.id, { headCommit: "bbb" });

      const found = registry.findByNameOrId(op.id);
      expect(found?.baseCommit).toBe("aaa");
      expect(found?.headCommit).toBe("bbb");
    });

    it("updateWorkspaceState returns false for unknown operator", () => {
      const registry = new OperatorRegistry();
      expect(registry.updateWorkspaceState("nonexistent", { syncState: "idle" })).toBe(false);
    });
  });
});
