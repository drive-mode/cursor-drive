#!/usr/bin/env python3
"""Tier 1 dependency auditor for the plan governance system.

Part of the Cursor Drive tiered model routing pattern:
  Tier 0 — Pure Python deterministic (hash checks, YAML parsing, state sync)
  Tier 1 — THIS SCRIPT: cheap model (Haiku) for structured extraction
  Tier 2 — Execution model for standard work (user's configured model)
  Tier 3 — Reasoning model (Opus) for complex analysis, explicit request only

This script is called by plan-runner.py ONLY when a structural diff is detected
(new plan, removed plan, or changes to planType/parentPlanId/childPlanIds/dependsOn).
It is NEVER called on todo-status-only changes (the common case).

Usage:
  Input:  JSON on stdin: {diff, current_edges, all_plan_ids}
  Output: JSON on stdout: {edges_changed, confidence, proposed_edges, model_used, reason}

Model config:
  DRIVE_TRIAGE_MODEL  env var — defaults to claude-3-5-haiku-20241022
  ANTHROPIC_API_KEY   env var — if absent, falls back to rule-based analysis (0 tokens)

Token budget: ~250 input tokens + ~100 output tokens per call.
"""

import json
import os
import re
import sys
from typing import Any, Dict, List, Optional

# ── Model config ──────────────────────────────────────────────────────────────
# Override via DRIVE_TRIAGE_MODEL env var when a newer / cheaper model ships.
# Tier 1 target: fastest available model that can do structured extraction.
DEFAULT_TRIAGE_MODEL = "claude-3-5-haiku-20241022"
TRIAGE_MODEL = os.environ.get("DRIVE_TRIAGE_MODEL", DEFAULT_TRIAGE_MODEL)

SYSTEM_PROMPT = """\
You are a plan dependency analyzer for a software project.
Plans have a `dependsOn` field — if plan A depends on plan B, A cannot start until B completes.

You receive a structural diff (what changed in plan files) and the current dependency edges.
Your job: determine if any `dependsOn` edges should be added, removed, or changed.

Rules:
- If `dependsOn` was explicitly changed in the diff → honor that change directly.
- If a new plan was added → only suggest deps if clearly implied by plan type or name.
- Hierarchy changes (parentPlanId/childPlanIds) do NOT imply dependency changes.
- Be conservative: if uncertain, set confidence to "low" and leave proposed_edges empty.
- Output ONLY a single JSON object, no prose."""


def _analyze_with_model(
    diff_data: Dict[str, Any],
    current_edges: Dict[str, List[str]],
    all_plan_ids: List[str],
) -> Dict[str, Any]:
    """Tier 1: call Haiku for structured dep-edge extraction."""
    try:
        import anthropic
    except ImportError:
        return _fallback_result("anthropic package not installed; using rule-based fallback")

    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        return _fallback_result("ANTHROPIC_API_KEY not set; using rule-based fallback")

    # Compact serialisation to minimise token usage
    diff_json = json.dumps(diff_data, separators=(",", ":"))
    edges_json = json.dumps(current_edges, separators=(",", ":"))
    # Cap plan IDs to avoid bloating context; full list rarely needed
    ids_preview = ", ".join(all_plan_ids[:25])
    if len(all_plan_ids) > 25:
        ids_preview += f", ... (+{len(all_plan_ids) - 25} more)"

    user_message = (
        f"STRUCTURAL DIFF: {diff_json}\n"
        f"CURRENT EDGES: {edges_json}\n"
        f"ALL PLAN IDs: {ids_preview}\n\n"
        'Output JSON: {"edges_changed":bool,"confidence":"high"|"low",'
        '"proposed_edges":{"plan-id":["dep-id"]},"reason":"one line"}'
    )

    try:
        client = anthropic.Anthropic(api_key=api_key)
        response = client.messages.create(
            model=TRIAGE_MODEL,
            max_tokens=256,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_message}],
        )
        raw = response.content[0].text.strip()
        # Extract JSON even if model wraps in prose or code fences
        m = re.search(r"\{.*\}", raw, re.DOTALL)
        if not m:
            return _fallback_result(f"model returned non-JSON: {raw[:100]}")
        result = json.loads(m.group())
        result["model_used"] = TRIAGE_MODEL
        return result
    except Exception as exc:
        return _fallback_result(f"model call failed: {exc}")


def _analyze_rule_based(
    diff_data: Dict[str, Any],
    current_edges: Dict[str, List[str]],
    all_plan_ids: List[str],
) -> Dict[str, Any]:
    """Tier 0 fallback: deterministic rule-based dep-edge analysis.

    Conservative: only applies explicit dependsOn changes from the diff.
    Never guesses semantic dependencies — that requires the model.
    """
    proposed: Dict[str, List[str]] = {}

    for change in diff_data.get("changes", []):
        plan_id = change.get("planId", "")
        changed_fields = change.get("changed_fields", [])
        new_vals = change.get("new", {})

        # If dependsOn was explicitly changed in the diff, honour it exactly
        if "dependsOn" in changed_fields and "dependsOn" in new_vals:
            new_deps = new_vals["dependsOn"]
            if isinstance(new_deps, list):
                old_deps = current_edges.get(plan_id, [])
                if set(old_deps) != set(new_deps):
                    proposed[plan_id] = new_deps

    if proposed:
        return {
            "edges_changed": True,
            "confidence": "high",
            "proposed_edges": proposed,
            "reason": "explicit dependsOn change detected in diff",
            "model_used": "rule-based",
        }

    # New plans: flag for manual review rather than guessing
    new_plans = diff_data.get("new_plans", [])
    if new_plans:
        return {
            "edges_changed": False,
            "confidence": "low",
            "proposed_edges": {},
            "reason": f"new plan(s) {new_plans} — run /plan-audit-deps for dep analysis",
            "model_used": "rule-based",
        }

    return {
        "edges_changed": False,
        "confidence": "high",
        "proposed_edges": {},
        "reason": "no dep-relevant changes detected",
        "model_used": "rule-based",
    }


def _fallback_result(reason: str) -> Dict[str, Any]:
    return {
        "edges_changed": False,
        "confidence": "low",
        "proposed_edges": {},
        "reason": reason,
        "model_used": "rule-based-fallback",
    }


def main() -> int:
    try:
        raw = sys.stdin.read()
        payload = json.loads(raw) if raw.strip() else {}
    except Exception as exc:
        print(json.dumps({"error": f"stdin parse failed: {exc}"}))
        return 1

    diff_data: Dict[str, Any] = payload.get("diff", {})
    current_edges: Dict[str, List[str]] = payload.get("current_edges", {})
    all_plan_ids: List[str] = payload.get("all_plan_ids", [])

    # Decide whether to use model or rule-based analysis
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    has_anthropic = False
    try:
        import anthropic  # noqa: F401
        has_anthropic = True
    except ImportError:
        pass

    use_model = bool(api_key and has_anthropic)

    if use_model:
        result = _analyze_with_model(diff_data, current_edges, all_plan_ids)
        # If model returned low confidence, note that escalation is available
        if result.get("confidence") == "low":
            result["escalation_hint"] = "run /plan-audit-deps for full semantic analysis"
    else:
        result = _analyze_rule_based(diff_data, current_edges, all_plan_ids)

    print(json.dumps(result, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
