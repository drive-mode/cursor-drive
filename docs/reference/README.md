# Reference Documentation

Lookup tables generated from source. When source changes, update these docs.

## Files

| File | Source | What it covers |
|---|---|---|
| [config-schema.md](config-schema.md) | `src/config.ts`, `package.json` | All `cursorDrive.*` settings with types, defaults, constraints |
| [mcp-tools.md](mcp-tools.md) | `src/mcpServer.ts` | Operator and Agent Screen (S-AS) tools, TTS, drive mode — parameters and return values |
| [commands-and-shortcuts.md](commands-and-shortcuts.md) | `package.json` | All VS Code commands, keybindings, and their behavior |
| [mcp-user-setup.md](mcp-user-setup.md) | — | User-level MCP (e.g. GitHub) without wrapper; .env at `C:\Users\harri\.env\` |

**Operator and Agent Screen (S-AS) tools** → [mcp-tools.md](mcp-tools.md).

Example user-level MCP fragment: [mcp-user-github-example.json](mcp-user-github-example.json) (merge into `%USERPROFILE%\.cursor\mcp.json`).

## Maintenance

These files are generated from source. When you change:
- `src/config.ts` or `package.json` configuration properties → update `config-schema.md`
- `src/mcpServer.ts` tool registrations → update `mcp-tools.md`
- `package.json` commands or keybindings → update `commands-and-shortcuts.md`

Use `/update-docs` command to get AI help updating these docs after source changes.
