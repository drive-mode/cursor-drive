---
name: doc-review
description: Scan docs/ for staleness, broken references, and AI slop. Report issues and optionally fix them.
disable-model-invocation: true
---

# Doc Review

Slash-command checklist for doc quality. Invoke explicitly with `/doc-review`. For the full review protocol (file inventory, severity classification, anti-patterns), use the **doc-reviewer** skill.

## When to use

- User runs `/doc-review`
- Quick scan for stale refs, broken links, and AI slop without the full doc-reviewer protocol

## What to check

### 1. Stale file references

Search `docs/` for paths that no longer exist:
- Files in `src/` that are referenced but deleted
- Plan files referenced that no longer exist in `.cursor/plans/`
- Config keys referenced that no longer exist in `src/config.ts`

```bash
# Find all file path references in docs/
rg --glob "*.md" "\`[^`]+\.(ts|py|md|json|yaml)\`" docs/
```

For each match, verify the referenced file exists. Flag if not.

### 2. Broken internal links

Check markdown links `[text](path)` in docs/ to ensure targets exist.

### 3. Stale content markers

Flag any content that references:
- "Discord bot", "hh-core", "Python backend" — this project has none
- "participant.ts" — this file was removed
- `src/hh/` paths — this directory doesn't exist
- `extension/` prefix for source files — the extension IS the root

### 4. AI slop patterns

Flag sentences matching these patterns:
- "This document provides..." / "This guide aims to..."
- "As we can see..." / "As mentioned above..."
- "It is important to note that..."
- "In conclusion..." / "To summarize..."
- Paragraphs that only restate the heading
- Redundant "first we do X, then we do X" patterns

### 5. Reference doc sync

Check if reference docs are in sync with source:
- `docs/reference/config-schema.md` vs `src/config.ts` — are all settings listed?
- `docs/reference/mcp-tools.md` vs `src/mcpServer.ts` — are all tools listed?
- `docs/reference/commands-and-shortcuts.md` vs `package.json` — are all commands listed?

## Output format

Report issues in this format:

```
STALE: docs/some/doc.md:42 — references `src/hh/` or deleted path
SLOP: docs/prd/prd-voice-io.md:45 — "It is important to note that filler words..."
OUT_OF_SYNC: docs/reference/config-schema.md — missing cursorDrive.blame.enabled (exists in src/config.ts)
```

Then ask: "Fix all issues? (Y/N/select)"

## Fix protocol

When fixing:
- STALE: remove the stale reference or update to correct path
- SLOP: rewrite the sentence to be direct and informational
- OUT_OF_SYNC: add the missing entry following the existing table format
