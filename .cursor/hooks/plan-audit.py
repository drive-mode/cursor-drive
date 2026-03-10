#!/usr/bin/env python3
"""Audit .cursor/plans/ and classify plans: completed, active, duplicate, superseded.

Classifies top-level *.plan.md files (excludes archive/). Outputs a JSON report.
With --apply, archives completed and superseded, deletes duplicates, updates plan-graph,
then runs sync-registry.

Usage:
  python .cursor/hooks/plan-audit.py [--dry-run] [--apply]

Classification rules:
  completed: All todos have status completed or cancelled.
  duplicate: Same planId in two files; keep {planId}.plan.md, delete hash-suffix variant.
  superseded: Hash-suffix file when clean {planId}.plan.md exists; or completed + obsolete.
  active: Else — keep in place.
"""

from __future__ import annotations

import argparse
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

try:
    import yaml
except Exception:
    yaml = None

ROOT = Path(__file__).resolve().parents[2]
PLANS_DIR = ROOT / ".cursor" / "plans"
ARCHIVE_DIR = PLANS_DIR / "archive"
SUPERSEDED_DIR = ARCHIVE_DIR / "superseded"
PLAN_GRAPH = ROOT / ".cursor" / "plans" / "plan-graph.yaml"
HASH_SUFFIX_RE = re.compile(r"^(.+)_[0-9a-f]{8}\.plan\.md$", re.I)


def _read_frontmatter(path: Path) -> dict | None:
    try:
        text = path.read_text(encoding="utf-8")
    except OSError:
        return None
    if not text.startswith("---"):
        return None
    match = re.match(r"^---\n(.*?)\n---\n", text, flags=re.DOTALL)
    if not match:
        return None
    if yaml is None:
        return None
    try:
        data = yaml.safe_load(match.group(1))
        return data if isinstance(data, dict) else None
    except Exception:
        return None


def _is_completed(frontmatter: dict | None) -> bool:
    if not frontmatter:
        return False
    todos = frontmatter.get("todos", [])
    if not isinstance(todos, list) or len(todos) == 0:
        return False
    for item in todos:
        if not isinstance(item, dict):
            return False
        status = str(item.get("status", "pending")).lower()
        if status not in {"completed", "cancelled"}:
            return False
    return True


def _get_plan_id(frontmatter: dict | None, path: Path) -> str | None:
    if frontmatter:
        pid = frontmatter.get("planId") or frontmatter.get("plan_id")
        if pid and isinstance(pid, str):
            return pid
    stem = path.stem.removesuffix(".plan")
    m = HASH_SUFFIX_RE.match(path.name)
    if m:
        return m.group(1)
    return stem if re.match(r"^[a-zA-Z0-9_-]+$", stem) else None


def _is_canonical_filename(path: Path, plan_id: str) -> bool:
    return path.name == f"{plan_id}.plan.md"


def _list_top_level_plans() -> list[Path]:
    if not PLANS_DIR.is_dir():
        return []
    return sorted(PLANS_DIR.glob("*.plan.md"))


def _classify_plans(paths: list[Path]) -> list[dict]:
    by_plan_id: dict[str, list[Path]] = {}
    for p in paths:
        fm = _read_frontmatter(p)
        pid = _get_plan_id(fm, p)
        if pid:
            by_plan_id.setdefault(pid, []).append(p)
        else:
            by_plan_id.setdefault(p.stem, []).append(p)

    results: list[dict] = []
    for path in paths:
        fm = _read_frontmatter(path)
        completed = _is_completed(fm)
        plan_id = _get_plan_id(fm, path)

        classification = "active"
        reason: str | None = None
        canonical_path: str | None = None

        if completed:
            classification = "completed"
            reason = "all todos completed or cancelled"

        same_id_paths = by_plan_id.get(plan_id or path.stem, [])
        if len(same_id_paths) > 1 and plan_id:
            canonical_file = PLANS_DIR / f"{plan_id}.plan.md"
            if path == canonical_file or _is_canonical_filename(path, plan_id):
                pass
            elif canonical_file.exists():
                canonical_path = f".cursor/plans/{plan_id}.plan.md"
                if HASH_SUFFIX_RE.match(path.name):
                    classification = "superseded"
                    reason = f"hash-suffix variant; canonical {plan_id}.plan.md exists"
                else:
                    classification = "duplicate"
                    reason = f"duplicate of {canonical_path}"
            else:
                same_id_paths_sorted = sorted(same_id_paths, key=lambda q: (0 if _is_canonical_filename(q, plan_id) else 1, q.name))
                keep = same_id_paths_sorted[0]
                if path != keep:
                    canonical_path = str(keep.relative_to(ROOT)).replace("\\", "/")
                    classification = "duplicate"
                    reason = f"duplicate of {canonical_path}"

        results.append({
            "path": str(path.relative_to(ROOT)).replace("\\", "/"),
            "classification": classification,
            "reason": reason,
            "canonicalPath": canonical_path,
        })
    return results


def main() -> int:
    parser = argparse.ArgumentParser(description="Audit .cursor/plans/ and classify plans.")
    parser.add_argument("--dry-run", action="store_true", help="Only output report, do not move/delete.")
    parser.add_argument("--apply", action="store_true", help="Archive completed/superseded, delete duplicates, run sync-registry.")
    args = parser.parse_args()

    paths = _list_top_level_plans()
    results = _classify_plans(paths)

    report = {
        "plans": results,
        "summary": {
            "total": len(results),
            "completed": sum(1 for r in results if r["classification"] == "completed"),
            "active": sum(1 for r in results if r["classification"] == "active"),
            "duplicate": sum(1 for r in results if r["classification"] == "duplicate"),
            "superseded": sum(1 for r in results if r["classification"] == "superseded"),
        },
    }
    print(json.dumps(report, indent=2))

    if not args.apply:
        return 0

    archive_dir = ARCHIVE_DIR
    superseded_dir = SUPERSEDED_DIR
    archive_dir.mkdir(parents=True, exist_ok=True)
    superseded_dir.mkdir(parents=True, exist_ok=True)

    moved: list[str] = []
    deleted: list[str] = []

    for r in results:
        path = ROOT / r["path"]
        if not path.exists():
            continue
        cls = r["classification"]
        if cls == "completed":
            dest = archive_dir / path.name
            if dest != path:
                shutil.move(str(path), str(dest))
                moved.append(r["path"])
        elif cls == "superseded":
            dest = superseded_dir / path.name
            if dest != path:
                if dest.exists():
                    dest = superseded_dir / f"{path.stem}_superseded.plan.md"
                shutil.move(str(path), str(dest))
                moved.append(r["path"])
        elif cls == "duplicate":
            path.unlink()
            deleted.append(r["path"])

    if moved or deleted:
        hook_dir = Path(__file__).resolve().parent
        runner = hook_dir / "plan-runner.py"
        if runner.exists():
            subprocess.run(
                [sys.executable, str(runner), "sync-registry"],
                cwd=str(ROOT),
                capture_output=True,
                timeout=60,
            )
        report["applied"] = {"moved": moved, "deleted": deleted}
        print("\nApplied:", json.dumps(report["applied"], indent=2))

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
