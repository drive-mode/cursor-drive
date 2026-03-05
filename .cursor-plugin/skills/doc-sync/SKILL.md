---
name: doc-sync
description: Sync reference docs after source code changes. Maps changed src/ files to affected docs and makes minimal targeted updates. Use after editing src/config.ts, src/mcpServer.ts, package.json, or adding new src/ modules.
disable-model-invocation: true
---

# Skill: Doc Sync

Sync affected documentation after source code changes. This skill is explicitly invoked — it does not apply automatically.

## When to use

Invoke `/doc-sync` explicitly after:
- Editing `src/config.ts` (config keys added/removed/renamed)
- Editing `src/mcpServer.ts` (MCP tools added/removed/renamed)
- Editing `package.json` commands or keybindings
- Adding a new `src/*.ts` module
- Satisfying PRD acceptance criteria

## Trigger

Only invoked explicitly with `/doc-sync` in Agent chat.

---

## Protocol

### Step 1: Identify changed files

```bash
git diff --name-only HEAD
```

Or read the user's message for what was changed.

### Step 2: Map changes to docs

| Changed source | Affected docs |
|---|---|
| `src/config.ts` | `docs/reference/config-schema.md` |
| `src/mcpServer.ts` | `docs/reference/mcp-tools.md` |
| `package.json` contributes.commands | `docs/reference/commands-and-shortcuts.md` |
| New `src/*.ts` module | `docs/guides/handoff.md` (module table), `docs/design/architecture/cursor-drive-walkthrough.md` |
| Changed module behavior | `docs/design/architecture/cursor-drive-walkthrough.md` |
| PRD acceptance criteria satisfied | `docs/prd/README.md` completion percentage |
| New plan created | `.cursor/plans/registry.yaml`, `plan-graph.yaml` (use plan-runner.py, not manual edit) |

### Step 3: Read before editing

For each affected doc, read the current content. Understand the format before editing.

### Step 4: Update each doc (minimal diff)

**For `config-schema.md`:**
- Read `src/config.ts`, find the `DriveConfig` interface
- For each new/changed field, add a row to the relevant table
- For removed fields, delete the corresponding row

**For `mcp-tools.md`:**
- Read `src/mcpServer.ts`, find all `this.mcpServer.tool(...)` calls
- For each new tool, add a row with: tool name, parameters, description
- For removed tools, delete the row
- Source format: `| \`tool_name\` | description | parameters table |`

**For `commands-and-shortcuts.md`:**
- Read `package.json` `.contributes.commands`
- Add/remove command rows to match

**For `handoff.md` (new module):**
- Add the module to the module table with: file name, purpose, key exports
- Follow the existing table format

**For `cursor-drive-walkthrough.md` (behavior change):**
- Find the relevant section for the changed module
- Make the minimal edit to reflect the new behavior

### Step 5: Verify

For each doc updated:
- [ ] All file paths in the doc are real
- [ ] All config keys match `src/config.ts` exactly
- [ ] All MCP tool names match `src/mcpServer.ts` exactly
- [ ] No filler language introduced
- [ ] Minimal diff — only what changed

### Step 6: Report

```
Updated docs/reference/config-schema.md: added cursorDrive.promptOptimizer.maxTokens
Updated docs/reference/mcp-tools.md: added drive_optimize_prompt tool
No changes needed for commands-and-shortcuts.md
```

---

## Style constraints (inherit from doc-writer skill)

- No filler language
- Tables over prose
- Every sentence is informational or actionable
- Exact names from source — do not paraphrase config keys or tool names
