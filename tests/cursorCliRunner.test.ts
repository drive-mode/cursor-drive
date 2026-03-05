import { EventEmitter } from "events";
import * as cp from "child_process";

jest.mock("vscode", () => ({
  workspace: {
    getConfiguration: jest.fn(() => ({
      get: jest.fn((_k: string, fallback: unknown) => fallback),
    })),
    workspaceFolders: undefined,
  },
}));

// We need to mock child_process.spawn before importing the module
const mockSpawn = jest.fn();
jest.mock("child_process", () => ({
  ...jest.requireActual("child_process"),
  spawn: (...args: unknown[]) => mockSpawn(...args),
}));

import { runCursorCliStreaming } from "../src/cursorCliRunner";

function makeMockChild() {
  const stdout = new EventEmitter() as EventEmitter & { on: jest.Mock };
  const child = new EventEmitter() as EventEmitter & {
    stdout: EventEmitter;
    on: jest.Mock;
    kill: jest.Mock;
  };
  child.stdout = stdout;
  child.kill = jest.fn();
  return child;
}

describe("runCursorCliStreaming", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("emits data events with correct CliStreamEvent fields", (done) => {
    const child = makeMockChild();
    mockSpawn.mockReturnValue(child);

    const runner = runCursorCliStreaming("test prompt");
    const received: unknown[] = [];

    runner.on("data", (event) => {
      received.push(event);
    });

    runner.on("close", () => {
      expect(received).toHaveLength(2);
      const first = received[0] as { type: string; text: string };
      const second = received[1] as { type: string; toolName: string };
      expect(first.type).toBe("assistant");
      expect(first.text).toBe("hello");
      expect(second.type).toBe("tool_call");
      expect(second.toolName).toBe("edit_file");
      done();
    });

    // Emit chunked stdout
    child.stdout.emit("data", Buffer.from('{"role":"assistant","content":"hello"}\n{"type":"tool_call","name":"edit_file"}\n'));
    child.emit("close", 0);
  });

  it("emits close event with exit code", (done) => {
    const child = makeMockChild();
    mockSpawn.mockReturnValue(child);

    const runner = runCursorCliStreaming("prompt");
    runner.on("close", (code) => {
      expect(code).toBe(42);
      done();
    });
    child.emit("close", 42);
  });

  it("handles error event from spawn gracefully", (done) => {
    const child = makeMockChild();
    mockSpawn.mockReturnValue(child);

    const runner = runCursorCliStreaming("prompt");
    runner.on("close", (code) => {
      expect(code).toBeNull();
      done();
    });
    child.emit("error", new Error("spawn ENOENT"));
  });

  it("buffers partial JSON lines across chunks", (done) => {
    const child = makeMockChild();
    mockSpawn.mockReturnValue(child);

    const runner = runCursorCliStreaming("prompt");
    const received: unknown[] = [];

    runner.on("data", (event) => {
      received.push(event);
    });

    runner.on("close", () => {
      expect(received).toHaveLength(1);
      const evt = received[0] as { type: string; text: string };
      expect(evt.type).toBe("text_delta");
      expect(evt.text).toBe("partial");
      done();
    });

    // Split the JSON across two chunks
    child.stdout.emit("data", Buffer.from('{"type":"text_delta","text":"'));
    child.stdout.emit("data", Buffer.from('partial"}\n'));
    child.emit("close", 0);
  });

  it("does not emit data events for malformed lines, just skips them", (done) => {
    const child = makeMockChild();
    mockSpawn.mockReturnValue(child);

    const runner = runCursorCliStreaming("prompt");
    const received: unknown[] = [];

    runner.on("data", (event) => {
      received.push(event);
    });

    runner.on("close", () => {
      // Only the valid line should emit
      expect(received).toHaveLength(1);
      done();
    });

    child.stdout.emit("data", Buffer.from('not-valid-json\n{"type":"error","text":"oops"}\n'));
    child.emit("close", 0);
  });

  it("uses fake timers to test timeout kills process", () => {
    jest.useFakeTimers();
    const child = makeMockChild();
    mockSpawn.mockReturnValue(child);

    const runner = runCursorCliStreaming("prompt", { timeoutMs: 5000 });
    const closeSpy = jest.fn();
    runner.on("close", closeSpy);

    // Advance past timeout
    jest.advanceTimersByTime(6000);

    expect(child.kill).toHaveBeenCalledWith("SIGKILL");
    expect(closeSpy).toHaveBeenCalledWith(null);

    jest.useRealTimers();
  });

  it("does not emit close twice if process exits after timeout", (done) => {
    jest.useFakeTimers();
    const child = makeMockChild();
    mockSpawn.mockReturnValue(child);

    const runner = runCursorCliStreaming("prompt", { timeoutMs: 100 });
    let closeCount = 0;
    runner.on("close", () => {
      closeCount++;
    });

    // Trigger timeout
    jest.advanceTimersByTime(200);
    // Then also emit close from process
    jest.useRealTimers();
    child.emit("close", 0);

    setImmediate(() => {
      expect(closeCount).toBe(1);
      done();
    });
  });

  it("passes correct args with --output-format stream-json", () => {
    const child = makeMockChild();
    mockSpawn.mockReturnValue(child);

    runCursorCliStreaming("my prompt");

    expect(mockSpawn).toHaveBeenCalledWith(
      expect.any(String),
      expect.arrayContaining(["-p", "my prompt", "--output-format", "stream-json"]),
      expect.any(Object)
    );
    child.emit("close", 0);
  });
});
