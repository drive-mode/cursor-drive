import * as vscode from "vscode";
import * as path from "path";
import { notifyPlaybackEnded } from "./tts.js";
import { agentScreenTemplate } from "./agentScreenTemplate";

export interface ActivityEvent {
  type: "activity" | "file" | "decision" | "agentSwitch" | "clear" | "planProgress" | "cliStream" | "cloudAgentStatus" | "cloudAgentArtifact" | "syncStatus" | "proposalUpdate" | "queueStatus";
  operatorName?: string;
  text?: string;
  filePath?: string;
  timestamp?: number;
  planId?: string;
  planName?: string;
  completedCount?: number;
  totalCount?: number;
  currentTodo?: string;
  cliStreamType?: "assistant" | "tool_call" | "text_delta" | "user" | "error";
  cliToolName?: string;
  cloudAgentId?: string;
  cloudStatus?: string;
  prUrl?: string;
  /** Cloud Agent artifact (for cloudAgentArtifact event). */
  artifactType?: "video" | "screenshot" | "log";
  artifactUrl?: string;
  artifactLabel?: string;
  /** Sync status snapshot data (for syncStatus event). */
  syncSnapshot?: unknown;
  /** Proposal data (for proposalUpdate event). */
  proposalData?: unknown;
  /** Queue state data (for queueStatus event). */
  queueState?: unknown;
}

export class AgentScreenPanel {
  public static readonly viewType = "cursorDrive.agentScreen";
  private static instance: AgentScreenPanel | undefined;

  private readonly panel: vscode.WebviewPanel | undefined;
  private readonly outputChannel: vscode.OutputChannel | undefined;
  private readonly extensionUri: vscode.Uri;
  private disposed = false;
  private _pendingEvents: ActivityEvent[] = [];
  private static readonly MAX_QUEUE = 200;

  private constructor(
    extensionUri: vscode.Uri,
    panel?: vscode.WebviewPanel,
    outputChannel?: vscode.OutputChannel
  ) {
    this.extensionUri = extensionUri;
    this.panel = panel;
    this.outputChannel = outputChannel;

    if (panel) {
      panel.webview.html = this.buildHtml(panel);
      panel.webview.onDidReceiveMessage((msg: { type: string; path?: string; text?: string; planPath?: string; level?: string; msg?: string; src?: string; line?: number; col?: number }) => {
        if (msg.type === "__debug") {
          const ch = this.outputChannel ?? vscode.window.createOutputChannel("Drive Agent Screen");
          const level = msg.level ?? "error";
          const loc = msg.src ? ` (${msg.src}:${msg.line ?? 0}:${msg.col ?? 0})` : "";
          ch.appendLine(`[AgentScreen WebView ${level}] ${msg.msg ?? ""}${loc}`);
          return;
        }
        if (msg.type === "ttsEnded") {
          notifyPlaybackEnded();
          return;
        }
        if (msg.type === "openFile" && msg.path) { void this.openFile(msg.path); }
        else if (msg.type === "askAboutItem" && msg.text) { void this.handleAskAboutItem(msg.text); }
        else if (msg.type === "openPlanTodo" && msg.planPath) { void this.openFile(msg.planPath); }
      });
      panel.onDidChangeViewState((e: { webviewPanel: vscode.WebviewPanel }) => {
        if (e.webviewPanel.visible && this._pendingEvents.length > 0) {
          void this.panel!.webview.postMessage({ type: "replayStart", count: this._pendingEvents.length });
          for (const ev of this._pendingEvents) {
            void this.panel!.webview.postMessage({ ...ev, timestamp: ev.timestamp ?? Date.now() });
          }
          this._pendingEvents.length = 0;
          void this.panel!.webview.postMessage({ type: "replayEnd" });
        }
      });
      vscode.workspace.onDidChangeConfiguration((e: vscode.ConfigurationChangeEvent) => {
        if (e.affectsConfiguration("cursorDrive.agentScreen.showPlanProgress")) {
          const showPlanProgress = vscode.workspace.getConfiguration("cursorDrive.agentScreen").get<boolean>("showPlanProgress", true);
          void this.panel!.webview.postMessage({ type: "config", showPlanProgress });
        }
      });
      panel.onDidDispose(() => {
        this.disposed = true;
        AgentScreenPanel.instance = undefined;
      });
    } else if (outputChannel) {
      outputChannel.show(true);
    }
  }

  static createOrShow(extensionUri: vscode.Uri): AgentScreenPanel {
    const displayMode = vscode.workspace.getConfiguration("cursorDrive.agentScreen").get<string>("displayMode", "tab");

    if (AgentScreenPanel.instance) {
      if (AgentScreenPanel.instance.panel) {
        const column = vscode.window.activeTextEditor
          ? vscode.window.activeTextEditor.viewColumn! + 1
          : vscode.ViewColumn.Two;
        AgentScreenPanel.instance.panel.reveal(column);
      } else if (AgentScreenPanel.instance.outputChannel) {
        AgentScreenPanel.instance.outputChannel.show(true);
      }
      return AgentScreenPanel.instance;
    }

    if (displayMode === "bottomLog") {
      const channel = vscode.window.createOutputChannel("Drive Agent Screen");
      AgentScreenPanel.instance = new AgentScreenPanel(extensionUri, undefined, channel);
    } else {
      const column = vscode.window.activeTextEditor
        ? vscode.window.activeTextEditor.viewColumn! + 1
        : vscode.ViewColumn.Two;
      const panel = vscode.window.createWebviewPanel(
        AgentScreenPanel.viewType,
        "Drive — Agent Screen",
        column,
        { enableScripts: true, retainContextWhenHidden: true, localResourceRoots: [extensionUri] }
      );
      AgentScreenPanel.instance = new AgentScreenPanel(extensionUri, panel);
    }
    return AgentScreenPanel.instance;
  }

  static getInstance(): AgentScreenPanel | undefined {
    return AgentScreenPanel.instance;
  }

  setDriveActive(active: boolean): void {
    if (this.disposed || !this.panel) return;
    void this.panel.webview.postMessage({ type: "driveState", active });
  }

  postEvent(event: ActivityEvent): void {
    if (this.disposed) { return; }
    if (this.outputChannel) {
      if (event.type === "activity" && event.text) {
        const prefix = event.operatorName ? `[${event.operatorName}] ` : "";
        this.outputChannel.appendLine(`${prefix}${event.text}`);
      } else if (event.type === "file" && event.filePath) {
        const prefix = event.operatorName ? `[${event.operatorName}] ` : "";
        this.outputChannel.appendLine(`${prefix}Touched: ${event.filePath}`);
      } else if (event.type === "clear") {
        this.outputChannel.clear();
      } else if (event.type === "cliStream" && event.text) {
        const label = event.cliToolName ?? event.cliStreamType ?? "CLI";
        const prefix = event.operatorName ? `[${event.operatorName}] ` : "";
        this.outputChannel.appendLine(`${prefix}[CLI] ${label}: ${event.text}`);
      }
      if (event.type === "syncStatus") {
        const snap = event.syncSnapshot as { userBranch?: string; userHeadCommit?: string; operators?: Array<{ operatorName?: string; syncState?: string }> } | undefined;
        if (snap) {
          const opSummary = (snap.operators ?? []).map((o) => `${o.operatorName ?? "?"}:${o.syncState ?? "?"}`).join(", ");
          this.outputChannel.appendLine(`[Sync] ${snap.userBranch ?? "?"}@${(snap.userHeadCommit ?? "?").slice(0, 7)} | ${opSummary || "no operators"}`);
        }
      }
      if (event.type === "proposalUpdate" && event.text) {
        this.outputChannel.appendLine(`[Sync/Proposal] ${event.text}`);
      }
      if (event.type === "queueStatus" && event.text) {
        this.outputChannel.appendLine(`[Sync/Queue] ${event.text}`);
      }
      if (event.type === "cloudAgentStatus") {
        const id = event.cloudAgentId ?? "?";
        const status = event.cloudStatus ?? "?";
        const pr = event.prUrl ? `: ${event.prUrl}` : "";
        this.outputChannel.appendLine(`[CloudAgent ${id}] ${status}${pr}`);
      }
      if (event.type === "cloudAgentArtifact") {
        const label = event.artifactLabel ?? "artifact";
        const type = event.artifactType ?? "log";
        this.outputChannel.appendLine(`[CloudAgent Artifact] ${type}: ${label} ${event.artifactUrl ?? ""}`);
      }
      return;
    }
    if (!this.panel) return;
    if (!this.panel.visible) {
      this._pendingEvents.push(event);
      if (this._pendingEvents.length > AgentScreenPanel.MAX_QUEUE) this._pendingEvents.shift();
      return;
    }
    void this.panel.webview.postMessage({ ...event, timestamp: event.timestamp ?? Date.now() });
  }

  logActivity(operatorName: string, text: string): void {
    this.postEvent({ type: "activity", operatorName, text });
  }

  logFile(operatorName: string, filePath: string): void {
    this.postEvent({ type: "file", operatorName, filePath });
  }

  logDecision(operatorName: string, text: string): void {
    this.postEvent({ type: "decision", operatorName, text });
  }

  switchAgent(newOperatorName: string): void {
    this.postEvent({ type: "agentSwitch", operatorName: newOperatorName });
    if (this.panel) {
      this.panel.title = `${newOperatorName} — Agent Screen`;
    }
  }

  clear(): void {
    this.postEvent({ type: "clear" });
  }

  /**
   * Play a chime tone via the WebView's Web Audio API.
   * 1 = Drive ON tone, 2 = Drive OFF (two tones).
   */
  playChime(count: 1 | 2): void {
    if (this.disposed) { return; }
    if (this.panel) {
      void this.panel.webview.postMessage({ type: "chime", count });
    }
  }

  /** Speak text via WebView's speechSynthesis (volume 0.2–1). Returns true if sent. */
  speakTts(text: string, volume: number): boolean {
    if (this.disposed || !this.panel) { return false; }
    void this.panel.webview.postMessage({ type: "ttsSpeak", text, volume });
    return true;
  }

  /** Stop current TTS playback. */
  stopTts(): void {
    if (this.disposed || !this.panel) { return; }
    void this.panel.webview.postMessage({ type: "ttsStop" });
  }

  /** Play audio (base64) via webview. Returns true if sent. */
  playAudio(base64: string, mimeType: string, volume: number): boolean {
    if (this.disposed || !this.panel) { return false; }
    void this.panel.webview.postMessage({ type: "playAudio", base64, mimeType, volume });
    return true;
  }

  /** Post a sync status snapshot update to the Agent Screen. */
  postSyncStatus(snapshot: unknown): void {
    this.postEvent({
      type: "syncStatus",
      syncSnapshot: snapshot,
      timestamp: Date.now(),
    });
  }

  /** Post a proposal status change to the Agent Screen. */
  postProposalUpdate(proposalId: string, status: string, operatorName?: string): void {
    this.postEvent({
      type: "proposalUpdate",
      text: `Proposal ${proposalId} → ${status}${operatorName ? ` (${operatorName})` : ""}`,
      timestamp: Date.now(),
    });
  }

  /** Post integration queue state to the Agent Screen. */
  postQueueStatus(processing: string | null, pendingCount: number): void {
    this.postEvent({
      type: "queueStatus",
      text: processing
        ? `Processing: ${processing}, ${pendingCount} pending`
        : `Idle, ${pendingCount} pending`,
      timestamp: Date.now(),
    });
  }

  updatePlanProgress(planId: string, planName: string, completedCount: number, totalCount: number, currentTodo?: string): void {
    this.postEvent({
      type: "planProgress",
      planId,
      planName,
      completedCount,
      totalCount,
      currentTodo,
      timestamp: Date.now(),
    });
  }

  dispose(): void {
    if (this.panel) this.panel.dispose();
    if (this.outputChannel) this.outputChannel.dispose();
  }

  private async openFile(filePath: string): Promise<void> {
    try {
      const uri = path.isAbsolute(filePath)
        ? vscode.Uri.file(filePath)
        : vscode.Uri.joinPath(
          vscode.workspace.workspaceFolders?.[0]?.uri ?? vscode.Uri.file(""),
          filePath
        );
      const doc = await vscode.workspace.openTextDocument(uri);
      const cfg = vscode.workspace.getConfiguration("cursorDrive.agentScreen");
      const clickBehavior = cfg.get<string>("clickBehavior", "openInEditor");
      const viewColumn = clickBehavior === "openInNewWindow"
        ? vscode.ViewColumn.Beside
        : undefined;
      await vscode.window.showTextDocument(doc, {
        preview: true,
        preserveFocus: false,
        viewColumn: viewColumn ?? vscode.ViewColumn.Active,
      });
    } catch (err) {
      console.error("[Drive AgentScreen] Failed to open file:", filePath, err);
    }
  }

  private async handleAskAboutItem(text: string): Promise<void> {
    const question = await vscode.window.showInputBox({
      prompt: "Ask about this",
      value: text,
      placeHolder: "Ask Drive a contextual question...",
    });
    if (question) {
      try {
        await vscode.commands.executeCommand("workbench.action.chat.open", { query: question });
      } catch {
        void vscode.env.clipboard.writeText(question);
        void vscode.window.showInformationMessage(`Copied to clipboard. Paste into chat to ask.`);
      }
    }
  }

  private buildHtml(panel: vscode.WebviewPanel): string {
    const nonce = getNonce();
    const csp = panel.webview.cspSource;
    const cfg = vscode.workspace.getConfiguration("cursorDrive.agentScreen");
    const clickBehavior = cfg.get<string>("clickBehavior", "openInEditor");
    const showPlanProgress = cfg.get<boolean>("showPlanProgress", true);

    const planProgressSection = showPlanProgress
      ? `
  <section class="plan-progress" id="plan-progress" data-testid="plan-progress" style="display:none" aria-label="Plan progress">
    <button class="plan-progress-toggle" id="plan-progress-toggle" title="Expand/collapse" aria-label="Toggle plan progress">▶</button>
    <div class="plan-progress-content">
      <span class="plan-name" id="plan-name">—</span>
      <div class="plan-progress-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100"><div class="plan-progress-fill" id="plan-progress-fill"></div></div>
      <span class="plan-counts" id="plan-counts">0/0</span>
      <div class="plan-current-todo" id="plan-current-todo"></div>
    </div>
  </section>
  `
      : "";

    return agentScreenTemplate
      .replace(/\{\{NONCE\}\}/g, nonce)
      .replace(/\{\{CSP\}\}/g, csp)
      .replace(/\{\{CLICK_BEHAVIOR\}\}/g, clickBehavior)
      .replace(/\{\{PLAN_PROGRESS_SECTION\}\}/g, planProgressSection);
  }
}

function getNonce(): string {
  let text = "";
  const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
