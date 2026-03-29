import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { AgentScreenPanel } from "../src/agentScreen";

function resetAgentScreenSingleton(): void {
  (AgentScreenPanel as unknown as { instance?: AgentScreenPanel }).instance = undefined;
}

describe("AgentScreenPanel", () => {
  async function flushAsyncTicks(count = 8): Promise<void> {
    for (let i = 0; i < count; i++) {
      await Promise.resolve();
    }
  }

  beforeEach(() => {
    jest.clearAllMocks();
    resetAgentScreenSingleton();
  });

  afterEach(() => {
    AgentScreenPanel.getInstance()?.dispose();
    resetAgentScreenSingleton();
  });

  it("formats output-channel events for activity/file/cliStream/clear", () => {
    (vscode.workspace.getConfiguration as jest.Mock).mockImplementation((section?: string) => {
      if (section === "cursorDrive.agentScreen") {
        return { get: jest.fn((key: string, fallback: unknown) => (key === "displayMode" ? "bottomLog" : fallback)) };
      }
      return { get: jest.fn((_key: string, fallback: unknown) => fallback) };
    });

    const panel = AgentScreenPanel.createOrShow({ fsPath: "/ext" } as vscode.Uri);
    const channel = (vscode.window.createOutputChannel as jest.Mock).mock.results[0].value;

    panel.postEvent({ type: "activity", operatorName: "Alpha", text: "Investigating" });
    panel.postEvent({ type: "file", operatorName: "Alpha", filePath: "src/mcpServer.ts" });
    panel.postEvent({ type: "cliStream", operatorName: "CLI", cliToolName: "bash", text: "npm test" });
    panel.clear();

    expect(channel.appendLine).toHaveBeenCalledWith("[Alpha] Investigating");
    expect(channel.appendLine).toHaveBeenCalledWith("[Alpha] Touched: src/mcpServer.ts");
    expect(channel.appendLine).toHaveBeenCalledWith("[CLI] [CLI] bash: npm test");
    expect(channel.clear).toHaveBeenCalled();
  });

  it("updatePlanProgress emits a planProgress event payload", () => {
    (vscode.workspace.getConfiguration as jest.Mock).mockImplementation((section?: string) => {
      if (section === "cursorDrive.agentScreen") {
        return { get: jest.fn((key: string, fallback: unknown) => (key === "displayMode" ? "bottomLog" : fallback)) };
      }
      return { get: jest.fn((_key: string, fallback: unknown) => fallback) };
    });

    const panel = AgentScreenPanel.createOrShow({ fsPath: "/ext" } as vscode.Uri);
    const postSpy = jest.spyOn(panel, "postEvent");

    panel.updatePlanProgress("capture-plan", "Screen Capture", 3, 10, "Wire cloud polling");

    expect(postSpy).toHaveBeenCalledWith(expect.objectContaining({
      type: "planProgress",
      planId: "capture-plan",
      planName: "Screen Capture",
      completedCount: 3,
      totalCount: 10,
      currentTodo: "Wire cloud polling",
    }));
  });

  it("formats syncStatus events in bottomLog mode", () => {
    (vscode.workspace.getConfiguration as jest.Mock).mockImplementation((section?: string) => {
      if (section === "cursorDrive.agentScreen") {
        return { get: jest.fn((key: string, fallback: unknown) => (key === "displayMode" ? "bottomLog" : fallback)) };
      }
      return { get: jest.fn((_key: string, fallback: unknown) => fallback) };
    });

    const panel = AgentScreenPanel.createOrShow({ fsPath: "/ext" } as vscode.Uri);
    const channel = (vscode.window.createOutputChannel as jest.Mock).mock.results[0].value;

    panel.postEvent({
      type: "syncStatus",
      syncSnapshot: {
        userBranch: "main",
        userHeadCommit: "abc1234567890",
        operators: [
          { operatorName: "Alpha", syncState: "idle" },
          { operatorName: "Beta", syncState: "conflict" },
        ],
      },
    });

    expect(channel.appendLine).toHaveBeenCalledWith(
      "[Sync] main@abc1234 | Alpha:idle, Beta:conflict"
    );
  });

  it("formats proposalUpdate events in bottomLog mode", () => {
    (vscode.workspace.getConfiguration as jest.Mock).mockImplementation((section?: string) => {
      if (section === "cursorDrive.agentScreen") {
        return { get: jest.fn((key: string, fallback: unknown) => (key === "displayMode" ? "bottomLog" : fallback)) };
      }
      return { get: jest.fn((_key: string, fallback: unknown) => fallback) };
    });

    const panel = AgentScreenPanel.createOrShow({ fsPath: "/ext" } as vscode.Uri);
    const channel = (vscode.window.createOutputChannel as jest.Mock).mock.results[0].value;

    panel.postProposalUpdate("p-1", "approved", "Alpha");

    expect(channel.appendLine).toHaveBeenCalledWith(
      "[Sync/Proposal] Proposal p-1 → approved (Alpha)"
    );
  });

  it("formats queueStatus events in bottomLog mode", () => {
    (vscode.workspace.getConfiguration as jest.Mock).mockImplementation((section?: string) => {
      if (section === "cursorDrive.agentScreen") {
        return { get: jest.fn((key: string, fallback: unknown) => (key === "displayMode" ? "bottomLog" : fallback)) };
      }
      return { get: jest.fn((_key: string, fallback: unknown) => fallback) };
    });

    const panel = AgentScreenPanel.createOrShow({ fsPath: "/ext" } as vscode.Uri);
    const channel = (vscode.window.createOutputChannel as jest.Mock).mock.results[0].value;

    panel.postQueueStatus("p-1", 2);
    panel.postQueueStatus(null, 0);

    expect(channel.appendLine).toHaveBeenCalledWith("[Sync/Queue] Processing: p-1, 2 pending");
    expect(channel.appendLine).toHaveBeenCalledWith("[Sync/Queue] Idle, 0 pending");
  });

  it("postSyncStatus emits syncStatus event", () => {
    (vscode.workspace.getConfiguration as jest.Mock).mockImplementation((section?: string) => {
      if (section === "cursorDrive.agentScreen") {
        return { get: jest.fn((key: string, fallback: unknown) => (key === "displayMode" ? "bottomLog" : fallback)) };
      }
      return { get: jest.fn((_key: string, fallback: unknown) => fallback) };
    });

    const panel = AgentScreenPanel.createOrShow({ fsPath: "/ext" } as vscode.Uri);
    const postSpy = jest.spyOn(panel, "postEvent");

    panel.postSyncStatus({ userBranch: "main", operators: [] });

    expect(postSpy).toHaveBeenCalledWith(expect.objectContaining({
      type: "syncStatus",
      syncSnapshot: { userBranch: "main", operators: [] },
    }));
  });

  it("switchAgent updates webview title in tab mode", async () => {
    (vscode.workspace.getConfiguration as jest.Mock).mockImplementation((section?: string) => {
      if (section === "cursorDrive.agentScreen") {
        return { get: jest.fn((key: string, fallback: unknown) => (key === "displayMode" ? "tab" : fallback)) };
      }
      return { get: jest.fn((_key: string, fallback: unknown) => fallback) };
    });

    const panel = AgentScreenPanel.createOrShow({ fsPath: "/ext" } as vscode.Uri);
    const webviewPanel = (vscode.window.createWebviewPanel as jest.Mock).mock.results[0].value;

    const receiveListener = (webviewPanel.webview.onDidReceiveMessage as jest.Mock).mock.calls[0]?.[0];
    expect(receiveListener).toBeDefined();
    receiveListener({ type: "webviewReady" });
    await flushAsyncTicks();
    panel.switchAgent("Beta");
    await flushAsyncTicks();

    expect(webviewPanel.title).toBe("Beta — Agent Screen");
    expect(webviewPanel.webview.postMessage).toHaveBeenCalledWith(expect.objectContaining({
      type: "agentSwitch",
      operatorName: "Beta",
    }));
  });

  it("logActivity posts activity event via postMessage in tab mode", async () => {
    (vscode.workspace.getConfiguration as jest.Mock).mockImplementation((section?: string) => {
      if (section === "cursorDrive.agentScreen") {
        return { get: jest.fn((key: string, fallback: unknown) => (key === "displayMode" ? "tab" : fallback)) };
      }
      return { get: jest.fn((_key: string, fallback: unknown) => fallback) };
    });

    const panel = AgentScreenPanel.createOrShow({ fsPath: "/ext" } as vscode.Uri);
    const webviewPanel = (vscode.window.createWebviewPanel as jest.Mock).mock.results[0].value;

    const receiveListener = (webviewPanel.webview.onDidReceiveMessage as jest.Mock).mock.calls[0]?.[0];
    expect(receiveListener).toBeDefined();
    receiveListener({ type: "webviewReady" });
    await flushAsyncTicks();
    panel.logActivity("Alpha", "Investigating auth module");
    await flushAsyncTicks();

    expect(webviewPanel.webview.postMessage).toHaveBeenCalledWith(expect.objectContaining({
      type: "activity",
      operatorName: "Alpha",
      text: "Investigating auth module",
    }));
  });

  it("logFile posts file event via postMessage in tab mode", async () => {
    (vscode.workspace.getConfiguration as jest.Mock).mockImplementation((section?: string) => {
      if (section === "cursorDrive.agentScreen") {
        return { get: jest.fn((key: string, fallback: unknown) => (key === "displayMode" ? "tab" : fallback)) };
      }
      return { get: jest.fn((_key: string, fallback: unknown) => fallback) };
    });

    const panel = AgentScreenPanel.createOrShow({ fsPath: "/ext" } as vscode.Uri);
    const webviewPanel = (vscode.window.createWebviewPanel as jest.Mock).mock.results[0].value;

    const receiveListener = (webviewPanel.webview.onDidReceiveMessage as jest.Mock).mock.calls[0]?.[0];
    expect(receiveListener).toBeDefined();
    receiveListener({ type: "webviewReady" });
    await flushAsyncTicks();
    panel.logFile("Alpha", "src/auth.ts");
    await flushAsyncTicks();

    expect(webviewPanel.webview.postMessage).toHaveBeenCalledWith(expect.objectContaining({
      type: "file",
      operatorName: "Alpha",
      filePath: "src/auth.ts",
    }));
  });

  it("logDecision posts decision event via postMessage in tab mode", async () => {
    (vscode.workspace.getConfiguration as jest.Mock).mockImplementation((section?: string) => {
      if (section === "cursorDrive.agentScreen") {
        return { get: jest.fn((key: string, fallback: unknown) => (key === "displayMode" ? "tab" : fallback)) };
      }
      return { get: jest.fn((_key: string, fallback: unknown) => fallback) };
    });

    const panel = AgentScreenPanel.createOrShow({ fsPath: "/ext" } as vscode.Uri);
    const webviewPanel = (vscode.window.createWebviewPanel as jest.Mock).mock.results[0].value;

    const receiveListener = (webviewPanel.webview.onDidReceiveMessage as jest.Mock).mock.calls[0]?.[0];
    expect(receiveListener).toBeDefined();
    receiveListener({ type: "webviewReady" });
    await flushAsyncTicks();
    panel.logDecision("Alpha", "Chose token bucket over leaky bucket");
    await flushAsyncTicks();

    expect(webviewPanel.webview.postMessage).toHaveBeenCalledWith(expect.objectContaining({
      type: "decision",
      operatorName: "Alpha",
      text: "Chose token bucket over leaky bucket",
    }));
  });

  it("clear posts clear event via postMessage in tab mode", async () => {
    (vscode.workspace.getConfiguration as jest.Mock).mockImplementation((section?: string) => {
      if (section === "cursorDrive.agentScreen") {
        return { get: jest.fn((key: string, fallback: unknown) => (key === "displayMode" ? "tab" : fallback)) };
      }
      return { get: jest.fn((_key: string, fallback: unknown) => fallback) };
    });

    const panel = AgentScreenPanel.createOrShow({ fsPath: "/ext" } as vscode.Uri);
    const webviewPanel = (vscode.window.createWebviewPanel as jest.Mock).mock.results[0].value;

    const receiveListener = (webviewPanel.webview.onDidReceiveMessage as jest.Mock).mock.calls[0]?.[0];
    expect(receiveListener).toBeDefined();
    receiveListener({ type: "webviewReady" });
    await flushAsyncTicks();
    panel.clear();
    await flushAsyncTicks();

    expect(webviewPanel.webview.postMessage).toHaveBeenCalledWith(expect.objectContaining({
      type: "clear",
    }));
  });

  it("setDriveActive posts driveState message in tab mode", () => {
    (vscode.workspace.getConfiguration as jest.Mock).mockImplementation((section?: string) => {
      if (section === "cursorDrive.agentScreen") {
        return { get: jest.fn((key: string, fallback: unknown) => (key === "displayMode" ? "tab" : fallback)) };
      }
      return { get: jest.fn((_key: string, fallback: unknown) => fallback) };
    });

    const panel = AgentScreenPanel.createOrShow({ fsPath: "/ext" } as vscode.Uri);
    const webviewPanel = (vscode.window.createWebviewPanel as jest.Mock).mock.results[0].value;

    panel.setDriveActive(true);

    expect(webviewPanel.webview.postMessage).toHaveBeenCalledWith(expect.objectContaining({
      type: "driveState",
      active: true,
    }));
  });

  it("setDriveActive(false) posts driveState with active=false", () => {
    (vscode.workspace.getConfiguration as jest.Mock).mockImplementation((section?: string) => {
      if (section === "cursorDrive.agentScreen") {
        return { get: jest.fn((key: string, fallback: unknown) => (key === "displayMode" ? "tab" : fallback)) };
      }
      return { get: jest.fn((_key: string, fallback: unknown) => fallback) };
    });

    const panel = AgentScreenPanel.createOrShow({ fsPath: "/ext" } as vscode.Uri);
    const webviewPanel = (vscode.window.createWebviewPanel as jest.Mock).mock.results[0].value;

    panel.setDriveActive(false);

    expect(webviewPanel.webview.postMessage).toHaveBeenCalledWith(expect.objectContaining({
      type: "driveState",
      active: false,
    }));
  });

  it("postSyncStatus posts syncStatus event", async () => {
    (vscode.workspace.getConfiguration as jest.Mock).mockImplementation((section?: string) => {
      if (section === "cursorDrive.agentScreen") {
        return { get: jest.fn((key: string, fallback: unknown) => (key === "displayMode" ? "tab" : fallback)) };
      }
      return { get: jest.fn((_key: string, fallback: unknown) => fallback) };
    });

    const panel = AgentScreenPanel.createOrShow({ fsPath: "/ext" } as vscode.Uri);
    const webviewPanel = (vscode.window.createWebviewPanel as jest.Mock).mock.results[0].value;

    const snapshot = { userBranch: "main", userHeadCommit: "abc123", operators: [] };
    const receiveListener = (webviewPanel.webview.onDidReceiveMessage as jest.Mock).mock.calls[0]?.[0];
    expect(receiveListener).toBeDefined();
    receiveListener({ type: "webviewReady" });
    await flushAsyncTicks();
    panel.postSyncStatus(snapshot);
    await flushAsyncTicks();

    expect(webviewPanel.webview.postMessage).toHaveBeenCalledWith(expect.objectContaining({
      type: "syncStatus",
      syncSnapshot: snapshot,
    }));
  });

  it("postProposalUpdate posts proposalUpdate event", async () => {
    (vscode.workspace.getConfiguration as jest.Mock).mockImplementation((section?: string) => {
      if (section === "cursorDrive.agentScreen") {
        return { get: jest.fn((key: string, fallback: unknown) => (key === "displayMode" ? "tab" : fallback)) };
      }
      return { get: jest.fn((_key: string, fallback: unknown) => fallback) };
    });

    const panel = AgentScreenPanel.createOrShow({ fsPath: "/ext" } as vscode.Uri);
    const webviewPanel = (vscode.window.createWebviewPanel as jest.Mock).mock.results[0].value;

    const receiveListener = (webviewPanel.webview.onDidReceiveMessage as jest.Mock).mock.calls[0]?.[0];
    expect(receiveListener).toBeDefined();
    receiveListener({ type: "webviewReady" });
    await flushAsyncTicks();
    panel.postProposalUpdate("proposal-1", "approved", "Alpha");
    await flushAsyncTicks();

    expect(webviewPanel.webview.postMessage).toHaveBeenCalledWith(expect.objectContaining({
      type: "proposalUpdate",
      text: expect.stringContaining("proposal-1"),
    }));
  });

  it("postQueueStatus posts queueStatus event", async () => {
    (vscode.workspace.getConfiguration as jest.Mock).mockImplementation((section?: string) => {
      if (section === "cursorDrive.agentScreen") {
        return { get: jest.fn((key: string, fallback: unknown) => (key === "displayMode" ? "tab" : fallback)) };
      }
      return { get: jest.fn((_key: string, fallback: unknown) => fallback) };
    });

    const panel = AgentScreenPanel.createOrShow({ fsPath: "/ext" } as vscode.Uri);
    const webviewPanel = (vscode.window.createWebviewPanel as jest.Mock).mock.results[0].value;

    const receiveListener = (webviewPanel.webview.onDidReceiveMessage as jest.Mock).mock.calls[0]?.[0];
    expect(receiveListener).toBeDefined();
    receiveListener({ type: "webviewReady" });
    await flushAsyncTicks();
    panel.postQueueStatus("proposal-1", 3);
    await flushAsyncTicks();

    expect(webviewPanel.webview.postMessage).toHaveBeenCalledWith(expect.objectContaining({
      type: "queueStatus",
      text: expect.stringContaining("Processing"),
    }));
  });

  it("postQueueStatus shows idle when not processing", async () => {
    (vscode.workspace.getConfiguration as jest.Mock).mockImplementation((section?: string) => {
      if (section === "cursorDrive.agentScreen") {
        return { get: jest.fn((key: string, fallback: unknown) => (key === "displayMode" ? "tab" : fallback)) };
      }
      return { get: jest.fn((_key: string, fallback: unknown) => fallback) };
    });

    const panel = AgentScreenPanel.createOrShow({ fsPath: "/ext" } as vscode.Uri);
    const webviewPanel = (vscode.window.createWebviewPanel as jest.Mock).mock.results[0].value;

    const receiveListener = (webviewPanel.webview.onDidReceiveMessage as jest.Mock).mock.calls[0]?.[0];
    expect(receiveListener).toBeDefined();
    receiveListener({ type: "webviewReady" });
    await flushAsyncTicks();
    panel.postQueueStatus(null, 0);
    await flushAsyncTicks();

    expect(webviewPanel.webview.postMessage).toHaveBeenCalledWith(expect.objectContaining({
      type: "queueStatus",
      text: expect.stringContaining("Idle"),
    }));
  });

  it("playChime posts chime message with count in tab mode", () => {
    (vscode.workspace.getConfiguration as jest.Mock).mockImplementation((section?: string) => {
      if (section === "cursorDrive.agentScreen") {
        return { get: jest.fn((key: string, fallback: unknown) => (key === "displayMode" ? "tab" : fallback)) };
      }
      return { get: jest.fn((_key: string, fallback: unknown) => fallback) };
    });

    const panel = AgentScreenPanel.createOrShow({ fsPath: "/ext" } as vscode.Uri);
    const webviewPanel = (vscode.window.createWebviewPanel as jest.Mock).mock.results[0].value;

    panel.playChime(1);

    expect(webviewPanel.webview.postMessage).toHaveBeenCalledWith(expect.objectContaining({
      type: "chime",
      count: 1,
    }));
  });

  it("playChime with count 2 posts correct count", () => {
    (vscode.workspace.getConfiguration as jest.Mock).mockImplementation((section?: string) => {
      if (section === "cursorDrive.agentScreen") {
        return { get: jest.fn((key: string, fallback: unknown) => (key === "displayMode" ? "tab" : fallback)) };
      }
      return { get: jest.fn((_key: string, fallback: unknown) => fallback) };
    });

    const panel = AgentScreenPanel.createOrShow({ fsPath: "/ext" } as vscode.Uri);
    const webviewPanel = (vscode.window.createWebviewPanel as jest.Mock).mock.results[0].value;

    panel.playChime(2);

    expect(webviewPanel.webview.postMessage).toHaveBeenCalledWith(expect.objectContaining({
      type: "chime",
      count: 2,
    }));
  });

  it("getInstance returns singleton after createOrShow", () => {
    (vscode.workspace.getConfiguration as jest.Mock).mockImplementation((section?: string) => {
      if (section === "cursorDrive.agentScreen") {
        return { get: jest.fn((key: string, fallback: unknown) => (key === "displayMode" ? "tab" : fallback)) };
      }
      return { get: jest.fn((_key: string, fallback: unknown) => fallback) };
    });

    const panel = AgentScreenPanel.createOrShow({ fsPath: "/ext" } as vscode.Uri);
    expect(AgentScreenPanel.getInstance()).toBe(panel);
  });

  it("webview HTML includes data-testid attributes for key elements", () => {
    (vscode.workspace.getConfiguration as jest.Mock).mockImplementation((section?: string) => {
      if (section === "cursorDrive.agentScreen") {
        return { get: jest.fn((key: string, fallback: unknown) => (key === "displayMode" ? "tab" : fallback)) };
      }
      return { get: jest.fn((_key: string, fallback: unknown) => fallback) };
    });

    AgentScreenPanel.createOrShow({ fsPath: "/ext" } as vscode.Uri);
    const webviewPanel = (vscode.window.createWebviewPanel as jest.Mock).mock.results[0].value;
    const html = webviewPanel.webview.html as string;

    expect(html).toContain('data-testid="agent-screen-title"');
    expect(html).toContain('data-testid="operator-badge"');
    expect(html).toContain('data-testid="tab-activity"');
    expect(html).toContain('data-testid="tab-files"');
    expect(html).toContain('data-testid="tab-decisions"');
    expect(html).toContain('data-testid="tab-sync"');
    expect(html).toContain('data-testid="tab-artifacts"');
    expect(html).toContain('data-testid="panel-artifacts"');
    expect(html).toContain('data-testid="panel-activity"');
    expect(html).toContain('data-testid="panel-files"');
    expect(html).toContain('data-testid="panel-decisions"');
    expect(html).toContain('data-testid="panel-sync"');
  });

  it("webview HTML includes ARIA accessibility attributes", () => {
    (vscode.workspace.getConfiguration as jest.Mock).mockImplementation((section?: string) => {
      if (section === "cursorDrive.agentScreen") {
        return { get: jest.fn((key: string, fallback: unknown) => (key === "displayMode" ? "tab" : fallback)) };
      }
      return { get: jest.fn((_key: string, fallback: unknown) => fallback) };
    });

    AgentScreenPanel.createOrShow({ fsPath: "/ext" } as vscode.Uri);
    const webviewPanel = (vscode.window.createWebviewPanel as jest.Mock).mock.results[0].value;
    const html = webviewPanel.webview.html as string;

    expect(html).toContain('role="tablist"');
    expect(html).toContain('role="tab"');
    expect(html).toContain('role="tabpanel"');
    expect(html).toContain('aria-label="Agent Screen tabs"');
    expect(html).toContain('aria-label="Activity tab"');
    expect(html).toContain('aria-label="Activity panel"');
    expect(html).toContain('aria-selected="true"');
  });

  it("sync events write to output channel in bottomLog mode", () => {
    (vscode.workspace.getConfiguration as jest.Mock).mockImplementation((section?: string) => {
      if (section === "cursorDrive.agentScreen") {
        return { get: jest.fn((key: string, fallback: unknown) => (key === "displayMode" ? "bottomLog" : fallback)) };
      }
      return { get: jest.fn((_key: string, fallback: unknown) => fallback) };
    });

    const panel = AgentScreenPanel.createOrShow({ fsPath: "/ext" } as vscode.Uri);
    const channel = (vscode.window.createOutputChannel as jest.Mock).mock.results[0].value;

    panel.postSyncStatus({
      userBranch: "main",
      userHeadCommit: "abc1234567890",
      operators: [{ operatorName: "Alpha", syncState: "idle" }],
    });

    expect(channel.appendLine).toHaveBeenCalledWith(
      expect.stringContaining("[Sync]")
    );
  });

  it("cloudAgentArtifact event writes to output channel in bottomLog mode", () => {
    (vscode.workspace.getConfiguration as jest.Mock).mockImplementation((section?: string) => {
      if (section === "cursorDrive.agentScreen") {
        return { get: jest.fn((key: string, fallback: unknown) => (key === "displayMode" ? "bottomLog" : fallback)) };
      }
      return { get: jest.fn((_key: string, fallback: unknown) => fallback) };
    });

    const panel = AgentScreenPanel.createOrShow({ fsPath: "/ext" } as vscode.Uri);
    const channel = (vscode.window.createOutputChannel as jest.Mock).mock.results[0].value;

    panel.postEvent({
      type: "cloudAgentArtifact",
      artifactType: "screenshot",
      artifactUrl: "https://example.com/screenshot.png",
      artifactLabel: "screenshot.png",
      timestamp: Date.now(),
    });

    expect(channel.appendLine).toHaveBeenCalledWith(
      expect.stringContaining("[CloudAgent Artifact]")
    );
    expect(channel.appendLine).toHaveBeenCalledWith(
      expect.stringContaining("screenshot")
    );
  });

  it("queues while hidden when not ready, then flushes after ready+visible", async () => {
    (vscode.workspace.getConfiguration as jest.Mock).mockImplementation((section?: string) => {
      if (section === "cursorDrive.agentScreen") {
        return { get: jest.fn((key: string, fallback: unknown) => (key === "displayMode" ? "tab" : fallback)) };
      }
      return { get: jest.fn((_key: string, fallback: unknown) => fallback) };
    });

    const panel = AgentScreenPanel.createOrShow({ fsPath: "/ext" } as vscode.Uri);
    const webviewPanel = (vscode.window.createWebviewPanel as jest.Mock).mock.results[0].value;
    webviewPanel.visible = false;

    panel.postEvent({ type: "activity", operatorName: "Alpha", text: "Queued" });
    await flushAsyncTicks();
    expect(webviewPanel.webview.postMessage).not.toHaveBeenCalled();
    const receiveListener = (webviewPanel.webview.onDidReceiveMessage as jest.Mock).mock.calls[0]?.[0];
    expect(receiveListener).toBeDefined();
    receiveListener({ type: "webviewReady" });
    webviewPanel.visible = true;
    const viewStateListener = (vscode.window.createWebviewPanel as jest.Mock).mock.results[0].value.onDidChangeViewState as jest.Mock;
    const listener = viewStateListener.mock.calls[0]?.[0];
    listener({ webviewPanel });
    await flushAsyncTicks();
    expect(webviewPanel.webview.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: "activity", text: "Queued" })
    );
  });

  it("flushes queued events when panel becomes visible (replayStart, events, replayEnd)", async () => {
    (vscode.workspace.getConfiguration as jest.Mock).mockImplementation((section?: string) => {
      if (section === "cursorDrive.agentScreen") {
        return { get: jest.fn((key: string, fallback: unknown) => (key === "displayMode" ? "tab" : fallback)) };
      }
      return { get: jest.fn((_key: string, fallback: unknown) => fallback) };
    });

    const panel = AgentScreenPanel.createOrShow({ fsPath: "/ext" } as vscode.Uri);
    const webviewPanel = (vscode.window.createWebviewPanel as jest.Mock).mock.results[0].value;
    const postMessageMock = webviewPanel.webview.postMessage as jest.Mock;
    const receiveListener = (webviewPanel.webview.onDidReceiveMessage as jest.Mock).mock.calls[0]?.[0];
    expect(receiveListener).toBeDefined();
    receiveListener({ type: "webviewReady" });
    await flushAsyncTicks();
    webviewPanel.visible = false;
    // Hidden panel alone should not block delivery; simulate undelivered post to queue.
    postMessageMock.mockResolvedValue(false);

    panel.postEvent({ type: "activity", operatorName: "Alpha", text: "Queued" });
    await flushAsyncTicks();
    expect(webviewPanel.webview.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: "activity", text: "Queued" })
    );

    const viewStateListener = (vscode.window.createWebviewPanel as jest.Mock).mock.results[0].value.onDidChangeViewState as jest.Mock;
    const listener = viewStateListener.mock.calls[0]?.[0];
    expect(listener).toBeDefined();

    postMessageMock.mockResolvedValue(true);
    webviewPanel.visible = true;
    listener({ webviewPanel });
    await flushAsyncTicks();

    expect(webviewPanel.webview.postMessage).toHaveBeenCalledWith(expect.objectContaining({ type: "replayStart", count: 1 }));
    expect(webviewPanel.webview.postMessage).toHaveBeenCalledWith(expect.objectContaining({ type: "activity", text: "Queued" }));
    expect(webviewPanel.webview.postMessage).toHaveBeenCalledWith(expect.objectContaining({ type: "replayEnd" }));
  });

  it("replays events after webviewReady when initial postMessage is not delivered", async () => {
    (vscode.workspace.getConfiguration as jest.Mock).mockImplementation((section?: string) => {
      if (section === "cursorDrive.agentScreen") {
        return { get: jest.fn((key: string, fallback: unknown) => (key === "displayMode" ? "tab" : fallback)) };
      }
      return { get: jest.fn((_key: string, fallback: unknown) => fallback) };
    });

    const panel = AgentScreenPanel.createOrShow({ fsPath: "/ext" } as vscode.Uri);
    const webviewPanel = (vscode.window.createWebviewPanel as jest.Mock).mock.results[0].value;
    const postMessageMock = webviewPanel.webview.postMessage as jest.Mock;

    // Simulate webview ready but transport undelivered: first post attempts return false.
    const receiveListener = (webviewPanel.webview.onDidReceiveMessage as jest.Mock).mock.calls[0]?.[0];
    expect(receiveListener).toBeDefined();
    receiveListener({ type: "webviewReady" });
    await flushAsyncTicks();

    let delivered = false;
    postMessageMock.mockImplementation(() => Promise.resolve(delivered));

    panel.postEvent({ type: "activity", operatorName: "Alpha", text: "Queued until ready" });
    await flushAsyncTicks();

    const attemptedBeforeReady = postMessageMock.mock.calls.filter(
      (c: unknown[]) => (c[0] as { type?: string })?.type === "activity"
    ).length;
    expect(attemptedBeforeReady).toBe(1);
    delivered = true;
    receiveListener({ type: "webviewReady" });
    await flushAsyncTicks();

    const deliveredAfterReady = postMessageMock.mock.calls.filter(
      (c: unknown[]) => (c[0] as { type?: string })?.type === "activity"
    ).length;
    expect(deliveredAfterReady).toBeGreaterThan(1);
  });

  it("queues events before webviewReady and flushes on readiness", async () => {
    (vscode.workspace.getConfiguration as jest.Mock).mockImplementation((section?: string) => {
      if (section === "cursorDrive.agentScreen") {
        return { get: jest.fn((key: string, fallback: unknown) => (key === "displayMode" ? "tab" : fallback)) };
      }
      return { get: jest.fn((_key: string, fallback: unknown) => fallback) };
    });

    const panel = AgentScreenPanel.createOrShow({ fsPath: "/ext" } as vscode.Uri);
    const webviewPanel = (vscode.window.createWebviewPanel as jest.Mock).mock.results[0].value;
    const postMessageMock = webviewPanel.webview.postMessage as jest.Mock;

    // Not ready yet; nothing should be posted.
    panel.postEvent({ type: "activity", operatorName: "Alpha", text: "Before ready" });
    await flushAsyncTicks();
    expect(postMessageMock).not.toHaveBeenCalled();

    const receiveListener = (webviewPanel.webview.onDidReceiveMessage as jest.Mock).mock.calls[0]?.[0];
    expect(receiveListener).toBeDefined();
    receiveListener({ type: "webviewReady" });
    await flushAsyncTicks();

    expect(postMessageMock).toHaveBeenCalledWith(expect.objectContaining({ type: "replayStart", count: 1 }));
    expect(postMessageMock).toHaveBeenCalledWith(expect.objectContaining({ type: "activity", text: "Before ready" }));
    expect(postMessageMock).toHaveBeenCalledWith(expect.objectContaining({ type: "replayEnd" }));
  });

  it("caps queue at MAX_QUEUE when panel hidden", async () => {
    (vscode.workspace.getConfiguration as jest.Mock).mockImplementation((section?: string) => {
      if (section === "cursorDrive.agentScreen") {
        return { get: jest.fn((key: string, fallback: unknown) => (key === "displayMode" ? "tab" : fallback)) };
      }
      return { get: jest.fn((_key: string, fallback: unknown) => fallback) };
    });

    const panel = AgentScreenPanel.createOrShow({ fsPath: "/ext" } as vscode.Uri);
    const webviewPanel = (vscode.window.createWebviewPanel as jest.Mock).mock.results[0].value;
    const postMessageMock = webviewPanel.webview.postMessage as jest.Mock;
    webviewPanel.visible = false;
    postMessageMock.mockResolvedValue(false);

    const MAX_QUEUE = 200;
    for (let i = 0; i < MAX_QUEUE + 50; i++) {
      panel.postEvent({ type: "activity", operatorName: "Alpha", text: `Event ${i}` });
    }
    await flushAsyncTicks();

    const viewStateListener = (vscode.window.createWebviewPanel as jest.Mock).mock.results[0].value.onDidChangeViewState as jest.Mock;
    const listener = viewStateListener.mock.calls[0]?.[0];
    postMessageMock.mockResolvedValue(true);
    webviewPanel.visible = true;
    listener({ webviewPanel });
    await flushAsyncTicks();

    const replayStartCall = (webviewPanel.webview.postMessage as jest.Mock).mock.calls.find(
      (c: unknown[]) => c[0]?.type === "replayStart"
    );
    expect(replayStartCall).toBeDefined();
    expect(replayStartCall[0].count).toBe(MAX_QUEUE);
  });

  it("syncStatus message updates sync-user and sync-operators in HTML", async () => {
    (vscode.workspace.getConfiguration as jest.Mock).mockImplementation((section?: string) => {
      if (section === "cursorDrive.agentScreen") {
        return { get: jest.fn((key: string, fallback: unknown) => (key === "displayMode" ? "tab" : fallback)) };
      }
      return { get: jest.fn((_key: string, fallback: unknown) => fallback) };
    });

    const panel = AgentScreenPanel.createOrShow({ fsPath: "/ext" } as vscode.Uri);
    const webviewPanel = (vscode.window.createWebviewPanel as jest.Mock).mock.results[0].value;

    const receiveListener = (webviewPanel.webview.onDidReceiveMessage as jest.Mock).mock.calls[0]?.[0];
    expect(receiveListener).toBeDefined();
    receiveListener({ type: "webviewReady" });
    await flushAsyncTicks();
    panel.postSyncStatus({
      userBranch: "main",
      userHeadCommit: "abc1234",
      operators: [{ operatorName: "Alpha", syncState: "idle", headCommit: "def" }],
      proposals: [],
      timestamp: Date.now(),
    });
    await flushAsyncTicks();

    expect(webviewPanel.webview.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "syncStatus",
        syncSnapshot: expect.objectContaining({ userBranch: "main", operators: expect.any(Array) }),
      })
    );
  });

  it("queueStatus message triggers postMessage with queue text", async () => {
    (vscode.workspace.getConfiguration as jest.Mock).mockImplementation((section?: string) => {
      if (section === "cursorDrive.agentScreen") {
        return { get: jest.fn((key: string, fallback: unknown) => (key === "displayMode" ? "tab" : fallback)) };
      }
      return { get: jest.fn((_key: string, fallback: unknown) => fallback) };
    });

    const panel = AgentScreenPanel.createOrShow({ fsPath: "/ext" } as vscode.Uri);
    const webviewPanel = (vscode.window.createWebviewPanel as jest.Mock).mock.results[0].value;

    const receiveListener = (webviewPanel.webview.onDidReceiveMessage as jest.Mock).mock.calls[0]?.[0];
    expect(receiveListener).toBeDefined();
    receiveListener({ type: "webviewReady" });
    await flushAsyncTicks();
    panel.postQueueStatus("p-1", 2);
    await flushAsyncTicks();

    expect(webviewPanel.webview.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "queueStatus",
        text: expect.stringContaining("Processing"),
      })
    );
  });

  it("cursorDrive.debug.sendTestEvent command is registered in package.json", () => {
    const pkgPath = path.join(__dirname, "..", "package.json");
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
    const commands = (pkg.contributes?.commands ?? []) as Array<{ command: string }>;
    const found = commands.some((c) => c.command === "cursorDrive.debug.sendTestEvent");
    expect(found).toBe(true);
  });

  it("webview HTML includes replay-banner data-testid", () => {
    (vscode.workspace.getConfiguration as jest.Mock).mockImplementation((section?: string) => {
      if (section === "cursorDrive.agentScreen") {
        return { get: jest.fn((key: string, fallback: unknown) => (key === "displayMode" ? "tab" : fallback)) };
      }
      return { get: jest.fn((_key: string, fallback: unknown) => fallback) };
    });

    AgentScreenPanel.createOrShow({ fsPath: "/ext" } as vscode.Uri);
    const webviewPanel = (vscode.window.createWebviewPanel as jest.Mock).mock.results[0].value;
    const html = webviewPanel.webview.html as string;

    expect(html).toContain('data-testid="replay-banner"');
    expect(html).toContain('id="sync-user"');
    expect(html).toContain('id="sync-operators"');
    expect(html).toContain('id="sync-proposals"');
    expect(html).toContain('id="sync-queue"');
  });

  it("webview HTML includes polished visual styling rules", () => {
    (vscode.workspace.getConfiguration as jest.Mock).mockImplementation((section?: string) => {
      if (section === "cursorDrive.agentScreen") {
        return { get: jest.fn((key: string, fallback: unknown) => (key === "displayMode" ? "tab" : fallback)) };
      }
      return { get: jest.fn((_key: string, fallback: unknown) => fallback) };
    });

    AgentScreenPanel.createOrShow({ fsPath: "/ext" } as vscode.Uri);
    const webviewPanel = (vscode.window.createWebviewPanel as jest.Mock).mock.results[0].value;
    const html = webviewPanel.webview.html as string;

    expect(html).toContain("radial-gradient");
    expect(html).toContain("backdrop-filter");
    expect(html).toContain("transition: color 0.15s ease, background 0.15s ease, border-bottom-color 0.15s ease");
  });

  it("webview HTML includes Artifacts tab and panel", () => {
    (vscode.workspace.getConfiguration as jest.Mock).mockImplementation((section?: string) => {
      if (section === "cursorDrive.agentScreen") {
        return { get: jest.fn((key: string, fallback: unknown) => (key === "displayMode" ? "tab" : fallback)) };
      }
      return { get: jest.fn((_key: string, fallback: unknown) => fallback) };
    });

    AgentScreenPanel.createOrShow({ fsPath: "/ext" } as vscode.Uri);
    const webviewPanel = (vscode.window.createWebviewPanel as jest.Mock).mock.results[0].value;
    const html = webviewPanel.webview.html as string;

    expect(html).toContain('data-testid="tab-artifacts"');
    expect(html).toContain('data-testid="panel-artifacts"');
    expect(html).toContain("No Cloud Agent artifacts yet");
    expect(html).toContain("img-src");
    expect(html).toContain("media-src");
  });
});
