# cursor-drive Cursor Plugin

This directory contains the distributable Cursor plugin manifest for cursor-drive.

## Structure

The Cursor plugin format requires all components (skills, rules, commands, hooks, agents) to live under the plugin root with relative paths (no `..`). The canonical source for these components is `.cursor/` in the project root.

For local development, `.cursor/` is live and used directly by Cursor. This `.cursor-plugin/` directory is for marketplace distribution.

## Component status

| Component | Source | Plugin path | Status |
|-----------|--------|-------------|--------|
| agents | `.cursor/agents/` | `agents/` | Synced |
| skills | `.cursor/skills/` | `skills/` | Needs copy |
| rules | `.cursor/rules/` | `rules/` | Needs copy |
| commands | `.cursor/commands/` | `commands/` | Needs copy |
| hooks | `.cursor/hooks/` + `.cursor/hooks.json` | `hooks/` | Needs copy |

## Agents (synced)

The following agents are already in `agents/` (copied from `.cursor/agents/`):

- `plan-orchestrator.md` — multi-phase plan execution orchestrator
- `verifier.md` — skeptical validator for completed work
- `plan-governor.md` — plan sync, dep audit, gate error reporting

**Keep these in sync** with `.cursor/agents/` when updated.

## Distribution setup

To prepare a full distributable plugin, run from the repo root:

```bash
npm run build:plugin
```

This copies agents, commands, rules, skills, and hooks from `.cursor/` to `.cursor-plugin/`, filters hooks to user-facing (drive-preprocessor only), adds `.mcp.json` and `assets/logo.svg`, and removes `__pycache__`. Run before marketplace submission and commit the result.

## Note on split components

Some components in `.cursor/` are development-workflow tools (plan-*, doc-*, dep-auditor) rather than user-facing features. When submitting to the marketplace, consider filtering to user-facing components only (drive-persona skill, drive-modes/drive-concise rules, verifier agent).
