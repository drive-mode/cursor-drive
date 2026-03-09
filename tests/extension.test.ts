import * as vscode from "vscode";
import { activate } from "../src/extension";

jest.mock("../src/mcpServer", () => ({
  DriveMcpServer: jest.fn().mockImplementation(() => ({
    start: jest.fn().mockResolvedValue(undefined),
    stop: jest.fn().mockResolvedValue(undefined),
    getPort: jest.fn().mockReturnValue(7891),
  })),
}));

jest.mock("../src/agentScreen", () => ({
  AgentScreenPanel: {
    createOrShow: jest.fn(() => ({ logActivity: jest.fn(), switchAgent: jest.fn(), clear: jest.fn() })),
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
      return { get: jest.fn((k: string, fallback: unknown) => config[key]?.[k] ?? fallback) };
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
