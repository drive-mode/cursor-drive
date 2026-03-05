import * as say from "say";
import * as vscode from "vscode";

const SPOKEN_HISTORY_SIZE = 20;

/** Circular buffer of recently spoken text. Agent can query what it has said via TTS. */
const spokenHistory: string[] = [];
let inProgressUtterance: string | undefined;

export function getSpokenHistory(): string[] {
  return [...spokenHistory];
}

/** True if stop() was called while TTS was mid-utterance. */
export function wasLastInterrupted(): boolean {
  return inProgressUtterance !== undefined;
}

export function clearSpokenHistory(): void {
  spokenHistory.length = 0;
  inProgressUtterance = undefined;
}

export interface TtsConfig {
  enabled: boolean;
  voice: string | undefined;
  speed: number;
  maxSpokenSentences: number;
  interruptOnInput: boolean;
}

let ttsConfigCache: TtsConfig | null = null;

vscode.workspace.onDidChangeConfiguration((e) => {
  if (e.affectsConfiguration("cursorDrive.tts")) {
    ttsConfigCache = null;
  }
});

export function getTtsConfig(): TtsConfig {
  if (ttsConfigCache) { return ttsConfigCache; }
  const cfg = vscode.workspace.getConfiguration("cursorDrive.tts");
  const voice = cfg.get<string>("voice", "");
  ttsConfigCache = {
    enabled: cfg.get<boolean>("enabled", false),
    voice: voice.trim() || undefined,
    speed: Math.max(0.5, Math.min(2.0, cfg.get<number>("speed", 1.0))),
    maxSpokenSentences: cfg.get<number>("maxSpokenSentences", 3),
    interruptOnInput: cfg.get<boolean>("interruptOnInput", true),
  };
  return ttsConfigCache;
}

function truncateToSentences(text: string, max: number): string {
  if (max <= 0) { return ""; }
  const sentences = text.match(/[^.!?\n]+[.!?\n]+/g);
  if (!sentences || sentences.length === 0) {
    return text.trim();
  }
  return sentences.slice(0, max).join(" ").trim();
}

export function speak(text: string, overrideVoice?: string): void {
  const cfg = getTtsConfig();
  if (!cfg.enabled) { return; }

  say.stop();
  inProgressUtterance = undefined;
  const speech = truncateToSentences(text.trim(), cfg.maxSpokenSentences);
  if (!speech) { return; }

  inProgressUtterance = speech;
  say.speak(speech, overrideVoice ?? cfg.voice, cfg.speed, (err: string) => {
    if (err) { console.error("[Drive TTS]", err); }
    inProgressUtterance = undefined;
    spokenHistory.push(speech);
    if (spokenHistory.length > SPOKEN_HISTORY_SIZE) {
      spokenHistory.shift();
    }
  });
}

export function speakFull(text: string, voice?: string, speed?: number): void {
  const cfg = getTtsConfig();
  if (!cfg.enabled) { return; }

  say.stop();
  inProgressUtterance = undefined;
  const trimmed = text.trim();
  if (!trimmed) { return; }

  inProgressUtterance = trimmed;
  say.speak(trimmed, voice ?? cfg.voice, speed ?? cfg.speed, (err: string) => {
    if (err) { console.error("[Drive TTS full]", err); }
    inProgressUtterance = undefined;
    spokenHistory.push(trimmed);
    if (spokenHistory.length > SPOKEN_HISTORY_SIZE) {
      spokenHistory.shift();
    }
  });
}

export function stop(): void {
  if (inProgressUtterance) {
    spokenHistory.push(`[interrupted] ${inProgressUtterance}`);
    if (spokenHistory.length > SPOKEN_HISTORY_SIZE) {
      spokenHistory.shift();
    }
    inProgressUtterance = undefined;
  }
  say.stop();
}

export function isEnabled(): boolean {
  return getTtsConfig().enabled;
}
