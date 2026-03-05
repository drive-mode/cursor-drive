# User-level MCP setup (no wrapper)

How to run MCP servers (e.g. GitHub) from your **user** config using a shared `.env` in `C:\Users\harri\.env\`. No wrapper script.

---

## 1. User-level config location

- **Windows:** `%USERPROFILE%\.cursor\mcp.json` (e.g. `C:\Users\harri\.cursor\mcp.json`).
- This applies to all workspaces. Workspace `.cursor/mcp.json` is separate and can coexist.

---

## 2. GitHub MCP without wrapper

Use `command` + `args` + `env`; do **not** use `python .cursor/mcp_wrapper.py ...`.

Example **user** `mcp.json` (only the servers you want at user level):

```json
{
  "mcpServers": {
    "user-github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "<paste from your .env file>"
      }
    }
  }
}
```

Replace `<paste from .env...>` with your token. Manually copy values from your `.env` file into the `env` object.

---

## 3. Shared .env in `C:\Users\harri\.env\`

Cursor does **not** load `.env` files automatically. To use a single file for secrets:

1. Create the directory: `C:\Users\harri\.env\`
2. Copy the repo’s `.env.example` there as `.env`:
   `C:\Users\harri\.env\.env`
3. Edit `C:\Users\harri\.env\.env` and set at least:
   - `GITHUB_PERSONAL_ACCESS_TOKEN=<your-token>`
4. Put those same values into the `env` object of your user `mcp.json` (see §2).

So: **user-level `.cursor` “uses” the file by you copying values from `C:\Users\harri\.env\.env` into `mcp.json`’s `env`.** Cursor does not read that path by itself.

---

## 4. Restart

After editing user `mcp.json`, fully restart Cursor (quit the app, then open again) so the MCP client picks up the new config.
