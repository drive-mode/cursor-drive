# Cursor Drive (plugin)

AI pair-programming **persona and operator skills** for Cursor. Install from the marketplace — no extension required for core behavior.

## Install

1. Install **cursor-drive** from the Cursor plugin marketplace.
2. Open Agent chat and work as usual — Drive rules and the `drive-persona` skill apply.
3. Optional slash skills: `/tangent`, `/switch`, `/merge`.

### Local install (dev)

```bash
npm run build:plugin
# Copy or link this directory to:
#   ~/.cursor/plugins/local/cursor-drive
```

On Windows: `%USERPROFILE%\.cursor\plugins\local\cursor-drive`.

## What works offline (no VSIX)

- Persona + policy / mode / routing rules
- `drive-preprocessor` hook (filler / mode / tangent hints)
- Commands and skills as chat guidance

## Full UI (optional VSIX)

Agent Screen, TTS, status bar, and the live MCP server (`127.0.0.1:7891`) ship in the **VSIX companion** from this repo (`vsce package` / CI artifact). After installing the VSIX:

1. Toggle Drive mode.
2. Confirm MCP in **Output → Drive** (port may fall back from 7891).
3. Keep `cursorDrive.mcp.enableApps` enabled for inline Agent Screen in chat (Cursor 2.6+).

This plugin intentionally **does not** ship a required `.mcp.json`, so install never fails when the extension is absent.

## Components (marketplace allowlist)

| Kind | Entries |
|------|---------|
| Skills | `drive-persona`, `tangent`, `switch`, `merge`, `drive-modes`, `drive-concise` |
| Rules | `policy-pack`, `operator-hierarchy`, `tiered-model-routing`, `drive-modes` |
| Agents | `drive-operator`, `drive-reviewer`, `verifier` |
| Commands | `tangent`, `switch`, `merge` |
| Hooks | `drive-preprocessor` only |

Rebuild from repo root: `npm run build:plugin` (fails if allowlisted paths are missing).

## Advanced

Architecture and ADRs live in the repository `docs/` tree — not required for everyday use.
