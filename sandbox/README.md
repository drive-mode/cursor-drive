# sandbox

Minimal workspace for live-testing the Cursor Drive extension.

## Quick start

1. Run the setup script once (creates `sandbox/.cursor/` with junctions to repo `.cursor/` subdirs and a **sandbox-specific** `mcp.json` so Drive uses port **7892** — no conflict with main Cursor on 7891):

   ```powershell
   # From the repo root:
   .\sandbox\setup-drive-dev.ps1
   ```

2. Press **F5** in Cursor (with the repo open) to launch the Extension Development Host.
   - Select **"Dev: Drive in sandbox"** from the Run menu.
   - A new Cursor window opens with this folder as the workspace and Drive loaded.

3. Follow the smoke-test prompts in **[docs/guides/live-testing.md](../docs/guides/live-testing.md)**.

### Check MCP health (PowerShell)

To verify the Drive MCP server is running **without** the script-execution prompt that `curl` triggers in PowerShell:

```powershell
.\sandbox\check-mcp-health.ps1
```

Or one line (sandbox port 7892):

```powershell
Invoke-WebRequest -Uri http://127.0.0.1:7892/health -UseBasicParsing
```

## Dev-loop (compile → package → install)

For serve-web or packaged-extension testing:

```bash
npm run dev-loop              # compile, package, install
npm run dev-loop:serve        # same + start cursor serve-web
```

### Port selection (MCP / S-AS)

The MCP server (used by Drive and S-AS) defaults to port **7891**. Port selection is automated:

- **Auto-select**: If 7891 is in use, the next free port (7892, 7893, …) is used.
- **Override**: Set `DRIVE_MCP_PORT` to choose a port explicitly.

The dev-loop updates `sandbox/.vscode/settings.json` and `.cursor/mcp.json` so the extension and MCP client use the same port.

| Shell      | Override example                          |
|-----------|--------------------------------------------|
| PowerShell| `$env:DRIVE_MCP_PORT=7892; npm run dev-loop` |
| Cmd       | `set DRIVE_MCP_PORT=7892 && npm run dev-loop` |
| Bash      | `DRIVE_MCP_PORT=7892 npm run dev-loop`     |

For serve-web: `SERVE_WEB_PORT` (default 8000). See `sandbox/dev-env.example`.

## Without running setup-drive-dev.ps1

The `.cursor/mcp.json` stub in this folder is enough to point the MCP server.
Custom skills, commands, and hooks will **not** load — they only resolve when the
`.cursor/` directory is the full repo `.cursor/` (via junction).

To test hooks and the drive-persona skill without the script, use the
**"Dev: Drive in repo root"** launch configuration instead.

## Troubleshooting

### "Cannot find module '...cursor-socket\out\main'"

Cursor's built-in extension `anysphere.cursor-socket` is broken or missing on your install. The launch configs **disable** this extension so the dev host can start. To fix Cursor itself: reinstall or repair Cursor from [cursor.com](https://cursor.com). After that you can remove `--disable-extension=anysphere.cursor-socket` from `.vscode/launch.json` if you want.

### "EADDRINUSE: address already in use 127.0.0.1:7891"

Port **7891** is already in use — often by another Cursor window that has Drive loaded (e.g. your main window). Cursor's MCP client then fails with "Error POSTing to endpoint" / "SSE error: Non-200 status code (500)" because it's talking to the wrong process or nothing is responding correctly.

**Option A — Free 7891 (simplest)**
- Close any other Cursor window that has the Drive extension (or that's running the Extension Development Host).
- Or find what's using the port:
  ```powershell
  Get-NetTCPConnection -LocalPort 7891 -ErrorAction SilentlyContinue | Select-Object OwningProcess
  ```
  Then close that process or that Cursor window.

**Option B — Use a different port for the sandbox**
1. In **sandbox/.vscode/settings.json**, set `"cursorDrive.mcp.port": 7892` (or another free port).
2. In **.cursor/mcp.json** (repo root), set the Drive server URL to that port: `"url": "http://127.0.0.1:7892/mcp"`.
3. Reload the Extension Development Host (or restart the sandbox window).

Then only the sandbox Drive instance runs on 7892. Keep the main Cursor window closed or without Drive when testing the sandbox, or it will still bind 7891 and you can use 7892 only for the sandbox.
