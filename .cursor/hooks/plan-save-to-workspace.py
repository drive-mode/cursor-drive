#!/usr/bin/env python3
"""Copy plan files from Cursor's default plan location into the workspace.

When the CreatePlan tool (or Plan mode) saves plans, Cursor may write them to
a global directory (e.g. ~/.cursor/plans/) instead of the workspace. This hook
runs on sessionStart and copies any *.plan.md from that source into
ROOT/.cursor/plans/ so plans are persisted in the codebase.

Usage:
  python .cursor/hooks/plan-save-to-workspace.py

Environment:
  CURSOR_PLANS_SOURCE  Optional. Directory to read plans from.
                      Default: ~/.cursor/plans (platform-aware).

Output (stdout): JSON with keys "copied": [list of basenames], "skipped": int, "errors": [str].
Exit: 0 (fail-soft; missing source dir or read errors do not fail the hook).
"""

from __future__ import annotations

import json
import os
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
WORKSPACE_PLANS = ROOT / ".cursor" / "plans"


def _source_dir() -> Path:
    raw = os.environ.get("CURSOR_PLANS_SOURCE", "").strip()
    if raw:
        return Path(raw).expanduser().resolve()
    home = Path.home()
    return home / ".cursor" / "plans"


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


def _dest_path(source_path: Path, frontmatter: dict | None) -> Path:
    """Choose workspace destination: planId.plan.md if in frontmatter, else source basename."""
    if frontmatter:
        plan_id = frontmatter.get("planId") or frontmatter.get("plan_id")
        if plan_id and isinstance(plan_id, str) and re.match(r"^[a-zA-Z0-9_-]+$", plan_id):
            return WORKSPACE_PLANS / f"{plan_id}.plan.md"
    return WORKSPACE_PLANS / source_path.name


def _is_completed(frontmatter: dict | None) -> bool:
    """True if all todos have status completed or cancelled. Empty/no todos = not completed."""
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


def main() -> int:
    copied: list[str] = []
    skipped = 0
    errors: list[str] = []

    source = _source_dir()
    if not source.is_dir():
        out = {"copied": [], "skipped": 0, "errors": [], "message": "Source dir not found (optional)."}
        print(json.dumps(out))
        return 0

    WORKSPACE_PLANS.mkdir(parents=True, exist_ok=True)

    for plan_file in sorted(source.glob("*.plan.md")):
        try:
            fm = _read_frontmatter(plan_file)
            dest = _dest_path(plan_file, fm)
            if dest == plan_file.resolve():
                skipped += 1
                continue
            if _is_completed(fm):
                skipped += 1
                continue
            if dest.exists():
                fm_dest = _read_frontmatter(dest)
                if _is_completed(fm_dest):
                    skipped += 1
                    continue
            do_copy = not dest.exists() or (plan_file.stat().st_mtime > dest.stat().st_mtime)
            if do_copy:
                shutil.copy2(plan_file, dest)
                copied.append(dest.name)
            else:
                skipped += 1
        except Exception as e:
            errors.append(f"{plan_file.name}: {e}")

    if copied:
        # Run plan-runner sync-registry so new plans appear in registry and graph.
        hook_dir = Path(__file__).resolve().parent
        runner = hook_dir / "plan-runner.py"
        if runner.exists():
            try:
                subprocess.run(
                    [sys.executable, str(runner), "sync-registry"],
                    cwd=str(ROOT),
                    capture_output=True,
                    timeout=60,
                )
            except Exception as e:
                errors.append(f"sync-registry: {e}")

    out = {"copied": copied, "skipped": skipped, "errors": errors}
    if copied:
        out["message"] = f"Copied {len(copied)} plan(s) to workspace."
    print(json.dumps(out))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
