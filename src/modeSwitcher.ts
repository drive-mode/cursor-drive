/**
 * Mode switching controls: voice vs semantic triggers with strict validation.
 * See docs/prd/prd-safety-config.md and cursorDrive.modeSwitching config.
 */

import * as vscode from "vscode";

export type SubMode = "plan" | "agent" | "ask" | "debug";

export type SwitchTrigger = "voice" | "semantic" | "manual";

const VALID_MODES: SubMode[] = ["plan", "agent", "ask", "debug"];

/** Voice phrases that map to sub-modes. Longest match first. */
const VOICE_MODE_PATTERNS: { pattern: RegExp; mode: SubMode }[] = [
  { pattern: /\b(?:switch to|go to|set)\s+plan\s*(?:mode)?\b/i, mode: "plan" },
  { pattern: /\b(?:switch to|go to|set)\s+agent\s*(?:mode)?\b/i, mode: "agent" },
  { pattern: /\b(?:switch to|go to|set)\s+ask\s*(?:mode)?\b/i, mode: "ask" },
  { pattern: /\b(?:switch to|go to|set)\s+debug\s*(?:mode)?\b/i, mode: "debug" },
  { pattern: /\bplan\s+mode\b/i, mode: "plan" },
  { pattern: /\bagent\s+mode\b/i, mode: "agent" },
  { pattern: /\bask\s+mode\b/i, mode: "ask" },
  { pattern: /\bdebug\s+mode\b/i, mode: "debug" },
];

function isSubMode(v: unknown): v is SubMode {
  return typeof v === "string" && VALID_MODES.includes(v as SubMode);
}

/**
 * Whether voice-triggered mode switches are allowed.
 */
export function canSwitchByVoice(): boolean {
  return vscode.workspace.getConfiguration("cursorDrive").get<boolean>("modeSwitching.voiceEnabled", true);
}

/**
 * Whether AI-suggested (semantic) mode switches are allowed.
 */
export function canSwitchBySemantic(): boolean {
  return vscode.workspace.getConfiguration("cursorDrive").get<boolean>("modeSwitching.semanticEnabled", false);
}

/**
 * Whether confirmation is required before switching.
 */
export function requireConfirmation(): boolean {
  return vscode.workspace.getConfiguration("cursorDrive").get<boolean>("modeSwitching.requireConfirmation", true);
}

/**
 * Modes the user is allowed to switch to.
 */
export function getAllowedModes(): SubMode[] {
  const raw = vscode.workspace.getConfiguration("cursorDrive").get<unknown[]>("modeSwitching.allowedModes", VALID_MODES);
  return raw.filter(isSubMode).length > 0 ? raw.filter(isSubMode) : [...VALID_MODES];
}

/**
 * Whether the given mode is in the allowed list.
 */
export function isAllowedMode(mode: SubMode): boolean {
  return getAllowedModes().includes(mode);
}

/**
 * Check if a switch is permitted for the given trigger.
 */
export function canSwitch(trigger: SwitchTrigger, targetMode: SubMode): boolean {
  if (!isAllowedMode(targetMode)) return false;
  switch (trigger) {
    case "voice":
      return canSwitchByVoice();
    case "semantic":
      return canSwitchBySemantic();
    case "manual":
      return true;
    default:
      return false;
  }
}

export interface ParsedVoiceMode {
  mode: SubMode;
  matchedText: string;
}

/**
 * Try to parse a voice-mode switch from text (e.g. "switch to plan mode").
 * Returns undefined if no match or voice switching disabled.
 */
export function parseVoiceModeSwitch(text: string): ParsedVoiceMode | undefined {
  if (!canSwitchByVoice()) return undefined;
  const trimmed = text.trim();
  for (const { pattern, mode } of VOICE_MODE_PATTERNS) {
    const m = trimmed.match(pattern);
    if (m && isAllowedMode(mode)) {
      return { mode, matchedText: m[0] };
    }
  }
  return undefined;
}
