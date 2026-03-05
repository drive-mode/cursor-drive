# Cursor Drive Plugin

This repository ships both:

- the **Cursor Drive extension** (VSIX runtime: UI, MCP server, commands), and
- the **Drive plugin assets** for Cursor workspaces (`agents/`, `rules/`, `commands/`, hooks, MCP config).

## Fast install in a workspace

1. Install the extension VSIX.
2. Open your target project folder in Cursor.
3. Run command: **Drive: Install Drive Plugin to Workspace**.

The command installs/updates:

- `.cursor/agents/*`
- `.cursor/rules/*`
- `.cursor/commands/*`
- `.cursor/mcp.json` (merged with existing servers)
- `.cursor/hooks/drive-preprocessor.py`
- `.cursor/hooks.json` (Drive hook registration merged)

## Manual install fallback

Copy these repository paths into your workspace `.cursor/` folder:

- `agents/` -> `.cursor/agents/`
- `rules/` -> `.cursor/rules/`
- `commands/` -> `.cursor/commands/`
- `mcp.json` -> `.cursor/mcp.json` (merge `mcpServers.drive` entry)
- `.cursor/hooks/drive-preprocessor.py` -> `.cursor/hooks/drive-preprocessor.py`

Then ensure `.cursor/hooks.json` has:

```json
{
  "hooks": {
    "beforeSubmitPrompt": [
      { "command": ".cursor/hooks/drive-preprocessor.py beforeSubmitPrompt" }
    ]
  }
}
```

## Verify

- Run **Drive: Diagnose Drive APIs**
- Confirm MCP health endpoint: `http://127.0.0.1:7891/health`
- Trigger **Drive: Show Share Screen**
