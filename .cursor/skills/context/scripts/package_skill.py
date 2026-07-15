#!/usr/bin/env python3
"""
Package the context skill into a single archive for distribution.
Usage: python package_skill.py [context_dir]
  Default: parent of scripts/ (i.e. the context skill root).
Output: context.skill (zip) in CWD, ready to install by extracting to .cursor/skills/context/
"""

from __future__ import annotations

import argparse
import zipfile
from pathlib import Path


def main() -> None:
    parser = argparse.ArgumentParser(description="Package context skill for installation")
    parser.add_argument(
        "skill_dir",
        nargs="?",
        default=None,
        help="Skill root directory (default: parent of scripts/)",
    )
    parser.add_argument(
        "-o", "--output",
        default="context.skill",
        help="Output archive path (default: context.skill)",
    )
    args = parser.parse_args()

    if args.skill_dir:
        root = Path(args.skill_dir).resolve()
    else:
        root = Path(__file__).resolve().parent.parent

    if not root.is_dir():
        raise SystemExit(f"Skill root is not a directory: {root}")

    out_path = Path(args.output).resolve()
    with zipfile.ZipFile(out_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for f in root.rglob("*"):
            if f.is_file() and "__pycache__" not in f.parts and ".pyc" not in f.name:
                arcname = f.relative_to(root.parent)
                zf.write(f, arcname)

    print(f"Created {out_path}")


if __name__ == "__main__":
    main()
