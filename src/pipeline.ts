/**
 * Drive prompt pipeline: wake/submit words → tangent → filler-clean → glossary-expand
 * → sanitize → promptOptimizer → approval-gate → session-context-inject → route → model-select.
 *
 * When Drive is inactive, returns the original prompt unchanged (unless wake word activates).
 * See docs/design/architecture/prompt-pipeline-design.md.
 */

import * as vscode from "vscode";
import { cleanFillerWords } from "./fillerCleaner.js";
import { expandGlossary } from "./glossaryExpander.js";
import { sanitizePrompt } from "./sanitizer.js";
import { getGateResult, type GateResult } from "./approvalGates.js";
import { route, type RouteDecision } from "./router.js";
import { tierForMode, type ModelTier } from "./modelSelector.js";
import { optimizePrompt } from "./promptOptimizer.js";
import type { OperatorRegistry } from "./operatorRegistry.js";
import { AgentScreenPanel } from "./agentScreen.js";
import { speak } from "./tts.js";
import { extractTangentNameAndTask } from "./tangentNameExtractor.js";
import { confirmTangentAgent } from "./tangentFlow.js";
import { maybeStopTtsOnInput, handleClarification } from "./clarificationHandler.js";
import { getSpokenHistory } from "./tts.js";

/**
 * Runtime pipeline monitoring stats. Tracks run count, block rate, latency,
 * and stage timing for observability.
 */
export interface PipelineStats {
  totalRuns: number;
  successCount: number;
  blockedCount: number;
  tangentCount: number;
  passThruCount: number;
  avgLatencyMs: number;
  lastRunMs: number;
  stageTimings: Record<string, number>;
}

const pipelineStats: PipelineStats = {
  totalRuns: 0,
  successCount: 0,
  blockedCount: 0,
  tangentCount: 0,
  passThruCount: 0,
  avgLatencyMs: 0,
  lastRunMs: 0,
  stageTimings: {},
};

/** Get a snapshot of pipeline runtime statistics. */
export function getPipelineStats(): Readonly<PipelineStats> {
  return { ...pipelineStats };
}

function updateAvgLatency(newMs: number): void {
  const n = pipelineStats.totalRuns;
  pipelineStats.avgLatencyMs = n === 1
    ? newMs
    : pipelineStats.avgLatencyMs + (newMs - pipelineStats.avgLatencyMs) / n;
  pipelineStats.lastRunMs = newMs;
}

export interface DriveContext {
  driveActive: boolean;
  driveSubMode?: string;
  sessionMemory: {
    buildContextString(): string;
    updateTurn?(index: number, content: string): boolean;
    getLastTurnIndex?(): number;
  };
  /** Call to activate Drive (e.g. when wake word detected while inactive). */
  setActive?: (active: boolean) => void;
  /** For tangent keyword: spawn operator and update status bar. */
  operatorRegistry?: OperatorRegistry;
  /** Optional persistent memory for long-term context injection. */
  persistentMemory?: {
    buildPromptContext(): Promise<string>;
    appendToDaily?(note: string, agent?: string): Promise<void>;
  };
}

export type PipelineResult =
  | { ok: true; prompt: string; route: RouteDecision; model: ModelTier; tangentAck?: string }
  | { ok: false; blocked: true; gateResult?: GateResult }
  | {
    /** User cancelled a checkpoint — pipeline halted awaiting user action. */
    ok: "checkpoint";
    reason: string;
  };

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Show a modal confirmation checkpoint.
 *
 * Returns `undefined` if the user confirms (pipeline should continue).
 * Returns a checkpoint result object if the user cancels (pipeline should halt).
 *
 * Gated by `cursorDrive.agents.subAgentApproval` (defaults to false so existing
 * tests and scripts are unaffected by default).
 */
export async function requestCheckpoint(
  reason: string,
  detail?: string
): Promise<{ ok: "checkpoint"; reason: string } | undefined> {
  const answer = await vscode.window.showInformationMessage(
    `Drive: ${reason}`,
    { modal: true, detail: detail ?? "Proceed or cancel to abort." },
    "Proceed",
    "Cancel"
  );
  if (answer !== "Proceed") {
    return { ok: "checkpoint", reason };
  }
  return undefined;
}

/**
 * Run the full Drive prompt pipeline when Drive is active.
 * When Drive is inactive, returns the original prompt with direct routing (unless wake word activates).
 */
export async function runPipeline(
  input: string,
  ctx: DriveContext
): Promise<PipelineResult> {
  const startTime = Date.now();
  pipelineStats.totalRuns++;

  const cfg = vscode.workspace.getConfiguration("cursorDrive");
  let text = input.trim();

  // Clarification: stop TTS on new input; if user was clarifying, optionally merge.
  maybeStopTtsOnInput();
  const lastTurnIdx = ctx.sessionMemory.getLastTurnIndex?.() ?? -1;
  const hadSpokenContent = getSpokenHistory().length > 0;
  if (lastTurnIdx >= 0 && hadSpokenContent && text.length < 200) {
    const result = await handleClarification(text);
    if (result?.action === "modify" && result.mergedContent && ctx.sessionMemory.updateTurn) {
      ctx.sessionMemory.updateTurn(lastTurnIdx, result.mergedContent);
      text = result.mergedContent;
    } else if (result?.action === "abandon" && ctx.sessionMemory.updateTurn) {
      ctx.sessionMemory.updateTurn(lastTurnIdx, `[Abandoned] ${text}`);
    }
  }
  let skipOptimizer = false;

  // pwm-06: Wake word — if inactive and starts with any wake word, activate and strip
  let activatedByWakeWord = false;
  const wakeWordRaw = cfg.get<string>("wakeWord", "drive mode");
  const wakeWords = wakeWordRaw
    ? wakeWordRaw.split(",").map((w) => w.trim().toLowerCase()).filter(Boolean)
    : [];
  const wakeWordMatch = wakeWords
    .filter((w) => text.toLowerCase().startsWith(w))
    .sort((a, b) => b.length - a.length)[0]; // longest match first
  if (!ctx.driveActive && ctx.setActive && wakeWordMatch) {
    ctx.setActive(true);
    text = text.slice(wakeWordMatch.length).trim();
    activatedByWakeWord = true;

    // Acknowledge wake word — TTS (no-op if disabled) + temporary status bar message
    speak("Drive listening. How can I help?");
    void vscode.window.setStatusBarMessage("$(mic) Drive listening", 5000);

    // Turn mic on for next utterance — hands-free follow-up without clicking mic again
    void vscode.commands.executeCommand("cursorDrive.activateVoiceInput");

    // Wake word only (no prompt after it) — acknowledge and return early
    if (!text) {
      pipelineStats.passThruCount++;
      updateAvgLatency(Date.now() - startTime);
      return {
        ok: true,
        prompt: "",
        route: { mode: "ask", reason: "Wake word only — awaiting prompt" },
        model: "execution",
        tangentAck: "How can I help?",
      };
    }
  }

  // Sleep word — if active and starts with any sleep word, deactivate and strip
  const sleepWordRaw = cfg.get<string>("sleepWord", "park mode");
  const sleepWords = sleepWordRaw
    ? sleepWordRaw.split(",").map((w) => w.trim().toLowerCase()).filter(Boolean)
    : [];
  const sleepWordMatch = sleepWords
    .filter((w) => text.toLowerCase().startsWith(w))
    .sort((a, b) => b.length - a.length)[0];
  if (ctx.driveActive && ctx.setActive && sleepWordMatch) {
    ctx.setActive(false);
    text = text.slice(sleepWordMatch.length).trim();
    speak("Drive sleeping");
    void vscode.window.setStatusBarMessage("$(debug-pause) Drive sleeping", 5000);
    if (!text) {
      pipelineStats.passThruCount++;
      updateAvgLatency(Date.now() - startTime);
      return {
        ok: true,
        prompt: "",
        route: { mode: "ask", reason: "Sleep word — Drive deactivated" },
        model: "execution",
        tangentAck: "Drive sleeping",
      };
    }
    // Text remains: pass stripped text through (Drive now inactive)
    pipelineStats.passThruCount++;
    updateAvgLatency(Date.now() - startTime);
    return {
      ok: true,
      prompt: text,
      route: { mode: "ask", reason: "Sleep word — Drive deactivated, prompt passed through" },
      model: "execution",
    };
  }

  // hpp-04: Drive-active gate — skip pipeline when still inactive (and not just activated by wake word)
  if (!ctx.driveActive && !activatedByWakeWord) {
    pipelineStats.passThruCount++;
    updateAvgLatency(Date.now() - startTime);
    return {
      ok: true,
      prompt: input,
      route: { mode: "ask", reason: "Drive inactive — pass-through" },
      model: "execution",
    };
  }

  // Transcript persistence: when enabled, append user input to daily log (ADR-0005: off by default)
  const transcriptPersistence = cfg.get<boolean>("privacy.transcriptPersistence", false);
  if (transcriptPersistence && text && ctx.persistentMemory?.appendToDaily) {
    void ctx.persistentMemory.appendToDaily(text, "user");
  }

  // Slash commands: /plan /run /drive /ask /debug /tangent /switch /merge
  let slashCommand: string | undefined;
  const slashMatch = text.match(/^\/(plan|run|drive|ask|debug|tangent|switch|merge)(?:\s+([\s\S]*))?$/i);
  if (slashMatch) {
    slashCommand = slashMatch[1].toLowerCase();
    text = (slashMatch[2] ?? "").trim();

    if (slashCommand === "switch" && ctx.operatorRegistry) {
      const target = text.trim();
      if (!target) {
        return {
          ok: true,
          prompt: "",
          route: { mode: "ask", reason: "/switch missing operator name" },
          model: "execution",
          tangentAck: "Usage: /switch <operator name>",
        };
      }
      const op = ctx.operatorRegistry.switchTo(target);
      if (!op) {
        return {
          ok: true,
          prompt: "",
          route: { mode: "ask", reason: "/switch operator not found" },
          model: "execution",
          tangentAck: `No operator named "${target}"`,
        };
      }
      AgentScreenPanel.getInstance()?.logActivity("Drive", `Switched to ${op.name}`);
      pipelineStats.successCount++;
      updateAvgLatency(Date.now() - startTime);
      return {
        ok: true,
        prompt: "",
        route: { mode: "agent", reason: "Slash /switch" },
        model: "execution",
        tangentAck: `Foreground: ${op.name}`,
      };
    }

    if (slashCommand === "merge" && ctx.operatorRegistry) {
      const mergeMatch = text.match(/^(.+?)\s+into\s+(.+)$/i);
      if (!mergeMatch) {
        return {
          ok: true,
          prompt: "",
          route: { mode: "ask", reason: "/merge bad syntax" },
          model: "execution",
          tangentAck: "Usage: /merge <source> into <target>",
        };
      }
      const ok = ctx.operatorRegistry.merge(mergeMatch[1].trim(), mergeMatch[2].trim());
      pipelineStats.successCount++;
      updateAvgLatency(Date.now() - startTime);
      return {
        ok: true,
        prompt: "",
        route: { mode: "agent", reason: "Slash /merge" },
        model: "execution",
        tangentAck: ok
          ? `Merged ${mergeMatch[1].trim()} into ${mergeMatch[2].trim()}`
          : "Merge failed — check operator names",
      };
    }

    if (slashCommand === "tangent") {
      // Reuse tangent keyword path below by rewriting to "<keyword> <task>"
      const tangentKeyword = cfg.get<string>("agents.tangentKeyword", "tangent");
      text = `${tangentKeyword} ${text}`.trim();
      slashCommand = undefined;
    }
  }

  // pwm-06: Submit word — if ends with any submit word, strip and set skipOptimizer
  const submitWordRaw = cfg.get<string>("submitWord", "send it");
  const submitWords = submitWordRaw
    ? submitWordRaw.split(",").map((w) => w.trim().toLowerCase()).filter(Boolean)
    : [];
  const submitWordMatch = submitWords
    .filter((w) => text.toLowerCase().endsWith(w))
    .sort((a, b) => b.length - a.length)[0]; // longest match first
  if (submitWordMatch) {
    skipOptimizer = true;
    text = text.slice(0, -submitWordMatch.length).trim();
  }

  // pwm-07: Tangent — "tangent [name] [task]" spawns operator, acknowledge, return early
  const tangentKeyword = cfg.get<string>("agents.tangentKeyword", "tangent");
  if (tangentKeyword && ctx.operatorRegistry) {
    const tangentRe = new RegExp(`^${escapeRegex(tangentKeyword)}\\s+(.+)$`, "is");
    const tangentMatch = text.match(tangentRe);
    if (tangentMatch) {
      const textAfterTangent = tangentMatch[1].trim();
      const { name: extractedName, task } = await extractTangentNameAndTask(textAfterTangent);

      // Guard: if extracted name matches main agent, use default instead
      const mainAgentNames = ["drive", "main", "primary", "cursor"];
      const isMainAgent = extractedName
        ? mainAgentNames.includes(extractedName.toLowerCase().trim())
        : false;
      const nameToUse = extractedName && !isMainAgent ? extractedName : undefined;

      // Checkpoint: require confirmation before spawning when subAgentApproval is on.
      const requireApproval = cfg.get<boolean>("agents.subAgentApproval", false);
      if (requireApproval) {
        const checkpoint = await requestCheckpoint(
          `Spawn an operator for: "${task}"?`,
          "A new operator will be spawned in the background to work on this task in parallel."
        );
        if (checkpoint) { return checkpoint; }
      }

      const op = ctx.operatorRegistry.spawn(nameToUse, task);
      AgentScreenPanel.getInstance()?.logActivity("Drive", `Spawned ${op.name}: ${task}`);

      // Tangent confirmation flow: intro, wait for confirm (unless autoConfirm)
      const autoConfirm = cfg.get<boolean>("agents.autoConfirmTangent", false);
      if (!autoConfirm) {
        const confirmResult = await confirmTangentAgent(op, task, {
          timeoutMs: cfg.get<number>("agents.tangentConfirmationTimeout", 5000),
          updateTask: (newTask) => ctx.operatorRegistry!.updateTask(op.id, newTask),
        });
        if (!confirmResult.confirmed) {
          ctx.operatorRegistry.dismiss(op.id);
          return {
            ok: "checkpoint",
            reason: "Tangent confirmation cancelled",
          };
        }
        if (confirmResult.task !== task) {
          ctx.operatorRegistry.updateTask(op.id, confirmResult.task);
        }
      }

      pipelineStats.tangentCount++;
      updateAvgLatency(Date.now() - startTime);
      return {
        ok: true,
        prompt: "",
        route: { mode: "agent", reason: "Tangent spawn" },
        model: "execution",
        tangentAck: `Spawned ${op.name} for: ${task}`,
      };
    }
  }

  // Stage order: filler-clean → glossary-expand → sanitize (pwm-01)
  const fillerResult = cleanFillerWords(text);
  text = fillerResult.cleaned;

  const glossaryResult = expandGlossary(text);
  text = glossaryResult.expanded;

  // Sanitize
  const sanitizeResult = sanitizePrompt(text);
  text = sanitizeResult.sanitized;

  // pwm-05: Prompt optimizer (between sanitize and approval-gate)
  const optResult = await optimizePrompt(text, {
    wasModifiedByFiller: fillerResult.wasModified,
    skipOptimizer,
  });
  text = optResult.prompt;

  // Approval-gate: check block first (no UI), then warn (UI), log (silent).
  // Pass foreground operator ID for per-operator stats tracking.
  const currentOperatorId = ctx.operatorRegistry?.getForeground()?.id;
  const gateResult = getGateResult(text, currentOperatorId);
  if (gateResult.action === "block") {
    const msg = gateResult.pattern
      ? `Drive blocked: Prompt contains "${gateResult.pattern}". ${gateResult.reason ?? "This operation is not allowed by safety policy."}`
      : `Drive blocked: ${gateResult.reason ?? "This operation is not allowed by safety policy."}`;
    void vscode.window.showErrorMessage(msg);
    pipelineStats.blockedCount++;
    updateAvgLatency(Date.now() - startTime);
    return { ok: false, blocked: true, gateResult };
  }
  if (gateResult.action === "warn") {
    // Use the already-computed gate result — avoid re-calling getGateResult via checkPrompt.
    const choice = await vscode.window.showWarningMessage(
      `Drive: Prompt contains "${gateResult.pattern}". This looks potentially destructive. Proceed?`,
      { modal: true },
      "Proceed",
      "Cancel"
    );
    if (choice !== "Proceed") {
      pipelineStats.blockedCount++;
      updateAvgLatency(Date.now() - startTime);
      return { ok: false, blocked: true, gateResult };
    }
  }
  if (gateResult.action === "log") {
    AgentScreenPanel.getInstance()?.logActivity("Drive/Steering", `Logged: ${gateResult.pattern ?? "policy match"}`);
  }

  // Persistent-context-inject (prepend before session)
  if (ctx.persistentMemory) {
    const persistentContext = await ctx.persistentMemory.buildPromptContext();
    if (persistentContext) {
      text = `${persistentContext}\n\n${text}`;
    }
  }

  // Session-context-inject
  const sessionContext = ctx.sessionMemory.buildContextString();
  if (sessionContext) {
    text = `${sessionContext}\n\n${text}`;
  }

  // Route
  const routeDecision = route({
    prompt: text,
    command: slashCommand,
    driveSubMode: ctx.driveSubMode,
  });

  // Model-select
  const model = tierForMode(routeDecision.mode);

  pipelineStats.successCount++;
  updateAvgLatency(Date.now() - startTime);
  return {
    ok: true,
    prompt: text,
    route: routeDecision,
    model,
  };
}
