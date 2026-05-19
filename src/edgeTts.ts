/**
 * Edge-TTS backend — free, cloud, high-quality neural TTS.
 * Uses Microsoft Edge's TTS service (same voices as Edge browser).
 * Requires: npm install edge-tts-universal (optional dependency)
 * No API key. Requires network.
 */

import * as vscode from "vscode";

let edgeTtsAvailable: boolean | undefined;

export function stopEdgeTts(): void {
  // Edge-TTS synthesis is fire-and-forget; playback happens in webview.
  // Webview handles ttsStop to cancel. No process to kill here.
}

export function isEdgeTtsAvailable(): boolean {
  if (edgeTtsAvailable !== undefined) return edgeTtsAvailable;
  try {
    require.resolve("edge-tts-universal");
    edgeTtsAvailable = true;
  } catch {
    edgeTtsAvailable = false;
  }
  return edgeTtsAvailable;
}

vscode.workspace.onDidChangeConfiguration((e) => {
  if (e.affectsConfiguration("cursorDrive.tts.edgeTts")) {
    edgeTtsAvailable = undefined;
  }
});

export type PlayAudioFn = (base64: string, mimeType: string, volume: number) => boolean;

let playAudioFn: PlayAudioFn | null = null;

export function registerEdgeTtsAudioPlayer(fn: PlayAudioFn): void {
  playAudioFn = fn;
}

/** Speak text via Edge-TTS. Async; onSpoken called when done. Returns true if started. */
export async function speakEdgeTts(
  text: string,
  volume: number,
  onSpoken?: (speech: string) => void
): Promise<boolean> {
  if (!isEdgeTtsAvailable() || !playAudioFn) return false;

  const cfg = vscode.workspace.getConfiguration("cursorDrive.tts.edgeTts");
  const voice = cfg.get<string>("voice", "en-US-EmmaMultilingualNeural");

  try {
    const { EdgeTTS } = await import("edge-tts-universal");
    const tts = new EdgeTTS(text, voice);
    const result = await tts.synthesize();
    const buffer = Buffer.from(await result.audio.arrayBuffer());
    const base64 = buffer.toString("base64");
    const sent = playAudioFn(base64, "audio/mpeg", volume);
    if (sent) {
      onSpoken?.(text);
    }
    return sent;
  } catch (e) {
    console.error("[Drive Edge-TTS]", e);
    return false;
  }
}
