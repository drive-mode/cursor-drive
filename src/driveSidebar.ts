/**
 * Drive sidebar panel — Codex-style Activity Bar view.
 * Uses viewsContainers + WebviewViewProvider for a dedicated Drive surface.
 * Shows: Drive status, mode, operators, quick actions.
 *
 * In development (Extension Development Host): loads HTML from webview/drive-sidebar.html
 * and hot-reloads when the file changes — edit the HTML, save, and the panel updates.
 */

import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import type { DriveModeManager } from "./driveMode.js";
import type { OperatorRegistry } from "./operatorRegistry.js";

export const DRIVE_SIDEBAR_VIEW_ID = "cursorDrive.panel";

export interface DriveSidebarState {
  active: boolean;
  subMode: string;
  operators: Array<{ id: string; name: string; task?: string; status: string }>;
  config?: {
    wakeWord: string;
    submitWord: string;
    tangentKeyword: string;
    namePool: string;
    autoActivateMicOnToggle: boolean;
  };
}

function getNonce(): string {
  let text = "";
  const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}


export class DriveSidebarProvider implements vscode.WebviewViewProvider {
  private _view: vscode.WebviewView | undefined;
  private _driveMgr: DriveModeManager | undefined;
  private _operatorRegistry: OperatorRegistry | undefined;
  private _extensionContext: vscode.ExtensionContext | undefined;

  constructor(
    private readonly _extensionUri: vscode.Uri,
    driveMgr?: DriveModeManager,
    operatorRegistry?: OperatorRegistry,
    extensionContext?: vscode.ExtensionContext
  ) {
    this._driveMgr = driveMgr;
    this._operatorRegistry = operatorRegistry;
    this._extensionContext = extensionContext;
  }

  setServices(driveMgr: DriveModeManager, operatorRegistry: OperatorRegistry): void {
    this._driveMgr = driveMgr;
    this._operatorRegistry = operatorRegistry;
  }

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): void {
    this._view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };
    this._setHtml(webviewView.webview);
    webviewView.webview.onDidReceiveMessage((msg: { type: string }) => {
      this._handleMessage(msg);
    });
    webviewView.onDidDispose(() => {
      this._view = undefined;
    });
    this._postState();
    // Re-post state when view becomes visible (WebviewView is lazy; user may have toggled before opening)
    webviewView.onDidChangeVisibility(() => {
      if (webviewView.visible) this._postState();
    });
    // Hot reload: when webview HTML file changes in dev, refresh the panel
    this._setupHotReload(webviewView.webview);
  }

  /** Post current state to the webview. Call when drive/operators change. */
  updateState(): void {
    this._postState();
  }

  private _postState(): void {
    if (!this._view) return;
    const state = this._getState();
    void this._view.webview.postMessage({ type: "state", state });
  }

  private _getState(): DriveSidebarState {
    const driveMgr = this._driveMgr;
    const registry = this._operatorRegistry;
    const operators = registry?.getActive().map((o) => ({
      id: o.id,
      name: o.name,
      task: o.task,
      status: o.status,
    })) ?? [];
    const cfg = vscode.workspace.getConfiguration("cursorDrive");
    const namePool = cfg.get<string[]>("operators.namePool", []);
    return {
      active: driveMgr?.active ?? false,
      subMode: driveMgr?.cursorMode ?? "agent",
      operators,
      config: {
        wakeWord: cfg.get<string>("wakeWord", "hey drive"),
        submitWord: cfg.get<string>("submitWord", "send it"),
        tangentKeyword: cfg.get<string>("agents.tangentKeyword", "tangent"),
        namePool: Array.isArray(namePool) ? namePool.join(", ") : String(namePool ?? ""),
        autoActivateMicOnToggle: cfg.get<boolean>("voice.autoActivateMicOnToggle", false),
      },
    };
  }

  private _handleMessage(msg: { type: string; key?: string; value?: string | boolean | string[] }): void {
    const cmdMap: Record<string, string> = {
      toggle: "cursorDrive.toggle",
      setMode: "cursorDrive.setSubMode",
      showAgentScreen: "cursorDrive.showAgentScreen",
      operators: "cursorDrive.operators",
      spawnOperator: "cursorDrive.spawnOperator",
      activateVoice: "cursorDrive.activateVoiceInput",
      openSettings: "workbench.action.openSettings",
    };
    if (msg.type === "openSettings") {
      void vscode.commands.executeCommand("workbench.action.openSettings", "cursorDrive");
      return;
    }
    if (msg.type === "updateConfig" && msg.key !== undefined) {
      const cfg = vscode.workspace.getConfiguration("cursorDrive");
      const key = msg.key as string;
      let value = msg.value;
      if (key === "operators.namePool" && typeof value === "string") {
        value = value.split(",").map((s) => s.trim()).filter(Boolean);
      }
      void cfg.update(key, value, vscode.ConfigurationTarget.Global);
      this._postState();
      return;
    }
    const cmd = cmdMap[msg.type];
    if (cmd) void vscode.commands.executeCommand(cmd);
  }

  private _getWebviewHtmlPath(): string {
    return path.join(this._extensionUri.fsPath, "webview", "drive-sidebar.html");
  }

  private _loadHtmlFromFile(webview: vscode.Webview): string | null {
    const p = this._getWebviewHtmlPath();
    try {
      const raw = fs.readFileSync(p, "utf8");
      const nonce = getNonce();
      return raw
        .replace(/\{\{CSP_NONCE\}\}/g, nonce)
        .replace(/\{\{CSP_SOURCE\}\}/g, webview.cspSource);
    } catch {
      return null;
    }
  }

  private _setHtml(webview: vscode.Webview): void {
    const html = this._loadHtmlFromFile(webview) ?? this._buildHtmlInline(webview);
    webview.html = html;
  }

  private _setupHotReload(webview: vscode.Webview): void {
    if (this._extensionContext?.extensionMode !== vscode.ExtensionMode.Development) return;
    const webviewDir = path.join(this._extensionUri.fsPath, "webview");
    const refresh = () => {
      if (this._view?.webview) {
        this._setHtml(this._view.webview);
        this._postState();
      }
    };
    const watcher = fs.watch(webviewDir, { recursive: true }, (event, filename) => {
      if (filename && filename.endsWith(".html")) {
        refresh();
      }
    });
    this._extensionContext.subscriptions.push({
      dispose: () => watcher.close(),
    });
  }

  private _buildHtmlInline(webview: vscode.Webview): string {
    const nonce = getNonce();
    const csp = webview.cspSource;
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy"
    content="default-src 'none'; style-src ${csp} 'nonce-${nonce}'; script-src ${csp} 'nonce-${nonce}';">
  <title>Drive</title>
  <style nonce="${nonce}">
    *, *::before, *::after { box-sizing: border-box; }
    body {
      font-family: var(--vscode-font-family), system-ui, -apple-system, sans-serif;
      font-size: 13px;
      line-height: 1.5;
      color: var(--vscode-editor-foreground);
      background: var(--vscode-sideBar-background);
      margin: 0;
      padding: 16px;
      min-height: 100%;
    }
    .card {
      background: var(--vscode-editor-background);
      border: 1px solid var(--vscode-widget-border, transparent);
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 12px;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
    }
    .card.drive-on { border-color: var(--vscode-testing-iconPassed, #4ec9b0); box-shadow: 0 0 0 1px rgba(78, 201, 176, 0.15); }
    .section-title {
      font-size: 11px;
      font-weight: 600;
      color: var(--vscode-descriptionForeground);
      text-transform: uppercase;
      letter-spacing: 0.6px;
      margin-bottom: 10px;
    }
    .status-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 12px;
    }
    .status-label { display: flex; align-items: center; gap: 8px; }
    .status-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      flex-shrink: 0;
      transition: background 0.2s ease, box-shadow 0.2s ease;
    }
    .status-dot.on { background: var(--vscode-testing-iconPassed, #4ec9b0); box-shadow: 0 0 8px rgba(78, 201, 176, 0.4); }
    .status-dot.off { background: var(--vscode-descriptionForeground); opacity: 0.6; }
    .toggle-switch {
      width: 40px;
      height: 22px;
      border-radius: 11px;
      background: var(--vscode-widget-border);
      cursor: pointer;
      position: relative;
      transition: background 0.2s ease;
    }
    .toggle-switch.on { background: var(--vscode-testing-iconPassed, #4ec9b0); }
    .toggle-switch::after {
      content: '';
      position: absolute;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: white;
      top: 2px;
      left: 2px;
      transition: transform 0.2s ease;
      box-shadow: 0 1px 3px rgba(0,0,0,0.2);
    }
    .toggle-switch.on::after { transform: translateX(18px); }
    .mode-badge {
      font-size: 11px;
      padding: 2px 8px;
      border-radius: 6px;
      background: var(--vscode-badge-background);
      color: var(--vscode-badge-foreground);
      margin-top: 4px;
      display: inline-block;
    }
    .actions { display: flex; flex-direction: column; gap: 6px; margin-top: 10px; }
    .btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      padding: 8px 12px;
      font-size: 12px;
      font-weight: 500;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      transition: background 0.15s ease, transform 0.05s ease;
    }
    .btn:active { transform: scale(0.98); }
    .btn-primary {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
    }
    .btn-primary:hover { background: var(--vscode-button-hoverBackground); }
    .btn-secondary {
      background: var(--vscode-list-hoverBackground, transparent);
      color: var(--vscode-foreground);
    }
    .btn-secondary:hover { background: var(--vscode-list-hoverBackground); }
    .operator-item {
      padding: 8px 0;
      font-size: 12px;
      border-bottom: 1px solid var(--vscode-widget-border);
      transition: background 0.1s ease;
    }
    .operator-item:hover { background: var(--vscode-list-hoverBackground, transparent); }
    .operator-item:last-child { border-bottom: none; }
    .operator-name { font-weight: 600; }
    .operator-task { font-size: 11px; color: var(--vscode-descriptionForeground); margin-top: 2px; }
    .empty-ops { font-style: italic; color: var(--vscode-descriptionForeground); font-size: 12px; padding: 8px 0; }
  </style>
</head>
<body>
  <div class="card" id="status-card">
    <div class="section-title">Drive</div>
    <div class="status-row">
      <div class="status-label">
        <span class="status-dot off" id="status-dot" aria-hidden="true"></span>
        <span id="status-text">Off</span>
      </div>
      <button class="toggle-switch off" id="toggle-switch" data-testid="btn-toggle" role="switch" aria-checked="false" aria-label="Toggle Drive mode"></button>
    </div>
    <div id="mode-text"></div>
    <div class="actions">
      <button class="btn btn-primary" id="btn-voice" data-testid="btn-voice">Open Chat & Start Voice</button>
      <button class="btn btn-secondary" id="btn-set-mode" data-testid="btn-set-mode">Change Mode</button>
    </div>
  </div>
  <div class="card">
    <div class="section-title">Operators</div>
    <div id="operators-list"></div>
    <div class="actions" style="margin-top: 8px;">
      <button class="btn btn-secondary" id="btn-operators" data-testid="btn-operators">Manage</button>
      <button class="btn btn-secondary" id="btn-spawn" data-testid="btn-spawn">Spawn Operator</button>
    </div>
  </div>
  <div class="card">
    <button class="btn btn-secondary" id="btn-agent-screen" data-testid="btn-agent-screen" style="width:100%">Show Agent Screen</button>
  </div>
  <script nonce="${nonce}">
    function render(state) {
      const card = document.getElementById('status-card');
      const dot = document.getElementById('status-dot');
      const text = document.getElementById('status-text');
      const mode = document.getElementById('mode-text');
      const toggle = document.getElementById('toggle-switch');
      const voiceBtn = document.getElementById('btn-voice');
      const opsList = document.getElementById('operators-list');
      if (card) card.className = 'card' + (state.active ? ' drive-on' : '');
      if (dot) dot.className = 'status-dot ' + (state.active ? 'on' : 'off');
      if (text) text.textContent = state.active ? 'On' : 'Off';
      if (toggle) {
        toggle.className = 'toggle-switch ' + (state.active ? 'on' : 'off');
        toggle.setAttribute('aria-checked', state.active ? 'true' : 'false');
      }
      if (mode) {
        mode.innerHTML = state.active ? '<span class="mode-badge">' + escapeHtml(state.subMode) + '</span>' : '';
      }
      if (voiceBtn) voiceBtn.textContent = state.active ? 'Open Chat & Start Voice' : 'Open Chat & Start Voice';
      if (opsList) {
        if (state.operators.length === 0) {
          opsList.innerHTML = '<div class="empty-ops">No active operators</div>';
        } else {
          opsList.innerHTML = state.operators.map(function(o) {
            return '<div class="operator-item"><span class="operator-name">' + escapeHtml(o.name) + '</span>' +
              (o.task ? '<div class="operator-task">' + escapeHtml(o.task) + '</div>' : '') + '</div>';
          }).join('');
        }
      }
    }
    function escapeHtml(s) {
      return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
    window.addEventListener('message', function(e) {
      const msg = e.data;
      if (msg && msg.type === 'state' && msg.state) render(msg.state);
    });
    const vscodeApi = acquireVsCodeApi();
    document.getElementById('toggle-switch').onclick = function() { vscodeApi.postMessage({ type: 'toggle' }); };
    document.getElementById('btn-set-mode').onclick = function() { vscodeApi.postMessage({ type: 'setMode' }); };
    document.getElementById('btn-voice').onclick = function() { vscodeApi.postMessage({ type: 'activateVoice' }); };
    document.getElementById('btn-operators').onclick = function() { vscodeApi.postMessage({ type: 'operators' }); };
    document.getElementById('btn-spawn').onclick = function() { vscodeApi.postMessage({ type: 'spawnOperator' }); };
    document.getElementById('btn-agent-screen').onclick = function() { vscodeApi.postMessage({ type: 'showAgentScreen' }); };
  </script>
</body>
</html>`;
  }
}
