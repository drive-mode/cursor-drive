#!/usr/bin/env python3
"""Drive Mode preprocessor hook.

Runs on `beforeSubmitPrompt` to:
  1. Count filler words in the prompt and surface the cleaned version as context
     so the agent sees what the prompt would look like after Drive's filler cleaner.
  2. Detect the "tangent" keyword and emit a reminder to spawn a parallel agent.
  3. Detect mode-switch keywords (plan/agent/ask/debug) and emit a mode hint.

This hook does NOT block or modify prompts — it only adds context.
(Cursor hooks cannot currently modify prompt text; Drive's extension handles that.)

Usage: registered in hooks.json or .cursor/hooks/ for beforeSubmitPrompt event.
"""

import json
import os
import re
import sys
import urllib.error
import urllib.request
from typing import Any, Dict, List

# ── Filler patterns (mirrors extension/src/fillerCleaner.ts) ─────────────────

FILLER_PATTERNS: List[str] = [
    r"\b(uhh?|umm?|erm|err|hmm+|uh-huh)\b",
    r"\b(like|you know|I mean|basically|literally|actually|honestly|right)\b",
    r"\b(kinda|sorta|kind of|sort of|a bit)\b",
    r"\b(maybe|perhaps|possibly|probably|I think|I guess|I suppose)\b",
    r"\b(just|simply|merely|obviously|clearly|definitely)\b",
    r"\b(and stuff|and things|and all that|etc\.?)\b",
]

MODE_KEYWORDS: Dict[str, str] = {
    r"\bplan\b": "plan",
    r"\bagent\b": "agent",
    r"\bask\b": "ask",
    r"\bdebug\b": "debug",
}

TANGENT_PATTERN = re.compile(r"\btangent\b", re.IGNORECASE)
SUBMIT_WORDS = {"send it", "go ahead", "submit", "run it", "do it"}

# Role keywords that suggest which operator role to use
ROLE_KEYWORDS: Dict[str, str] = {
    r"\breview\b": "reviewer",
    r"\btest\b": "tester",
    r"\bresearch\b": "researcher",
    r"\bplan\b": "planner",
    r"\bimplement\b": "implementer",
    r"\bbuild\b": "implementer",
    r"\bfix\b": "implementer",
    r"\brefactor\b": "implementer",
}

# Escalation keywords that suggest an operator is blocked or needs help
ESCALATION_PATTERNS = [
    re.compile(r"\bescalat", re.IGNORECASE),
    re.compile(r"\bblocked\b", re.IGNORECASE),
    re.compile(r"\bstuck\b", re.IGNORECASE),
    re.compile(r"\bneed\s+help\b", re.IGNORECASE),
    re.compile(r"\bcan'?t\s+(?:figure|solve|fix)\b", re.IGNORECASE),
]


def _strip_fillers(text: str) -> str:
    cleaned = text
    for pattern in FILLER_PATTERNS:
        cleaned = re.sub(pattern, "", cleaned, flags=re.IGNORECASE)
    # Collapse multiple spaces
    cleaned = re.sub(r" {2,}", " ", cleaned).strip()
    # Collapse duplicate consecutive words
    cleaned = re.sub(r"\b(\w+)( \1\b)+", r"\1", cleaned, flags=re.IGNORECASE)
    return cleaned


def _filler_density(original: str, cleaned: str) -> float:
    orig_words = len(original.split())
    if orig_words == 0:
        return 0.0
    cleaned_words = len(cleaned.split())
    return max(0.0, (orig_words - cleaned_words) / orig_words)


def _detect_mode(text: str) -> str | None:
    lower = text.lower()
    for pattern, mode in MODE_KEYWORDS.items():
        if re.search(pattern, lower):
            return mode
    return None


def emit(decision: str, message: str, details: Dict[str, Any] | None = None) -> None:
    payload: Dict[str, Any] = {"decision": decision, "message": message}
    if details:
        payload["details"] = details
    print(json.dumps(payload), flush=True)


def _try_pipeline_bridge(prompt: str, details: Dict[str, Any]) -> None:
    """Fail-soft POST to Drive MCP /pipeline. Attaches result or agent hint."""
    base = os.environ.get("DRIVE_MCP_URL", "http://127.0.0.1:7891").rstrip("/")
    url = f"{base}/pipeline"
    body = json.dumps({"prompt": prompt}).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=1.0) as resp:
            raw = resp.read().decode("utf-8")
            details["drive_pipeline_result"] = json.loads(raw)
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError, OSError):
        details["drive_pipeline_hint"] = (
            "Drive MCP /pipeline unreachable. "
            "When Drive is active, call drive_run_pipeline with the user prompt."
        )


def main() -> None:
    event = sys.argv[1] if len(sys.argv) > 1 else "beforeSubmitPrompt"

    # Only process beforeSubmitPrompt — all other events pass through immediately.
    if event != "beforeSubmitPrompt":
        emit("allow", "drive preprocessor: pass-through")
        return

    # Read event data from stdin (Cursor passes JSON on stdin for some hooks).
    raw_input = ""
    try:
        raw_input = sys.stdin.read()
    except Exception:
        pass

    prompt = ""
    try:
        data = json.loads(raw_input) if raw_input.strip() else {}
        prompt = data.get("prompt", "")
    except Exception:
        prompt = raw_input.strip()

    if not prompt:
        emit("allow", "drive preprocessor: empty prompt, pass-through")
        return

    # ── Filler analysis ────────────────────────────────────────────────────
    cleaned = _strip_fillers(prompt)
    density = _filler_density(prompt, cleaned)

    details: Dict[str, Any] = {}

    if density > 0.15:
        # Significant filler detected — show the cleaned version as context.
        details["drive_cleaned_prompt"] = cleaned
        details["drive_filler_density"] = f"{density:.0%}"

    # ── Tangent detection with role inference ─────────────────────────────
    if TANGENT_PATTERN.search(prompt):
        # Try to infer role from the tangent task description
        tangent_text = TANGENT_PATTERN.split(prompt)[-1].strip()
        inferred_role = None
        for pattern, role in ROLE_KEYWORDS.items():
            if re.search(pattern, tangent_text, re.IGNORECASE):
                inferred_role = role
                break
        role_param = f", role: '{inferred_role}'" if inferred_role else ""
        details["drive_hint"] = (
            "Tangent keyword detected. "
            f"Use the operator_spawn MCP tool to fork a parallel operator: "
            f"operator_spawn({{ name: 'Beta', task: '<task after tangent keyword>'{role_param} }})"
        )
        if inferred_role:
            details["drive_inferred_role"] = inferred_role

    # ── Escalation detection ──────────────────────────────────────────────
    for esc_pat in ESCALATION_PATTERNS:
        if esc_pat.search(prompt):
            details["drive_escalation_hint"] = (
                "Escalation language detected. If you are an operator that is blocked, "
                "use operator_escalate MCP tool to notify the lead/user: "
                "operator_escalate({ name_or_id: '<your_name>', reason: '<why you are blocked>' })"
            )
            break

    # ── Mode-switch detection ──────────────────────────────────────────────
    detected_mode = _detect_mode(prompt)
    if detected_mode:
        details["drive_mode_hint"] = (
            f"Mode keyword '{detected_mode}' detected. "
            f"Consider calling drive_set_mode({{ mode: '{detected_mode}' }}) "
            "via the Drive MCP server to update the status bar."
        )

    # ── Submit word detection ─────────────────────────────────────────────
    lower_prompt = prompt.lower().strip()
    if any(lower_prompt.endswith(w) or lower_prompt == w for w in SUBMIT_WORDS):
        details["drive_hint"] = details.get("drive_hint", "") + (
            " Submit word detected — proceeding immediately."
        )

    _try_pipeline_bridge(prompt, details)

    if details:
        emit("allow", "drive preprocessor: context added", details)
    else:
        emit("allow", "drive preprocessor: no hints")


if __name__ == "__main__":
    main()
