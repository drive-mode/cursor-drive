import { SessionMemory } from "../src/sessionMemory";

jest.mock("vscode", () => ({
  workspace: {
    getConfiguration: jest.fn(() => ({
      get: jest.fn((key: string, fallback: unknown) => fallback),
    })),
  },
}));

function makeMockMemento(): { data: Record<string, unknown>; get: jest.Mock; update: jest.Mock } {
  const data: Record<string, unknown> = {};
  return {
    data,
    get: jest.fn((key: string) => data[key]),
    update: jest.fn((key: string, value: unknown) => {
      data[key] = value;
      return Promise.resolve();
    }),
  };
}

describe("SessionMemory", () => {
  describe("turn tracking", () => {
    it("adds turn entries", () => {
      const mem = new SessionMemory(makeMockMemento() as never);
      mem.addTurn("Refactored auth module");
      expect(mem.getState().entries).toHaveLength(1);
      expect(mem.getState().entries[0].type).toBe("turn");
    });

    it("persists entries", () => {
      const memento = makeMockMemento();
      const mem = new SessionMemory(memento as never);
      mem.addTurn("Added tests");
      expect(memento.update).toHaveBeenCalled();
    });
  });

  describe("task tracking", () => {
    it("adds and completes tasks", () => {
      const mem = new SessionMemory(makeMockMemento() as never);
      mem.addTask("refactor auth");
      expect(mem.getState().activeTasks).toContain("refactor auth");
      mem.completeTask("refactor auth");
      expect(mem.getState().activeTasks).not.toContain("refactor auth");
    });

    it("does not duplicate tasks", () => {
      const mem = new SessionMemory(makeMockMemento() as never);
      mem.addTask("refactor auth");
      mem.addTask("refactor auth");
      expect(mem.getState().activeTasks).toHaveLength(1);
    });
  });

  describe("buildContextString", () => {
    it("returns empty string when no data", () => {
      const mem = new SessionMemory(makeMockMemento() as never);
      expect(mem.buildContextString()).toBe("");
    });

    it("includes active tasks", () => {
      const mem = new SessionMemory(makeMockMemento() as never);
      mem.addTask("add login page");
      const ctx = mem.buildContextString();
      expect(ctx).toContain("add login page");
    });

    it("includes pending actions", () => {
      const mem = new SessionMemory(makeMockMemento() as never);
      mem.addPendingAction("deploy to staging");
      const ctx = mem.buildContextString();
      expect(ctx).toContain("deploy to staging");
    });
  });

  describe("clear", () => {
    it("empties all state", () => {
      const mem = new SessionMemory(makeMockMemento() as never);
      mem.addTurn("something");
      mem.addTask("task1");
      mem.clear();
      expect(mem.getState().entries).toHaveLength(0);
      expect(mem.getState().activeTasks).toHaveLength(0);
    });
  });

  describe("memory bounds", () => {
    it("trims entries over maxEntries", () => {
      const memento = makeMockMemento();
      const cfg = require("vscode").workspace.getConfiguration as jest.Mock;
      cfg.mockReturnValue({
        get: jest.fn((key: string, fallback: unknown) => {
          if (key === "maxEntries") { return 5; }
          return fallback;
        })
      });

      const mem = new SessionMemory(memento as never);
      for (let i = 0; i < 10; i++) {
        mem.addTurn(`turn ${i}`);
      }
      expect(mem.getState().entries.length).toBeLessThanOrEqual(5);
    });
  });

  describe("operator memory isolation", () => {
    it("forOperator isolated only shows own entries", () => {
      const mem = new SessionMemory(makeMockMemento() as never);
      mem.addTurn("Alpha did something", "op-alpha");
      mem.addTurn("Beta did something", "op-beta");
      mem.addDecision("key decision by alpha", "op-alpha");

      const alphaCtx = mem.forOperator("op-alpha", "isolated");
      const result = alphaCtx.buildContextString();
      expect(result).toContain("Alpha did something");
      expect(result).not.toContain("Beta did something");
      expect(result).toContain("key decision by alpha");
    });

    it("forOperator shared shows all entries", () => {
      const mem = new SessionMemory(makeMockMemento() as never);
      mem.addTurn("Alpha did something", "op-alpha");
      mem.addTurn("Beta did something", "op-beta");

      const alphaCtx = mem.forOperator("op-alpha", "shared");
      const result = alphaCtx.buildContextString();
      expect(result).toContain("Alpha did something");
      expect(result).toContain("Beta did something");
    });

    it("forOperator collaborative labels other operators' decisions", () => {
      const mem = new SessionMemory(makeMockMemento() as never);
      mem.addDecision("alpha's decision", "op-alpha");
      mem.addDecision("beta's insight", "op-beta");

      const alphaCtx = mem.forOperator("op-alpha", "collaborative");
      const result = alphaCtx.buildContextString();
      // Beta's decision should be labelled with attribution.
      expect(result).toContain("[op-beta]");
      expect(result).toContain("beta's insight");
    });

    it("isolated returns empty when no entries for operator", () => {
      const mem = new SessionMemory(makeMockMemento() as never);
      mem.addTurn("some other op's work", "other-op");

      const ctx = mem.forOperator("op-alpha", "isolated");
      expect(ctx.buildContextString()).toBe("");
    });
  });

  describe("session compaction", () => {
    it("compact does nothing when under threshold", () => {
      const mem = new SessionMemory(makeMockMemento() as never);
      mem.addTurn("turn 1");
      mem.addTurn("turn 2");
      mem.compact();
      // No compaction-summary should be added.
      const entries = mem.getState().entries;
      expect(entries.every((e) => e.type !== "compaction-summary")).toBe(true);
    });

    it("compact creates a summary entry with decisions when threshold exceeded", () => {
      const memento = makeMockMemento();
      const cfg = require("vscode").workspace.getConfiguration as jest.Mock;
      cfg.mockReturnValue({
        get: jest.fn((key: string, fallback: unknown) => {
          if (key === "maxEntries") { return 10; }
          return fallback;
        })
      });

      const mem = new SessionMemory(memento as never);
      // Add 8 turns (threshold = floor(10 * 0.8) = 8) — should trigger compaction
      mem.addDecision("important decision 1");
      for (let i = 0; i < 7; i++) {
        mem.addTurn(`turn ${i}`);
      }
      mem.compact();

      const entries = mem.getState().entries;
      const summary = entries.find((e) => e.type === "compaction-summary");
      expect(summary).toBeDefined();
      expect(summary?.content).toContain("important decision 1");
    });

    it("auto-compaction triggers and creates a summary, keeping count below raw added", () => {
      const memento = makeMockMemento();
      const cfg = require("vscode").workspace.getConfiguration as jest.Mock;
      cfg.mockReturnValue({
        get: jest.fn((key: string, fallback: unknown) => {
          if (key === "maxEntries") { return 10; }
          return fallback;
        })
      });

      const mem = new SessionMemory(memento as never);
      // Adding 10 turns triggers auto-compaction at threshold (floor(10*0.8)=8).
      for (let i = 0; i < 10; i++) {
        mem.addTurn(`turn ${i}`);
      }
      const entries = mem.getState().entries;
      // Compaction should have run and reduced count below 10.
      expect(entries.length).toBeLessThan(10);
      // A compaction-summary entry should exist.
      expect(entries.some((e) => e.type === "compaction-summary")).toBe(true);
    });
  });
});
