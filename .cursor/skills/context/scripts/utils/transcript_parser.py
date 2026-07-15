"""
Parse agent session transcripts into a structured format.
Supports: (1) JSONL (Claude Code / Anthropic SDK), (2) Markdown (exported Cursor transcripts).
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Literal, Optional

from .tokenizer import Tokenizer

# --- Output schema ---

Role = Literal["system", "user", "assistant", "tool_result"]
SourceType = Literal[
    "system_prompt", "file_load", "tool_call", "tool_result", "conversation"
]


@dataclass
class TranscriptSegment:
    role: Role
    content: str
    token_count: int
    source_type: SourceType
    file_path: Optional[str] = None
    tool_name: Optional[str] = None


@dataclass
class ParsedTranscript:
    segments: list[TranscriptSegment] = field(default_factory=list)
    total_tokens: int = 0
    format: Literal["jsonl", "markdown"] = "jsonl"
    session_id: Optional[str] = None


# --- File path extraction from content ---

# <file path="..."> or <file path='...'>
_FILE_PATH_XML = re.compile(r'<file\s+path\s*=\s*["\']([^"\']+)["\']', re.IGNORECASE)
# ```filepath or ``` filepath — path on same line or first line of block
_FENCED_FILEPATH = re.compile(
    r'^```\s*filepath\s*(?:\n([^\n]+)|\s+([^\n]+))',
    re.MULTILINE | re.IGNORECASE,
)


def _extract_file_path(content: str) -> Optional[str]:
    """Extract file path from content. Supports <file path="..."> and ```filepath fenced block."""
    m = _FILE_PATH_XML.search(content)
    if m:
        return m.group(1).strip()
    m = _FENCED_FILEPATH.search(content)
    if m:
        return (m.group(1) or m.group(2) or "").strip() or None
    return None


def _infer_source_type(
    role: Role,
    content: str,
    block_type: Optional[str] = None,
    tool_name: Optional[str] = None,
) -> SourceType:
    if role == "system":
        return "system_prompt"
    if block_type == "tool_use" or tool_name:
        return "tool_call"
    if block_type == "tool_result":
        return "tool_result"
    if _extract_file_path(content) is not None:
        return "file_load"
    return "conversation"


# --- Token counting ---

def _get_tokenizer() -> Tokenizer:
    try:
        return Tokenizer()
    except ImportError:
        # Fallback when tiktoken not installed: approximate by chars/4
        class _FakeTokenizer:
            def count(self, text: str) -> int:
                return max(0, len(text) // 4)
        return _FakeTokenizer()  # type: ignore[return-value]


# --- JSONL (Claude / Anthropic SDK) ---

def _parse_jsonl(content: str, tokenizer: Tokenizer) -> list[TranscriptSegment]:
    segments: list[TranscriptSegment] = []
    for line in content.strip().splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            obj = json.loads(line)
        except json.JSONDecodeError:
            continue
        role_str = obj.get("role") or obj.get("type")
        if not role_str:
            continue
        role: Role = "user" if role_str == "user" else "assistant" if role_str == "assistant" else "system" if role_str == "system" else "tool_result" if role_str == "tool_result" else "user"
        msg = obj.get("message") or obj
        blocks = msg.get("content") if isinstance(msg, dict) else []
        if not isinstance(blocks, list):
            # Single text message
            text = msg.get("text", msg.get("content", "")) if isinstance(msg, dict) else str(msg)
            if isinstance(text, list):
                text = "".join(
                    b.get("text", "") if isinstance(b, dict) else str(b) for b in text
                )
            text = text or ""
            fp = _extract_file_path(text)
            st = _infer_source_type(role, text, None, None)
            if fp:
                st = "file_load"
            seg = TranscriptSegment(
                role=role,
                content=text,
                token_count=tokenizer.count(text),
                source_type=st,
                file_path=fp,
            )
            segments.append(seg)
            continue
        for block in blocks:
            if not isinstance(block, dict):
                continue
            block_type = block.get("type")
            text = ""
            tool_name: Optional[str] = None
            if block_type == "text":
                text = block.get("text", "")
            elif block_type == "tool_use":
                tool_name = block.get("name")
                inp = block.get("input")
                text = json.dumps(inp) if inp is not None else ""
            elif block_type == "tool_result" or block_type == "tool_result_spec":
                # Anthropic-style tool result (often under user message)
                res = block.get("content") or block.get("result")
                if isinstance(res, list):
                    text = " ".join(
                        item.get("text", "") if isinstance(item, dict) else str(item)
                        for item in res
                    )
                else:
                    text = str(res) if res is not None else ""
                seg = TranscriptSegment(
                    role="tool_result",
                    content=text,
                    token_count=tokenizer.count(text),
                    source_type="tool_result",
                    tool_name=block.get("tool_use_id") or block.get("name"),
                )
                segments.append(seg)
                continue
            else:
                text = block.get("text", str(block))
            fp = _extract_file_path(text)
            st = _infer_source_type(role, text, block_type, tool_name)
            if fp:
                st = "file_load"
            segments.append(
                TranscriptSegment(
                    role=role,
                    content=text,
                    token_count=tokenizer.count(text),
                    source_type=st,
                    file_path=fp,
                    tool_name=tool_name,
                )
            )
    return segments


# --- Markdown (exported Cursor transcripts) ---

# Sections: ## User, ## Assistant, ### Tool call, code blocks with ```filepath
_MD_SECTION = re.compile(r"^#{1,3}\s*(.+)$", re.MULTILINE)
_MD_CODE_FENCE = re.compile(r"^```(\w*)\s*\n(.*?)^```", re.MULTILINE | re.DOTALL)


def _parse_markdown(content: str, tokenizer: Tokenizer) -> list[TranscriptSegment]:
    segments: list[TranscriptSegment] = []
    current_role: Role = "user"
    current_content: list[str] = []
    current_source: SourceType = "conversation"
    current_file_path: Optional[str] = None
    current_tool_name: Optional[str] = None

    def flush() -> None:
        if not current_content:
            return
        text = "\n".join(current_content).strip()
        if not text:
            return
        fp = current_file_path or _extract_file_path(text)
        st = current_source
        if fp and st == "conversation":
            st = "file_load"
        segments.append(
            TranscriptSegment(
                role=current_role,
                content=text,
                token_count=tokenizer.count(text),
                source_type=st,
                file_path=fp,
                tool_name=current_tool_name,
            )
        )

    lines = content.splitlines()
    i = 0
    while i < len(lines):
        line = lines[i]
        section = _MD_SECTION.match(line)
        if section:
            flush()
            current_content = []
            current_file_path = None
            current_tool_name = None
            title = section.group(1).strip().lower()
            if "user" in title:
                current_role = "user"
                current_source = "conversation"
            elif "assistant" in title:
                current_role = "assistant"
                current_source = "conversation"
            elif "tool" in title or "call" in title:
                current_role = "assistant"
                current_source = "tool_call"
                # Optional: parse tool name from title e.g. "Tool call: Read"
                if ":" in title:
                    current_tool_name = title.split(":", 1)[1].strip() or None
            else:
                current_role = "user"
                current_source = "conversation"
            i += 1
            continue
        # Check for ```filepath block
        if line.strip().startswith("```"):
            fence_match = line.strip()
            lang = fence_match[3:].strip().lower() if len(fence_match) > 3 else ""
            i += 1
            block_lines: list[str] = []
            while i < len(lines) and not lines[i].strip().startswith("```"):
                block_lines.append(lines[i])
                i += 1
            if i < len(lines):
                i += 1  # consume closing ```
            block_text = "\n".join(block_lines)
            if "filepath" in lang or (not lang and _extract_file_path(block_text)):
                flush()
                current_content = []
                fp = _extract_file_path(block_text) or (block_lines[0].strip() if block_lines else None)
                segments.append(
                    TranscriptSegment(
                        role=current_role,
                        content=block_text,
                        token_count=tokenizer.count(block_text),
                        source_type="file_load",
                        file_path=fp,
                    )
                )
            else:
                current_content.append(line)
                current_content.extend(block_lines)
                current_content.append("```")
            continue
        current_content.append(line)
        i += 1
    flush()
    return segments


# --- Format detection and entry point ---

def _detect_format(content: str) -> Literal["jsonl", "markdown"]:
    stripped = content.strip()
    if stripped.startswith("{") and ("role" in stripped[:500] or "message" in stripped[:500]):
        return "jsonl"
    if re.search(r"^#+\s*(User|Assistant|Tool)", content, re.MULTILINE | re.IGNORECASE):
        return "markdown"
    # Default: try first line as JSON
    first = stripped.split("\n")[0].strip()
    if first.startswith("{") and "role" in first:
        return "jsonl"
    return "markdown"


def parse(
    path_or_content: str,
    format_hint: Optional[str] = None,
    session_id: Optional[str] = None,
) -> ParsedTranscript:
    """
    Parse a transcript from a file path or raw string.
    Returns ParsedTranscript with segments, total_tokens, and format.

    - path_or_content: Path to a transcript file, or the raw transcript string.
    - format_hint: "jsonl" or "markdown" to force format; None to auto-detect.
    - session_id: Optional session identifier (e.g. from filename).
    """
    path = Path(path_or_content)
    if path.exists() and path.is_file():
        content = path.read_text(encoding="utf-8", errors="replace")
        sid = session_id or path.stem
    else:
        content = path_or_content
        sid = session_id

    fmt: Literal["jsonl", "markdown"]
    if format_hint and format_hint.lower() in ("jsonl", "markdown"):
        fmt = format_hint.lower()
    else:
        fmt = _detect_format(content)

    tokenizer = _get_tokenizer()
    if fmt == "jsonl":
        segments = _parse_jsonl(content, tokenizer)
    else:
        segments = _parse_markdown(content, tokenizer)

    total_tokens = sum(s.token_count for s in segments)
    return ParsedTranscript(
        segments=segments,
        total_tokens=total_tokens,
        format=fmt,
        session_id=sid or None,
    )
