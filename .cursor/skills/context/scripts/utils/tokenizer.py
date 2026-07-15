"""
Thin wrapper around tiktoken for token counting and outline/heading estimates.
Default encoding: cl100k_base. File-not-found returns 0 and logs a warning.
"""

import logging
import re
from pathlib import Path
from typing import Optional

try:
    import tiktoken
except ImportError:
    tiktoken = None  # type: ignore[assignment]

logger = logging.getLogger(__name__)

def _is_outline_line(line: str) -> bool:
    """True if line looks like def, class, //, #, /*, export, type, or interface."""
    s = line.strip()
    if not s:
        return False
    if s.startswith("def ") or s.startswith("class "):
        return True
    if s.startswith("//") or s.startswith("#") or s.startswith("/*"):
        return True
    if s.startswith("export ") or s.startswith("export\t"):
        return True
    if s.startswith("type ") or s.startswith("type\t"):
        return True
    if s.startswith("interface ") or s.startswith("interface\t"):
        return True
    return False


# Markdown heading: line starts with one or more # (optional leading whitespace)
_MD_HEADING = re.compile(r"^\s*#{1,6}\s+.+")
# Comment-block header: line is only // ... or /* ... */ or === / ---
_COMMENT_HEADER = re.compile(r"^\s*(?://.*|/\*.*\*/)\s*$|^\s*[=\-]{2,}\s*$")


def _decode_file(path: Path) -> Optional[str]:
    """Read path and decode as UTF-8. Return None if file not found or binary/invalid."""
    try:
        raw = path.read_bytes()
    except OSError as e:
        logger.warning("tokenizer: file not found or unreadable: %s — %s", path, e)
        return None
    try:
        return raw.decode("utf-8")
    except UnicodeDecodeError:
        logger.warning("tokenizer: binary or non-UTF-8 file, skipping: %s", path)
        return None


class Tokenizer:
    """Thin tiktoken wrapper. Default encoding: cl100k_base."""

    def __init__(self, encoding_name: str = "cl100k_base"):
        if tiktoken is None:
            raise ImportError("tiktoken is required; install with: pip install tiktoken")
        self._encoding = tiktoken.get_encoding(encoding_name)

    def count(self, text: str) -> int:
        """Return token count for the given string."""
        return len(self._encoding.encode(text))

    def count_file(self, path: str) -> int:
        """
        Return token count for file at path. If file is not found or not
        decodable as UTF-8 (e.g. binary), return 0 and log a warning.
        """
        content = _decode_file(Path(path))
        if content is None:
            return 0
        return self.count(content)

    def estimate_outline(self, path: str) -> int:
        """
        Return estimated token count for an outline of the file: lines matching
        def, class, //, #, /*, export, type, interface. For non-trivial code
        files this is less than count_file. Returns 0 if file not found or binary.
        """
        content = _decode_file(Path(path))
        if content is None:
            return 0
        lines = [line for line in content.splitlines() if _is_outline_line(line)]
        outline_text = "\n".join(lines) if lines else ""
        return self.count(outline_text)

    def estimate_headings(self, path: str) -> int:
        """
        Return estimated token count for markdown or comment-block headers only
        (e.g. # Title, ## Section, // === Section ===). Returns 0 if file not
        found or binary.
        """
        content = _decode_file(Path(path))
        if content is None:
            return 0
        lines = []
        for line in content.splitlines():
            stripped = line.strip()
            if _MD_HEADING.match(line):
                lines.append(line)
            elif _COMMENT_HEADER.match(line) and stripped:
                lines.append(line)
        heading_text = "\n".join(lines) if lines else ""
        return self.count(heading_text)
