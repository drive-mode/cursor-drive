import * as vscode from "vscode";
import { speakPiper, stopPiper, isPiperAvailable } from "./piper.js";
import { speakEdgeTts, stopEdgeTts, isEdgeTtsAvailable, registerEdgeTtsAudioPlayer } from "./edgeTts.js";

const SPOKEN_HISTORY_SIZE = 20;

interface TtsWebviewProvider {
  speak(text: string, volume: number): boolean;
  stop?(): void;
}
const ttsWebviewProviders: TtsWebviewProvider[] = [];

export function registerTtsWebviewProvider(p: TtsWebviewProvider): void {
  ttsWebviewProviders.push(p);
}

/** Lazy-loaded say module. undefined = not yet tried, null = unavailable, otherwise the module. */
let sayModule: typeof import("say") | null | undefined = undefined;

function getSay(): typeof import("say") | null {
  if (sayModule !== undefined) return sayModule as typeof import("say") | null;
  try {
    sayModule = require("say");
    return sayModule as typeof import("say");
  } catch {
    sayModule = null;
    return null;
  }
}

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
  backend: "webSpeech" | "edgeTts" | "piper" | "say";
  voice: string | undefined;
  speed: number;
  volume: number;
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
  const backend = cfg.get<string>("backend", "webSpeech") as "webSpeech" | "edgeTts" | "piper" | "say";
  ttsConfigCache = {
    enabled: cfg.get<boolean>("enabled", false),
    backend: ["webSpeech", "edgeTts", "piper", "say"].includes(backend) ? backend : "webSpeech",
    voice: voice.trim() || undefined,
    speed: Math.max(0.5, Math.min(2.0, cfg.get<number>("speed", 1.0))),
    volume: Math.max(0.2, Math.min(1, cfg.get<number>("volume", 0.5))),
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

function pushSpoken(speech: string): void {
  spokenHistory.push(speech);
  if (spokenHistory.length > SPOKEN_HISTORY_SIZE) spokenHistory.shift();
}

export function speak(text: string, overrideVoice?: string): void {
  const cfg = getTtsConfig();
  if (!cfg.enabled) { return; }

  const speech = truncateToSentences(text.trim(), cfg.maxSpokenSentences);
  if (!speech) { return; }

  inProgressUtterance = speech;

  // 1. Webview (volume control, works when Drive/Agent panel open)
  for (const p of ttsWebviewProviders) {
    if (p.speak(speech, cfg.volume)) {
      pushSpoken(speech);
      return;
    }
  }

  // 2. Edge-TTS (free, cloud, high quality)
  if ((cfg.backend === "edgeTts" || cfg.backend === "webSpeech") && isEdgeTtsAvailable()) {
    void speakEdgeTts(speech, cfg.volume, () => {
      inProgressUtterance = undefined;
      pushSpoken(speech);
    }).then((started) => {
      if (!started) doSayFallback(speech, overrideVoice ?? cfg.voice, cfg.speed);
    });
    return;
  }

  // 3. Piper (free, local, better quality)
  if ((cfg.backend === "piper" || cfg.backend === "webSpeech") && isPiperAvailable()) {
    if (speakPiper(speech, cfg.volume, () => {
      inProgressUtterance = undefined;
      pushSpoken(speech);
    })) {
      return;
    }
  }

  doSayFallback(speech, overrideVoice ?? cfg.voice, cfg.speed);
}

function doSayFallback(speech: string, voice: string | undefined, speed: number): void {
  const say = getSay();
  if (!say) {
    inProgressUtterance = undefined;
    return;
  }
  say.stop();
  say.speak(speech, voice, speed, (err: string) => {
    if (err) { console.error("[Drive TTS]", err); }
    inProgressUtterance = undefined;
    pushSpoken(speech);
  });
}

export function speakFull(text: string, voice?: string, speed?: number): void {
  const cfg = getTtsConfig();
  if (!cfg.enabled) { return; }

  const trimmed = text.trim();
  if (!trimmed) { return; }

  inProgressUtterance = trimmed;

  for (const p of ttsWebviewProviders) {
    if (p.speak(trimmed, cfg.volume)) {
      pushSpoken(trimmed);
      return;
    }
  }

  if ((cfg.backend === "edgeTts" || cfg.backend === "webSpeech") && isEdgeTtsAvailable()) {
    void speakEdgeTts(trimmed, cfg.volume, () => {
      inProgressUtterance = undefined;
      pushSpoken(trimmed);
    }).then((started) => {
      if (!started) doSayFallback(trimmed, voice ?? cfg.voice, speed ?? cfg.speed);
    });
    return;
  }

  if ((cfg.backend === "piper" || cfg.backend === "webSpeech") && isPiperAvailable()) {
    if (speakPiper(trimmed, cfg.volume, () => {
      inProgressUtterance = undefined;
      pushSpoken(trimmed);
    })) {
      return;
    }
  }

  doSayFallback(trimmed, voice ?? cfg.voice, speed ?? cfg.speed);
}

export function stop(): void {
  for (const p of ttsWebviewProviders) {
    p.stop?.();
  }
  stopPiper();
  stopEdgeTts();
  if (inProgressUtterance) {
    spokenHistory.push(`[interrupted] ${inProgressUtterance}`);
    if (spokenHistory.length > SPOKEN_HISTORY_SIZE) spokenHistory.shift();
    inProgressUtterance = undefined;
  }
  const say = getSay();
  if (say) { say.stop(); }
}

export function isEnabled(): boolean {
  return getTtsConfig().enabled;
}

let onPlaybackEndedCallback: (() => void) | null = null;

export function setOnPlaybackEnded(cb: () => void): void {
  onPlaybackEndedCallback = cb;
}

export function notifyPlaybackEnded(): void {
  if (inProgressUtterance) {
    spokenHistory.push(inProgressUtterance);
    if (spokenHistory.length > SPOKEN_HISTORY_SIZE) spokenHistory.shift();
    inProgressUtterance = undefined;
  }
  onPlaybackEndedCallback?.();
}
