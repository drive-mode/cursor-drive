/**
 * Handles user clarification when they interrupt agent TTS.
 * Uses Tier-1 model to decide if the agent's response is still valid or should be modified.
 */

import * as vscode from "vscode";
import { selectCheapModel } from "./modelSelector.js";
import { getSpokenHistory, stop as ttsStop } from "./tts.js";

export type ClarificationAction = "continue" | "modify" | "abandon";

export interface ClarificationResult {
  action: ClarificationAction;
  /** If modify: suggested merged content for the previous turn. */
  mergedContent?: string;
}

const VALIDATION_PROMPT = `The agent was speaking (or about to speak) the following. The user interrupted with a clarification/correction.

Agent's spoken/recent content:
{{AGENT_CONTENT}}

User's new input:
{{USER_INPUT}}

Decide:
- "continue": Agent's response is still valid; process user input as a new turn.
- "modify": User is refining/correcting; merge their input with the prior intent. Output a single merged summary.
- "abandon": Agent should discard and re-plan; user's input supersedes.

Respond with JSON only: {"action": "continue"|"modify"|"abandon", "mergedContent": "..." (only if modify)}`;

/**
 * When user input arrives while TTS was active, validate whether the agent
 * should continue, modify its response, or abandon.
 */
export async function handleClarification(
  userInput: string,
  options?: { token?: vscode.CancellationToken }
): Promise<ClarificationResult | undefined> {
  const spoken = getSpokenHistory();
  if (spoken.length === 0) { return undefined; }

  const agentContent = spoken.slice(-3).join(" ").trim();
  if (!agentContent) { return undefined; }

  const model = await selectCheapModel(options?.token ?? new vscode.CancellationTokenSource().token);
  if (!model) { return undefined; }

  const prompt = VALIDATION_PROMPT
    .replace("{{AGENT_CONTENT}}", agentContent)
    .replace("{{USER_INPUT}}", userInput);

  const messages = [vscode.LanguageModelChatMessage.User(prompt)];
  const tokenToUse = options?.token ?? new vscode.CancellationTokenSource().token;
  const session = await model.sendRequest(messages, {}, tokenToUse);

  let raw = "";
  for await (const chunk of session.text) {
    raw += chunk;
  }

  try {
    const parsed = JSON.parse(raw.trim()) as { action?: string; mergedContent?: string };
    const action = (parsed.action === "modify" || parsed.action === "abandon"
      ? parsed.action
      : "continue") as ClarificationAction;
    return {
      action,
      mergedContent: typeof parsed.mergedContent === "string" ? parsed.mergedContent.trim() : undefined,
    };
  } catch {
    return { action: "continue" };
  }
}

/**
 * Stop TTS when user sends new input (if interruptOnInput is enabled).
 * Call at pipeline entry when processing new user prompt.
 */
export function maybeStopTtsOnInput(): void {
  const cfg = vscode.workspace.getConfiguration("cursorDrive.tts");
  if (cfg.get<boolean>("interruptOnInput", true)) {
    ttsStop();
  }
}
