/**
 * Optional Tier 1 governance summarizer using Cursor's cheap model selection.
 *
 * This is intentionally bounded and non-authoritative:
 * - Input is limited to top findings/tasks (titles + ids only)
 * - Output must be short JSON with a confidence flag
 * - Failure to produce valid JSON is treated as "no summary"
 */

import * as vscode from "vscode";
import { selectCheapModel } from "../modelSelector.js";
import type { EntropyReport, TaskLedger } from "./schemas.js";

export type GovernanceSummaryConfidence = "high" | "low";

export interface GovernanceAiSummary {
  confidence: GovernanceSummaryConfidence;
  summary: string;
  top_risks: string[];
  top_actions: string[];
}

const SYSTEM_PROMPT = `You are a governance report summarizer for a software project.
You receive a small JSON payload with entropy score, top findings, and top tasks.
Return a concise JSON summary for a human.

Rules:
- Output MUST be a single JSON object, no prose, no markdown.
- summary: 1-2 sentences maximum.
- top_risks: 1-5 bullets, short phrases.
- top_actions: 1-5 bullets, imperative verbs.
- If you are uncertain or input is insufficient, set confidence to "low".`;

export async function summarizeGovernanceWithModel(
  entropy: EntropyReport,
  ledger: TaskLedger,
  token?: vscode.CancellationToken
): Promise<GovernanceAiSummary | undefined> {
  const model = await selectCheapModel(token ?? new vscode.CancellationTokenSource().token);
  if (!model) { return undefined; }

  const payload = {
    entropyScore: entropy.score,
    metrics: entropy.metrics,
    topFindings: entropy.findings.slice(0, 8).map((f) => ({
      id: f.id,
      category: f.category,
      severity: f.severity,
      title: f.title,
    })),
    topTasks: ledger.tasks.slice(0, 8).map((t) => ({
      id: t.id,
      priority: t.priority,
      type: t.type,
      title: t.title,
    })),
    warnings: (entropy.warnings ?? []).slice(0, 5),
  };

  const userMessage = vscode.LanguageModelChatMessage.User(
    SYSTEM_PROMPT + "\n\nINPUT:\n" + JSON.stringify(payload)
  );

  const session = await model.sendRequest([userMessage], {}, token ?? new vscode.CancellationTokenSource().token);

  let raw = "";
  for await (const chunk of session.text) { raw += chunk; }
  raw = raw.trim();

  // Extract JSON if the model wraps it.
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) { return undefined; }

  try {
    const parsed = JSON.parse(match[0]) as Partial<GovernanceAiSummary>;
    if (typeof parsed.summary !== "string" || !Array.isArray(parsed.top_risks) || !Array.isArray(parsed.top_actions)) {
      return undefined;
    }
    const confidence = parsed.confidence === "high" ? "high" : "low";
    return {
      confidence,
      summary: parsed.summary.trim(),
      top_risks: parsed.top_risks.map((s) => String(s)).slice(0, 5),
      top_actions: parsed.top_actions.map((s) => String(s)).slice(0, 5),
    };
  } catch {
    return undefined;
  }
}

