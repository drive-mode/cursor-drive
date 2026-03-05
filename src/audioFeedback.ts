/**
 * Audio feedback for Drive mode state transitions.
 *
 * Plays synthesized chime tones via the AgentScreen WebView (Web Audio API).
 * Falls back to OS TTS ("Drive on" / "Drive off") when the WebView is not open.
 *
 * 1 chime = Drive ON
 * 2 chimes = Drive OFF
 */

import { AgentScreenPanel } from "./agentScreen.js";
import { speak } from "./tts.js";

export type ChimeCount = 1 | 2;

/**
 * Play a chime via the AgentScreen WebView.
 * Falls back to TTS if the WebView is not currently open.
 */
export function playChime(count: ChimeCount): void {
  const panel = AgentScreenPanel.getInstance();
  if (panel) {
    panel.playChime(count);
    return;
  }
  // WebView not open — fall back to TTS label (no-op when TTS disabled)
  speak(count === 1 ? "Drive on" : "Drive off");
}
