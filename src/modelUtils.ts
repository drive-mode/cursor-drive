/**
 * Shared LM model selection logic.
 * Single source of truth for vscode.lm.selectChatModels + tier-based fallback.
 */

import * as vscode from "vscode";

export type ModelTier = "routing" | "planning" | "execution" | "reasoning";

/**
 * Get available chat models from vscode.lm. Returns empty array on error.
 */
export async function getAvailableModels(): Promise<readonly vscode.LanguageModelChat[]> {
  const result = await getAvailableModelsWithError();
  return result.models;
}

/**
 * Get available models with error info. Use when probing/API discovery.
 */
export async function getAvailableModelsWithError(): Promise<{
  models: readonly vscode.LanguageModelChat[];
  error?: string;
}> {
  try {
    const models = await vscode.lm.selectChatModels({});
    return { models };
  } catch (e) {
    return { models: [], error: String(e) };
  }
}

const TIER_PREFERENCES: Record<ModelTier, string[]> = {
  routing: [
    "claude-haiku",
    "claude-3-5-haiku",
    "claude-3-haiku",
    "gpt-4o-mini",
    "gemini-1.5-flash",
    "gemini-flash",
    "gpt-3.5-turbo",
  ],
  planning: [
    "claude-sonnet",
    "claude-3-5-sonnet",
    "gpt-4o",
    "gemini-1.5-pro",
    "gpt-4-turbo",
    "gpt-4",
  ],
  execution: [
    "claude-sonnet",
    "claude-3-5-sonnet",
    "gpt-4o",
  ],
  reasoning: [
    "claude-opus",
    "claude-3-opus",
    "o1",
    "o1-preview",
    "o1-mini",
    "claude-sonnet",
  ],
};

/**
 * Select a model for the given tier. Uses vscode.lm.selectChatModels and
 * tier preferences for cheap-model fallback.
 */
export async function selectTierModel(
  tier: ModelTier,
  token: vscode.CancellationToken
): Promise<vscode.LanguageModelChat | undefined> {
  if (token.isCancellationRequested) { return undefined; }

  const models = await getAvailableModels();

  if (!models.length) { return undefined; }

  const preferences = TIER_PREFERENCES[tier];
  for (const preferred of preferences) {
    const match = models.find(
      (m) => m.family?.toLowerCase().includes(preferred) || m.id?.toLowerCase().includes(preferred)
    );
    if (match) { return match; }
  }

  return models[0];
}
