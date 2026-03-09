# Load Levels

Canonical reference for file/artifact context granularity. Use to choose how much of a file or document to include in agent context.

**Related**: Context skill for when to request which level; escalation protocol below for mid-session level changes.

## Contents

- [Level summary](#level-summary)
- [Level definitions](#level-definitions)
- [Outline examples by type](#outline-examples-by-type)
- [Escalation protocol](#escalation-protocol)

---

## Level summary

| Level    | Token % of full | When to use |
|----------|-----------------|-------------|
| **full** | 100%            | Editing, debugging, or answering questions that need complete content. |
| **outline** | 10–20%       | Navigation, "where is X?", scoping; enough structure to decide what to load next. |
| **headings** | 2–5%        | TOC-style scan; filtering many files. |
| **digest** | ~5% (fixed)   | One-line or short summary per file; bulk triage. |
| **exclude** | ~0%          | Do not include in context. |

---

## Level definitions

### full (100%)

- **What's included:** Entire file contents — every line, no truncation.
- **Approximate token % of full:** 100%.
- **When to use:** Implementing changes, fixing bugs, answering questions that depend on exact code or text. Default for the small set of files currently being edited.
- **Example:** Raw file as returned by read_file / editor.

---

### outline (10–20%)

- **What's included:** Structural skeleton: for code, top-level declarations (classes, functions, methods, exports) with signatures and optionally first line of body or docstring; for Markdown, section headings and list bullets (one level); for config, key names and top-level blocks. No full bodies or long prose.
- **Approximate token % of full:** 10–20%.
- **When to use:** "Where is X defined?", "What does this file export?", choosing which file or symbol to load at full. Keeps token cost low while preserving navigability.
- **Example:** See [Outline examples by type](#outline-examples-by-type).

---

### headings (2–5%)

- **What's included:** Only headings (and optionally first-level list items). For code: file path + symbol names only (no signatures). For Markdown: `#` / `##` lines and top-level `-` or `1.` lines. No bodies.
- **Approximate token % of full:** 2–5%.
- **When to use:** Table-of-contents scan across many files; "which of these files mentions auth?"; filtering before requesting outline or full.
- **Example:** See [Outline examples by type](#outline-examples-by-type) (headings row).

---

### digest (~5% fixed)

- **What's included:** One short line (or fixed small block) per file: purpose, main export, or generated summary. Length cap per file (e.g. 1–2 sentences). Not structure — meaning.
- **Approximate token % of full:** Roughly ~5% but **capped per file** so total digest size is predictable regardless of file length.
- **When to use:** Bulk triage over many files; "what does each file in this folder do?"; prioritising which files deserve outline/full.
- **Example:** `src/auth.ts — Exports login(), logout(), and session middleware.`

---

### exclude (~0%)

- **What's included:** Nothing. File or path is not included in context.
- **Approximate token % of full:** ~0%.
- **When to use:** Ignore list: generated files, lockfiles, large binaries, or off-topic paths. Explicitly exclude to avoid accidental inclusion.
- **Example:** Path or glob listed in an exclude list; no content sent.

---

## Outline examples by type

What "outline" looks like for TypeScript, Python, and Markdown (contrast with **headings**).

### TypeScript

**Outline (10–20%):** signatures + optional first line of body or JSDoc one-liner.

```ts
// src/auth.ts
export function login(user: string, password: string): Promise<Session>;
export function logout(sessionId: string): void;
export const sessionMiddleware: RequestHandler;
```

**Headings (2–5%):** path + symbol names only.

```
src/auth.ts: login, logout, sessionMiddleware
```

---

### Python

**Outline (10–20%):** def/class signatures and docstring first line.

```python
# lib/auth.py
def login(user: str, password: str) -> Session: ...
def logout(session_id: str) -> None: ...
class SessionMiddleware: ...
```

**Headings (2–5%):** path + symbol names only.

```
lib/auth.py: login, logout, SessionMiddleware
```

---

### Markdown

**Outline (10–20%):** headings and one level of list items; no paragraph body.

```md
# Load Levels
## Level summary
## Level definitions
### full (100%)
### outline (10–20%)
...
## Outline examples by type
## Escalation protocol
```

**Headings (2–5%):** only `#` / `##` lines.

```md
# Load Levels
## Level summary
## Level definitions
## Outline examples by type
## Escalation protocol
```

---

## Escalation protocol

When an agent is given context at a level that is too low to complete the task, it must **signal that it needs a higher load level** instead of guessing or failing silently.

### How to signal

1. **In chat/turn output:** Emit a structured escalation request the host or pipeline can parse.
2. **Format:** Use the metadata object below so tooling can upgrade context and re-run or re-query.

### Metadata to include

| Field | Required | Description |
|-------|----------|-------------|
| `file_path` | Yes | Absolute or workspace-relative path to the file (or glob) that needs higher level. |
| `current_level` | Yes | Level at which the file was originally provided (`outline`, `headings`, `digest`, or `exclude`). |
| `requested_level` | Yes | Level needed (`full` or `outline`). |
| `reason` | Yes | Short, machine- and human-readable reason (e.g. "Need full body to implement login validation", "Need outline to find export"). |

### Example escalation payload

```json
{
  "load_level_escalation": {
    "file_path": "src/auth/login.ts",
    "current_level": "outline",
    "requested_level": "full",
    "reason": "Need full implementation to add rate-limiting logic to login()."
  }
}
```

### Behaviour after escalation

- **Consumer (pipeline/tool):** If supported, re-fetch the file at `requested_level` and re-inject into context (or re-run the agent with upgraded context).
- **Agent:** Do not assume escalation is granted; if context is not updated, state that the task is blocked and repeat the escalation metadata.

### When not to escalate

- Do not escalate for files already at **full**.
- Do not escalate for purely speculative "nice to have" context; only when the current level is insufficient to complete the requested task.
