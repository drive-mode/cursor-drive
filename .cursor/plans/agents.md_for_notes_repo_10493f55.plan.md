---
name: AGENTS.md for notes repo
overview: Create a single AGENTS.md entry point that teaches agents how to use the Roler second brain vault, applying prompt/context engineering to avoid redundancy and context overload.
todos: []
isProject: false
---

# AGENTS.md for Roler Notes Repo

## Goal

One canonical agent entry point that replaces scattered guidance across README, rules, commands, and skills. Design principles: layered disclosure, decision-tree routing, hard constraints first, no duplication of existing docs.

## Structure (6 sections)

### 1. Hard rules (top, unmissable)

- Never edit vault content files directly; all writes via `scripts/`
- No agent-generated DataviewJS/Templater in templates
- One note per operation; no concurrent MOC edits
- `99_System/` is read-only

### 2. Folder map

Table: folder → stage → purpose. Flow: 00 → 10 → 20 → 30 (capture → source → knowledge → index). Reference [99_System/VAULT_LAYOUT.md](99_System/VAULT_LAYOUT.md) for full details.

### 3. Intent routing

Table mapping user phrases to actions:
- "capture" / "save" → classify and route (fleeting/doc/permanent)
- "create note" / "permanent note" → `create_note.py`
- "update MOC" / "add to structure" → transclusion only
- "research X" → search → synthesize → optionally capture

### 4. Scripts reference

Table: script name, purpose, key args. Include `create_note.py`, `obsidian_cli.py`, `validate_schema.py`, `validate_links.py`, `guard_shell.py`. Note `NOTE_VAULT_PATH` env.

### 5. Schema (minimal)

Only fields agents must not break: `note_id`, `note_type`, claim block format, file naming, tags. Point to [99_System/note-schema.md](99_System/note-schema.md) and [99_System/categories.md](99_System/categories.md) for full spec.

### 6. Subagent + anti-patterns

- Use `model: fast` for note-taker/obsidian subagent
- Don't invent frontmatter, don't copy claims into MOCs, don't run `obsidian eval`

## File to create

- [AGENTS.md](AGENTS.md) at repo root (~80 lines, scannable)

## Out of scope (this plan)

- No changes to README, rules, commands, or skill files
- Those can be slimmed later to reference AGENTS.md instead of duplicating
