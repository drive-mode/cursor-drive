import * as vscode from "vscode";
import { OperatorRegistry } from "../src/operatorRegistry";
import { CommsAgent } from "../src/commsAgent";

jest.mock("../src/modelSelector", () => ({
  selectCheapModel: jest.fn(),
}));

jest.mock("../src/agentScreen", () => ({
  AgentScreenPanel: {
    getInstance: jest.fn(),
  },
}));

jest.mock("../src/tts", () => ({
  speak: jest.fn(),
}));

import { selectCheapModel } from "../src/modelSelector";
import { AgentScreenPanel } from "../src/agentScreen";
import { speak } from "../src/tts";

function makeContext(): vscode.ExtensionContext {
  return { subscriptions: [] } as unknown as vscode.ExtensionContext;
}

describe("CommsAgent", () => {
  const mockPanel = { logActivity: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    (AgentScreenPanel.getInstance as jest.Mock).mockReturnValue(mockPanel);
    (vscode.workspace.getConfiguration as jest.Mock).mockImplementation((section?: string) => {
      if (section === "cursorDrive.agents.commsAgent") {
        return { get: jest.fn((key: string, fallback: unknown) => (key === "enabled" ? true : fallback)) };
      }
      if (section === "cursorDrive.agent.proactiveSteering") {
        return { get: jest.fn((key: string, fallback: unknown) => (key === "idleSeconds" ? 1 : fallback)) };
      }
      if (section === "cursorDrive.tts") {
        return { get: jest.fn((key: string, fallback: unknown) => (key === "enabled" ? false : fallback)) };
      }
      return { get: jest.fn((_key: string, fallback: unknown) => fallback) };
    });
    (selectCheapModel as jest.Mock).mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("flushes a single update immediately with direct summary", async () => {
    const registry = new OperatorRegistry();
    const comms = new CommsAgent(registry, makeContext());

    comms.enqueue({
      operatorName: "Alpha",
      operatorId: "op-1",
      type: "completion",
      message: "done",
      timestamp: Date.now(),
    });
    await comms.flush();

    expect(mockPanel.logActivity).toHaveBeenCalledWith("Drive", expect.stringContaining("Alpha: done"));
    expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(expect.stringContaining("Alpha finished"));
  });

  it("caps queue size and drops oldest updates", async () => {
    const registry = new OperatorRegistry();
    const comms = new CommsAgent(registry, makeContext());

    for (let i = 0; i < 105; i++) {
      comms.enqueue({
        operatorName: "Alpha",
        operatorId: "op-1",
        type: "progress",
        message: `event-${i}`,
        timestamp: Date.now(),
      });
    }

    await comms.flush();
    const summary = (mockPanel.logActivity as jest.Mock).mock.calls[0][1] as string;
    expect(summary).toContain("event-104");
    expect(summary).not.toContain("event-0");
  });

  it("auto-flushes after idle timeout", async () => {
    const registry = new OperatorRegistry();
    const comms = new CommsAgent(registry, makeContext());
    comms.enqueue({
      operatorName: "Beta",
      operatorId: "op-2",
      type: "progress",
      message: "running",
      timestamp: Date.now(),
    });

    jest.advanceTimersByTime(1000);
    await Promise.resolve();

    expect(vscode.window.showInformationMessage).toHaveBeenCalled();
  });

  it("uses model summary when multiple updates and model available", async () => {
    const registry = new OperatorRegistry();
    const comms = new CommsAgent(registry, makeContext());
    const model = {
      sendRequest: jest.fn().mockResolvedValue({
        text: (async function* () {
          yield "Merged update summary.";
        })(),
      }),
    };
    (selectCheapModel as jest.Mock).mockResolvedValue(model);

    comms.enqueue({ operatorName: "Alpha", operatorId: "a", type: "progress", message: "first", timestamp: Date.now() });
    comms.enqueue({ operatorName: "Beta", operatorId: "b", type: "completion", message: "second", timestamp: Date.now() });
    await comms.flush();

    expect(model.sendRequest).toHaveBeenCalled();
    expect(mockPanel.logActivity).toHaveBeenCalledWith("Drive", expect.stringContaining("Merged update summary."));
  });

  it("does nothing when comms agent is disabled", async () => {
    (vscode.workspace.getConfiguration as jest.Mock).mockImplementation((section?: string) => {
      if (section === "cursorDrive.agents.commsAgent") {
        return { get: jest.fn((key: string, fallback: unknown) => (key === "enabled" ? false : fallback)) };
      }
      if (section === "cursorDrive.agent.proactiveSteering") {
        return { get: jest.fn((_key: string, fallback: unknown) => fallback) };
      }
      if (section === "cursorDrive.tts") {
        return { get: jest.fn((_key: string, fallback: unknown) => fallback) };
      }
      return { get: jest.fn((_key: string, fallback: unknown) => fallback) };
    });

    const registry = new OperatorRegistry();
    const comms = new CommsAgent(registry, makeContext());
    comms.enqueue({ operatorName: "Alpha", operatorId: "x", type: "progress", message: "ignored", timestamp: Date.now() });
    await comms.flush();

    expect(mockPanel.logActivity).not.toHaveBeenCalled();
    expect(vscode.window.showInformationMessage).not.toHaveBeenCalled();
    expect(speak).not.toHaveBeenCalled();
  });

  it("notifySyncEvent enqueues a sync update", async () => {
    const registry = new OperatorRegistry();
    const comms = new CommsAgent(registry, makeContext());

    comms.notifySyncEvent("op-1", "Alpha", "Proposal approved");
    await comms.flush();

    expect(mockPanel.logActivity).toHaveBeenCalledWith("Drive", expect.stringContaining("Alpha: Proposal approved"));
    expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(expect.stringContaining("Alpha finished"));
  });

  it("removes registry listeners on dispose", () => {
    const registry = new OperatorRegistry();
    const comms = new CommsAgent(registry, makeContext());
    comms.dispose();

    const op = registry.spawn("Alpha", "task");
    registry.emitProgress(op.id, "after-dispose");
    jest.advanceTimersByTime(1000);

    expect(vscode.window.showInformationMessage).not.toHaveBeenCalled();
  });
});
