/**
 * Cursor CLI runner: run `agent -p "..."` (or `cursor agent -p "..."`) so that
 * Cursor subscription is used for coding. Used by MCP tool and optional POST /run
 * for external OpenClaw or scripts. Part of "minimal scrape" from OpenClaw
 * (we don't depend on OpenClaw; we run Cursor CLI ourselves).
 */

import * as cp from "child_process";
import * as vscode from "vscode";
import { EventEmitter } from "events";
import { NdjsonParser, mapToCliStreamEvent, type CliStreamEvent } from "./ndjsonParser.js";

const DEFAULT_TIMEOUT_MS = 300_000; // 5 min
const DEFAULT_COMMAND = "agent";

export interface RunCursorCliOptions {
  /** Timeout in milliseconds; process is killed after this. */
  timeoutMs?: number;
  /** Working directory; defaults to first workspace folder. */
  cwd?: string;
  /**
   * Run in an isolated git worktree (`-w`).
   * - `true` — let the CLI auto-name the worktree.
   * - `string` — use the given name (e.g. operator id / name).
   */
  worktree?: boolean | string;
  /** Branch/ref to base the worktree on (default: HEAD). Only used when `worktree` is set. */
  worktreeBase?: string;
  /** Resume a prior session by chatId (from `agent create-chat` or `agent ls`). */
  resumeChatId?: string;
  /** Force-allow all commands without confirmation (`--force`). */
  force?: boolean;
  /** Model override (e.g. "claude-sonnet-4", "gpt-5"). */
  model?: string;
  /** Agent mode: "plan" (read-only planning) or "ask" (Q&A, no edits). Omit for full agent. */
  mode?: "plan" | "ask";
}

export interface RunCursorCliResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  /** True if process was killed due to timeout. */
  timedOut?: boolean;
  /** Error message if spawn or run failed. */
  error?: string;
  /** Chat ID for stateful multi-turn sessions. Pass as resumeChatId on the next run. */
  chatId?: string;
}

/**
 * Build the CLI argument list for a headless (`-p`) invocation.
 * Shared between `runCursorCli` and `runCursorCliStreaming`.
 */
function buildCliArgs(
  argsPrefix: string[],
  prompt: string,
  opts: RunCursorCliOptions & { outputFormat?: "text" | "json" | "stream-json"; streamPartial?: boolean }
): string[] {
  const args: string[] = [...argsPrefix, "-p"];
  // Always trust the workspace in headless mode — Drive runs in a trusted extension context.
  args.push("--trust");
  if (opts.worktree !== undefined) {
    args.push("-w");
    if (typeof opts.worktree === "string") { args.push(opts.worktree); }
  }
  if (opts.worktreeBase) { args.push("--worktree-base", opts.worktreeBase); }
  if (opts.resumeChatId) { args.push("--resume", opts.resumeChatId); }
  if (opts.force) { args.push("--force"); }
  if (opts.model) { args.push("--model", opts.model); }
  if (opts.mode) { args.push("--mode", opts.mode); }
  if (opts.outputFormat) { args.push("--output-format", opts.outputFormat); }
  if (opts.streamPartial) { args.push("--stream-partial-output"); }
  args.push(prompt);
  return args;
}

/**
 * Read cursorDrive.cursorCli config.
 */
export function getCursorCliConfig(): {
  command: string;
  argsPrefix: string[];
  timeoutSeconds: number;
} {
  const cfg = vscode.workspace.getConfiguration("cursorDrive");
  const raw = (cfg.get("cursorCli.command", DEFAULT_COMMAND) as string)?.trim() || DEFAULT_COMMAND;
  const timeoutSeconds = Math.max(60, Math.min(3600, (cfg.get("cursorCli.timeoutSeconds", 300) as number) ?? 300));
  if (raw === "cursor" || raw === "cursor.exe") {
    return { command: raw, argsPrefix: ["agent"], timeoutSeconds };
  }
  return { command: raw, argsPrefix: [], timeoutSeconds };
}

/**
 * Run Cursor CLI with the given prompt. Uses cursorDrive.cursorCli.command
 * (default "agent") and cursorDrive.cursorCli.timeoutSeconds (default 300).
 * cwd defaults to first workspace folder.
 */
export function runCursorCli(
  prompt: string,
  options: RunCursorCliOptions = {}
): Promise<RunCursorCliResult> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, cwd } = options;
  const { command, argsPrefix, timeoutSeconds } = getCursorCliConfig();
  const effectiveTimeout = Math.min(timeoutMs, timeoutSeconds * 1000);
  const args = buildCliArgs(argsPrefix, prompt, options);
  const workdir = cwd ?? vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

  return new Promise((resolve) => {
    const child = cp.spawn(command, args, {
      cwd: workdir ?? process.cwd(),
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env },
    });

    let stdout = "";
    let stderr = "";
    let settled = false;

    const finish = (exitCode: number | null, timedOut?: boolean, error?: string) => {
      if (settled) return;
      settled = true;
      try {
        child.kill("SIGKILL");
      } catch {
        // ignore
      }
      const result: RunCursorCliResult = {
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        exitCode,
        timedOut,
        error,
      };
      if (options.resumeChatId) result.chatId = options.resumeChatId;
      resolve(result);
    };

    const timeout = setTimeout(() => {
      finish(null, true, "Cursor CLI run timed out.");
    }, effectiveTimeout);

    child.stdout?.on("data", (ch: Buffer) => {
      stdout += ch.toString();
    });
    child.stderr?.on("data", (ch: Buffer) => {
      stderr += ch.toString();
    });

    child.on("error", (err) => {
      clearTimeout(timeout);
      finish(null, false, err.message ?? "Failed to spawn Cursor CLI.");
    });

    child.on("close", (code) => {
      clearTimeout(timeout);
      if (!settled) {
        settled = true;
        const result: RunCursorCliResult = {
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          exitCode: code,
        };
        if (options.resumeChatId) result.chatId = options.resumeChatId;
        resolve(result);
      }
    });
  });
}

export interface StreamingCliRunner extends EventEmitter {
  on(event: "data", listener: (event: CliStreamEvent) => void): this;
  on(event: "close", listener: (exitCode: number | null) => void): this;
}

/**
 * Run Cursor CLI with streaming NDJSON output. Emits "data" events for each parsed
 * CliStreamEvent and a "close" event when the process exits or times out.
 */
export function runCursorCliStreaming(
  prompt: string,
  options: RunCursorCliOptions = {}
): StreamingCliRunner {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, cwd } = options;
  const { command, argsPrefix, timeoutSeconds } = getCursorCliConfig();
  const effectiveTimeout = Math.min(timeoutMs, timeoutSeconds * 1000);
  const args = buildCliArgs(argsPrefix, prompt, { ...options, outputFormat: "stream-json", streamPartial: true });
  const workdir = cwd ?? vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

  const emitter = new EventEmitter() as StreamingCliRunner;
  const parser = new NdjsonParser();
  let accumulatedStdout = "";
  let settled = false;

  const child = cp.spawn(command, args, {
    cwd: workdir ?? process.cwd(),
    shell: false,
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env },
  });

  const timeout = setTimeout(() => {
    if (!settled) {
      settled = true;
      try { child.kill("SIGKILL"); } catch { /* ignore */ }
      emitter.emit("close", null);
    }
  }, effectiveTimeout);

  child.stdout?.on("data", (chunk: Buffer) => {
    const str = chunk.toString();
    accumulatedStdout += str;
    const parsed = parser.feed(str);
    for (const raw of parsed) {
      emitter.emit("data", mapToCliStreamEvent(raw));
    }
  });

  child.on("error", () => {
    if (!settled) {
      settled = true;
      clearTimeout(timeout);
      emitter.emit("close", null);
    }
  });

  child.on("close", (code) => {
    if (!settled) {
      settled = true;
      clearTimeout(timeout);
      emitter.emit("close", code);
    }
  });

  Object.defineProperty(emitter, "getAccumulatedStdout", {
    value: () => accumulatedStdout,
    writable: false,
  });

  return emitter;
}

/**
 * Run `agent create-chat` and return the new chatId string, or null on failure.
 * The chatId can be passed as `resumeChatId` to subsequent `runCursorCli` calls
 * to maintain session continuity across multiple prompts.
 */
export function createCursorCliChat(): Promise<string | null> {
  const { command, argsPrefix } = getCursorCliConfig();
  const args = [...argsPrefix, "create-chat"];
  return new Promise((resolve) => {
    let stdout = "";
    const child = cp.spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
    const t = setTimeout(() => {
      try { child.kill("SIGKILL"); } catch { /* ignore */ }
      resolve(null);
    }, 10_000);
    child.stdout?.on("data", (ch: Buffer) => { stdout += ch.toString(); });
    child.on("error", () => { clearTimeout(t); resolve(null); });
    child.on("close", () => {
      clearTimeout(t);
      const chatId = stdout.trim();
      resolve(chatId || null);
    });
  });
}

/**
 * Check if Cursor CLI appears to be available (runs `agent --help` or equivalent
 * and returns true if exit 0 or help text seen). Used for diagnostics.
 */
export function isCursorCliAvailable(): Promise<boolean> {
  const { command, argsPrefix } = getCursorCliConfig();
  const args = [...argsPrefix, "--help"];
  return new Promise((resolve) => {
    const child = cp.spawn(command, args, { stdio: "pipe" });
    const t = setTimeout(() => {
      try {
        child.kill("SIGKILL");
      } catch {
        // ignore
      }
      resolve(false);
    }, 5000);
    child.on("error", () => {
      clearTimeout(t);
      resolve(false);
    });
    child.on("close", (code) => {
      clearTimeout(t);
      resolve(code === 0);
    });
  });
}
