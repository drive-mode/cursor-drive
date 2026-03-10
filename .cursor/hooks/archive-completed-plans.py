#!/usr/bin/env python3
"""Archive plan files whose TODOs are all completed or cancelled.

Scans .cursor/plans/*.plan.md, identifies plans with no remaining TODOs,
and moves them to .cursor/plans/archive/. Removes duplicates when archive
already has a copy.
"""

import argparse
import re
import shutil
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

try:
    import yaml
except ImportError:
    yaml = None

ROOT = Path(__file__).resolve().parents[2]
PLANS_DIR = ROOT / ".cursor" / "plans"
ARCHIVE_DIR = ROOT / ".cursor" / "plans" / "archive"

# Plans to never archive (root project, etc.)
KEEP_IN_ROOT = {"cursor-drive-v1"}

# Hash-suffixed plans (e.g. foo_abc12345.plan.md) are typically duplicate/superseded copies
HASH_SUFFIX_RE = re.compile(r"_[a-f0-9]{8}\.plan\.md$", re.I)


def _read_frontmatter(path: Path) -> Tuple[Optional[Dict[str, Any]], List[str]]:
    errors: List[str] = []
    try:
        text = path.read_text(encoding="utf-8")
    except Exception as e:
        return None, [f"Failed to read {path}: {e}"]
    if not text.startswith("---"):
        return None, [f"{path.name} missing frontmatter"]
    match = re.match(r"^---\n(.*?)\n---\n", text, flags=re.DOTALL)
    if not match:
        return None, [f"{path.name} malformed frontmatter"]
    if yaml is None:
        return None, ["PyYAML unavailable"]
    try:
        data = yaml.safe_load(match.group(1)) or {}
        if not isinstance(data, dict):
            return None, [f"{path.name} frontmatter must be a mapping"]
        return data, []
    except Exception as e:
        return None, [f"{path.name} frontmatter parse error: {e}"]


def _remaining_todos(frontmatter: Dict[str, Any]) -> List[str]:
    todos = frontmatter.get("todos", [])
    if not isinstance(todos, list):
        return ["todos frontmatter must be a list"]
    remaining: List[str] = []
    for item in todos:
        if not isinstance(item, dict):
            remaining.append("invalid-todo-item")
            continue
        status = str(item.get("status", "pending")).lower()
        todo_id = str(item.get("id", "unknown"))
        if status not in {"completed", "cancelled"}:
            remaining.append(todo_id)
    return remaining


def _is_complete(path: Path, archive_superseded: bool = False) -> Tuple[bool, Optional[str]]:
    """Return (True, plan_id) if plan should be archived; else (False, None)."""
    frontmatter, errs = _read_frontmatter(path)
    if frontmatter is None:
        return False, None
    plan_id = frontmatter.get("planId") or frontmatter.get("id") or path.stem.replace(".plan", "")
    plan_id = str(plan_id)
    if plan_id in KEEP_IN_ROOT:
        return False, None
    # Hash-suffixed plans (foo_abc12345) are typically duplicates; archive when complete or --archive-superseded
    is_superseded = bool(HASH_SUFFIX_RE.search(path.name))
    if archive_superseded and is_superseded:
        return True, plan_id
    # Accept state: completed as completion signal even if some todos remain
    state = str(frontmatter.get("state", "")).lower()
    if state == "completed":
        return True, plan_id
    if _remaining_todos(frontmatter):
        return False, None
    return True, plan_id


def main() -> int:
    parser = argparse.ArgumentParser(description="Archive completed plan files to .cursor/plans/archive/")
    parser.add_argument("--dry-run", action="store_true", help="Show what would be archived without moving")
    parser.add_argument(
        "--archive-superseded",
        action="store_true",
        help="Also archive hash-suffixed plans (e.g. foo_abc12345.plan.md) as duplicates",
    )
    args = parser.parse_args()

    if yaml is None:
        print("Error: PyYAML required. Install with: pip install pyyaml", file=sys.stderr)
        return 1

    ARCHIVE_DIR.mkdir(parents=True, exist_ok=True)

    completed: List[Tuple[Path, str]] = []

    for plan_file in sorted(PLANS_DIR.glob("*.plan.md")):
        ok, plan_id = _is_complete(plan_file, archive_superseded=args.archive_superseded)
        if ok and plan_id:
            completed.append((plan_file, plan_id))

    if not completed:
        print("No plans with all TODOs complete (or state: completed). Nothing to archive.")
        return 0

    if args.dry_run:
        print(f"Would archive {len(completed)} plan(s):")
        for plan_file, plan_id in completed:
            dest = ARCHIVE_DIR / plan_file.name
            action = "remove duplicate" if dest.exists() else "move"
            print(f"  {plan_id}: {action} -> archive/{plan_file.name}")
        return 0

    moved: List[str] = []
    removed_dupes: List[str] = []
    for plan_file, plan_id in completed:
        dest = ARCHIVE_DIR / plan_file.name
        if dest.exists():
            try:
                plan_file.unlink()
                removed_dupes.append(f"{plan_id} (duplicate removed)")
            except Exception as e:
                print(f"Error removing duplicate {plan_file.name}: {e}", file=sys.stderr)
                return 1
        else:
            try:
                shutil.move(str(plan_file), str(dest))
                moved.append(f"{plan_id} -> archive/{plan_file.name}")
            except Exception as e:
                print(f"Error moving {plan_file.name}: {e}", file=sys.stderr)
                return 1

    total = len(moved) + len(removed_dupes)
    if moved:
        print(f"Moved {len(moved)} plan(s) to archive:")
        for m in moved:
            print(f"  {m}")
    if removed_dupes:
        print(f"Removed {len(removed_dupes)} duplicate(s) (already in archive):")
        for r in removed_dupes:
            print(f"  {r}")
    print(f"Total: {total} plan(s) cleaned from .cursor/plans/")

    # Run sync-registry to update registry
    try:
        import subprocess
        result = subprocess.run(
            [sys.executable, str(ROOT / ".cursor" / "hooks" / "plan-runner.py"), "sync-registry"],
            cwd=str(ROOT),
            capture_output=True,
            text=True,
            timeout=120,
        )
        if result.returncode != 0:
            print(f"Warning: sync-registry failed: {result.stderr or result.stdout}", file=sys.stderr)
        else:
            print("Registry synced.")
    except Exception as e:
        print(f"Warning: could not run sync-registry: {e}", file=sys.stderr)

    return 0


if __name__ == "__main__":
    sys.exit(main())
