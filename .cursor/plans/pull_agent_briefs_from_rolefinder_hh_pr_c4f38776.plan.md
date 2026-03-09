---
name: Pull Agent Briefs from rolefinder/hh PR
overview: "Review rolefinder/hh PR #3 via GitHub MCP (or local clone fallback), identify all agent-briefs-standard content, and pull it into the briefs repo with a clear structure."
todos: []
isProject: false
---

# Pull Agent Briefs Standard from rolefinder/hh PR #3

## Prerequisites

**GitHub MCP access**: Ensure GitHub MCP is enabled and `GPAT` is set. Current session shows GitHub MCP is not in the available servers list. If it remains unavailable, use the git-clone fallback below.

**Fallback**: Clone the repo locally:
```bash
git clone https://github.com/rolefinder/hh.git /tmp/hh
cd /tmp/hh
git fetch origin pull/3/head:pr-3
git checkout pr-3
```

---

## Phase 1: Review PR #3

### 1.1 Get PR metadata (GitHub MCP)

- Tool: `pull_request_read` with `method: "get"`
- Args: `owner: "rolefinder"`, `repo: "hh"`, `pullNumber: 3`
- Capture: title, body, base/head branches, merge state

### 1.2 List changed files (GitHub MCP)

- Tool: `pull_request_read` with `method: "get_files"`
- Args: same as above
- Output: list of file paths added/modified/deleted

### 1.3 Identify briefs-related files

Filter the file list for content that defines or implements the "agent briefs standard":
- Docs: `*.md`, `AGENTS.md`, `README`, `docs/**`
- Config: `.cursor/**`, `.agents/**`, rules, hooks, commands
- Code: scripts, tools, or modules that create/manage briefs
- Schema/spec: any JSON/YAML defining brief format

---

## Phase 2: Fetch content

### 2.1 Per-file fetch (GitHub MCP)

For each briefs-related file:
- Tool: `get_file_contents`
- Args: `owner: "rolefinder"`, `repo: "hh"`, `path: "<file_path>"`, `ref: "refs/pull/3/head"`
- Store content for mapping into briefs repo

### 2.2 Fallback (local clone)

If using local clone:
```bash
# From repo root
git show pr-3:<path>   # or just read files from working tree
```

---

## Phase 3: Map into briefs repo structure

Target layout in [briefs](c:\Users\harri\Documents\Coding Projects\fun\briefs):

```
briefs/
├── .cursor/
│   ├── agents/        # Brief definitions, agent configs from hh
│   ├── rules/         # Merge/append rules from hh (avoid overwriting core.mdc, python.mdc)
│   ├── hooks/         # Hook scripts if any
│   └── commands/      # Commands if any
├── docs/              # NEW: spec, usage, examples from hh
├── briefs/            # NEW (optional): Python package if hh has code
└── AGENTS.md          # Merge hh's agent docs into existing
```

### 3.1 Mapping rules

| Source (hh PR) | Target (briefs) |
|----------------|-----------------|
| `AGENTS.md`, `README` briefs section | Merge into [AGENTS.md](c:\Users\harri\Documents\Coding Projects\fun\briefs\AGENTS.md) |
| `.cursor/rules/*.mdc` | Copy to [.cursor/rules/](c:\Users\harri\Documents\Coding Projects\fun\briefs\.cursor\rules\) with `hh-` prefix if overlap |
| `.cursor/agents/*` | Copy to [.cursor/agents/](c:\Users\harri\Documents\Coding Projects\fun\briefs\.cursor\agents\) |
| `docs/**` or spec files | Create [docs/](c:\Users\harri\Documents\Coding Projects\fun\briefs\docs\) |
| Python/scripts for briefs | Create `briefs/` package or `scripts/` |

### 3.2 Conflict handling

- Do not overwrite [.cursor/rules/core.mdc](c:\Users\harri\Documents\Coding Projects\fun\briefs\.cursor\rules\core.mdc) or [python.mdc](c:\Users\harri\Documents\Coding Projects\fun\briefs\.cursor\rules\python.mdc) entirely; merge relevant additions
- Preserve briefs-specific context (this repo is the canonical briefs standard)

---

## Phase 4: Document provenance

- Add `docs/sources.md` (or section in README) listing: `rolefinder/hh` PR #3 as source
- Preserve any license/attribution from hh if present

---

## Execution order

1. Resolve GitHub MCP or clone hh locally
2. Run Phase 1 (review PR, list files)
3. Filter to briefs-related files
4. Fetch content (Phase 2)
5. Apply mapping (Phase 3)
6. Add provenance doc (Phase 4)
7. Commit with message: `Pull agent briefs standard from rolefinder/hh#3`
