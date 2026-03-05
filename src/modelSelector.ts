import * as vscode from "vscode";
import { RouteMode } from "./router.js";
import { selectTierModel, type ModelTier } from "./modelUtils.js";

export type { ModelTier };

export const TIER_METADATA: Record<ModelTier, { label: string; description: string }> = {
  routing: {
    label: "cheap routing",
    description: "Cheapest available model — classification and extraction only",
  },
  planning: {
    label: "planning",
    description: "Mid-tier model — plan generation and clarification",
  },
  execution: {
    label: "execution",
    description: "User's configured model — main implementation work",
  },
  reasoning: {
    label: "reasoning",
    description: "Highest-capability model — complex semantic analysis, explicit request only",
  },
};

export async function selectModelForTier(
  tier: ModelTier,
  token: vscode.CancellationToken
): Promise<vscode.LanguageModelChat | undefined> {
  return selectTierModel(tier, token);
}

export async function selectCheapModel(
  token: vscode.CancellationToken
): Promise<vscode.LanguageModelChat | undefined> {
  return selectModelForTier("routing", token);
}

export function tierForMode(mode: RouteMode): ModelTier {
  switch (mode) {
    case "plan":
      return "planning";
    case "agent":
    case "ask":
    case "debug":
    default:
      return "execution";
  }
}

export function describeModel(
  model: vscode.LanguageModelChat | undefined,
  tier: ModelTier
): string {
  const meta = TIER_METADATA[tier];
  if (!model) { return `(no model available — ${meta.label})`; }
  const name = model.name ?? model.family ?? model.id ?? "unknown";
  return `${name} [${meta.label}]`;
}
