/**
 * Cursor Drive extension entrypoint.
 *
 * Architecture:
 *   VS Code extension (UI layer) + MCP server (agent tools layer) + Cursor Plugin (intelligence layer)
 *
 * Note: vscode.chat.createChatParticipant is NOT supported in Cursor's chat.
 * The @drive participant has been removed. Drive integrates via:
 *   1. VS Code commands + keybindings (Ctrl+Shift+D toggle, mode picker, etc.)
 *   2. Status bar (Drive > Mode | AgentName, click to configure)
 *   3. MCP server on localhost:7891 — Cursor's native agents call Drive tools
 *   4. Agent Screen WebviewPanel beside the editor
 *   5. Cursor Plugin files (agents/, commands/, rules/) for native Cursor integration
 *
 * Register the MCP server in .cursor/mcp.json:
 *   { "mcpServers": { "drive": { "url": "http://localhost:7891/mcp" } } }
 */

import * as vscode from "vscode";
import * as path from "path";
import { createDriveModeManager, CursorMode } from "./driveMode.js";
import { createDriveStatusBar } from "./statusBar.js";
import { speak, stop as ttsStop, isEnabled as ttsEnabled } from "./tts.js";
import { AgentScreenPanel } from "./agentScreen.js";
import { DriveSidebarProvider, DRIVE_SIDEBAR_VIEW_ID } from "./driveSidebar.js";
import { OperatorRegistry } from "./operatorRegistry.js";
import { CommsAgent } from "./commsAgent.js";
import { DriveMcpServer } from "./mcpServer.js";
import { discoverAPIs, formatReport, discoverAllCommands } from "./apiDiscovery.js";
import {
  executeChatOpen,
  executeMicStart,
  executeMicStopSubmit,
  executeMicStopCancel,
  probeVoiceCommands,
} from "./voiceCommands.js";
import { SessionMemory } from "./sessionMemory.js";
import { PersistentMemory } from "./persistentMemory.js";
import { installDrivePluginToWorkspace } from "./pluginInstaller.js";
import { playChime } from "./audioFeedback.js";
import { GitService } from "./gitService.js";
import { WorktreeManager } from "./worktreeManager.js";
import { SyncLedger } from "./syncLedger.js";
import { StateSyncCoordinator } from "./stateSyncCoordinator.js";
import { IntegrationQueue } from "./integrationQueue.js";
import { resolvePendingTangentConfirm } from "./tangentFlow.js";

/** Set when we register the Drive MCP server via vscode.cursor.mcp.registerServer; cleared in deactivate. */
let mcpRegisteredByExtensionApi = false;

/** Get Cursor API key from SecretStorage. Used by Cloud Agent MCP tools. */
export async function getApiKey(context: vscode.ExtensionContext): Promise<string | undefined> {
  return context.secrets.get("cursorDrive.cursorApiKey");
}

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  const out = vscode.window.createOutputChannel("Cursor Drive", { log: true });
  context.subscriptions.push(out);
  out.appendLine("[Drive] activate() called");
  if ("debug" in out && typeof (out as { debug: (s: string) => void }).debug === "function") {
    (out as { debug: (s: string) => void }).debug("Log level: Developer: Set Log Level… → Cursor Drive");
  }
  let driveMgr: ReturnType<typeof createDriveModeManager>;
  try {
    driveMgr = createDriveModeManager(context);
    out.appendLine("[Drive] driveMode: OK");
  } catch (e) {
    out.appendLine(`[Drive] driveMode FAILED: ${e}`);
    out.show(true);
    return;
  }
  let operatorRegistry: OperatorRegistry;
  let sessionMemory: SessionMemory;
  let persistentMemory: PersistentMemory | undefined;
  let commsAgent: CommsAgent;
  try {
    operatorRegistry = new OperatorRegistry();
    sessionMemory = new SessionMemory(context.workspaceState);
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (workspaceRoot) {
      persistentMemory = new PersistentMemory(workspaceRoot);
      const retentionDays = vscode.workspace.getConfiguration("cursorDrive.privacy").get<number>("transcriptRetentionDays", 30);
      persistentMemory.pruneOlderThan(retentionDays).then((deleted) => {
        if (deleted > 0) { out.appendLine(`[Drive] Pruned ${deleted} old transcript log(s)`); }
      });
    }
    commsAgent = new CommsAgent(operatorRegistry, context);
    out.appendLine("[Drive] operatorRegistry, sessionMemory, commsAgent: OK");
  } catch (e) {
    out.appendLine(`[Drive] core services FAILED: ${e}`);
    out.show(true);
    return;
  }
  context.subscriptions.push(driveMgr);

  try {
    context.subscriptions.push(createDriveStatusBar(driveMgr, operatorRegistry));
    out.appendLine("[Drive] status bar: OK");
  } catch (e) {
    out.appendLine(`[Drive] status bar FAILED: ${e}`);
    out.show(true);
    return;
  }

  function setDriveActiveContext(): void {
    void vscode.commands.executeCommand("setContext", "cursorDrive.active", driveMgr.active);
    AgentScreenPanel.getInstance()?.setDriveActive(driveMgr.active);
  }
  setDriveActiveContext();
  context.subscriptions.push(driveMgr.onDidChange(setDriveActiveContext));

  // ── Drive sidebar (Activity Bar panel) ─────────────────────────────────────
  const driveSidebarProvider = new DriveSidebarProvider(
    context.extensionUri,
    driveMgr,
    operatorRegistry,
    context
  );
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(DRIVE_SIDEBAR_VIEW_ID, driveSidebarProvider)
  );
  context.subscriptions.push(
    driveMgr.onDidChange(() => driveSidebarProvider.updateState())
  );
  operatorRegistry.events.on("operatorCompleted", () => driveSidebarProvider.updateState());
  vscode.workspace.onDidChangeConfiguration((e) => {
    if (e.affectsConfiguration("cursorDrive")) driveSidebarProvider.updateState();
  });

  context.subscriptions.push({ dispose: () => commsAgent.dispose() });

  // ── Mob-programming sync services ──────────────────────────────────────
  let gitService: GitService | undefined;
  let worktreeManager: WorktreeManager | undefined;
  let syncLedger: SyncLedger | undefined;
  let stateSyncCoordinator: StateSyncCoordinator | undefined;
  let integrationQueue: IntegrationQueue | undefined;

  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (workspaceRoot) {
    try {
      gitService = new GitService(workspaceRoot);
      worktreeManager = new WorktreeManager(gitService, workspaceRoot);
      syncLedger = new SyncLedger(path.join(workspaceRoot, ".drive", "state-sync"));
      stateSyncCoordinator = new StateSyncCoordinator(
        gitService, operatorRegistry, worktreeManager, syncLedger
      );
      integrationQueue = new IntegrationQueue(
        stateSyncCoordinator, gitService, syncLedger
      );
      out.appendLine("[Drive] Sync services: OK");
    } catch (e) {
      out.appendLine(`[Drive] Sync services init warning: ${e}`);
      // Non-fatal: extension works without sync services
    }
  }

  // Auto-allocate worktrees on operator spawn, release on dismiss
  if (worktreeManager && stateSyncCoordinator) {
    const wt = worktreeManager;
    const syncCoord = stateSyncCoordinator;
    operatorRegistry.events.on("operatorCompleted", (id: string) => {
      void wt.release(id).catch((err) => {
        out.appendLine(`[Drive] Worktree release failed for ${id}: ${err}`);
      });
    });
    // Note: worktree allocation happens on demand via MCP tools or
    // can be triggered by the coordinator. Auto-allocation on spawn
    // would add latency — operators can work without worktrees initially.
    void syncCoord; // Referenced to prevent unused warning
  }

  // ── MCP server ──────────────────────────────────────────────────────────
  const cfg = vscode.workspace.getConfiguration("cursorDrive");
  const preferredPort = cfg.get<number>("mcp.port", 7891);
  const maxPortAttempts = 15;
  let mcpServer: DriveMcpServer | undefined;
  let actualPort: number | undefined;

  for (let attempt = 0; attempt < maxPortAttempts; attempt++) {
    const tryPort = preferredPort + attempt;
    try {
      mcpServer = new DriveMcpServer({
        port: tryPort,
        driveMgr,
        operatorRegistry,
        sessionMemory,
        persistentMemory,
        stateSyncCoordinator,
        integrationQueue,
        getEnableApps: () => vscode.workspace.getConfiguration("cursorDrive.mcp").get<boolean>("enableApps", false),
        getExtensionPath: () => context.extensionPath,
        getApiKey: () => getApiKey(context),
        getCloudAgentsApiBaseUrl: () =>
          vscode.workspace.getConfiguration("cursorDrive.cloudAgents").get<string>("apiBaseUrl", "https://api.cursor.com"),
        promptAndStoreApiKey: async () => {
          const key = await vscode.window.showInputBox({
            prompt: "Cursor API key required for Cloud Agents",
            password: true,
            placeHolder: "Paste your API key from Cursor Dashboard",
          });
          if (key) {
            await context.secrets.store("cursorDrive.cursorApiKey", key);
            return key;
          }
          return undefined;
        },
      });
      await mcpServer.start();
      actualPort = mcpServer.getPort();
      context.subscriptions.push({
        dispose: () => { void mcpServer!.stop(); },
      });
      out.appendLine(`[Drive] MCP server: listening on port ${actualPort}${tryPort !== preferredPort ? ` (fallback from ${preferredPort}; port in use)` : ""}`);
      if ("debug" in out && typeof (out as { debug: (s: string) => void }).debug === "function") {
        (out as { debug: (s: string) => void }).debug(`MCP HTTP root: http://127.0.0.1:${actualPort}`);
      }
      // Programmatic MCP registration when Cursor exposes the API (cursor.com/docs/context/mcp-extension-api)
      const cursorMcp = (vscode as { cursor?: { mcp?: { registerServer: (c: unknown) => void } } }).cursor?.mcp;
      if (typeof cursorMcp?.registerServer === "function") {
        try {
          cursorMcp.registerServer({
            name: "drive",
            server: { url: `http://127.0.0.1:${actualPort}/mcp` },
          });
          mcpRegisteredByExtensionApi = true;
          out.appendLine("[Drive] MCP server registered via Extension API");
        } catch (e) {
          out.appendLine(`[Drive] MCP Extension API registerServer failed: ${e}`);
        }
      }
      void registerMcpViaDeepLink(actualPort, context, out);
      break;
    } catch (err) {
      const e = err as NodeJS.ErrnoException;
      const portInUse = e.code === "EADDRINUSE";
      if (mcpServer) {
        void mcpServer.stop();
        mcpServer = undefined;
      }
      if (portInUse && attempt < maxPortAttempts - 1) {
        out.appendLine(`[Drive] Port ${tryPort} in use, trying ${tryPort + 1}...`);
        continue;
      }
      out.appendLine(`[Drive] MCP start error: ${e.message}`);
      console.error("[Drive MCP] Failed to start:", e.message);
      void vscode.window.showWarningMessage(
        `Drive MCP server failed to start${portInUse ? ` (tried ports ${preferredPort}–${preferredPort + maxPortAttempts - 1})` : ""}: ${e.message}`
      );
      break;
    }
  }

  // ── Commands ────────────────────────────────────────────────────────────

  async function registerMcpViaDeepLink(
    port: number,
    ctx: vscode.ExtensionContext,
    log: vscode.OutputChannel
  ): Promise<void> {
    const alreadyRegistered = ctx.workspaceState.get<boolean>("drive.mcpRegistered", false);
    if (alreadyRegistered) { return; }

    const config = JSON.stringify({ url: `http://127.0.0.1:${port}/mcp` });
    const b64 = Buffer.from(config).toString("base64");
    const deepLinkUri = vscode.Uri.parse(
      `cursor://anysphere.cursor-deeplink/mcp/install?name=drive&config=${encodeURIComponent(b64)}`
    );

    const choice = await vscode.window.showInformationMessage(
      "Drive: Register the MCP server with Cursor to enable AI tool access?",
      "Register",
      "Later"
    );
    if (choice !== "Register") { return; }

    try {
      await vscode.env.openExternal(deepLinkUri);
      await ctx.workspaceState.update("drive.mcpRegistered", true);
      log.appendLine("[Drive] MCP deep link opened for registration");
    } catch (err) {
      log.appendLine(`[Drive] MCP deep link failed: ${err}`);
    }
  }

  async function activateVoiceInput(): Promise<void> {
    const voiceCfg = vscode.workspace.getConfiguration("cursorDrive.voice");
    const chatCmd = voiceCfg.get<string>("chatOpenCommand", "workbench.action.chat.open");
    const micCmd = voiceCfg.get<string>("micCommand", "workbench.action.chat.startVoiceChat");
    const micFallbacks = voiceCfg.get<string[]>("micCommandFallbacks", []);
    const chatFallbacks = voiceCfg.get<string[]>("chatOpenFallbacks", []);
    const delayMs = voiceCfg.get<number>("activateMicDelayMs", 400);

    try {
      await executeChatOpen(chatCmd, chatFallbacks);
    } catch (e) {
      out.appendLine(`[Drive] Chat open failed: ${e}`);
      void vscode.window.showWarningMessage("Chat not available. Use the chat icon in the sidebar.");
      return;
    }

    // Focus composer so the chat input (and mic UI) are ready. startVoiceChat is often
    // context-gated and only works after the mic button is visible/clickable.
    try {
      await vscode.commands.executeCommand("composer.focusComposer");
    } catch {
      // Best-effort; not all Cursor versions have this
    }

    // Let the chat UI render before firing the mic command. The mic button may not
    // exist or be ready until the panel has finished rendering.
    if (delayMs > 0) {
      await new Promise((r) => setTimeout(r, delayMs));
    }

    const micFallbackList = Array.isArray(micFallbacks) ? micFallbacks : [];
    const worked = await executeMicStart(micCmd, micFallbackList);
    if (worked) {
      const showFeedback = voiceCfg.get<boolean>("showListeningFeedback", false);
      if (showFeedback) {
        void vscode.window.setStatusBarMessage("Listening…", 2000);
      }
      out.appendLine(`[Drive] Mic started via: ${worked}`);
    } else {
      out.appendLine(`[Drive] Mic command failed. Tried: ${micCmd}, ${micFallbackList.join(", ")}`);
      void vscode.window.showInformationMessage(
        "Voice input not started. Run Drive: Discover Voice Commands to find the correct command for your Cursor version."
      );
    }
  }

  async function stopVoiceInput(): Promise<void> {
    const voiceCfg = vscode.workspace.getConfiguration("cursorDrive.voice");
    const stopCmd = voiceCfg.get<string>("stopCommand", "workbench.action.chat.stopListeningAndSubmit");
    const stopFallbacks = voiceCfg.get<string[]>("stopCommandFallbacks", []);

    const worked = await executeMicStopSubmit(stopCmd, Array.isArray(stopFallbacks) ? stopFallbacks : []);
    if (!worked) {
      await executeMicStopCancel("workbench.action.chat.stopListening", []);
    }
  }

  context.subscriptions.push(
    vscode.commands.registerCommand("cursorDrive.activateVoiceInput", () => {
      void activateVoiceInput();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("cursorDrive.stopVoice", () => {
      void stopVoiceInput();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("cursorDrive.toggle", async () => {
      driveMgr.toggle();
      const nowActive = driveMgr.active;
      const state = nowActive
        ? `Drive ON — ${driveMgr.subMode} mode`
        : "Drive OFF";
      void vscode.window.showInformationMessage(state);
      if (nowActive && ttsEnabled()) {
        speak(state);
      }

      if (nowActive) {
        // Open chat first so user sees the chat UI immediately
        try {
          const voiceCfg = vscode.workspace.getConfiguration("cursorDrive.voice");
          const chatCmd = voiceCfg.get<string>("chatOpenCommand", "workbench.action.chat.open");
          const chatFallbacks = voiceCfg.get<string[]>("chatOpenFallbacks", []);
          await executeChatOpen(chatCmd, Array.isArray(chatFallbacks) ? chatFallbacks : []);
        } catch {
          // Chat panel unavailable — continue
        }
        // Auto-open AgentScreen before chime so Web Audio can play (chime needs panel)
        const autoOpen = vscode.workspace
          .getConfiguration("cursorDrive.agentScreen")
          .get<boolean>("autoOpen", true);
        if (autoOpen) {
          AgentScreenPanel.createOrShow(context.extensionUri);
          AgentScreenPanel.getInstance()?.setDriveActive(driveMgr.active);
          // Defer chime so webview has time to load and attach message listener
          setTimeout(() => playChime(1), 150);
        } else {
          playChime(1);
        }
        // Auto-activate mic if configured
        const autoMic = vscode.workspace
          .getConfiguration("cursorDrive.voice")
          .get<boolean>("autoActivateMicOnToggle", false);
        if (autoMic) {
          void activateVoiceInput();
        }
      } else {
        // Chime: 2 = OFF
        playChime(2);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("cursorDrive.exit", () => {
      driveMgr.setActive(false);
      ttsStop();
      void vscode.window.showInformationMessage("Drive mode off.");
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("cursorDrive.setSubMode", async () => {
      const driveIconUri = vscode.Uri.joinPath(context.extensionUri, "assets", "logo.svg");
      const items: vscode.QuickPickItem[] = [
        { label: "Drive", description: "Voice-first (mic, wake word)", iconPath: driveIconUri },
        { label: "$(circle-slash) Off", description: "Disable drive mode" },
        { label: "$(book) Plan", description: "Clarify goals, generate plan artifact" },
        { label: "$(rocket) Agent", description: "Execute autonomously" },
        { label: "$(search) Ask", description: "Read-only exploration" },
        { label: "$(bug) Debug", description: "Diagnose issues, evidence-first debugging" },
      ];
      const selected = await vscode.window.showQuickPick(items, {
        title: "Drive Mode",
        placeHolder: "Select sub-mode or turn off. Status bar: Drive button; Ctrl+Shift+D to toggle.",
      });
      if (!selected) { return; }
      if (selected.label.includes("Off")) {
        driveMgr.setActive(false);
        return;
      }
      if (selected.label === "Drive") {
        driveMgr.setSubMode("agent");
        driveMgr.setActive(true);
        const syncNative = vscode.workspace.getConfiguration("cursorDrive").get<boolean>("syncNativeMode", true);
        if (syncNative) {
          vscode.commands.executeCommand("composerMode.agent").then(undefined, () => { });
        }
        return;
      }
      const modeMap: Record<string, CursorMode> = {
        Plan: "plan",
        Agent: "agent",
        Ask: "ask",
        Debug: "debug",
      };
      const word = selected.label.split(" ").pop() ?? "";
      const mode = modeMap[word];
      if (mode) {
        driveMgr.setSubMode(mode);
        driveMgr.setActive(true);
        // Sync Cursor's native mode if configured
        const syncNative = vscode.workspace.getConfiguration("cursorDrive").get<boolean>("syncNativeMode", true);
        if (syncNative) {
          const nativeCmdMap: Partial<Record<CursorMode, string>> = {
            plan: "composerMode.plan",
            agent: "composerMode.agent",
            ask: "composerMode.chat",
            debug: "composerMode.debug",
          };
          const nativeCmd = nativeCmdMap[mode];
          if (nativeCmd) {
            vscode.commands.executeCommand(nativeCmd).then(undefined, () => {
              // Not available in this Cursor version — silent degradation
            });
          }
        }
      }
    })
  );

  // ── Agent Screen commands ───────────────────────────────────────────────

  context.subscriptions.push(
    vscode.commands.registerCommand("cursorDrive.showAgentScreen", () => {
      AgentScreenPanel.createOrShow(context.extensionUri);
      AgentScreenPanel.getInstance()?.setDriveActive(driveMgr.active);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("cursorDrive.clearAgentScreen", () => {
      AgentScreenPanel.getInstance()?.clear();
    })
  );

  // ── TTS commands ────────────────────────────────────────────────────────

  context.subscriptions.push(
    vscode.commands.registerCommand("cursorDrive.speak", async () => {
      const text = await vscode.window.showInputBox({
        prompt: "Text to speak (tests Drive TTS)",
        placeHolder: "Hello from Drive",
      });
      if (text) { speak(text); }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("cursorDrive.stopSpeaking", () => {
      ttsStop();
    })
  );

  // ── Operator commands ───────────────────────────────────────────────────

  context.subscriptions.push(
    vscode.commands.registerCommand("cursorDrive.operators", async () => {
      const activeOperators = operatorRegistry.getActive();
      if (activeOperators.length === 0) {
        const action = await vscode.window.showQuickPick(
          [{ label: "$(add) Spawn first operator", id: "spawn" }],
          { title: "Drive Operators", placeHolder: "No active operators" }
        );
        if (action?.id === "spawn") {
          await vscode.commands.executeCommand("cursorDrive.spawnOperator");
        }
        return;
      }

      const items = [
        ...activeOperators.map((o) => ({
          label: `$(person) ${o.name}`,
          description: o.status === "active" ? "● foreground" : "◌ background",
          detail: o.task || "(no task set)",
          id: o.id,
          name: o.name,
        })),
        { label: "$(add) Spawn new operator", id: "spawn", name: "", description: "", detail: "" },
        { label: "$(trash) Dismiss operator", id: "dismiss", name: "", description: "", detail: "" },
      ];

      const selected = await vscode.window.showQuickPick(items, {
        title: "Drive Operators",
        placeHolder: "Select an operator to switch to, or manage",
      });
      if (!selected) { return; }

      if (selected.id === "spawn") {
        await vscode.commands.executeCommand("cursorDrive.spawnOperator");
      } else if (selected.id === "dismiss") {
        const dismissTarget = await vscode.window.showQuickPick(
          activeOperators.map((o) => ({ label: o.name, id: o.id })),
          { title: "Dismiss which operator?" }
        );
        if (dismissTarget) {
          operatorRegistry.dismiss(dismissTarget.id);
          AgentScreenPanel.getInstance()?.logActivity("Drive", `Dismissed ${dismissTarget.label}`);
          driveSidebarProvider.updateState();
        }
      } else {
        const op = operatorRegistry.switchTo(selected.id);
        if (op) {
          AgentScreenPanel.getInstance()?.switchAgent(op.name);
          driveSidebarProvider.updateState();
          void vscode.window.showInformationMessage(`Switched to ${op.name}`);
        }
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("cursorDrive.spawnOperator", async () => {
      const maxConcurrent = vscode.workspace
        .getConfiguration("cursorDrive.operators")
        .get<number>("maxConcurrent", 3);
      if (operatorRegistry.activeCount() >= maxConcurrent) {
        void vscode.window.showWarningMessage(
          `Drive: max concurrent operators (${maxConcurrent}) reached. Dismiss one first.`
        );
        return;
      }

      const task = await vscode.window.showInputBox({
        prompt: "What should this operator work on?",
        placeHolder: "Research rate limiting patterns",
      });
      if (!task) { return; }

      const name = await vscode.window.showInputBox({
        prompt: "Name for this operator (leave blank for default)",
        placeHolder: "Beta",
      });

      const op = operatorRegistry.spawn(name || undefined, task);
      const panel = AgentScreenPanel.createOrShow(context.extensionUri);
      panel.setDriveActive(driveMgr.active);
      panel.logActivity("Drive", `Spawned ${op.name}: ${task}`);
      driveSidebarProvider.updateState();
      void vscode.window.showInformationMessage(
        `Operator ${op.name} spawned. Task: ${task}`
      );
    })
  );

  // ── Diagnostic command ──────────────────────────────────────────────────
  // Validates which Drive APIs are available in the current host environment.

  context.subscriptions.push(
    vscode.commands.registerCommand("cursorDrive.installPluginToWorkspace", async () => {
      try {
        const { workspaceRoot, installedPaths } = await installDrivePluginToWorkspace(context);
        void vscode.window.showInformationMessage(
          `Drive plugin installed to ${workspaceRoot}. ${installedPaths.length} paths updated.`
        );
      } catch (err) {
        void vscode.window.showErrorMessage(
          `Drive plugin install failed: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("cursorDrive.diagnose", async () => {
      const results: string[] = [];

      // Test vscode.lm
      try {
        const models = await vscode.lm.selectChatModels({});
        results.push(`✅ vscode.lm.selectChatModels: ${models.length} model(s) available`);
        if (models.length > 0) {
          const names = models.slice(0, 3).map((m) => m.name ?? m.id ?? "unnamed").join(", ");
          results.push(`   Models: ${names}${models.length > 3 ? ` (+${models.length - 3} more)` : ""}`);
        }
      } catch (e) {
        results.push(`❌ vscode.lm.selectChatModels: ${String(e)}`);
      }

      // Test TTS
      results.push(`ℹ️  TTS enabled: ${ttsEnabled()}`);
      results.push(actualPort !== undefined ? `ℹ️  MCP server port: ${actualPort} (http://127.0.0.1:${actualPort}/mcp)` : "ℹ️  MCP server: not started");
      results.push(`ℹ️  Drive active: ${driveMgr.active}, mode: ${driveMgr.subMode}`);
      results.push(`ℹ️  Active operators: ${operatorRegistry.activeCount()}`);
      results.push(`⚠️  @drive chat participant: NOT supported in Cursor chat (known limitation)`);

      // Try NDJSON ingest status
      try {
        await vscode.commands.executeCommand("cursor.ndjsonIngest.showStatus");
        results.push("ℹ️  NDJSON ingest: command available (check output channel)");
      } catch {
        results.push("ℹ️  NDJSON ingest: cursor.ndjsonIngest.showStatus not available");
      }

      const message = results.join("\n");
      const action = await vscode.window.showInformationMessage(
        "Drive Diagnostics",
        { modal: true, detail: message },
        "Show Logs",
        "Extension Monitor"
      );

      if (action === "Show Logs") {
        const logChannels: vscode.QuickPickItem[] = [
          { label: "Drive Output", description: "cursorDrive main output" },
          { label: "MCP Logs", description: "anysphere.cursor-mcp" },
          { label: "Agent Exec", description: "anysphere.cursor-agent-exec" },
          { label: "Cursor Agent", description: "extension-output-anysphere.cursor-agent" },
          { label: "Cursor Plugins", description: "extension-output-anysphere.cursor-agent-exec" },
        ];
        const picked = await vscode.window.showQuickPick(logChannels, { title: "Open Log Channel" });
        const channelMap: Record<string, string> = {
          "MCP Logs": "workbench.action.output.show.anysphere.cursor-mcp.MCP Logs",
          "Agent Exec": "workbench.action.output.show.anysphere.cursor-agent-exec.Cursor Agent Exec",
          "Cursor Agent": "workbench.action.output.show.extension-output-anysphere.cursor-agent-#1-Cursor Agent",
          "Cursor Plugins": "workbench.action.output.show.extension-output-anysphere.cursor-agent-exec-#1-Cursor Plugins",
        };
        if (picked) {
          const cmd = channelMap[picked.label];
          if (cmd) {
            vscode.commands.executeCommand(cmd).then(undefined, () => { });
          } else {
            out.show(true); // Drive Output — already have the channel reference
          }
        }
      } else if (action === "Extension Monitor") {
        vscode.commands.executeCommand("workbench.action.openExtensionMonitor").then(undefined, () => { });
      }
    })
  );

  // ── Native command integrations ────────────────────────────────────────

  context.subscriptions.push(
    vscode.commands.registerCommand("cursorDrive.focusAgentView", () => {
      vscode.commands.executeCommand("workbench.action.openAgentsView").then(undefined, () => { });
      vscode.commands.executeCommand("cursor.tryAgentLayout").then(undefined, () => { });
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("cursorDrive.reloadMcp", () => {
      vscode.commands.executeCommand("mcp.reloadClient").then(
        () => { void vscode.window.showInformationMessage("Drive MCP client reloaded."); },
        () => { void vscode.window.showWarningMessage("mcp.reloadClient not available in this Cursor version."); }
      );
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("cursorDrive.openWebviewDevTools", () => {
      vscode.commands.executeCommand("workbench.action.webview.openDeveloperTools").then(undefined, () => { });
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("cursorDrive.focusDrivePanel", () => {
      void vscode.commands.executeCommand("cursorDrive.panel.focus");
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("cursorDrive.setApiKey", async () => {
      const key = await vscode.window.showInputBox({
        prompt: "Cursor API key for Cloud Agents",
        password: true,
        placeHolder: "Paste your API key from Cursor Dashboard",
      });
      if (key) {
        await context.secrets.store("cursorDrive.cursorApiKey", key);
        void vscode.window.showInformationMessage("Cursor API key stored.");
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("cursorDrive.confirmTangent", () => {
      if (resolvePendingTangentConfirm()) {
        void vscode.window.setStatusBarMessage("$(check) Tangent confirmed", 3000);
      } else {
        void vscode.window.showInformationMessage("Drive: No tangent confirmation pending.");
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("cursorDrive.injectFilesToComposer", () => {
      const activeEditor = vscode.window.activeTextEditor;
      if (!activeEditor) {
        void vscode.window.showInformationMessage("Drive: No active editor to inject.");
        return;
      }
      vscode.commands.executeCommand("composer.addfilestocomposer", [activeEditor.document.uri]).then(
        undefined,
        () => {
          void vscode.window.showWarningMessage("composer.addfilestocomposer not available in this Cursor version.");
        }
      );
    })
  );

  // ── API Discovery command ───────────────────────────────────────────────
  // Deep runtime introspection: enumerates all vscode namespaces, probes
  // vscode.cursor, vscode.lm, vscode.chat, and lists registered commands.
  // Results written to an OutputChannel and optionally to a JSON file.

  const discoveryChannel = vscode.window.createOutputChannel("Drive API Discovery");
  context.subscriptions.push(discoveryChannel);

  context.subscriptions.push(
    vscode.commands.registerCommand("cursorDrive.discoverAPIs", async () => {
      discoveryChannel.clear();
      discoveryChannel.show(true);
      discoveryChannel.appendLine("Running API discovery...\n");

      try {
        const report = await discoverAPIs();
        const formatted = formatReport(report);

        discoveryChannel.appendLine(formatted);

        // Write JSON to workspace for diffing / version tracking
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (workspaceFolder) {
          const jsonUri = vscode.Uri.joinPath(
            workspaceFolder.uri,
            ".cursor",
            "drive-api-discovery.json"
          );
          const jsonBytes = Buffer.from(JSON.stringify(report, null, 2), "utf-8");
          await vscode.workspace.fs.writeFile(jsonUri, jsonBytes);
          discoveryChannel.appendLine(`\nJSON report written to: ${jsonUri.fsPath}`);
        }

        void vscode.window.showInformationMessage(
          `API Discovery complete. ${report.hostIdentity.isCursor ? "Cursor" : "VS Code"} ` +
          `${report.hostIdentity.version} — ` +
          `${report.vscodeNamespaces.length} namespaces, ` +
          `${report.commands.cursorSpecific.length} cursor-specific commands, ` +
          `vscode.lm models: ${report.vscodeLm.selectChatModelsResult?.modelCount ?? "N/A"}`
        );
      } catch (err) {
        const msg = `API Discovery failed: ${String(err)}`;
        discoveryChannel.appendLine(msg);
        void vscode.window.showErrorMessage(msg);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("cursorDrive.discoverVoiceCommands", async () => {
      discoveryChannel.clear();
      discoveryChannel.show(true);
      discoveryChannel.appendLine("Discovering voice/chat commands...\n");
      try {
        const voiceCfg = vscode.workspace.getConfiguration("cursorDrive.voice");
        const micFallbacks = voiceCfg.get<string[]>("micCommandFallbacks", []);
        const fallbacks = Array.isArray(micFallbacks) ? micFallbacks : [];

        const result = await probeVoiceCommands(fallbacks);

        discoveryChannel.appendLine("▸ Voice command probe results\n");
        discoveryChannel.appendLine(`  Chat open (exists):     ${result.chatOpen ?? "NONE"}`);
        discoveryChannel.appendLine(`  Mic start (exists):     ${result.micStart ?? "NONE"}`);
        discoveryChannel.appendLine(`  Mic stop+submit (exists): ${result.micStopSubmit ?? "NONE"}`);
        discoveryChannel.appendLine(`  Mic stop cancel (exists):  ${result.micStopCancel ?? "NONE"}`);
        discoveryChannel.appendLine("\n▸ All chat/voice-related commands:\n");
        for (const cmd of result.allChatVoiceCommands) {
          discoveryChannel.appendLine(`  ${cmd}`);
        }

        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (workspaceFolder) {
          const jsonUri = vscode.Uri.joinPath(workspaceFolder.uri, ".cursor", "voice-commands-probe.json");
          const jsonBytes = Buffer.from(JSON.stringify(result, null, 2), "utf-8");
          await vscode.workspace.fs.writeFile(jsonUri, jsonBytes);
          discoveryChannel.appendLine(`\nProbe JSON: ${jsonUri.fsPath}`);
        }

        if (!result.micStart) {
          discoveryChannel.appendLine("\n⚠ Mic start command not found. Add a working command to cursorDrive.voice.micCommand or micCommandFallbacks.");
        }
        void vscode.window.showInformationMessage(
          result.micStart
            ? `Voice commands OK. Mic: ${result.micStart}`
            : "Voice probe: mic command not found. Check Drive API Discovery output."
        );
      } catch (err) {
        discoveryChannel.appendLine(`Error: ${String(err)}`);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("cursorDrive.discoverAllCommands", async () => {
      discoveryChannel.clear();
      discoveryChannel.show(true);
      discoveryChannel.appendLine("Discovering all commands...\n");
      try {
        const result = await discoverAllCommands();
        discoveryChannel.appendLine(`Total commands: ${result.total}\n`);
        for (const [prefix, cmds] of Object.entries(result.byPrefix).sort()) {
          discoveryChannel.appendLine(`\n--- ${prefix} (${cmds.length}) ---`);
          for (const cmd of cmds.sort()) {
            discoveryChannel.appendLine(`  ${cmd}`);
          }
        }
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (workspaceFolder) {
          const jsonUri = vscode.Uri.joinPath(workspaceFolder.uri, ".cursor", "cursor-commands-full.json");
          const jsonBytes = Buffer.from(JSON.stringify(result, null, 2), "utf-8");
          await vscode.workspace.fs.writeFile(jsonUri, jsonBytes);
          discoveryChannel.appendLine(`\nFull JSON written to: ${jsonUri.fsPath}`);
          await vscode.commands.executeCommand("vscode.open", jsonUri);
        }
        void vscode.window.showInformationMessage(
          `Discovered ${result.total} commands across ${Object.keys(result.byPrefix).length} prefixes.`
        );
      } catch (err) {
        discoveryChannel.appendLine(`Error: ${String(err)}`);
      }
    })
  );

  out.appendLine("[Drive] activate() complete");
}

export function deactivate(): void {
  if (mcpRegisteredByExtensionApi) {
    const cursorMcp = (vscode as { cursor?: { mcp?: { unregisterServer: (name: string) => void } } }).cursor?.mcp;
    if (typeof cursorMcp?.unregisterServer === "function") {
      try {
        cursorMcp.unregisterServer("drive");
        mcpRegisteredByExtensionApi = false;
      } catch {
        // Best-effort; extension is shutting down
      }
    }
  }
}
