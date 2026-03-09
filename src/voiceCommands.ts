/**
 * Voice command discovery and execution with fallback chain.
 *
 * Cursor/VS Code voice commands vary by version. This module probes commands
 * in order and uses the first that succeeds. Run cursorDrive.discoverVoiceCommands
 * to find which commands work in your Cursor build.
 */

import * as vscode from "vscode";

// ── Known command candidates (order = preference) ────────────────────────────

/** Commands to open the chat/composer panel. */
export const CHAT_OPEN_CANDIDATES = [
  "workbench.action.chat.open",
  "composer.openComposer",
  "composer.openAsPane",
  "composer.focusComposer",
] as const;

/** Commands to start mic/voice input. composer.toggleVoiceDictation often works when
 * startVoiceChat is context-gated (only after user has clicked the mic in chat). */
export const MIC_START_CANDIDATES = [
  "composer.toggleVoiceDictation",
  "workbench.action.chat.startVoiceChat",
  "workbench.action.chat.voice.start", // legacy Copilot
] as const;

/** Commands to stop mic and submit. */
export const MIC_STOP_SUBMIT_CANDIDATES = [
  "workbench.action.chat.stopListeningAndSubmit",
  "composer.cancelVoiceDictation", // may cancel only; try as fallback
] as const;

/** Commands to stop mic (cancel, no submit). */
export const MIC_STOP_CANCEL_CANDIDATES = [
  "workbench.action.chat.stopListening",
  "composer.cancelVoiceDictation",
] as const;

// ── Probe ───────────────────────────────────────────────────────────────────

/**
 * Try executing a command; return true if it ran without throwing.
 */
async function probeExecute(id: string): Promise<boolean> {
  try {
    await vscode.commands.executeCommand(id);
    return true;
  } catch {
    return false;
  }
}

/**
 * Try commands in order; return the first that succeeds. Uses execute for start/open.
 */
async function tryFirstExecute(
  candidates: readonly string[],
  customFallbacks: string[] = []
): Promise<string | undefined> {
  const all = [...candidates, ...customFallbacks];
  for (const id of all) {
    if (await probeExecute(id)) {
      return id;
    }
  }
  return undefined;
}

/**
 * Return first command that exists in the registry. Does not execute.
 */
function tryFirstExists(
  candidates: readonly string[],
  customFallbacks: string[],
  allCommands: string[]
): string | undefined {
  const all = [...candidates, ...customFallbacks];
  return all.find((id) => allCommands.includes(id));
}

// ── Public API ───────────────────────────────────────────────────────────────

export interface VoiceProbeResult {
  chatOpen: string | undefined;
  micStart: string | undefined;
  micStopSubmit: string | undefined;
  micStopCancel: string | undefined;
  allChatVoiceCommands: string[];
}

/**
 * Probe all voice-related commands. For chat open we execute (safe); for mic we check existence only.
 */
export async function probeVoiceCommands(
  customMicFallbacks: string[] = []
): Promise<VoiceProbeResult> {
  const allCommands = await vscode.commands.getCommands(false);
  const chatVoice = allCommands.filter(
    (c) =>
      c.includes("chat") ||
      c.includes("voice") ||
      c.includes("composer") ||
      c.includes("dictation")
  );

  const chatOpen = await tryFirstExecute(CHAT_OPEN_CANDIDATES);
  const micStart = tryFirstExists(
    MIC_START_CANDIDATES,
    customMicFallbacks,
    allCommands
  );
  const micStopSubmit = tryFirstExists(
    MIC_STOP_SUBMIT_CANDIDATES,
    [],
    allCommands
  );
  const micStopCancel = tryFirstExists(
    MIC_STOP_CANCEL_CANDIDATES,
    [],
    allCommands
  );

  return {
    chatOpen,
    micStart,
    micStopSubmit,
    micStopCancel,
    allChatVoiceCommands: chatVoice.sort(),
  };
}

/**
 * Execute chat open using config + fallbacks. Always appends built-in candidates.
 * Throws if none work.
 */
export async function executeChatOpen(
  primary: string,
  fallbacks: string[] = []
): Promise<string> {
  const userCandidates = primary ? [primary, ...fallbacks] : [...fallbacks];
  const builtIn = [...CHAT_OPEN_CANDIDATES];
  const candidates = [...userCandidates, ...builtIn.filter((c) => !userCandidates.includes(c))];
  const worked = await tryFirstExecute(candidates, []);
  if (!worked) {
    throw new Error(`Chat open failed. Tried: ${candidates.join(", ")}`);
  }
  return worked;
}

/**
 * Execute mic start using config + fallbacks. Always appends built-in candidates.
 */
export async function executeMicStart(
  primary: string,
  fallbacks: string[] = []
): Promise<string | undefined> {
  const userCandidates = primary ? [primary, ...fallbacks] : [...fallbacks];
  const builtIn = [...MIC_START_CANDIDATES];
  const candidates = [...userCandidates, ...builtIn.filter((c) => !userCandidates.includes(c))];
  return tryFirstExecute(candidates, []);
}

/**
 * Execute mic stop+submit. Always appends built-in candidates.
 */
export async function executeMicStopSubmit(
  primary: string,
  fallbacks: string[] = []
): Promise<string | undefined> {
  const userCandidates = primary ? [primary, ...fallbacks] : [...fallbacks];
  const builtIn = [...MIC_STOP_SUBMIT_CANDIDATES];
  const candidates = [...userCandidates, ...builtIn.filter((c) => !userCandidates.includes(c))];
  return tryFirstExecute(candidates, []);
}

/**
 * Execute mic stop (cancel). Always appends built-in candidates.
 */
export async function executeMicStopCancel(
  primary: string,
  fallbacks: string[] = []
): Promise<string | undefined> {
  const userCandidates = primary ? [primary, ...fallbacks] : [...fallbacks];
  const builtIn = [...MIC_STOP_CANCEL_CANDIDATES];
  const candidates = [...userCandidates, ...builtIn.filter((c) => !userCandidates.includes(c))];
  return tryFirstExecute(candidates, []);
}
