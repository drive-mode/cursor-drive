import * as vscode from "vscode";
import { AgentScreenPanel } from "../src/agentScreen";

function resetAgentScreenSingleton(): void {
  (AgentScreenPanel as unknown as { instance?: AgentScreenPanel }).instance = undefined;
}

describe("AgentScreenPanel", () => {
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

  it("switchAgent updates webview title in tab mode", () => {
    (vscode.workspace.getConfiguration as jest.Mock).mockImplementation((section?: string) => {
      if (section === "cursorDrive.agentScreen") {
        return { get: jest.fn((key: string, fallback: unknown) => (key === "displayMode" ? "tab" : fallback)) };
      }
      return { get: jest.fn((_key: string, fallback: unknown) => fallback) };
    });

    const panel = AgentScreenPanel.createOrShow({ fsPath: "/ext" } as vscode.Uri);
    const webviewPanel = (vscode.window.createWebviewPanel as jest.Mock).mock.results[0].value;

    panel.switchAgent("Beta");

    expect(webviewPanel.title).toBe("Beta — Agent Screen");
    expect(webviewPanel.webview.postMessage).toHaveBeenCalledWith(expect.objectContaining({
      type: "agentSwitch",
      operatorName: "Beta",
    }));
  });

  it("logActivity posts activity event via postMessage in tab mode", () => {
    (vscode.workspace.getConfiguration as jest.Mock).mockImplementation((section?: string) => {
      if (section === "cursorDrive.agentScreen") {
        return { get: jest.fn((key: string, fallback: unknown) => (key === "displayMode" ? "tab" : fallback)) };
      }
      return { get: jest.fn((_key: string, fallback: unknown) => fallback) };
    });

    const panel = AgentScreenPanel.createOrShow({ fsPath: "/ext" } as vscode.Uri);
    const webviewPanel = (vscode.window.createWebviewPanel as jest.Mock).mock.results[0].value;

    panel.logActivity("Alpha", "Investigating auth module");

    expect(webviewPanel.webview.postMessage).toHaveBeenCalledWith(expect.objectContaining({
      type: "activity",
      operatorName: "Alpha",
      text: "Investigating auth module",
    }));
  });

  it("logFile posts file event via postMessage in tab mode", () => {
    (vscode.workspace.getConfiguration as jest.Mock).mockImplementation((section?: string) => {
      if (section === "cursorDrive.agentScreen") {
        return { get: jest.fn((key: string, fallback: unknown) => (key === "displayMode" ? "tab" : fallback)) };
      }
      return { get: jest.fn((_key: string, fallback: unknown) => fallback) };
    });

    const panel = AgentScreenPanel.createOrShow({ fsPath: "/ext" } as vscode.Uri);
    const webviewPanel = (vscode.window.createWebviewPanel as jest.Mock).mock.results[0].value;

    panel.logFile("Alpha", "src/auth.ts");

    expect(webviewPanel.webview.postMessage).toHaveBeenCalledWith(expect.objectContaining({
      type: "file",
      operatorName: "Alpha",
      filePath: "src/auth.ts",
    }));
  });

  it("logDecision posts decision event via postMessage in tab mode", () => {
    (vscode.workspace.getConfiguration as jest.Mock).mockImplementation((section?: string) => {
      if (section === "cursorDrive.agentScreen") {
        return { get: jest.fn((key: string, fallback: unknown) => (key === "displayMode" ? "tab" : fallback)) };
      }
      return { get: jest.fn((_key: string, fallback: unknown) => fallback) };
    });

    const panel = AgentScreenPanel.createOrShow({ fsPath: "/ext" } as vscode.Uri);
    const webviewPanel = (vscode.window.createWebviewPanel as jest.Mock).mock.results[0].value;

    panel.logDecision("Alpha", "Chose token bucket over leaky bucket");

    expect(webviewPanel.webview.postMessage).toHaveBeenCalledWith(expect.objectContaining({
      type: "decision",
      operatorName: "Alpha",
      text: "Chose token bucket over leaky bucket",
    }));
  });

  it("clear posts clear event via postMessage in tab mode", () => {
    (vscode.workspace.getConfiguration as jest.Mock).mockImplementation((section?: string) => {
      if (section === "cursorDrive.agentScreen") {
        return { get: jest.fn((key: string, fallback: unknown) => (key === "displayMode" ? "tab" : fallback)) };
      }
      return { get: jest.fn((_key: string, fallback: unknown) => fallback) };
    });

    const panel = AgentScreenPanel.createOrShow({ fsPath: "/ext" } as vscode.Uri);
    const webviewPanel = (vscode.window.createWebviewPanel as jest.Mock).mock.results[0].value;

    panel.clear();

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

  it("postSyncStatus posts syncStatus event", () => {
    (vscode.workspace.getConfiguration as jest.Mock).mockImplementation((section?: string) => {
      if (section === "cursorDrive.agentScreen") {
        return { get: jest.fn((key: string, fallback: unknown) => (key === "displayMode" ? "tab" : fallback)) };
      }
      return { get: jest.fn((_key: string, fallback: unknown) => fallback) };
    });

    const panel = AgentScreenPanel.createOrShow({ fsPath: "/ext" } as vscode.Uri);
    const webviewPanel = (vscode.window.createWebviewPanel as jest.Mock).mock.results[0].value;

    const snapshot = { userBranch: "main", userHeadCommit: "abc123", operators: [] };
    panel.postSyncStatus(snapshot);

    expect(webviewPanel.webview.postMessage).toHaveBeenCalledWith(expect.objectContaining({
      type: "syncStatus",
      syncSnapshot: snapshot,
    }));
  });

  it("postProposalUpdate posts proposalUpdate event", () => {
    (vscode.workspace.getConfiguration as jest.Mock).mockImplementation((section?: string) => {
      if (section === "cursorDrive.agentScreen") {
        return { get: jest.fn((key: string, fallback: unknown) => (key === "displayMode" ? "tab" : fallback)) };
      }
      return { get: jest.fn((_key: string, fallback: unknown) => fallback) };
    });

    const panel = AgentScreenPanel.createOrShow({ fsPath: "/ext" } as vscode.Uri);
    const webviewPanel = (vscode.window.createWebviewPanel as jest.Mock).mock.results[0].value;

    panel.postProposalUpdate("proposal-1", "approved", "Alpha");

    expect(webviewPanel.webview.postMessage).toHaveBeenCalledWith(expect.objectContaining({
      type: "proposalUpdate",
      text: expect.stringContaining("proposal-1"),
    }));
  });

  it("postQueueStatus posts queueStatus event", () => {
    (vscode.workspace.getConfiguration as jest.Mock).mockImplementation((section?: string) => {
      if (section === "cursorDrive.agentScreen") {
        return { get: jest.fn((key: string, fallback: unknown) => (key === "displayMode" ? "tab" : fallback)) };
      }
      return { get: jest.fn((_key: string, fallback: unknown) => fallback) };
    });

    const panel = AgentScreenPanel.createOrShow({ fsPath: "/ext" } as vscode.Uri);
    const webviewPanel = (vscode.window.createWebviewPanel as jest.Mock).mock.results[0].value;

    panel.postQueueStatus("proposal-1", 3);

    expect(webviewPanel.webview.postMessage).toHaveBeenCalledWith(expect.objectContaining({
      type: "queueStatus",
      text: expect.stringContaining("Processing"),
    }));
  });

  it("postQueueStatus shows idle when not processing", () => {
    (vscode.workspace.getConfiguration as jest.Mock).mockImplementation((section?: string) => {
      if (section === "cursorDrive.agentScreen") {
        return { get: jest.fn((key: string, fallback: unknown) => (key === "displayMode" ? "tab" : fallback)) };
      }
      return { get: jest.fn((_key: string, fallback: unknown) => fallback) };
    });

    const panel = AgentScreenPanel.createOrShow({ fsPath: "/ext" } as vscode.Uri);
    const webviewPanel = (vscode.window.createWebviewPanel as jest.Mock).mock.results[0].value;

    panel.postQueueStatus(null, 0);

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
