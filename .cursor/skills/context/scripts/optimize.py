#!/usr/bin/env python3
"""
Propose context rebalancing from a measure profile and workflow priors.
CLI: python optimize.py --profile <measure_output.json> --priors <workflow-priors.yaml> [--budget 80000] [--dry-run|--apply]
Default is dry-run (print proposal only, write nothing). Use --apply to output proposal for diff.py/agent consumption; does not modify workflow-priors.yaml.
"""

from __future__ import annotations

import argparse
import fnmatch
import json
import sys
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any, Optional

# Resolve context skill root: script lives in .../context/scripts/optimize.py
_SCRIPT_DIR = Path(__file__).resolve().parent
_CONTEXT_ROOT = _SCRIPT_DIR.parent

if str(_SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPT_DIR))

from measure import profile_from_dict  # noqa: E402


# --- Schema (consumable by diff.py / agent) ---

@dataclass
class ChangeItem:
    file_path: str
    from_level: str  # full | outline | headings | digest | exclude
    to_level: str
    token_delta: int  # negative = savings
    rationale: str
    confidence: float  # 0.0–1.0


@dataclass
class RebalancingProposal:
    current_tokens: int
    proposed_tokens: int
    savings: int
    savings_pct: float
    changes: list[ChangeItem]
    requires_confirmation: bool  # True if savings > 30% or any full->exclude
    summary: str


# Token fraction of full for each level (load-levels.md)
_LEVEL_FRACTION = {
    "full": 1.0,
    "outline": 0.15,
    "headings": 0.035,
    "digest": 0.05,
    "exclude": 0.0,
}


def _matches_glob(path: str, pattern: str) -> bool:
    norm = path.replace("\\", "/")
    if fnmatch.fnmatch(norm, pattern):
        return True
    if fnmatch.fnmatch(norm, pattern.replace("**/", "")):
        return True
    return False


def _matches_any(path: str, patterns: list[str]) -> bool:
    return any(_matches_glob(path, p) for p in (patterns or []))


def load_priors(priors_path: Path) -> dict[str, Any]:
    """Load workflow-priors.yaml; resolve path relative to skill root or CWD."""
    p = priors_path.resolve() if priors_path.is_absolute() else None
    if p is None or not p.is_file():
        # Try skill root: context/references/workflow-priors.yaml or context/<path>
        for candidate in [
            _CONTEXT_ROOT / "references" / "workflow-priors.yaml",
            _CONTEXT_ROOT / priors_path,
            Path.cwd() / priors_path,
        ]:
            c = candidate.resolve()
            if c.is_file():
                p = c
                break
    if p is None or not p.is_file():
        raise FileNotFoundError(f"Priors file not found: {priors_path}")
    try:
        import yaml
        return yaml.safe_load(p.read_text(encoding="utf-8")) or {}
    except ImportError:
        raise RuntimeError("PyYAML required for workflow-priors; pip install pyyaml")


def get_workflow_prior(priors_data: dict[str, Any], workflow_type: str) -> dict[str, Any]:
    """Return the workflow block for workflow_type, or unknown, or empty dict."""
    workflows = priors_data.get("workflows") or {}
    if workflow_type in workflows:
        return workflows[workflow_type]
    if "unknown" in workflows:
        return workflows["unknown"]
    return {
        "reliable_excludes": [],
        "reliable_outlines": [],
        "always_full": [],
    }


def propose_level(
    path: str,
    tokens: int,
    flag: str,
    prior: dict[str, Any],
    over_budget: bool,
) -> tuple[str, str, float]:  # (to_level, rationale, confidence)
    """Propose target level for one file. from_level is always 'full' (measure reports full)."""
    always_full = prior.get("always_full") or []
    reliable_excludes = prior.get("reliable_excludes") or []
    reliable_outlines = prior.get("reliable_outlines") or []

    if _matches_any(path, always_full):
        return "full", "Prior: always_full", 1.0
    if _matches_any(path, reliable_excludes):
        return "exclude", "Prior: reliable_excludes", 0.9
    if _matches_any(path, reliable_outlines):
        return "outline", "Prior: reliable_outlines", 0.9

    # Use measure flag
    if flag == "candidate_exclude":
        return "exclude", "Measure: candidate_exclude", 0.8
    if flag == "candidate_digest":
        return "digest", "Measure: candidate_digest", 0.75
    if flag == "candidate_outline":
        return "outline", "Measure: candidate_outline", 0.75
    # ok
    if over_budget:
        return "outline", "Over budget; suggest outline for large file", 0.5
    return "full", "No downgrade suggested", 1.0


def estimate_tokens_at_level(tokens_full: int, level: str) -> int:
    """Estimate token count at given level (file was loaded at full)."""
    frac = _LEVEL_FRACTION.get(level, 1.0)
    return int(round(tokens_full * frac))


def build_proposal(
    profile: Any,  # TokenProfile from measure
    prior: dict[str, Any],
    budget: int,
) -> RebalancingProposal:
    """Build RebalancingProposal from profile and workflow prior."""
    total_file_tokens = sum(f["tokens"] for f in profile.loaded_files)
    over_budget = total_file_tokens > budget if budget else False

    changes: list[ChangeItem] = []
    proposed_file_tokens = 0

    for fe in profile.loaded_files:
        path = fe["path"]
        tokens = fe["tokens"]
        flag = fe.get("flag", "ok")
        from_level = fe.get("load_level_detected", "full")

        to_level, rationale, confidence = propose_level(
            path, tokens, flag, prior, over_budget
        )
        if from_level == to_level:
            proposed_file_tokens += tokens
            continue

        est = estimate_tokens_at_level(tokens, to_level)
        delta = est - tokens
        changes.append(
            ChangeItem(
                file_path=path,
                from_level=from_level,
                to_level=to_level,
                token_delta=delta,
                rationale=rationale,
                confidence=confidence,
            )
        )
        proposed_file_tokens += est

    # Non-file tokens (we don't change those); profile.total_tokens includes everything
    non_file_tokens = profile.total_tokens - total_file_tokens
    current_tokens = profile.total_tokens
    proposed_tokens = non_file_tokens + proposed_file_tokens
    savings = current_tokens - proposed_tokens
    savings_pct = (savings / current_tokens * 100) if current_tokens else 0.0

    full_to_exclude = any(
        c.from_level == "full" and c.to_level == "exclude" for c in changes
    )
    requires_confirmation = savings_pct > 30.0 or full_to_exclude
    summary = (
        f"Proposed savings: {savings:,} tokens ({savings_pct:.1f}%). "
        f"{len(changes)} file(s) downgraded."
    )

    return RebalancingProposal(
        current_tokens=current_tokens,
        proposed_tokens=proposed_tokens,
        savings=savings,
        savings_pct=round(savings_pct, 1),
        changes=changes,
        requires_confirmation=requires_confirmation,
        summary=summary,
    )


def proposal_to_dict(proposal: RebalancingProposal) -> dict[str, Any]:
    """JSON-serializable form for diff.py / agent."""
    return {
        "current_tokens": proposal.current_tokens,
        "proposed_tokens": proposal.proposed_tokens,
        "savings": proposal.savings,
        "savings_pct": proposal.savings_pct,
        "changes": [asdict(c) for c in proposal.changes],
        "requires_confirmation": proposal.requires_confirmation,
        "summary": proposal.summary,
    }


def format_proposal_human(proposal: RebalancingProposal) -> str:
    """Human-readable proposal (dry-run output)."""
    lines = [
        proposal.summary,
        "",
        f"Current tokens: {proposal.current_tokens:,}",
        f"Proposed tokens: {proposal.proposed_tokens:,}",
        f"Savings: {proposal.savings:,} ({proposal.savings_pct}%)",
        f"Requires confirmation: {proposal.requires_confirmation}",
        "",
        "Changes:",
    ]
    for c in proposal.changes:
        lines.append(
            f"  {c.file_path}: {c.from_level} -> {c.to_level} "
            f"(delta={c.token_delta:,}) [{c.rationale}] conf={c.confidence}"
        )
    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Propose context rebalancing from measure profile and workflow priors."
    )
    parser.add_argument(
        "--profile",
        required=True,
        help="Path to measure output JSON (TokenProfile schema)",
    )
    parser.add_argument(
        "--priors",
        default="workflow-priors.yaml",
        help="Path to workflow-priors.yaml (default: references/workflow-priors.yaml from skill root)",
    )
    parser.add_argument(
        "--budget",
        type=int,
        default=80_000,
        help="Token budget (default: 80000)",
    )
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Output proposal JSON for diff.py/agent (default: dry-run, print proposal only, write nothing)",
    )
    args = parser.parse_args()

    profile_path = Path(args.profile)
    if not profile_path.is_absolute():
        profile_path = Path.cwd() / profile_path
    if not profile_path.is_file():
        print(f"Error: profile file not found: {profile_path}", file=sys.stderr)
        return 1

    try:
        data = json.loads(profile_path.read_text(encoding="utf-8"))
        profile = profile_from_dict(data)
    except Exception as e:
        print(f"Error: failed to load profile: {e}", file=sys.stderr)
        return 1

    try:
        priors_data = load_priors(Path(args.priors))
    except (FileNotFoundError, RuntimeError) as e:
        print(f"Error: {e}", file=sys.stderr)
        return 1

    prior = get_workflow_prior(priors_data, profile.workflow_type)
    budget = args.budget
    proposal = build_proposal(profile, prior, budget)

    if not args.apply:
        # Dry-run: print proposal only, write nothing
        print(format_proposal_human(proposal))
        return 0

    # --apply: output proposal JSON for diff.py / agent (does not modify workflow-priors.yaml)
    print(json.dumps(proposal_to_dict(proposal), indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
