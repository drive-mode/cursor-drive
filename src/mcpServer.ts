import * as http from "http";
import { randomUUID } from "crypto";
import * as vscode from "vscode";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import { speak, stop as ttsStop } from "./tts.js";
import { AgentScreenPanel } from "./agentScreen.js";
import { DriveModeManager, SubMode } from "./driveMode.js";
import { OperatorRegistry } from "./operatorRegistry.js";
import { SessionMemory } from "./sessionMemory.js";
import { runPipeline, getPipelineStats } from "./pipeline.js";
import { getSteeringStats } from "./approvalGates.js";
import { runCursorCli, isCursorCliAvailable, runCursorCliStreaming, createCursorCliChat, type StreamingCliRunner } from "./cursorCliRunner.js";
import type { PersistentMemory } from "./persistentMemory.js";
import { getEffectivePresetForOperator, checkPermissionForOperator } from "./toolAllowlist.js";
import { resolvePendingTangentConfirm } from "./tangentFlow.js";
import type { StateSyncCoordinator } from "./stateSyncCoordinator.js";
import type { IntegrationQueue } from "./integrationQueue.js";
import { buildAgentScreenAppHtml, AGENT_SCREEN_APP_RESOURCE_URI } from "./agentScreenApp.js";
import {
  launchAgent,
  getAgentStatus,
  getAgentConversation,
  getAgentArtifacts,
  getArtifactDownloadUrl,
  CloudAgentError,
} from "./cloudAgentClient.js";

const DEFAULT_PORT = 7891;

export interface DriveMcpServerOptions {
  port?: number;
  driveMgr: DriveModeManager;
  operatorRegistry: OperatorRegistry;
  sessionMemory: SessionMemory;
  persistentMemory?: PersistentMemory;
  getMaxConcurrent?: () => number;
  /** Mob-programming sync control plane (optional — tools registered only when present). */
  stateSyncCoordinator?: StateSyncCoordinator;
  integrationQueue?: IntegrationQueue;
  /** When true, register MCP App UI resource and augment agent_screen_* tool results with _meta.ui. */
  getEnableApps?: () => boolean;
  /** Extension path for reading bundled MCP App (CSP-compliant, no external script). */
  getExtensionPath?: () => string;
  /** Get Cursor API key for Cloud Agents. If absent, cloud agent tools are not registered. */
  getApiKey?: () => Promise<string | undefined>;
  /** Prompt user for API key and store it. Called when getApiKey returns undefined and a cloud agent tool is invoked. */
  promptAndStoreApiKey?: () => Promise<string | undefined>;
  /** Cloud Agents API base URL (default https://api.cursor.com). */
  getCloudAgentsApiBaseUrl?: () => string;
}

type A2ATaskState = "submitted" | "working" | "completed" | "failed" | "canceled";

interface A2ATaskRecord {
  id: string;
  operatorId: string;
  status: A2ATaskState;
  task: string;
  createdAt: number;
}

const CURSOR_CLI_CACHE_TTL_MS = 60_000;

interface SessionEntry {
  transport: StreamableHTTPServerTransport;
  mcpServer: McpServer;
}

function isInitializeRequest(msg: unknown): boolean {
  return typeof msg === "object" && msg !== null && "method" in msg && (msg as { method?: string }).method === "initialize";
}

function parseAndCheckInit(body: string): { parsed: unknown; isInit: boolean } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(body || "{}");
  } catch {
    return { parsed: undefined, isInit: false };
  }
  const messages = Array.isArray(parsed) ? parsed : [parsed];
  const isInit = messages.some(isInitializeRequest);
  return { parsed, isInit };
}

export class DriveMcpServer {
  private httpServer: http.Server | undefined;
  private mcpServer: McpServer;
  private transport: StreamableHTTPServerTransport;
  private port: number;
  private a2aTasks: Map<string, A2ATaskRecord> = new Map();
  private cursorCliAvailable: boolean | undefined;
  private cursorCliCacheExpiresAt = 0;
  /** Per-session transport+McpServer for multiple MCP clients (avoids "Server already initialized"). */
  private sessionMap = new Map<string, SessionEntry>();

  constructor(private opts: DriveMcpServerOptions) {
    this.port = opts.port ?? DEFAULT_PORT;
    this.mcpServer = new McpServer(
      { name: "cursor-drive", version: "0.3.0" },
      { capabilities: { tools: {} } }
    );
    this.transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
    });
    this.transport.onerror = (error) => {
      console.error("[Drive MCP] Transport error:", error);
    };
    this.registerToolsOn(this.mcpServer);
  }

  private isMcpPath(url: string | undefined): boolean {
    if (!url) { return false; }
    const pathOnly = url.split("?")[0];
    return pathOnly === "/mcp" || pathOnly === "/mcp/sse" || pathOnly === "/sse";
  }

  private async readRequestBody(req: http.IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      req.on("data", (chunk) => chunks.push(chunk));
      req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
      req.on("error", reject);
    });
  }

  private async createSession(): Promise<SessionEntry> {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
    });
    transport.onerror = (err) => console.error("[Drive MCP] Session transport error:", err);
    const mcpServer = new McpServer(
      { name: "cursor-drive", version: "0.3.0" },
      { capabilities: { tools: {} } }
    );
    this.registerToolsOn(mcpServer);
    await this.registerMcpAppResourceIfEnabledOn(mcpServer);
    return { transport, mcpServer };
  }

  private async handleMcpHttpRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    const cleanSessionId = typeof sessionId === "string" ? sessionId.trim() || undefined : undefined;

    try {
      if (req.method === "POST") {
        const body = await this.readRequestBody(req);
        const { parsed, isInit } = parseAndCheckInit(body);

        if (isInit) {
          const entry = await this.createSession();
          await entry.mcpServer.connect(entry.transport);
          await entry.transport.handleRequest(req, res, parsed);
          const sid = entry.transport.sessionId;
          if (sid) {
            this.sessionMap.set(sid, entry);
            entry.transport.onclose = () => this.sessionMap.delete(sid);
          }
          return;
        }

        if (cleanSessionId && this.sessionMap.has(cleanSessionId)) {
          const entry = this.sessionMap.get(cleanSessionId)!;
          await entry.transport.handleRequest(req, res, parsed);
          return;
        }

        if (cleanSessionId && !this.sessionMap.has(cleanSessionId)) {
          if (!res.headersSent) {
            res.writeHead(404, { "Content-Type": "application/json" });
            res.end(JSON.stringify({
              jsonrpc: "2.0",
              error: { code: -32000, message: "Session not found" },
              id: null,
            }));
          }
          return;
        }

        if (!isInit && !cleanSessionId) {
          if (!res.headersSent) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({
              jsonrpc: "2.0",
              error: { code: -32600, message: "Invalid Request: Session ID required for non-initialization requests" },
              id: null,
            }));
          }
          return;
        }
      }

      if (req.method === "GET" || req.method === "DELETE") {
        if (cleanSessionId && this.sessionMap.has(cleanSessionId)) {
          const entry = this.sessionMap.get(cleanSessionId)!;
          await entry.transport.handleRequest(req, res);
          return;
        }
        if (!res.headersSent) {
          res.writeHead(404, { "Content-Type": "application/json" });
          res.end(JSON.stringify({
            jsonrpc: "2.0",
            error: { code: -32000, message: "Session not found" },
            id: null,
          }));
        }
        return;
      }

      if (!res.headersSent) {
        res.writeHead(405, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          jsonrpc: "2.0",
          error: { code: -32000, message: "Method not allowed" },
          id: null,
        }));
      }
    } catch (error) {
      console.error(`[Drive MCP] MCP request failed (${req.method ?? "UNKNOWN"} ${req.url ?? ""}):`, error);
      if (!res.headersSent) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          jsonrpc: "2.0",
          error: {
            code: -32603,
            message: "Internal MCP transport error",
          },
          id: null,
        }));
      } else if (!res.writableEnded) {
        res.end();
      }
    }
  }

  private registerToolsOn(mcpServer: McpServer): void {
    const { driveMgr, operatorRegistry } = this.opts;
    const getMaxConcurrent = this.opts.getMaxConcurrent ?? (() => Number.MAX_SAFE_INTEGER);

    mcpServer.tool(
      "tts_speak",
      "Speak text aloud through the Drive TTS engine. Silently no-ops if TTS is disabled. [Parallel-safe]",
      {
        text: z.string().describe("Text to speak. Will be truncated to maxSpokenSentences setting."),
        voice: z.string().optional().describe("Voice name override (OS voice, Piper model, or ElevenLabs voice ID)."),
      },
      async ({ text, voice }) => {
        speak(text, voice);
        return { content: [{ type: "text" as const, text: "ok" }] };
      }
    );

    mcpServer.tool(
      "tts_stop",
      "Immediately stop any ongoing TTS speech. [Parallel-safe]",
      {},
      async () => {
        ttsStop();
        return { content: [{ type: "text" as const, text: "stopped" }] };
      }
    );

    const agentScreenActivity = async (opName: string, text: string) => {
      const panel = AgentScreenPanel.getInstance();
      if (panel) { panel.logActivity(opName, text); }
      return { content: [{ type: "text" as const, text: "ok" }] };
    };
    const agentScreenFile = async (opName: string, filePath: string) => {
      const panel = AgentScreenPanel.getInstance();
      if (panel) { panel.logFile(opName, filePath); }
      return { content: [{ type: "text" as const, text: "ok" }] };
    };
    const agentScreenDecision = async (opName: string, text: string) => {
      const panel = AgentScreenPanel.getInstance();
      if (panel) { panel.logDecision(opName, text); }
      return { content: [{ type: "text" as const, text: "ok" }] };
    };

    const enableApps = () => this.opts.getEnableApps?.() ?? false;

    mcpServer.tool(
      "agent_screen_activity",
      "Push an activity event to the Drive Agent Screen (S-AS). Use to show the user what the operator is doing. [Parallel-safe]",
      {
        operator_name: z.string().describe("Name of the operator reporting this activity."),
        text: z.string().describe("Short description of the current action (e.g. 'Reading src/auth.ts', 'Searching for login handler')."),
      },
      async ({ operator_name, text }) => {
        const base = await agentScreenActivity(operator_name, text);
        if (enableApps()) {
          return {
            content: [{ type: "text" as const, text: JSON.stringify({ kind: "activity" as const, op: operator_name, text }) }],
            _meta: { ui: { resourceUri: AGENT_SCREEN_APP_RESOURCE_URI } },
          };
        }
        return base;
      }
    );

    mcpServer.tool(
      "agent_screen_file",
      "Record a file touch in the Drive Agent Screen. Clicking the file in the panel opens it in the user's editor. [Parallel-safe]",
      {
        operator_name: z.string().describe("Name of the operator touching this file."),
        file_path: z.string().describe("Workspace-relative or absolute path to the file."),
      },
      async ({ operator_name, file_path }) => {
        const base = await agentScreenFile(operator_name, file_path);
        if (enableApps()) {
          return {
            content: [{ type: "text" as const, text: JSON.stringify({ kind: "file" as const, op: operator_name, file_path }) }],
            _meta: { ui: { resourceUri: AGENT_SCREEN_APP_RESOURCE_URI } },
          };
        }
        return base;
      }
    );

    mcpServer.tool(
      "agent_screen_decision",
      "Record a key decision or reasoning step in the Drive Agent Screen Decisions tab. [Parallel-safe]",
      {
        operator_name: z.string().describe("Name of the operator making this decision."),
        text: z.string().describe("Decision or reasoning to record (e.g. 'Chose token bucket over leaky bucket for rate limiting')."),
      },
      async ({ operator_name, text }) => {
        const base = await agentScreenDecision(operator_name, text);
        if (enableApps()) {
          return {
            content: [{ type: "text" as const, text: JSON.stringify({ kind: "decision" as const, op: operator_name, text }) }],
            _meta: { ui: { resourceUri: AGENT_SCREEN_APP_RESOURCE_URI } },
          };
        }
        return base;
      }
    );

    mcpServer.tool(
      "agent_screen_plan_update",
      "Push plan progress to the Drive Agent Screen. When showPlanProgress is enabled, displays active plan name, TODO counts, and current in-progress TODO. [Parallel-safe]",
      {
        plan_id: z.string().describe("Plan ID (e.g. 'terminology-sas-overhaul'). Used to derive .plan.md path for open-on-click."),
        plan_name: z.string().describe("Human-readable plan name."),
        completed_count: z.number().describe("Number of completed TODOs."),
        total_count: z.number().describe("Total number of TODOs."),
        current_todo: z.string().optional().describe("The currently in_progress TODO content (clickable to open plan file)."),
      },
      async ({ plan_id, plan_name, completed_count, total_count, current_todo }) => {
        AgentScreenPanel.getInstance()?.updatePlanProgress(
          plan_id,
          plan_name,
          completed_count,
          total_count,
          current_todo
        );
        return { content: [{ type: "text" as const, text: "ok" }] };
      }
    );

    const pm = this.opts.persistentMemory;
    if (pm) {
      mcpServer.tool(
        "persistent_memory_append",
        "Append a note to today's daily log in .drive/memory/. [Sequential]",
        {
          note: z.string().describe("Note to append."),
          agent: z.string().optional().describe("Operator name for attribution."),
        },
        async ({ note, agent }) => {
          await pm.appendToDaily(note, agent);
          return { content: [{ type: "text" as const, text: "ok" }] };
        }
      );
      mcpServer.tool(
        "persistent_memory_search",
        "Search daily log files by keyword (BM25-lite). Returns top matches with snippets. [Parallel-safe]",
        {
          query: z.string().describe("Search query."),
          top_k: z.number().optional().describe("Max results (default 5)."),
        },
        async ({ query, top_k }) => {
          const results = await pm.search(query, top_k ?? 5);
          return { content: [{ type: "text" as const, text: JSON.stringify(results, null, 2) }] };
        }
      );
      mcpServer.tool(
        "persistent_memory_write_curated",
        "Write (overwrite) the curated MEMORY.md file. Use for long-term facts the user wants to remember. [Sequential]",
        { content: z.string().describe("Full content for MEMORY.md.") },
        async ({ content }) => {
          await pm.writeCurated(content);
          return { content: [{ type: "text" as const, text: "ok" }] };
        }
      );
      mcpServer.tool(
        "persistent_memory_context",
        "Build prompt context from curated + today/yesterday logs. Returns concatenated markdown for injection. [Parallel-safe]",
        {},
        async () => {
          const ctx = await pm.buildPromptContext();
          return { content: [{ type: "text" as const, text: ctx || "(no memory)" }] };
        }
      );
    }

    // Deprecated aliases for agent_screen_*
    mcpServer.tool(
      "share_screen_activity",
      "[Deprecated] Use agent_screen_activity instead. Push an activity event to the Drive Agent Screen.",
      { agent_name: z.string(), text: z.string() },
      async ({ agent_name, text }) => {
        console.warn("[Drive MCP] Tool share_screen_activity is deprecated; use agent_screen_activity instead.");
        return agentScreenActivity(agent_name, text);
      }
    );
    mcpServer.tool(
      "share_screen_file",
      "[Deprecated] Use agent_screen_file instead. Record a file touch in the Drive Agent Screen.",
      { agent_name: z.string(), file_path: z.string() },
      async ({ agent_name, file_path }) => {
        console.warn("[Drive MCP] Tool share_screen_file is deprecated; use agent_screen_file instead.");
        return agentScreenFile(agent_name, file_path);
      }
    );
    mcpServer.tool(
      "share_screen_decision",
      "[Deprecated] Use agent_screen_decision instead. Record a decision in the Drive Agent Screen.",
      { agent_name: z.string(), text: z.string() },
      async ({ agent_name, text }) => {
        console.warn("[Drive MCP] Tool share_screen_decision is deprecated; use agent_screen_decision instead.");
        return agentScreenDecision(agent_name, text);
      }
    );

    mcpServer.tool(
      "drive_set_mode",
      "Change the active Drive meta-mode. Valid modes: off, plan, agent, ask, debug. [Parallel-safe]",
      {
        mode: z.enum(["off", "plan", "agent", "ask", "debug"]).describe("Target Drive mode."),
      },
      async ({ mode }) => {
        if (mode === "off") {
          const requireConfirm = vscode.workspace.getConfiguration("cursorDrive").get<boolean>("modeSwitching.requireConfirmation", true);
          if (requireConfirm) {
            const choice = await vscode.window.showQuickPick(
              [{ label: "Yes", description: "Turn Drive off" }, { label: "No", description: "Keep Drive on" }],
              { title: "Switch Drive to off?", placeHolder: "Confirm mode switch" }
            );
            if (choice?.label !== "Yes") {
              return { content: [{ type: "text" as const, text: "mode switch cancelled by user" }] };
            }
          }
          driveMgr.setSubMode("off");
          driveMgr.setActive(false);
          return { content: [{ type: "text" as const, text: "mode set to off" }] };
        }
        const subModeMap: Record<string, SubMode> = {
          ask: "ask",
          agent: "agent",
          plan: "plan",
          debug: "debug",
        };
        const subMode = subModeMap[mode] ?? "agent";
        const requireConfirm = vscode.workspace.getConfiguration("cursorDrive").get<boolean>("modeSwitching.requireConfirmation", true);
        if (requireConfirm) {
          const choice = await vscode.window.showQuickPick(
            [{ label: "Yes", description: `Switch to ${mode} mode` }, { label: "No", description: "Keep current mode" }],
            { title: `Switch Drive to ${mode}?`, placeHolder: "Confirm mode switch" }
          );
          if (choice?.label !== "Yes") {
            return { content: [{ type: "text" as const, text: "mode switch cancelled by user" }] };
          }
        }
        driveMgr.setSubMode(subMode as SubMode);
        driveMgr.setActive(true);
        return { content: [{ type: "text" as const, text: `mode set to ${mode}` }] };
      }
    );

    mcpServer.tool(
      "cursor_cli_run",
      "Run a prompt through Cursor CLI (agent -p \"...\") using the user's Cursor subscription. Use for headless or scripted coding tasks; output is returned when the run finishes or times out. [Sequential]",
      {
        prompt: z.string().describe("The prompt to send to Cursor CLI (e.g. 'fix the bug in src/auth.ts')."),
        timeout_seconds: z.number().optional().describe("Override timeout in seconds (60–3600). Default from cursorDrive.cursorCli.timeoutSeconds."),
        worktree_name: z.string().optional().describe("Run in an isolated git worktree with this name (e.g. operator id/name). Worktree is created at ~/.cursor/worktrees/<repo>/<name>."),
        worktree_base: z.string().optional().describe("Branch/ref to base the worktree on (default: HEAD). Only used when worktree_name is set."),
        resume_chat_id: z.string().optional().describe("Resume a prior CLI session by chatId (from cursor_cli_create_chat) for multi-turn context continuity."),
        force: z.boolean().optional().describe("Force-allow all commands without confirmation (--force). Use with care."),
        model: z.string().optional().describe("Model override (e.g. 'claude-sonnet-4', 'gpt-5'). Defaults to user's configured model."),
        mode: z.enum(["plan", "ask"]).optional().describe("Agent mode: 'plan' (read-only planning) or 'ask' (Q&A, no edits). Omit for full agent."),
      },
      async ({ prompt, timeout_seconds, worktree_name, worktree_base, resume_chat_id, force, model, mode }) => {
        const fg = operatorRegistry.getForeground();
        if (fg && !checkPermissionForOperator(fg, "terminalExecute")) {
          return {
            content: [{ type: "text" as const, text: `Permission denied: operator "${fg.name}" (preset: ${fg.permissionPreset}) does not have terminalExecute permission.` }],
            isError: true,
          };
        }
        const timeoutMs = timeout_seconds ? Math.min(3600, Math.max(60, timeout_seconds)) * 1000 : undefined;
        const result = await runCursorCli(prompt.trim(), {
          timeoutMs,
          worktree: worktree_name,
          worktreeBase: worktree_base,
          resumeChatId: resume_chat_id,
          force,
          model,
          mode,
        });
        if (result.error) {
          return {
            content: [{ type: "text" as const, text: `Cursor CLI error: ${result.error}${result.stderr ? `\nstderr: ${result.stderr}` : ""}` }],
            isError: true,
          };
        }
        const parts: string[] = [result.stdout];
        if (result.timedOut) parts.push("[Timed out]");
        if (result.stderr) parts.push(`stderr: ${result.stderr}`);
        return { content: [{ type: "text" as const, text: parts.join("\n") }] };
      }
    );

    mcpServer.tool(
      "cursor_cli_create_chat",
      "Create a new empty Cursor CLI chat session and return its chatId. Pass the chatId as resume_chat_id to subsequent cursor_cli_run calls to maintain multi-turn conversation context. [Parallel-safe]",
      {},
      async () => {
        const chatId = await createCursorCliChat();
        if (!chatId) {
          return {
            content: [{ type: "text" as const, text: "Failed to create chat session. Is Cursor CLI available and authenticated?" }],
            isError: true,
          };
        }
        return { content: [{ type: "text" as const, text: chatId }] };
      }
    );

    mcpServer.tool(
      "cursor_cli_run_streaming",
      "Run Cursor CLI with a prompt and stream NDJSON events to the Agent Screen in real time. Returns accumulated stdout when done.",
      {
        prompt: z.string().describe("The prompt to send to the Cursor CLI agent"),
        timeout_seconds: z.number().optional().describe("Override timeout in seconds (default: from config)"),
        worktree_name: z.string().optional().describe("Run in an isolated git worktree with this name (e.g. operator id/name)."),
        worktree_base: z.string().optional().describe("Branch/ref to base the worktree on (default: HEAD). Only used when worktree_name is set."),
        resume_chat_id: z.string().optional().describe("Resume a prior CLI session by chatId for multi-turn continuity."),
        force: z.boolean().optional().describe("Force-allow all commands without confirmation (--force)."),
        model: z.string().optional().describe("Model override (e.g. 'claude-sonnet-4', 'gpt-5')."),
        mode: z.enum(["plan", "ask"]).optional().describe("Agent mode: 'plan' or 'ask'. Omit for full agent."),
      },
      async ({ prompt, timeout_seconds, worktree_name, worktree_base, resume_chat_id, force, model, mode }) => {
        const fg = operatorRegistry.getForeground();
        if (fg && !checkPermissionForOperator(fg, "terminalExecute")) {
          return {
            content: [{ type: "text" as const, text: `Permission denied: operator "${fg.name}" (preset: ${fg.permissionPreset}) does not have terminalExecute permission.` }],
            isError: true,
          };
        }
        const agentScreen = AgentScreenPanel.getInstance();
        const timeoutMs = timeout_seconds ? timeout_seconds * 1000 : undefined;

        return new Promise((resolve) => {
          let accumulated = "";
          const runner: StreamingCliRunner = runCursorCliStreaming(prompt, {
            timeoutMs,
            worktree: worktree_name,
            worktreeBase: worktree_base,
            resumeChatId: resume_chat_id,
            force,
            model,
            mode,
          });

          runner.on("data", (event) => {
            accumulated += (event.text ?? "");
            if (agentScreen) {
              agentScreen.postEvent({
                type: "cliStream",
                cliStreamType: event.type === "unknown" ? "assistant" : event.type,
                cliToolName: event.toolName,
                text: event.text,
                timestamp: Date.now(),
              });
            }
            const foreground = this.opts.operatorRegistry.getForeground();
            if (foreground) {
              this.opts.operatorRegistry.emitProgress?.(foreground.id, event.text ?? "");
            }
          });

          runner.on("close", (exitCode) => {
            resolve({
              content: [{ type: "text" as const, text: accumulated || `(no output, exit code: ${exitCode})` }],
            });
          });
        });
      }
    );

    // ── Cloud Agent tools (require full preset, getApiKey + promptAndStoreApiKey) ──
    if (this.opts.getApiKey && this.opts.promptAndStoreApiKey) {
      const getCloudAgentConfig = (apiKey: string) => ({
        apiBaseUrl: (this.opts.getCloudAgentsApiBaseUrl?.() ?? "https://api.cursor.com").replace(/\/$/, ""),
        apiKey,
      });

      mcpServer.tool(
        "cloud_agent_launch",
        "Launch a Cursor Cloud Agent for a coding task. Returns agent ID for status polling. Requires cursorDrive.cursorApiKey (run cursorDrive.setApiKey if absent). [Sequential]",
        {
          repository: z.string().describe("GitHub repo slug (owner/repo)."),
          prompt: z.string().describe("Task description for the cloud agent."),
          branch: z.string().optional().describe("Target branch (default: auto-generated)."),
          model: z.string().optional().describe("Model override (e.g. 'claude-sonnet-4')."),
        },
        async ({ repository, prompt, branch, model }) => {
          const fg = operatorRegistry.getForeground();
          if (fg && !checkPermissionForOperator(fg, "webSearch")) {
            return {
              content: [{ type: "text" as const, text: `Permission denied: operator "${fg.name}" (preset: ${fg.permissionPreset}) does not have webSearch permission. Cloud agents require "full" preset.` }],
              isError: true,
            };
          }
          let apiKey = await this.opts.getApiKey!();
          if (!apiKey) {
            apiKey = await this.opts.promptAndStoreApiKey!();
          }
          if (!apiKey) {
            return {
              content: [{ type: "text" as const, text: "API key required. Run cursorDrive.setApiKey or provide it when prompted." }],
              isError: true,
            };
          }
          const config = getCloudAgentConfig(apiKey);
          try {
            const result = await launchAgent({ repository, prompt, branch, model }, config);
            const panel = AgentScreenPanel.getInstance();
            if (panel) {
              panel.postEvent({
                type: "cloudAgentStatus",
                cloudAgentId: result.agentId,
                cloudStatus: result.status,
                prUrl: result.prUrl,
                timestamp: Date.now(),
              });
            }
            const pollIntervalMs = 10_000;
            const intervalId = setInterval(async () => {
              try {
                const status = await getAgentStatus(result.agentId, config);
                if (panel) {
                  panel.postEvent({
                    type: "cloudAgentStatus",
                    cloudAgentId: result.agentId,
                    cloudStatus: status.status,
                    prUrl: status.prUrl,
                    timestamp: Date.now(),
                  });
                }
                const terminal = ["finished", "error", "expired", "failed"].includes(status.status);
                if (terminal) {
                  clearInterval(intervalId);
                  if (status.status === "finished") {
                    try {
                      const conv = await getAgentConversation(result.agentId, config);
                      const excerpt = conv.messages
                        .slice(-3)
                        .map((m) => `${m.role}: ${m.text.slice(0, 100)}`)
                        .join("\n");
                      if (panel && excerpt) {
                        panel.postEvent({
                          type: "activity",
                          operatorName: "CloudAgent",
                          text: `Conversation excerpt:\n${excerpt}`,
                          timestamp: Date.now(),
                        });
                      }
                    } catch {
                      // ignore
                    }
                    // Fetch artifacts and post cloudAgentArtifact events
                    try {
                      const { artifacts } = await getAgentArtifacts(result.agentId, config);
                      for (const art of artifacts) {
                        const ext = art.absolutePath.split(".").pop()?.toLowerCase() ?? "";
                        const artifactType = /^(mp4|webm|mov)$/.test(ext) ? "video" : /^(png|jpg|jpeg|gif|webp)$/.test(ext) ? "screenshot" : "log";
                        const { url } = await getArtifactDownloadUrl(result.agentId, art.absolutePath, config);
                        const label = art.absolutePath.split("/").pop() ?? art.absolutePath;
                        if (panel && url) {
                          panel.postEvent({
                            type: "cloudAgentArtifact",
                            cloudAgentId: result.agentId,
                            artifactType,
                            artifactUrl: url,
                            artifactLabel: label,
                            timestamp: Date.now(),
                          });
                        }
                      }
                    } catch {
                      // ignore artifact fetch failures
                    }
                  }
                }
              } catch {
                clearInterval(intervalId);
              }
            }, pollIntervalMs);
            return {
              content: [{
                type: "text" as const,
                text: JSON.stringify({
                  agent_id: result.agentId,
                  status: result.status,
                  dashboard_url: result.dashboardUrl,
                  pr_url: result.prUrl,
                }),
              }],
            };
          } catch (err) {
            const e = err instanceof CloudAgentError ? err : new CloudAgentError(String(err), 0, "launch");
            let msg = e.message;
            if (e.status === 401 || e.status === 403) {
              msg = "Re-authenticate: run cursorDrive.setApiKey to set a valid API key.";
            } else if (e.status === 404) {
              msg = "Agent not found. Check the agent ID.";
            } else if (e.status === 409) {
              msg = "Conflict: agent may already exist or be in a conflicting state.";
            } else if (e.status === 429) {
              msg = "Rate limit exceeded. Wait before retrying.";
            } else if (e.status >= 500) {
              msg = "Server error. Retry later.";
            }
            return { content: [{ type: "text" as const, text: msg }], isError: true };
          }
        }
      );

      mcpServer.tool(
        "cloud_agent_status",
        "Poll a cloud agent's status and surface progress in the Agent Screen. Returns current status, conversation summary, and PR URL if available. [Parallel-safe]",
        {
          agent_id: z.string().describe("Agent ID from cloud_agent_launch."),
          include_conversation: z.boolean().optional().describe("Include recent conversation messages (default false)."),
        },
        async ({ agent_id, include_conversation }) => {
          const fg = operatorRegistry.getForeground();
          if (fg && !checkPermissionForOperator(fg, "webSearch")) {
            return {
              content: [{ type: "text" as const, text: `Permission denied: operator "${fg.name}" does not have webSearch permission. Cloud agents require "full" preset.` }],
              isError: true,
            };
          }
          let apiKey = await this.opts.getApiKey!();
          if (!apiKey) {
            apiKey = await this.opts.promptAndStoreApiKey!();
          }
          if (!apiKey) {
            return {
              content: [{ type: "text" as const, text: "API key required. Run cursorDrive.setApiKey." }],
              isError: true,
            };
          }
          const config = getCloudAgentConfig(apiKey);
          try {
            const status = await getAgentStatus(agent_id, config);
            const panel = AgentScreenPanel.getInstance();
            if (panel) {
              panel.postEvent({
                type: "cloudAgentStatus",
                cloudAgentId: agent_id,
                cloudStatus: status.status,
                prUrl: status.prUrl,
                timestamp: Date.now(),
              });
            }
            const payload: Record<string, unknown> = {
              status: status.status,
              pr_url: status.prUrl,
              summary: status.summary,
            };
            if (include_conversation && (status.status === "finished" || status.status === "error")) {
              try {
                const conv = await getAgentConversation(agent_id, config);
                payload.recent_messages = conv.messages.slice(-5);
              } catch {
                // ignore
              }
            }
            return { content: [{ type: "text" as const, text: JSON.stringify(payload, null, 2) }] };
          } catch (err) {
            const e = err instanceof CloudAgentError ? err : new CloudAgentError(String(err), 0, "status");
            let msg = e.message;
            if (e.status === 401 || e.status === 403) {
              msg = "Re-authenticate: run cursorDrive.setApiKey.";
            } else if (e.status === 404) {
              msg = "Agent not found.";
            } else if (e.status === 429) {
              msg = "Rate limit exceeded.";
            } else if (e.status >= 500) {
              msg = "Server error. Retry later.";
            }
            return { content: [{ type: "text" as const, text: msg }], isError: true };
          }
        }
      );
    }

    const operatorSpawn = async (
      name: string | undefined,
      task: string,
      parentId?: string,
      preset?: "readonly" | "standard" | "full",
      role?: "implementer" | "reviewer" | "tester" | "researcher" | "planner"
    ) => {
      const maxConcurrent = Math.max(1, getMaxConcurrent());
      if (operatorRegistry.activeCount() >= maxConcurrent) {
        return {
          content: [{ type: "text" as const, text: `max concurrent operators (${maxConcurrent}) reached` }],
          isError: true,
        };
      }
      const options: Record<string, unknown> = {};
      if (parentId) { options.parentId = parentId; }
      if (preset) { options.preset = preset; }
      if (role) { options.role = role; }
      const op = operatorRegistry.spawn(name, task, Object.keys(options).length > 0 ? options as any : undefined);
      const roleLabel = op.role ? ` [${op.role}]` : "";
      AgentScreenPanel.getInstance()?.logActivity("Drive", `Spawned operator ${op.name}${roleLabel}: ${task}`);
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            id: op.id,
            name: op.name,
            task: op.task,
            depth: op.depth,
            parentId: op.parentId,
            permissionPreset: op.permissionPreset,
            role: op.role,
            systemHint: op.systemHint,
          }),
        }],
      };
    };

    const operatorSwitch = async (nameOrId: string) => {
      const op = operatorRegistry.switchTo(nameOrId);
      if (!op) {
        return { content: [{ type: "text" as const, text: `operator not found: ${nameOrId}` }], isError: true };
      }
      AgentScreenPanel.getInstance()?.switchAgent(op.name);
      return { content: [{ type: "text" as const, text: `switched to ${op.name}` }] };
    };

    const getActiveOperatorPermissions = () => {
      const fg = operatorRegistry.getForeground();
      return fg ? getEffectivePresetForOperator(fg) : undefined;
    };

    const operatorList = async () => {
      const operators = operatorRegistry.getActive().map((o) => ({
        id: o.id,
        name: o.name,
        task: o.task,
        status: o.status,
        depth: o.depth,
        parentId: o.parentId,
        permissionPreset: o.permissionPreset,
        effectivePreset: getEffectivePresetForOperator(o),
        role: o.role,
      }));
      const fgPreset = getActiveOperatorPermissions();
      const payload = fgPreset !== undefined ? { operators, foregroundEffectivePreset: fgPreset } : { operators };
      return { content: [{ type: "text" as const, text: JSON.stringify(payload, null, 2) }] };
    };

    const operatorMerge = async (source: string, target: string) => {
      const ok = operatorRegistry.merge(source, target);
      if (ok) { AgentScreenPanel.getInstance()?.logActivity("Drive", `Merged ${source} into ${target}`); }
      return { content: [{ type: "text" as const, text: ok ? "merged" : "one or both operators not found" }] };
    };

    mcpServer.tool(
      "operator_spawn",
      "Spawn a new named operator for a parallel task (tangent). Supports semantic roles that set default permissions and behavior hints. Returns operator metadata including role and systemHint. [Parallel-safe]",
      {
        name: z.string().optional().describe("Name for the new operator. If omitted, the next default name (Beta, Gamma, etc.) is used."),
        task: z.string().describe("Description of the task this operator should work on."),
        parent_id: z.string().optional().describe("ID of the parent operator delegating to this one."),
        preset: z.enum(["readonly", "standard", "full"]).optional().describe("Permission preset (capped by parent if parent_id given). Overrides role default."),
        role: z.enum(["implementer", "reviewer", "tester", "researcher", "planner"]).optional().describe("Semantic role. Sets default preset and system prompt hint. implementer=standard, reviewer/researcher/planner=readonly, tester=standard."),
      },
      async ({ name, task, parent_id, preset, role }) => operatorSpawn(name, task, parent_id, preset, role)
    );

    mcpServer.tool(
      "operator_switch",
      "Switch the foreground operator by name or id. The Agent Screen will update to show the new operator's work. [Sequential]",
      { name_or_id: z.string().describe("Operator name (e.g. 'Beta') or operator id.") },
      async ({ name_or_id }) => operatorSwitch(name_or_id)
    );

    mcpServer.tool(
      "operator_list",
      "List all active operators with their names, tasks, and status. [Parallel-safe]",
      {},
      operatorList
    );

    mcpServer.tool(
      "operator_pause",
      "Pause an active/background operator by name or id. [Sequential]",
      { name_or_id: z.string().describe("Operator name or id to pause.") },
      async ({ name_or_id }) => {
        const ok = operatorRegistry.pause(name_or_id);
        return { content: [{ type: "text" as const, text: ok ? "paused" : "not found" }] };
      }
    );

    mcpServer.tool(
      "operator_resume",
      "Resume a paused operator by name or id. [Sequential]",
      { name_or_id: z.string().describe("Operator name or id to resume.") },
      async ({ name_or_id }) => {
        const ok = operatorRegistry.resume(name_or_id);
        return { content: [{ type: "text" as const, text: ok ? "resumed" : "not found or not paused" }] };
      }
    );

    mcpServer.tool(
      "operator_dismiss",
      "Dismiss (deactivate) an operator by name or id. [Sequential]",
      { name_or_id: z.string().describe("Operator name or id to dismiss.") },
      async ({ name_or_id }) => {
        const ok = operatorRegistry.dismiss(name_or_id);
        return { content: [{ type: "text" as const, text: ok ? "dismissed" : "not found" }] };
      }
    );

    mcpServer.tool(
      "operator_confirm_tangent",
      "Confirm a pending tangent agent on behalf of the user. Use when delegateConfirmation is enabled and a tangent agent is awaiting confirmation. [Parallel-safe]",
      {},
      async () => {
        const ok = resolvePendingTangentConfirm();
        return { content: [{ type: "text" as const, text: ok ? "confirmed" : "no pending confirmation" }] };
      }
    );

    mcpServer.tool(
      "operator_search_history",
      "Search transcript/memory history for previous user requests. Returns matching snippets from daily logs. Requires transcriptPersistence to be enabled for results. [Parallel-safe]",
      {
        query: z.string().describe("Search query (keywords)."),
        top_k: z.number().optional().describe("Max results to return (default 5)."),
      },
      async ({ query, top_k }) => {
        const pm = this.opts.persistentMemory;
        if (!pm) {
          return { content: [{ type: "text" as const, text: JSON.stringify({ results: [], message: "Persistent memory not configured" }) }] };
        }
        const results = await pm.search(query, top_k ?? 5);
        return { content: [{ type: "text" as const, text: JSON.stringify(results, null, 2) }] };
      }
    );

    mcpServer.tool(
      "drive_run_pipeline",
      "Run the Drive prompt pipeline (filler-clean, sanitize, route, etc.). Use when processing a user prompt with Drive active. Pass operator_id for operator-scoped session memory. [Sequential]",
      {
        prompt: z.string().describe("Raw user prompt to process."),
        operator_id: z.string().optional().describe("Operator id or name for scoped session memory (uses forOperator visibility)."),
      },
      async ({ prompt, operator_id }) => {
        const op = operator_id ? operatorRegistry.findByNameOrId(operator_id) : undefined;
        const sessionMemory = op
          ? this.opts.sessionMemory.forOperator(op.id, op.visibility)
          : this.opts.sessionMemory;
        const result = await runPipeline(prompt, {
          driveActive: driveMgr.active,
          driveSubMode: driveMgr.subMode,
          sessionMemory,
          setActive: (active) => driveMgr.setActive(active),
          operatorRegistry,
          persistentMemory: this.opts.persistentMemory,
        });
        if (result.ok === true) {
          this.opts.sessionMemory.addTurn(result.prompt.slice(0, 200));
          const payload: Record<string, unknown> = { prompt: result.prompt, route: result.route, model: result.model };
          if (result.tangentAck) { payload.tangentAck = result.tangentAck; }
          return {
            content: [{ type: "text" as const, text: JSON.stringify(payload) }],
          };
        }
        const errorPayload = result.ok === false
          ? { blocked: true, gateResult: result.gateResult }
          : { blocked: true, checkpoint: result.reason };
        return {
          content: [{ type: "text" as const, text: JSON.stringify(errorPayload) }],
          isError: true,
        };
      }
    );

    mcpServer.tool(
      "drive_pipeline_stats",
      "Get runtime statistics for the Drive prompt pipeline: total runs, success/block/tangent counts, average latency. Useful for monitoring operator behavior and pipeline health. [Parallel-safe]",
      {},
      async () => {
        const stats = getPipelineStats();
        return { content: [{ type: "text" as const, text: JSON.stringify(stats, null, 2) }] };
      }
    );

    mcpServer.tool(
      "drive_steering_stats",
      "Get runtime statistics for the steering/approval-gate system: total checks, action counts by type (allow/log/warn/block), per-operator action counts, and recent blocks. Useful for tuning safety policies. [Parallel-safe]",
      {},
      async () => {
        const raw = getSteeringStats();
        const stats = {
          totalChecks: raw.totalChecks,
          actionCounts: raw.actionCounts,
          operatorActionCounts: Object.fromEntries(raw.operatorActionCounts),
          recentBlocks: raw.recentBlocks.slice(-10),
        };
        return { content: [{ type: "text" as const, text: JSON.stringify(stats, null, 2) }] };
      }
    );

    mcpServer.tool(
      "operator_merge",
      "Merge a source operator's memory and context into a target operator, then deactivate the source. [Sequential]",
      {
        source: z.string().describe("Name or id of the operator to merge FROM."),
        target: z.string().describe("Name or id of the operator to merge INTO."),
      },
      async ({ source, target }) => operatorMerge(source, target)
    );

    mcpServer.tool(
      "operator_update_memory",
      "Append a string to a named operator's memory array. Memory is used when merging operators. [Parallel-safe]",
      {
        name_or_id: z.string().describe("Operator name or id."),
        entry: z.string().describe("String to append to memory."),
      },
      async ({ name_or_id, entry }) => {
        operatorRegistry.updateMemory(name_or_id, entry);
        return { content: [{ type: "text" as const, text: "ok" }] };
      }
    );

    mcpServer.tool(
      "operator_set_visibility",
      "Set operator visibility mode: isolated (no shared context), shared (default), or collaborative. [Sequential]",
      {
        name_or_id: z.string().describe("Operator name or id."),
        visibility: z.enum(["isolated", "shared", "collaborative"]).describe("Visibility mode."),
      },
      async ({ name_or_id, visibility }) => {
        const ok = operatorRegistry.setVisibility(name_or_id, visibility);
        return { content: [{ type: "text" as const, text: ok ? "ok" : "not found" }] };
      }
    );

    mcpServer.tool(
      "operator_escalate",
      "Signal that an operator is blocked or needs help. Notifies the lead operator or user via the Agent Screen and comms agent. Use when an operator hits permission boundaries, encounters unexpected errors, or needs human input. [Parallel-safe]",
      {
        name_or_id: z.string().describe("Operator name or id that is escalating."),
        reason: z.string().describe("Why the operator is blocked or needs help."),
        severity: z.enum(["info", "warning", "critical"]).optional().describe("Escalation severity (default: warning)."),
      },
      async ({ name_or_id, reason, severity }) => {
        const ok = operatorRegistry.escalate(name_or_id, reason, severity ?? "warning");
        if (!ok) {
          return { content: [{ type: "text" as const, text: "operator not found" }], isError: true };
        }
        const op = operatorRegistry.findByNameOrId(name_or_id);
        const label = severity === "critical" ? "🔴" : severity === "info" ? "ℹ️" : "⚠️";
        AgentScreenPanel.getInstance()?.logDecision("Drive/Escalation", `${label} ${op?.name ?? name_or_id}: ${reason}`);
        return { content: [{ type: "text" as const, text: JSON.stringify({ escalated: true, severity: severity ?? "warning", operator: op?.name }) }] };
      }
    );

    mcpServer.tool(
      "operator_delegate",
      "Delegate a task from one operator to another. Spawns target if it doesn't exist. Creates a directed edge in the task graph. [Sequential]",
      {
        from_name_or_id: z.string().describe("Operator delegating FROM."),
        to_name_or_id: z.string().describe("Operator to delegate TO (spawned if absent)."),
        task: z.string().describe("Task description to delegate."),
      },
      async ({ from_name_or_id, to_name_or_id, task }) => {
        const target = operatorRegistry.delegate(from_name_or_id, to_name_or_id, task);
        if (!target) {
          return { content: [{ type: "text" as const, text: "source operator not found" }], isError: true };
        }
        AgentScreenPanel.getInstance()?.logActivity("Drive", `Delegated to ${target.name}: ${task}`);
        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify({
              id: target.id,
              name: target.name,
              task,
              depth: target.depth,
              parentId: target.parentId,
              permissionPreset: target.permissionPreset,
            }),
          }],
        };
      }
    );

    // Deprecated aliases for operator_*
    mcpServer.tool(
      "agent_spawn",
      "[Deprecated] Use operator_spawn instead. Spawn a new named operator for a parallel task.",
      { name: z.string().optional(), task: z.string() },
      async ({ name, task }) => {
        console.warn("[Drive MCP] Tool agent_spawn is deprecated; use operator_spawn instead.");
        return operatorSpawn(name, task);
      }
    );
    mcpServer.tool(
      "agent_switch",
      "[Deprecated] Use operator_switch instead. Switch the foreground operator.",
      { name_or_id: z.string() },
      async ({ name_or_id }) => {
        console.warn("[Drive MCP] Tool agent_switch is deprecated; use operator_switch instead.");
        return operatorSwitch(name_or_id);
      }
    );
    mcpServer.tool(
      "agent_list",
      "[Deprecated] Use operator_list instead. List all active operators.",
      {},
      async () => {
        console.warn("[Drive MCP] Tool agent_list is deprecated; use operator_list instead.");
        return operatorList();
      }
    );
    mcpServer.tool(
      "agent_pause",
      "[Deprecated] Use operator_pause instead. Pause an operator.",
      { name_or_id: z.string() },
      async ({ name_or_id }) => {
        console.warn("[Drive MCP] Tool agent_pause is deprecated; use operator_pause instead.");
        const ok = operatorRegistry.pause(name_or_id);
        return { content: [{ type: "text" as const, text: ok ? "paused" : "not found" }] };
      }
    );
    mcpServer.tool(
      "agent_resume",
      "[Deprecated] Use operator_resume instead. Resume a paused operator.",
      { name_or_id: z.string() },
      async ({ name_or_id }) => {
        console.warn("[Drive MCP] Tool agent_resume is deprecated; use operator_resume instead.");
        const ok = operatorRegistry.resume(name_or_id);
        return { content: [{ type: "text" as const, text: ok ? "resumed" : "not found or not paused" }] };
      }
    );
    mcpServer.tool(
      "agent_dismiss",
      "[Deprecated] Use operator_dismiss instead. Dismiss an operator.",
      { name_or_id: z.string() },
      async ({ name_or_id }) => {
        console.warn("[Drive MCP] Tool agent_dismiss is deprecated; use operator_dismiss instead.");
        const ok = operatorRegistry.dismiss(name_or_id);
        return { content: [{ type: "text" as const, text: ok ? "dismissed" : "not found" }] };
      }
    );
    mcpServer.tool(
      "agent_merge",
      "[Deprecated] Use operator_merge instead. Merge source operator into target.",
      { source: z.string(), target: z.string() },
      async ({ source, target }) => {
        console.warn("[Drive MCP] Tool agent_merge is deprecated; use operator_merge instead.");
        return operatorMerge(source, target);
      }
    );

    // ── Sync control plane tools (mob-programming cockpit) ────────────────
    this.registerSyncToolsOn(mcpServer);
  }

  /** Register sync/proposal MCP tools when the coordinator is available. */
  private registerSyncToolsOn(mcpServer: McpServer): void {
    const coordinator = this.opts.stateSyncCoordinator;
    const queue = this.opts.integrationQueue;
    if (!coordinator) { return; }

    mcpServer.tool(
      "operator_sync_status",
      "Get the current sync status snapshot: user branch/head, per-operator workspace state, and active proposals. [Parallel-safe]",
      {},
      async () => {
        const snapshot = await coordinator.computeSnapshot();
        return { content: [{ type: "text" as const, text: JSON.stringify(snapshot, null, 2) }] };
      }
    );

    mcpServer.tool(
      "operator_sync_proposals",
      "List sync proposals with optional filtering by operator or status. [Parallel-safe]",
      {
        operator_id: z.string().optional().describe("Filter proposals by operator ID."),
        status: z.string().optional().describe("Filter proposals by status (e.g. 'pending_review', 'approved')."),
      },
      async ({ operator_id, status }) => {
        let proposals = await coordinator.getActiveProposals();
        // Also include terminal proposals if a specific filter is given
        if (status) {
          const all = (await coordinator.computeSnapshot()).proposals;
          proposals = all.filter((p) => p.status === status);
        }
        if (operator_id) {
          proposals = proposals.filter((p) => p.operatorId === operator_id);
        }
        return { content: [{ type: "text" as const, text: JSON.stringify(proposals, null, 2) }] };
      }
    );

    mcpServer.tool(
      "operator_sync_approve",
      "Approve a sync proposal by ID. Only proposals in pending_review or conflict status can be approved. [Sequential]",
      {
        proposal_id: z.string().describe("ID of the proposal to approve."),
      },
      async ({ proposal_id }) => {
        const result = await coordinator.approveProposal(proposal_id);
        if (!result) {
          return {
            content: [{ type: "text" as const, text: "Proposal not found or not in approvable state." }],
            isError: true,
          };
        }
        AgentScreenPanel.getInstance()?.logDecision("Drive/Sync", `Approved proposal ${proposal_id}`);
        return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
      }
    );

    mcpServer.tool(
      "operator_sync_reject",
      "Reject a sync proposal by ID with an optional reason. [Sequential]",
      {
        proposal_id: z.string().describe("ID of the proposal to reject."),
        reason: z.string().optional().describe("Reason for rejection."),
      },
      async ({ proposal_id, reason }) => {
        const result = await coordinator.rejectProposal(proposal_id, reason);
        if (!result) {
          return {
            content: [{ type: "text" as const, text: "Proposal not found or not in rejectable state." }],
            isError: true,
          };
        }
        AgentScreenPanel.getInstance()?.logDecision("Drive/Sync", `Rejected proposal ${proposal_id}${reason ? `: ${reason}` : ""}`);
        return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
      }
    );

    mcpServer.tool(
      "operator_sync_apply",
      "Apply an approved sync proposal. The proposal must be in 'approved' status. Apply is serialized through the integration queue. [Sequential]",
      {
        proposal_id: z.string().describe("ID of the approved proposal to apply."),
      },
      async ({ proposal_id }) => {
        // Verify proposal exists and is approved
        const proposal = await coordinator.getProposal(proposal_id);
        if (!proposal) {
          return {
            content: [{ type: "text" as const, text: "Proposal not found." }],
            isError: true,
          };
        }
        if (proposal.status !== "approved") {
          return {
            content: [{ type: "text" as const, text: `Proposal status is '${proposal.status}', not 'approved'. Only approved proposals can be applied.` }],
            isError: true,
          };
        }

        if (!queue) {
          return {
            content: [{ type: "text" as const, text: "Integration queue not available." }],
            isError: true,
          };
        }

        const applyResult = await queue.enqueue(proposal_id);
        AgentScreenPanel.getInstance()?.logActivity(
          "Drive/Sync",
          applyResult.success
            ? `Applied proposal ${proposal_id} (merge: ${applyResult.mergeCommit})`
            : `Apply failed for ${proposal_id}: ${applyResult.error}`
        );
        return {
          content: [{ type: "text" as const, text: JSON.stringify(applyResult, null, 2) }],
          isError: !applyResult.success,
        };
      }
    );

    mcpServer.tool(
      "operator_events_latest",
      "Get recent operator activity events. Newest first. [Parallel-safe]",
      {
        limit: z.number().optional().describe("Max events to return (default 50)."),
        operator_id: z.string().optional().describe("Filter by operator ID."),
      },
      async ({ limit, operator_id }) => {
        const events = coordinator.getRecentEvents(limit ?? 50, operator_id);
        return { content: [{ type: "text" as const, text: JSON.stringify(events, null, 2) }] };
      }
    );

    if (queue) {
      mcpServer.tool(
        "integration_queue_status",
        "Get the current state of the integration queue: processing, pending, and completed proposal IDs. [Parallel-safe]",
        {},
        async () => {
          const state = queue.getQueueState();
          return { content: [{ type: "text" as const, text: JSON.stringify(state, null, 2) }] };
        }
      );
    }

    // ── Optional MCP Apps connector hooks (T60) ───────────────────────────
    // These are capability-detected: they attempt to call external MCP Apps
    // connectors and gracefully no-op when connectors are unavailable.
    // Core flow is unaffected when connectors are absent.

    mcpServer.tool(
      "connector_publish_proposal",
      "Publish a proposal summary to an external connector (e.g., Slack, GitHub). No-ops gracefully if no connector is configured. [Parallel-safe]",
      {
        proposal_id: z.string().describe("ID of the proposal to publish."),
        channel: z.string().optional().describe("Target channel or destination (connector-specific)."),
      },
      async ({ proposal_id, channel }) => {
        const proposal = await coordinator.getProposal(proposal_id);
        if (!proposal) {
          return { content: [{ type: "text" as const, text: "Proposal not found." }], isError: true };
        }
        // Capability detection: check if an external connector is available
        // For MVP, this is always a graceful no-op with an informational message.
        const summary = `[${proposal.operatorName}] ${proposal.status}: ${proposal.changedFiles.length} files changed`;
        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify({
              published: false,
              reason: "No external connector configured. Summary: " + summary,
              proposal_id,
              channel: channel ?? "default",
            }),
          }],
        };
      }
    );

    mcpServer.tool(
      "connector_push_progress",
      "Push operator progress to an external system. No-ops gracefully if no connector is configured. [Parallel-safe]",
      {
        operator_id: z.string().describe("Operator ID."),
        message: z.string().describe("Progress message."),
      },
      async ({ operator_id, message }) => {
        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify({
              pushed: false,
              reason: "No external connector configured.",
              operator_id,
              message,
            }),
          }],
        };
      }
    );

  }

  private async registerMcpAppResourceIfEnabledOn(mcpServer: McpServer): Promise<void> {
    if (!this.opts.getEnableApps?.()) return;
    try {
      let bundle: string | undefined;
      const extPath = this.opts.getExtensionPath?.();
      if (extPath) {
        const { readFile } = await import("fs/promises");
        const { join } = await import("path");
        try {
          bundle = await readFile(join(extPath, "out", "mcp-app-bundle.js"), "utf8");
        } catch {
          // Fallback to esm.sh if bundle missing (e.g. dev without prepublish)
        }
      }
      const { registerAppResource, RESOURCE_MIME_TYPE } = await import("@modelcontextprotocol/ext-apps/server");
      // Cast needed: SDK CJS vs ext-apps ESM type resolution mismatch on registerResource overloads
      registerAppResource(
        mcpServer as unknown as Parameters<typeof registerAppResource>[0],
        "Agent Screen",
        AGENT_SCREEN_APP_RESOURCE_URI,
        { mimeType: RESOURCE_MIME_TYPE },
        async () => ({
          contents: [{
            uri: AGENT_SCREEN_APP_RESOURCE_URI,
            mimeType: RESOURCE_MIME_TYPE,
            text: buildAgentScreenAppHtml(bundle),
          }],
        })
      );
    } catch (err) {
      // ESM dynamic import can fail in CJS test runners (e.g. Jest without experimental-vm-modules)
      console.warn("[Drive MCP] MCP App resource registration skipped:", err instanceof Error ? err.message : String(err));
    }
  }

  private buildAgentCard(): object {
    const baseUrl = `http://127.0.0.1:${this.port}`;
    return {
      name: "Cursor Drive",
      description: "AI pair-programming driver for Cursor. Voice-first, multi-agent, Agent Screen. Integrates via MCP tools and A2A Task endpoints.",
      version: "0.3.0",
      supportedInterfaces: [
        {
          url: `${baseUrl}/mcp`,
          protocolBinding: "HTTP+JSON",
          protocolVersion: "0.3",
        },
      ],
      capabilities: {
        streaming: true,
        pushNotifications: false,
        extendedAgentCard: false,
      },
      supportedStates: ["submitted", "working", "completed", "failed", "canceled", "input_required"],
      defaultInputModes: ["text/plain"],
      defaultOutputModes: ["text/plain"],
      skills: [
        { id: "voice-pipeline", name: "Voice Pipeline", description: "TTS speak, filler cleaning, sanitization", tags: ["voice", "tts"] },
        { id: "multi-agent", name: "Multi-Agent", description: "Spawn, switch, merge operators; parallel task execution", tags: ["operators", "orchestration"] },
        { id: "agent-screen", name: "Agent Screen", description: "Activity log, file touches, decisions, plan progress", tags: ["ui", "visibility"] },
      ],
    };
  }

  async start(): Promise<void> {
    await this.mcpServer.connect(this.transport);
    await this.registerMcpAppResourceIfEnabledOn(this.mcpServer);

    const agentCard = this.buildAgentCard();
    this.httpServer = http.createServer((req, res) => {
      const requestLabel = `${req.method ?? "UNKNOWN"} ${req.url ?? ""}`;
      console.log(`[Drive MCP] HTTP ${requestLabel}`);
      res.once("finish", () => {
        console.log(`[Drive MCP] HTTP ${requestLabel} -> ${res.statusCode} (sent=${res.writableEnded})`);
      });
      res.once("close", () => {
        if (!res.writableEnded) {
          console.log(`[Drive MCP] HTTP ${requestLabel} -> closed before response`);
        }
      });

      if (this.isMcpPath(req.url)) {
        void this.handleMcpHttpRequest(req, res);
      } else if (req.method === "GET" && (req.url === "/.well-known/agent.json" || req.url === "/.well-known/agent-card.json")) {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(agentCard));
      } else if (req.url === "/health") {
        const now = Date.now();
        if (now >= this.cursorCliCacheExpiresAt) {
          this.cursorCliCacheExpiresAt = now + CURSOR_CLI_CACHE_TTL_MS;
          void isCursorCliAvailable().then((ok) => {
            this.cursorCliAvailable = ok;
          });
        }
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          status: "ok",
          name: "cursor-drive",
          port: this.port,
          cursorCli: this.cursorCliAvailable,
        }));
      } else if (req.method === "POST" && req.url === "/tasks") {
        let body = "";
        req.on("data", (chunk) => { body += chunk; });
        req.on("end", () => {
          try {
            const parsed = JSON.parse(body || "{}");
            const message = typeof parsed.message === "string" ? parsed.message : (parsed.parts?.[0]?.text ?? "");
            const taskDesc = message.trim() || "A2A task";
            const getMaxConcurrent = this.opts.getMaxConcurrent ?? (() => Number.MAX_SAFE_INTEGER);
            if (this.opts.operatorRegistry.activeCount() >= getMaxConcurrent()) {
              res.writeHead(503, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ error: "max concurrent operators reached" }));
              return;
            }
            const validRoles = ["implementer", "reviewer", "tester", "researcher", "planner"];
            const rawRole = typeof parsed.role === "string" ? parsed.role : undefined;
            const role = rawRole && validRoles.includes(rawRole) ? rawRole as "implementer" | "reviewer" | "tester" | "researcher" | "planner" : undefined;
            const spawnOptions = role ? { role } : undefined;
            const op = this.opts.operatorRegistry.spawn(undefined, taskDesc, spawnOptions);
            const taskId = `task-${op.id}`;
            const record: A2ATaskRecord = {
              id: taskId,
              operatorId: op.id,
              status: "submitted",
              task: taskDesc,
              createdAt: Date.now(),
            };
            this.a2aTasks.set(taskId, record);
            record.status = "working";
            AgentScreenPanel.getInstance()?.logActivity("Drive", `A2A task ${taskId}: ${taskDesc}`);
            const responsePayload: Record<string, unknown> = {
              id: taskId,
              status: record.status,
              task: taskDesc,
              operatorId: op.id,
            };
            if (op.role) { responsePayload.role = op.role; }
            res.writeHead(201, { "Content-Type": "application/json" });
            res.end(JSON.stringify(responsePayload));
          } catch {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Invalid request body" }));
          }
        });
      } else if (req.method === "GET" && req.url?.startsWith("/tasks/")) {
        const taskId = req.url.replace(/^\/tasks\//, "").split("?")[0];
        const record = taskId ? this.a2aTasks.get(taskId) : undefined;
        if (!record) {
          res.writeHead(404, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Task not found" }));
          return;
        }
        const op = this.opts.operatorRegistry.list().find((o) => o.id === record.operatorId);
        if (op?.status === "completed" || op?.status === "merged") {
          record.status = "completed";
        }

        const accept = req.headers.accept ?? "";
        if (accept === "text/event-stream") {
          res.writeHead(200, {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
          });

          const initialPayload: Record<string, unknown> = {
            id: record.id,
            status: record.status,
            task: record.task,
            operatorId: record.operatorId,
          };
          if (op?.name) { initialPayload.operatorName = op.name; }
          if (op?.role) { initialPayload.role = op.role; }
          res.write(`data: ${JSON.stringify(initialPayload)}\n\n`);

          if (record.status === "completed" || record.status === "canceled" || record.status === "failed") {
            res.end();
            return;
          }

          const registry = this.opts.operatorRegistry;
          const operatorId = record.operatorId;

          const onCompleted = (id: string, summary: string) => {
            if (id !== operatorId) { return; }
            record.status = "completed";
            res.write(`data: ${JSON.stringify({ type: "operatorCompleted", id, summary })}\n\n`);
            cleanup();
            res.end();
          };
          const onProgress = (id: string, message: string) => {
            if (id !== operatorId) { return; }
            res.write(`data: ${JSON.stringify({ type: "operatorProgress", id, message })}\n\n`);
          };
          const onError = (id: string, error: string) => {
            if (id !== operatorId) { return; }
            record.status = "failed";
            res.write(`data: ${JSON.stringify({ type: "operatorError", id, error })}\n\n`);
            cleanup();
            res.end();
          };
          const onEscalated = (event: { operatorId: string; operatorName: string; reason: string; severity: string }) => {
            if (event.operatorId !== operatorId) { return; }
            res.write(`data: ${JSON.stringify({ type: "operatorEscalated", ...event })}\n\n`);
          };

          const cleanup = () => {
            registry.events.off("operatorCompleted", onCompleted);
            registry.events.off("operatorProgress", onProgress);
            registry.events.off("operatorError", onError);
            registry.events.off("operatorEscalated", onEscalated);
          };

          registry.events.on("operatorCompleted", onCompleted);
          registry.events.on("operatorProgress", onProgress);
          registry.events.on("operatorError", onError);
          registry.events.on("operatorEscalated", onEscalated);

          req.on("close", () => {
            cleanup();
          });
        } else {
          const payload: Record<string, unknown> = {
            id: record.id,
            status: record.status,
            task: record.task,
            operatorId: record.operatorId,
          };
          if (op?.name) { payload.operatorName = op.name; }
          if (op?.role) { payload.role = op.role; }
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify(payload));
        }
      } else if (req.method === "POST" && req.url?.match(/^\/tasks\/[^/]+\/cancel$/)) {
        const taskId = req.url.replace(/^\/tasks\//, "").replace(/\/cancel$/, "");
        const record = this.a2aTasks.get(taskId);
        if (!record) {
          res.writeHead(404, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Task not found" }));
          return;
        }
        record.status = "canceled";
        this.opts.operatorRegistry.dismiss(record.operatorId);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          id: record.id,
          status: "canceled",
          task: record.task,
          operatorId: record.operatorId,
        }));
      } else if (req.method === "POST" && req.url === "/pipeline") {
        let body = "";
        req.on("data", (chunk) => { body += chunk; });
        req.on("end", () => {
          try {
            const { prompt, operator_id } = JSON.parse(body || "{}");
            const op = operator_id ? this.opts.operatorRegistry.findByNameOrId(operator_id) : undefined;
            const sessionMemory = op
              ? this.opts.sessionMemory.forOperator(op.id, op.visibility)
              : this.opts.sessionMemory;
            void runPipeline(String(prompt ?? ""), {
              driveActive: this.opts.driveMgr.active,
              driveSubMode: this.opts.driveMgr.subMode,
              sessionMemory,
              setActive: (active) => this.opts.driveMgr.setActive(active),
              operatorRegistry: this.opts.operatorRegistry,
              persistentMemory: this.opts.persistentMemory,
            }).then((result) => {
              if (result.ok === true) {
                this.opts.sessionMemory.addTurn(result.prompt.slice(0, 200));
              }
              res.writeHead(200, { "Content-Type": "application/json" });
              res.end(JSON.stringify(result));
            });
          } catch {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ ok: false, error: "Invalid request" }));
          }
        });
      } else if (req.method === "POST" && req.url === "/run") {
        let body = "";
        req.on("data", (chunk) => { body += chunk; });
        req.on("end", async () => {
          try {
            const { prompt, timeout_seconds } = JSON.parse(body || "{}");
            const text = typeof prompt === "string" ? prompt.trim() : "";
            if (!text) {
              res.writeHead(400, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ error: "Missing or empty prompt" }));
              return;
            }
            const timeoutMs = typeof timeout_seconds === "number" ? Math.min(3600, Math.max(60, timeout_seconds)) * 1000 : undefined;

            const acceptHeader = req.headers["accept"] ?? "";
            if (acceptHeader.includes("text/event-stream")) {
              res.writeHead(200, {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
              });
              const runner = runCursorCliStreaming(text, { timeoutMs });
              runner.on("data", (event) => {
                res.write(`data: ${JSON.stringify({ type: event.type, text: event.text, toolName: event.toolName })}\n\n`);
              });
              runner.on("close", (exitCode) => {
                res.write(`data: ${JSON.stringify({ type: "done", exitCode })}\n\n`);
                res.end();
              });
              return;
            }

            const result = await runCursorCli(text, { timeoutMs });
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({
              stdout: result.stdout,
              stderr: result.stderr,
              exitCode: result.exitCode,
              timedOut: result.timedOut ?? false,
              error: result.error ?? undefined,
            }));
          } catch {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Invalid request body" }));
          }
        });
      } else {
        res.writeHead(404);
        res.end();
      }
    });

    await new Promise<void>((resolve, reject) => {
      this.httpServer!.once("error", (err: NodeJS.ErrnoException) => {
        reject(err);
      });
      this.httpServer!.listen(this.port, "127.0.0.1", () => resolve());
    });

    console.log(`[Drive MCP] Server listening on http://127.0.0.1:${this.port}/mcp`);
  }

  async stop(): Promise<void> {
    await this.mcpServer.close();
    for (const entry of this.sessionMap.values()) {
      await entry.mcpServer.close();
    }
    this.sessionMap.clear();
    await new Promise<void>((resolve) => {
      if (this.httpServer) {
        this.httpServer.close(() => resolve());
      } else {
        resolve();
      }
    });
    console.log("[Drive MCP] Server stopped.");
  }

  getPort(): number {
    return this.port;
  }
}
