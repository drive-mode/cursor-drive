#!/usr/bin/env python3
"""
Measure context usage from an agent transcript.
CLI: python measure.py --transcript <path> [--format json|table] [--output <path>] [--budget 200000]
Run from context skill root (paths relative to script location or CWD).
"""

from __future__ import annotations

import argparse
import fnmatch
import json
import sys
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any, Optional

# Resolve context skill root: script lives in .../context/scripts/measure.py
_SCRIPT_DIR = Path(__file__).resolve().parent
_CONTEXT_ROOT = _SCRIPT_DIR.parent

# Ensure we can import utils from script location
if str(_SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPT_DIR))

from utils.transcript_parser import parse as parse_transcript
from utils.workflow_detector import detect as detect_workflow


# --- Schema ---

@dataclass
class CategoryStat:
    tokens: int
    pct: float
    items: int


@dataclass
class FileEntry:
    path: str
    tokens: int
    load_level_detected: str
    pct_of_total: float
    flag: str  # ok | candidate_outline | candidate_exclude | candidate_digest


@dataclass
class TokenProfile:
    session_id: Optional[str]
    workflow_type: str
    workflow_confidence: float
    total_tokens: int
    budget: int
    budget_pct: float
    by_category: dict[str, Any]  # category key -> {tokens, pct, items}
    loaded_files: list[dict[str, Any]]  # list of FileEntry-like dicts
    recommendations: list[str] = field(default_factory=list)
    prior_available: bool = False
    prior_workflow: Optional[str] = None


# --- FileEntry flag logic ---

_DOC_EXTENSIONS = (".md", ".txt", ".rst")
_EXCLUDE_PATTERNS = ("*.test.*", "*.spec.*", "*.lock", "*node_modules*", "**/node_modules/**")


def _is_code_file(path: str) -> bool:
    p = path.lower()
    if any(p.endswith(ext) for ext in _DOC_EXTENSIONS):
        return False
    # Common code extensions
    return any(
        p.endswith(ext)
        for ext in (".ts", ".tsx", ".js", ".jsx", ".py", ".go", ".rs", ".java", ".c", ".cpp", ".h", ".mjs", ".cjs")
    ) or "." in Path(path).suffix


def _is_readme(path: str) -> bool:
    p = path.lower()
    return "readme" in p or p.endswith("readme.md") or p.endswith("readme.txt")


def _is_architecture_doc(path: str) -> bool:
    p = path.lower()
    return "architecture" in p or "adr" in p or "docs/architecture" in p.replace("\\", "/")


def _is_doc_file(path: str) -> bool:
    return any(path.lower().endswith(ext) for ext in _DOC_EXTENSIONS)


def _matches_exclude(path: str) -> bool:
    norm = path.replace("\\", "/")
    for pat in _EXCLUDE_PATTERNS:
        if fnmatch.fnmatch(norm, pat) or fnmatch.fnmatch(norm, pat.replace("**/", "")):
            return True
    if "node_modules" in norm or ".test." in norm or ".spec." in norm or norm.endswith(".lock"):
        return True
    return False


def file_entry_flag(path: str, tokens: int) -> str:
    if _matches_exclude(path):
        return "candidate_exclude"
    if tokens > 5000 and _is_doc_file(path):
        return "candidate_digest"
    if tokens > 3000 and _is_code_file(path) and not _is_readme(path) and not _is_architecture_doc(path):
        return "candidate_outline"
    return "ok"


# --- Prior lookup ---

def load_prior_workflow(workflow_type: str) -> tuple[bool, Optional[str]]:
    priors_path = _CONTEXT_ROOT / "references" / "workflow-priors.yaml"
    if not priors_path.is_file():
        return False, None
    try:
        import yaml  # type: ignore[import-untyped]
        data = yaml.safe_load(priors_path.read_text(encoding="utf-8"))
        workflows = data.get("workflows") or {}
        if workflow_type in workflows:
            return True, workflow_type
        return False, None
    except ImportError:
        # No PyYAML: parse workflow keys by line (e.g. "  code-review:")
        text = priors_path.read_text(encoding="utf-8")
        in_workflows = False
        workflow_keys: set[str] = set()
        for line in text.splitlines():
            stripped = line.strip()
            if stripped == "workflows:":
                in_workflows = True
                continue
            if in_workflows:
                if stripped and not line.startswith(" ") and not line.startswith("\t"):
                    break
                if ":" in line and line.startswith("  ") and not line.startswith("    "):
                    key = line.strip().split(":")[0].strip()
                    if key and not key.startswith("#"):
                        workflow_keys.add(key)
        if workflow_type in workflow_keys:
            return True, workflow_type
        return False, None
    except Exception:
        return False, None


# --- Build profile from parsed transcript ---

def build_profile(
    transcript_path: str,
    budget: int = 200_000,
) -> TokenProfile:
    parsed = parse_transcript(transcript_path)
    workflow_type, workflow_confidence = detect_workflow(parsed)
    prior_available, prior_workflow = load_prior_workflow(workflow_type)

    total = parsed.total_tokens
    budget_pct = (total / budget * 100) if budget else 0.0

    # by_category: map source_type to CategoryStat-like dict
    category_keys = ("system_prompt", "file_load", "tool_call", "tool_result", "conversation")
    by_category: dict[str, dict[str, Any]] = {k: {"tokens": 0, "pct": 0.0, "items": 0} for k in category_keys}
    for seg in parsed.segments:
        st = seg.source_type
        if st not in by_category:
            continue
        by_category[st]["tokens"] += seg.token_count
        by_category[st]["items"] += 1
    for k in by_category:
        by_category[k]["pct"] = round((by_category[k]["tokens"] / total * 100), 1) if total else 0.0

    # Alias for output: "loaded_files" category = file_load
    by_category_output = {
        "system_prompt": by_category["system_prompt"],
        "loaded_files": by_category["file_load"],
        "tool_calls": by_category["tool_call"],
        "tool_results": by_category["tool_result"],
        "conversation": by_category["conversation"],
    }

    # loaded_files list (FileEntry)
    file_entries: list[dict[str, Any]] = []
    for seg in parsed.segments:
        if seg.source_type != "file_load" or not seg.file_path:
            continue
        path = seg.file_path
        tok = seg.token_count
        pct = round((tok / total * 100), 1) if total else 0.0
        flag = file_entry_flag(path, tok)
        file_entries.append({
            "path": path,
            "tokens": tok,
            "load_level_detected": "full",
            "pct_of_total": pct,
            "flag": flag,
        })

    recommendations: list[str] = []
    if total > budget:
        recommendations.append("Over budget; consider /context optimize.")
    if prior_available:
        recommendations.append(f"Prior available for workflow: {prior_workflow}")
    recommendations.append("Suggested action: /context optimize")

    return TokenProfile(
        session_id=parsed.session_id,
        workflow_type=workflow_type,
        workflow_confidence=workflow_confidence,
        total_tokens=total,
        budget=budget,
        budget_pct=round(budget_pct, 1),
        by_category=by_category_output,
        loaded_files=file_entries,
        recommendations=recommendations,
        prior_available=prior_available,
        prior_workflow=prior_workflow,
    )


def profile_from_dict(data: dict[str, Any]) -> TokenProfile:
    """Build TokenProfile from a dict (e.g. loaded from measure.py JSON output)."""
    return TokenProfile(
        session_id=data.get("session_id"),
        workflow_type=data["workflow_type"],
        workflow_confidence=float(data.get("workflow_confidence", 0)),
        total_tokens=int(data["total_tokens"]),
        budget=int(data["budget"]),
        budget_pct=float(data.get("budget_pct", 0)),
        by_category=dict(data.get("by_category", {})),
        loaded_files=list(data.get("loaded_files", [])),
        recommendations=list(data.get("recommendations", [])),
        prior_available=bool(data.get("prior_available", False)),
        prior_workflow=data.get("prior_workflow"),
    )


def profile_to_json_serializable(profile: TokenProfile) -> dict[str, Any]:
    return {
        "session_id": profile.session_id,
        "workflow_type": profile.workflow_type,
        "workflow_confidence": profile.workflow_confidence,
        "total_tokens": profile.total_tokens,
        "budget": profile.budget,
        "budget_pct": profile.budget_pct,
        "by_category": profile.by_category,
        "loaded_files": profile.loaded_files,
        "recommendations": profile.recommendations,
        "prior_available": profile.prior_available,
        "prior_workflow": profile.prior_workflow,
    }


def format_table(profile: TokenProfile) -> str:
    lines = [
        f"Context Budget: {profile.total_tokens:,} / {profile.budget:,} ({profile.budget_pct}%)",
        f"Workflow: {profile.workflow_type} (confidence: {profile.workflow_confidence})",
        f"Prior available: {profile.prior_available}" + (f" ({profile.prior_workflow})" if profile.prior_workflow else ""),
        "",
        "By category:",
    ]
    for cat, stat in profile.by_category.items():
        lines.append(f"  {cat}: {stat['tokens']:,} tokens ({stat['pct']}%), {stat['items']} items")
    lines.append("")
    lines.append("  loaded_files:")
    for fe in profile.loaded_files:
        lines.append(
            f"    {fe['path']}  tokens={fe['tokens']:,}  load_level={fe['load_level_detected']}  flag={fe['flag']}"
        )
    lines.append("")
    lines.append("Suggested action: /context optimize")
    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser(description="Measure context usage from an agent transcript.")
    parser.add_argument("--transcript", required=True, help="Path to transcript file")
    parser.add_argument("--format", choices=("json", "table"), default="table", help="Output format")
    parser.add_argument("--output", "-o", help="Write output to file (default: stdout)")
    parser.add_argument("--budget", type=int, default=200_000, help="Token budget (default: 200000)")
    args = parser.parse_args()

    transcript_path = Path(args.transcript)
    if not transcript_path.is_absolute():
        # Resolve relative to CWD (run from context skill root)
        transcript_path = Path.cwd() / transcript_path
    if not transcript_path.is_file():
        print(f"Error: transcript file not found: {transcript_path}", file=sys.stderr)
        return 1

    profile = build_profile(str(transcript_path), budget=args.budget)

    if args.format == "json":
        out = json.dumps(profile_to_json_serializable(profile), indent=2)
    else:
        out = format_table(profile)

    if args.output:
        Path(args.output).write_text(out, encoding="utf-8")
    else:
        print(out)
    return 0


if __name__ == "__main__":
    sys.exit(main())
