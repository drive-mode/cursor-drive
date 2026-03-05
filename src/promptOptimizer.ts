/**
 * AI-powered prompt refinement using the cheapest available model.
 * Rewrites voice/dictation prompts for clarity while preserving all intent.
 * See docs/design/ai/prompt-optimizer-design.md.
 */

import * as vscode from "vscode";
import { selectCheapModel } from "./modelSelector.js";
import { looksLikeDictation } from "./fillerCleaner.js";

const OPTIMIZER_SYSTEM_PROMPT = `Rewrite the developer's request into a clear, specific, actionable engineering prompt.
Preserve ALL intent. Remove filler, hedging, and rambling.
If the prompt is already clear and specific, return it unchanged.
Output only the rewritten prompt, no explanation.`;

const SHORT_CLEAN_THRESHOLD = 80; // chars — short prompts skip optimizer

export interface OptimizeResult {
  prompt: string;
  wasOptimized: boolean;
  original?: string;
}

/**
 * Optimize a prompt when enabled and the prompt benefits from it.
 * Skips when disabled, autoApprove skips QuickPick, or prompt is short+clean.
 */
export async function optimizePrompt(
  text: string,
  options: {
    wasModifiedByFiller?: boolean;
    skipOptimizer?: boolean;
    token?: vscode.CancellationToken;
  } = {}
): Promise<OptimizeResult> {
  const cfg = vscode.workspace.getConfiguration("cursorDrive");
  const enabled = cfg.get<boolean>("promptOptimizer.enabled", true);
  const autoApprove = cfg.get<boolean>("promptOptimizer.autoApprove", false);

  if (!enabled || options.skipOptimizer) {
    return { prompt: text, wasOptimized: false };
  }

  const shouldRun =
    options.wasModifiedByFiller ||
    looksLikeDictation(text) ||
    text.length > SHORT_CLEAN_THRESHOLD;

  if (!shouldRun) {
    return { prompt: text, wasOptimized: false };
  }

  const model = await selectCheapModel(options.token ?? new vscode.CancellationTokenSource().token);
  if (!model) {
    return { prompt: text, wasOptimized: false };
  }

  const messages = [
    vscode.LanguageModelChatMessage.User(OPTIMIZER_SYSTEM_PROMPT + "\n\nUser prompt to rewrite:\n" + text),
  ];
  const tokenToUse = options.token ?? new vscode.CancellationTokenSource().token;
  const session = await model.sendRequest(messages, {}, tokenToUse);

  let optimized = "";
  for await (const chunk of session.text) {
    optimized += chunk;
  }
  optimized = optimized.trim() || text;

  if (optimized === text) {
    return { prompt: text, wasOptimized: false };
  }

  if (autoApprove) {
    return { prompt: optimized, wasOptimized: true, original: text };
  }

  const choice = await vscode.window.showQuickPick(
    [
      { label: "Use optimized", value: "optimized" as const },
      { label: "Use original", value: "original" as const },
      { label: "Edit", value: "edit" as const },
    ],
    {
      title: "Prompt optimizer — choose version",
      placeHolder: "Optimized prompt ready",
    }
  );

  if (!choice) {
    return { prompt: text, wasOptimized: false };
  }
  if (choice.value === "original") {
    return { prompt: text, wasOptimized: false };
  }
  if (choice.value === "edit") {
    const edited = await vscode.window.showInputBox({
      prompt: "Edit the prompt",
      value: optimized,
      validateInput: (v) => (v.trim() ? null : "Prompt cannot be empty"),
    });
    return {
      prompt: edited?.trim() ?? optimized,
      wasOptimized: true,
      original: text,
    };
  }

  return { prompt: optimized, wasOptimized: true, original: text };
}
