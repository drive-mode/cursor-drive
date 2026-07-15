"""
Infer workflow type from a ParsedTranscript using keyword scoring over the first 20% of segments.
"""

from __future__ import annotations

from dataclasses import dataclass

from .transcript_parser import ParsedTranscript

WORKFLOW_SIGNALS = {
    "code-review": ["review", "PR", "pull request", "diff", "LGTM", "approve"],
    "plan-executor": ["plan", "implement", "todo", "step 1", "execute", "complete"],
    "debugging": ["error", "bug", "traceback", "exception", "failing", "fix"],
    "refactor": ["refactor", "rename", "extract", "clean up", "restructure"],
    "documentation": ["document", "docstring", "README", "explain", "comment"],
}


@dataclass
class WorkflowDetection:
    workflow_type: str  # matched key or "unknown"
    confidence: float  # 0.0–1.0
    signals_found: list[str]


def detect_workflow(parsed: ParsedTranscript) -> WorkflowDetection:
    """
    Infer workflow type from the first 20% of transcript segments via keyword scoring.
    Returns "unknown" with confidence 0.0 if the top workflow has fewer than 2 signals.
    """
    segments = parsed.segments
    if not segments:
        return WorkflowDetection(workflow_type="unknown", confidence=0.0, signals_found=[])

    n = max(1, int(len(segments) * 0.2))
    head_content = " ".join(s.content for s in segments[:n]).lower()

    best_type = "unknown"
    best_signals: list[str] = []
    best_count = 0

    for workflow_type, signals in WORKFLOW_SIGNALS.items():
        found: list[str] = []
        for sig in signals:
            if sig.lower() in head_content:
                found.append(sig)
        count = len(found)
        if count > best_count:
            best_count = count
            best_type = workflow_type
            best_signals = found

    if best_count < 2:
        return WorkflowDetection(workflow_type="unknown", confidence=0.0, signals_found=[])

    # confidence: 2 signals -> 0.6, 3 -> 0.8, 4+ -> 1.0
    confidence = min(1.0, 0.4 + 0.2 * len(best_signals))
    return WorkflowDetection(
        workflow_type=best_type,
        confidence=confidence,
        signals_found=best_signals,
    )


def detect(parsed: ParsedTranscript) -> tuple[str, float]:
    """
    Legacy: returns (workflow_type, confidence) for callers that expect the old API.
    """
    r = detect_workflow(parsed)
    return r.workflow_type, r.confidence
