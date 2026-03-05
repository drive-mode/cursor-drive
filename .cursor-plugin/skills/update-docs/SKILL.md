---
name: update-docs
description: Update documentation after source code changes. Scans changed files, identifies doc impact, updates affected docs and regenerates reference docs.
disable-model-invocation: true
---

You are updating the Cursor Drive documentation to reflect recent source code changes.

## Steps

1. **Identify changed files** — use `git diff --name-only HEAD` or read recent edit history to find which `src/` files changed.

2. **Map changes to docs** using this table:

| Changed source | Affected docs |
|---|---|
| `src/config.ts` or `package.json` configuration | `docs/reference/config-schema.md` |
| `src/mcpServer.ts` tool registrations | `docs/reference/mcp-tools.md` |
| `package.json` commands or keybindings | `docs/reference/commands-and-shortcuts.md` |
| New `src/*.ts` module | `docs/guides/handoff.md` module table, `docs/design/architecture/cursor-drive-walkthrough.md` |
| Changed module behavior | `docs/design/architecture/cursor-drive-walkthrough.md` relevant section |
| PRD acceptance criteria satisfied | `docs/prd/README.md` completion percentage |
| New plan created | `.cursor/plans/registry.yaml`, `plan-graph.yaml` |

3. **Read the affected doc** before editing — understand current content first.

4. **Update each affected doc** with minimal changes:
   - Add new config entries to the relevant table in `config-schema.md`
   - Add new MCP tools to `mcp-tools.md` following the existing format
   - Update module table in `handoff.md` for new `src/` files
   - Never rewrite a doc wholesale — make targeted edits

5. **Check for stale references** in updated files:
   - File paths that no longer exist
   - Module names that were renamed
   - Config keys that were removed or renamed

6. **Summarize** what was updated: "Updated `config-schema.md` (added 2 new TTS settings), `handoff.md` (added promptOptimizer module)."

## Style rules

- No filler language ("This document...", "As mentioned above...")
- Every sentence must be informational or actionable
- Tables over prose for parameter lists
- Consistent formatting with the existing doc style
