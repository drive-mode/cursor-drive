/**
 * Extracts agent name and task from tangent command text.
 * Uses regex (Tier 0) first, then Tier-1 model for ambiguous cases.
 * See plan: tangent_agent_ux_features.
 */

import * as vscode from "vscode";
import { selectCheapModel } from "./modelSelector.js";

export interface TangentParseResult {
  name?: string;
  task: string;
}

/** Regex: "call it X — task" or "X — task" or "X: task" (explicit separator). */
const EXPLICIT_SEP_RE = /^(?:call\s+it\s+)?(.+?)\s*[-—:]\s*(.+)$/s;

/**
 * Try regex extraction first. Returns undefined if no match.
 */
function tryRegexExtract(textAfterTangent: string): TangentParseResult | undefined {
  const m = textAfterTangent.trim().match(EXPLICIT_SEP_RE);
  if (!m) return undefined;
  const name = m[1].trim();
  const task = m[2].trim();
  if (!task) return undefined;
  return { name, task };
}

const EXTRACT_SYSTEM_PROMPT = `You extract agent name and task from a tangent command.
The user said "tangent" followed by text. Determine if they gave a custom agent name.

Rules:
- If they said something like "call it X" or "X — task" or "X, task", extract name and task.
- Names can be multi-word (e.g. "The Godly Knight"). Case insensitive.
- If no clear name, return task only.
- Output JSON only: {"name": "Name" or null, "task": "the task"}.
- If name is clearly the main/primary agent (e.g. "Drive", "main", "primary"), use null.`;

/**
 * Use Tier-1 model to extract name and task from ambiguous text.
 */
async function extractViaModel(
  textAfterTangent: string,
  token?: vscode.CancellationToken
): Promise<TangentParseResult> {
  const model = await selectCheapModel(token ?? new vscode.CancellationTokenSource().token);
  if (!model) {
    return { task: textAfterTangent.trim() };
  }

  const messages = [
    vscode.LanguageModelChatMessage.User(
      `${EXTRACT_SYSTEM_PROMPT}\n\nText after "tangent":\n${textAfterTangent}`
    ),
  ];
  const tokenToUse = token ?? new vscode.CancellationTokenSource().token;
  const session = await model.sendRequest(messages, {}, tokenToUse);

  let raw = "";
  for await (const chunk of session.text) {
    raw += chunk;
  }

  try {
    const parsed = JSON.parse(raw.trim()) as { name?: string | null; task?: string };
    const name = parsed.name && String(parsed.name).trim() ? String(parsed.name).trim() : undefined;
    const task = parsed.task && String(parsed.task).trim() ? String(parsed.task).trim() : textAfterTangent.trim();
    return { name, task };
  } catch {
    return { task: textAfterTangent.trim() };
  }
}

/**
 * Extract name and task from text that follows the tangent keyword.
 * Tries regex first (Tier 0), then model (Tier 1) for ambiguous input.
 */
export async function extractTangentNameAndTask(
  textAfterTangent: string,
  options?: { token?: vscode.CancellationToken }
): Promise<TangentParseResult> {
  const regexResult = tryRegexExtract(textAfterTangent);
  if (regexResult) return regexResult;
  return extractViaModel(textAfterTangent, options?.token);
}
