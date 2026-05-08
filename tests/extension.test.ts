import * as vscode from "vscode";
import { activate } from "../src/extension";
import { AgentScreenPanel } from "../src/agentScreen";

jest.mock("../src/mcpServer", () => ({
  DriveMcpServer: jest.fn().mockImplementation(() => ({
    start: jest.fn().mockResolvedValue(undefined),
    stop: jest.fn().mockResolvedValue(undefined),
    getPort: jest.fn().mockReturnValue(7891),
  })),
}));

jest.mock("../src/agentScreen", () => ({
  AgentScreenPanel: {
    createOrShow: jest.fn(() => ({
      logActivity: jest.fn(),
      switchAgent: jest.fn(),
      clear: jest.fn(),
      setDriveActive: jest.fn(),
      postEvent: jest.fn(),
      waitForWebviewReady: jest.fn().mockResolvedValue(undefined),
    })),
    getInstance: jest.fn(() => null),
  },
}));

function makeContext(): vscode.ExtensionContext {
  const subs: vscode.Disposable[] = [];
  const state = new Map<string, unknown>();
  return {
    subscriptions: subs,
    workspaceState: {
      get: jest.fn((key: string, fallback?: unknown) => (state.has(key) ? state.get(key) : fallback)),
      update: jest.fn((key: string, value: unknown) => {
        state.set(key, value);
        return Promise.resolve();
      }),
    },
    extensionUri: { fsPath: "/test/ext" } as vscode.Uri,
  } as unknown as vscode.ExtensionContext;
}

describe("activate", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (vscode.workspace.getConfiguration as jest.Mock).mockImplementation((section?: string) => {
      const config: Record<string, Record<string, unknown>> = {
        cursorDrive: {
          "mcp.port": 7891,
          defaultSubMode: "agent",
          wakeWord: "hey drive",
          submitWord: "send it",
          "agents.tangentKeyword": "tangent",
        },
        "cursorDrive.operators": { maxConcurrent: 3 },
        "cursorDrive.agents.commsAgent": { enabled: true },
        "cursorDrive.agent.proactiveSteering": { idleSeconds: 30 },
        "cursorDrive.tts": { enabled: false },
      };
      const key = section ?? "cursorDrive";
      return {
        get: jest.fn((k: string, fallback: unknown) => config[key]?.[k] ?? fallback),
        update: jest.fn().mockResolvedValue(undefined),
      };
    });
  });

  it("registers all commands", async () => {
    const ctx = makeContext();
    await activate(ctx);

    const registered = (vscode.commands.registerCommand as jest.Mock).mock.calls.map((c: unknown[]) => (c as string[])[0]);
    expect(registered).toContain("cursorDrive.toggle");
    expect(registered).toContain("cursorDrive.exit");
    expect(registered).toContain("cursorDrive.setSubMode");
    expect(registered).toContain("cursorDrive.showAgentScreen");
    expect(registered).toContain("cursorDrive.clearAgentScreen");
    expect(registered).toContain("cursorDrive.speak");
    expect(registered).toContain("cursorDrive.stopSpeaking");
    expect(registered).toContain("cursorDrive.operators");
    expect(registered).toContain("cursorDrive.spawnOperator");
    expect(registered).toContain("cursorDrive.installPluginToWorkspace");
    expect(registered).toContain("cursorDrive.diagnose");
    expect(registered).toContain("cursorDrive.discoverAPIs");
  });

  it("waits for Agent Screen webview readiness before debug test events", async () => {
    const ctx = makeContext();
    await activate(ctx);

    const calls = (vscode.commands.registerCommand as jest.Mock).mock.calls as Array<[string, (...args: unknown[]) => unknown]>;
    const debugCmd = calls.find((c) => c[0] === "cursorDrive.debug.sendTestEvent");
    expect(debugCmd).toBeDefined();
    const handler = debugCmd?.[1];
    expect(typeof handler).toBe("function");

    await (handler as () => Promise<void>)();

    const createOrShowMock = AgentScreenPanel.createOrShow as unknown as jest.Mock;
    const panelInstance = createOrShowMock.mock.results[0]?.value as { waitForWebviewReady?: jest.Mock };
    expect(panelInstance?.waitForWebviewReady).toBeDefined();
    expect(panelInstance.waitForWebviewReady).toHaveBeenCalled();
  });

  it("creates Cursor Drive Output Channel and logs activation", async () => {
    const ctx = makeContext();
    await activate(ctx);

    expect(vscode.window.createOutputChannel).toHaveBeenCalledWith("Cursor Drive", { log: true });
    const channel = (vscode.window.createOutputChannel as jest.Mock).mock.results[0].value;
    expect(channel.appendLine).toHaveBeenCalledWith("[Drive] activate() called");
    expect(channel.appendLine).toHaveBeenCalledWith("[Drive] activate() complete");
  });

  it("registers disposables", async () => {
    const ctx = makeContext();
    await activate(ctx);

    expect(ctx.subscriptions.length).toBeGreaterThan(5);
  });
});
