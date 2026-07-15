#!/usr/bin/env python3
"""
Compare two token profiles (before/after optimize) and update workflow-priors.yaml.
CLI: python diff.py --before <profile_before.json> --after <profile_after.json> --priors <workflow-priors.yaml> [--outcome success|failure|unknown]
"""

from __future__ import annotations

import argparse
import json
import sys
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

# Load level order: higher = more content (full is highest, exclude lowest)
_LEVEL_ORDER = {"full": 4, "outline": 3, "headings": 2, "digest": 1, "exclude": 0}


@dataclass
class TokenProfile:
    """Mirror of measure.py TokenProfile for JSON load."""
    session_id: Optional[str]
    workflow_type: str
    workflow_confidence: float
    total_tokens: int
    budget: int
    budget_pct: float
    by_category: dict[str, Any]
    loaded_files: list[dict[str, Any]]
    recommendations: list[str] = field(default_factory=list)
    prior_available: bool = False
    prior_workflow: Optional[str] = None


def load_profile(path: Path) -> TokenProfile:
    data = json.loads(path.read_text(encoding="utf-8"))
    return TokenProfile(
        session_id=data.get("session_id"),
        workflow_type=data.get("workflow_type", "unknown"),
        workflow_confidence=float(data.get("workflow_confidence", 0)),
        total_tokens=int(data.get("total_tokens", 0)),
        budget=int(data.get("budget", 0)),
        budget_pct=float(data.get("budget_pct", 0)),
        by_category=data.get("by_category", {}),
        loaded_files=data.get("loaded_files", []),
        recommendations=data.get("recommendations", []),
        prior_available=bool(data.get("prior_available", False)),
        prior_workflow=data.get("prior_workflow"),
    )


def _level_rank(level: str) -> int:
    return _LEVEL_ORDER.get(level.lower() if level else "full", 4)


def compute_demotions(
    before_files: list[dict[str, Any]], after_files: list[dict[str, Any]]
) -> list[tuple[str, str, str]]:
    """Return list of (path, level_before, level_after) for files demoted to a lower level."""
    after_by_path = {e["path"]: e for e in after_files}
    demoted: list[tuple[str, str, str]] = []
    for be in before_files:
        path = be["path"]
        level_before = be.get("load_level_detected") or "full"
        ae = after_by_path.get(path)
        if ae is None:
            demoted.append((path, level_before, "exclude"))
            continue
        level_after = ae.get("load_level_detected") or "full"
        if _level_rank(level_after) < _level_rank(level_before):
            demoted.append((path, level_before, level_after))
    return demoted


def _rolling_avg(old_avg: Optional[float], old_sessions: int, new_value: float) -> float:
    if old_avg is None or old_sessions == 0:
        return round(new_value, 1)
    return round((old_avg * old_sessions + new_value) / (old_sessions + 1), 1)


def _load_priors(path: Path) -> tuple[dict[str, Any], Optional[Any]]:
    """Load YAML; return (data, round_trip_engine) for comment preservation if available."""
    text = path.read_text(encoding="utf-8")
    try:
        import ruamel.yaml
        yaml = ruamel.yaml.YAML()
        yaml.preserve_quotes = True
        data = yaml.load(text)
        return data, yaml
    except ImportError:
        pass
    import yaml
    data = yaml.safe_load(text) or {}
    return data, None


def _save_priors(path: Path, data: dict[str, Any], round_trip_engine: Optional[Any]) -> None:
    if round_trip_engine is not None:
        with open(path, "w", encoding="utf-8") as f:
            round_trip_engine.dump(data, f)
        return
    import yaml
    path.write_text(yaml.safe_dump(data, default_flow_style=False, allow_unicode=True, sort_keys=False), encoding="utf-8")


def _workflow_entry(data: dict[str, Any], workflow_key: str) -> dict[str, Any]:
    workflows = data.setdefault("workflows", {})
    if workflow_key not in workflows:
        workflows[workflow_key] = {
            "sessions": 0,
            "avg_tokens_before": None,
            "avg_tokens_after": None,
            "p50_savings_pct": None,
            "reliable_excludes": [],
            "reliable_outlines": [],
            "always_full": [],
            "notes": "",
        }
    return workflows[workflow_key]


def _ensure_candidate_counts(entry: dict[str, Any]) -> None:
    if "outline_candidate_counts" not in entry:
        entry["outline_candidate_counts"] = {}
    if "exclude_candidate_counts" not in entry:
        entry["exclude_candidate_counts"] = {}


def update_priors(
    priors_path: Path,
    workflow_key: str,
    tokens_before: int,
    tokens_after: int,
    demoted: list[tuple[str, str, str]],
    outcome: str,
) -> None:
    data, round_trip = _load_priors(priors_path)
    entry = _workflow_entry(data, workflow_key)
    _ensure_candidate_counts(entry)

    sessions_old = int(entry.get("sessions") or 0)
    sessions_new = sessions_old + 1
    entry["sessions"] = sessions_new

    avg_before = entry.get("avg_tokens_before")
    avg_after = entry.get("avg_tokens_after")
    entry["avg_tokens_before"] = _rolling_avg(avg_before, sessions_old, float(tokens_before))
    entry["avg_tokens_after"] = _rolling_avg(avg_after, sessions_old, float(tokens_after))

    data["updated_at"] = datetime.now(timezone.utc).isoformat()

    if outcome == "success":
        outline_counts = entry["outline_candidate_counts"]
        exclude_counts = entry["exclude_candidate_counts"]
        reliable_outlines = list(entry.get("reliable_outlines") or [])
        reliable_excludes = list(entry.get("reliable_excludes") or [])

        for path, _level_before, level_after in demoted:
            if level_after == "exclude":
                exclude_counts[path] = exclude_counts.get(path, 0) + 1
                if exclude_counts[path] >= 5 and path not in reliable_excludes:
                    reliable_excludes.append(path)
                    del exclude_counts[path]
            else:
                outline_counts[path] = outline_counts.get(path, 0) + 1
                if outline_counts[path] >= 3 and path not in reliable_outlines:
                    reliable_outlines.append(path)
                    del outline_counts[path]

        entry["reliable_outlines"] = reliable_outlines
        entry["reliable_excludes"] = reliable_excludes
        entry["outline_candidate_counts"] = outline_counts
        entry["exclude_candidate_counts"] = exclude_counts

    _save_priors(priors_path, data, round_trip)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Compare before/after token profiles and update workflow-priors.yaml."
    )
    parser.add_argument("--before", required=True, help="Path to profile before optimize (JSON)")
    parser.add_argument("--after", required=True, help="Path to profile after optimize (JSON)")
    parser.add_argument("--priors", required=True, help="Path to workflow-priors.yaml")
    parser.add_argument(
        "--outcome",
        choices=("success", "failure", "unknown"),
        default="unknown",
        help="Session outcome for prior learning (default: unknown)",
    )
    args = parser.parse_args()

    before_path = Path(args.before)
    after_path = Path(args.after)
    priors_path = Path(args.priors)

    for p, name in [(before_path, "before"), (after_path, "after"), (priors_path, "priors")]:
        if not p.is_file():
            print(f"Error: {name} file not found: {p}", file=sys.stderr)
            return 1

    before = load_profile(before_path)
    after = load_profile(after_path)

    workflow_key = after.workflow_type if after.workflow_type else before.workflow_type
    # Map to known workflow key; use "unknown" if not in priors
    known = {"code-review", "plan-executor", "debugging", "unknown"}
    if workflow_key not in known:
        workflow_key = "unknown"

    demoted = compute_demotions(before.loaded_files, after.loaded_files)
    delta = before.total_tokens - after.total_tokens
    pct = (delta / before.total_tokens * 100) if before.total_tokens else 0.0
    ts = datetime.now(timezone.utc).isoformat()

    update_priors(
        priors_path,
        workflow_key,
        before.total_tokens,
        after.total_tokens,
        demoted,
        args.outcome,
    )

    # Stdout summary
    print("Diff summary")
    print("  workflow:", workflow_key)
    print("  tokens before:", before.total_tokens)
    print("  tokens after:", after.total_tokens)
    print("  delta (absolute):", delta)
    print("  delta (percent):", f"{pct:.1f}%")
    print("  outcome:", args.outcome)
    print("  timestamp:", ts)
    print("  demoted files:")
    for path, lev_before, lev_after in demoted:
        print(f"    {path}  {lev_before} -> {lev_after}")
    if not demoted:
        print("    (none)")
    print("  workflow-priors updated:", priors_path)

    return 0


if __name__ == "__main__":
    sys.exit(main())
