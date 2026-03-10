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

type ModeSwitchingConfig = {
  voiceEnabled: boolean;
  semanticEnabled: boolean;
  requireConfirmation: boolean;
  allowedModes: SubMode[];
};

let cachedModeSwitching: ModeSwitchingConfig | undefined;

function ensureConfigInvalidation(): void {
  if (cachedModeSwitching !== undefined) return;
  vscode.workspace.onDidChangeConfiguration((e) => {
    if (e.affectsConfiguration("cursorDrive.modeSwitching")) {
      cachedModeSwitching = undefined;
    }
  });
}

/** Cached mode-switching config (single getConfiguration read, invalidated on change). */
function getModeSwitchingConfig(): ModeSwitchingConfig {
  ensureConfigInvalidation();
  if (cachedModeSwitching) return cachedModeSwitching;
  const cfg = vscode.workspace.getConfiguration("cursorDrive");
  const raw = cfg.get<unknown[]>("modeSwitching.allowedModes", VALID_MODES);
  const allowed = raw.filter(isSubMode).length > 0 ? (raw.filter(isSubMode) as SubMode[]) : [...VALID_MODES];
  cachedModeSwitching = {
    voiceEnabled: cfg.get<boolean>("modeSwitching.voiceEnabled", true),
    semanticEnabled: cfg.get<boolean>("modeSwitching.semanticEnabled", false),
    requireConfirmation: cfg.get<boolean>("modeSwitching.requireConfirmation", true),
    allowedModes: allowed,
  };
  return cachedModeSwitching;
}

/**
 * Whether voice-triggered mode switches are allowed.
 */
export function canSwitchByVoice(): boolean {
  return getModeSwitchingConfig().voiceEnabled;
}

/**
 * Whether AI-suggested (semantic) mode switches are allowed.
 */
export function canSwitchBySemantic(): boolean {
  return getModeSwitchingConfig().semanticEnabled;
}

/**
 * Whether confirmation is required before switching.
 */
export function requireConfirmation(): boolean {
  return getModeSwitchingConfig().requireConfirmation;
}

/**
 * Modes the user is allowed to switch to.
 */
export function getAllowedModes(): SubMode[] {
  return getModeSwitchingConfig().allowedModes;
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
