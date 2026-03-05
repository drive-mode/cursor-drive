import {
  SessionAccumulator,
  ToolCallTracker,
  AcpRequestError,
  createPermissionBroker,
} from "../src/cursor-sdk/index.js";

describe("cursor-sdk", () => {
  describe("SessionAccumulator", () => {
    it("accumulates tool calls and emits snapshots", () => {
      const acc = new SessionAccumulator();
      const snapshots: unknown[] = [];
      acc.subscribe((s) => snapshots.push(s));

      acc.apply({ toolCall: { externalId: "tc-1", name: "read_file", args: "{}" } });
      expect(acc.getSnapshot().toolCalls).toHaveLength(1);
      expect(acc.getSnapshot().toolCalls[0].name).toBe("read_file");

      acc.apply({ toolCallUpdate: { externalId: "tc-1", resultDelta: "content" } });
      expect(acc.getSnapshot().toolCalls[0].result).toBe("content");
      expect(snapshots).toHaveLength(2);
    });
  });

  describe("ToolCallTracker", () => {
    it("tracks tool calls by externalId", () => {
      const tracker = new ToolCallTracker();
      tracker.start("tc-1", "run_terminal", '{"cmd":"ls"}');
      expect(tracker.view("tc-1")?.name).toBe("run_terminal");
      tracker.progress("tc-1", { status: "completed", result: "done" });
      expect(tracker.view("tc-1")?.status).toBe("completed");
    });
  });

  describe("AcpRequestError", () => {
    it("extends Error with code and details", () => {
      const err = new AcpRequestError("Permission denied", "PERMISSION_DENIED", { tool: "write" });
      expect(err.message).toBe("Permission denied");
      expect(err.code).toBe("PERMISSION_DENIED");
      expect(err.details).toEqual({ tool: "write" });
      expect(err.name).toBe("AcpRequestError");
    });
  });

  describe("PermissionBroker", () => {
    it("creates broker wired to approval gates", () => {
      const broker = createPermissionBroker();
      expect(broker).toBeDefined();
    });
  });
});
