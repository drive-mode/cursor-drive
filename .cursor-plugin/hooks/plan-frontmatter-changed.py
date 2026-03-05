#!/usr/bin/env python3
"""Lightweight check: has any .plan.md frontmatter changed since last run?

Usage: python .cursor/hooks/plan-frontmatter-changed.py

Output (stdout): "changed" or "unchanged"
Exit: 0 always (never blocks)

Used by plan-governance rule: agent runs this before/after editing plans.
If "changed" → run sync-registry and update diagrams.
If "unchanged" → skip (no tokens, no heavy process).
"""

import hashlib
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PLANS_DIR = ROOT / ".cursor" / "plans"
ARCHIVE_DIR = PLANS_DIR / "archive"
HASH_FILE = PLANS_DIR / ".plan-frontmatter-hash"


def _extract_frontmatter(path: Path) -> str:
    """Return raw frontmatter block (between ---) or empty string."""
    try:
        text = path.read_text(encoding="utf-8")
    except OSError:
        return ""
    if not text.startswith("---"):
        return ""
    match = re.match(r"^---\n(.*?)\n---\n", text, flags=re.DOTALL)
    return match.group(1) if match else ""


def _compute_hash() -> str:
    """Hash of all .plan.md frontmatter, sorted by path for determinism."""
    h = hashlib.sha256()
    paths: list[Path] = []
    if PLANS_DIR.exists():
        paths.extend(PLANS_DIR.glob("*.plan.md"))
    if ARCHIVE_DIR.exists():
        paths.extend(ARCHIVE_DIR.rglob("*.plan.md"))  # supports archive/{project}/
    for p in sorted(paths, key=lambda x: str(x)):
        rel = str(p.relative_to(ROOT)).replace("\\", "/")
        fm = _extract_frontmatter(p)
        h.update(f"{rel}\n{fm}\n".encode("utf-8"))
    return h.hexdigest()


def main() -> int:
    current = _compute_hash()
    try:
        stored = HASH_FILE.read_text(encoding="utf-8").strip() if HASH_FILE.exists() else ""
    except OSError:
        stored = ""
    if current != stored:
        try:
            HASH_FILE.parent.mkdir(parents=True, exist_ok=True)
            HASH_FILE.write_text(current + "\n", encoding="utf-8")
        except OSError:
            pass
        print("changed", file=sys.stdout)
    else:
        print("unchanged", file=sys.stdout)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
