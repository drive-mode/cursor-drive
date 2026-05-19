---
name: Fix invalid hooks.json
overview: Fix hooks.json configuration so Cursor can load plugins and hooks. The JSON parses correctly, but Cursor's documented schema does not include the `description` field, which may cause strict validation to fail. Additionally, Windows Python invocation may need adjustment.
todos: []
isProject: false
---

# Fix Invalid hooks.json

## Findings

- **JSON validity**: Both [`.cursor/hooks.json`](.cursor/hooks.json) and [`.cursor-plugin/hooks/hooks.json`](.cursor-plugin/hooks/hooks.json) parse as valid JSON.
- **Schema mismatch**: Cursor's [official hooks docs](https://cursor.com/docs/agent/hooks) only document `command`, `timeout`, `matcher`, `type`, `prompt`, and `model` for hook entries. The `description` field is not in the schema and may cause strict validation to reject the config.
- **Event names**: All events (`beforeSubmitPrompt`, `sessionStart`, `stop`, `subagentStop`) are valid per Cursor docs.
- **Windows note**: A known regression affects hooks on Windows (Cursor 2.1.25+). If hooks still fail after schema fixes, check Cursor Settings → Output → "Hooks" for execution logs.

## Changes

### 1. Remove `description` from both hooks.json files

Remove the undocumented `description` field from every hook entry in:

- [`.cursor/hooks.json`](.cursor/hooks.json) — 5 entries
- [`.cursor-plugin/hooks/hooks.json`](.cursor-plugin/hooks/hooks.json) — 1 entry

**Before:**
```json
{
  "command": "python .cursor/hooks/drive-preprocessor.py beforeSubmitPrompt",
  "description": "Drive voice/tangent/role preprocessing — adds context hints for operators"
}
```

**After:**
```json
{
  "command": "python .cursor/hooks/drive-preprocessor.py beforeSubmitPrompt"
}
```

### 2. (Optional) Windows Python compatibility

If hooks still fail after the schema fix, try using the Python launcher on Windows:

- Change `python` to `py` in commands — `py` is the Python launcher on Windows and is more reliable when multiple Python versions exist.
- **Risk**: `py` may not exist on macOS/Linux. If you need cross-platform support, keep `python` and ensure Python is in PATH on Windows.

Recommendation: Apply the schema fix first; only change to `py` if you confirm the failure is Python-related (e.g., from the Hooks output panel).

### 3. Align pluginInstaller with workspace hooks

[`src/pluginInstaller.ts`](src/pluginInstaller.ts) uses `DRIVE_HOOK_COMMAND = ".cursor/hooks/drive-preprocessor.py beforeSubmitPrompt"` (no `python` prefix). The workspace hooks use `python .cursor/hooks/...`. The installer merges hooks and will add its command if the drive hook is missing; it does not overwrite existing entries. No change needed unless you want the installer to add the `python` prefix when it injects the drive hook.

## Summary

| File | Action |
|------|--------|
| `.cursor/hooks.json` | Remove `description` from all 5 hook entries |
| `.cursor-plugin/hooks/hooks.json` | Remove `description` from the 1 hook entry |

This brings the config in line with Cursor's documented schema and should resolve "could not be loaded" errors caused by strict validation.
