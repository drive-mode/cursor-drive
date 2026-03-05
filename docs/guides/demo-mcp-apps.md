# Demo: MCP Apps (self-hosted)

Self-hosted walkthrough for Cursor Drive with MCP Apps: everything runs on your machine; no cloud or external services.

---

## Self-hosted model

| Component | Where it runs |
|-----------|----------------|
| Cursor Drive extension | In-process in Cursor |
| Drive MCP server | In-process; HTTP on `127.0.0.1` |
| MCP client | Cursor built-in |
| MCP App UI (agent_screen_*) | Inline in Cursor chat (Cursor 2.6+) |

No data is sent to Drive backends. The only network is localhost: Cursor talks to the Drive MCP server over HTTP on a configurable port.

---

## Ports and networking

- **Preferred port:** `cursorDrive.mcp.port` (default `7891`). Only Cursor on this machine needs to reach it.
- **If the port is in use:** Drive tries the next ports (e.g. 7892, 7893, … up to 15 attempts). The **actual** port is logged in **Output → Drive**.
- **Manual MCP config:** Use the actual port in `.cursor/mcp.json` (see below). If you use the deep link to register MCP, the correct URL (with actual port) is applied for you.
- **Firewall:** Binding is `127.0.0.1` only; no LAN exposure unless you change the code.

---

## Defaults (after install)

Out-of-the-box defaults are set for a smooth demo:

| Setting | Default | Purpose |
|---------|---------|---------|
| `cursorDrive.mcp.enableApps` | `true` | Agent_screen_* tools return `ui://` for inline MCP App UI |
| `cursorDrive.agentScreen.autoOpen` | `true` | Agent Screen opens when Drive activates |
| `cursorDrive.mcp.port` | `7891` | Preferred port (with auto fallback) |

You can change these in Cursor Settings (search for “Cursor Drive” or “cursorDrive”).

---

**Workspace defaults:** To lock demo settings in a repo, add to `.vscode/settings.json`:
`cursorDrive.mcp.enableApps: true`, `cursorDrive.agentScreen.autoOpen: true`, `cursorDrive.mcp.port: 7891`.

---

## Demo walkthrough

### 1. Install the extension

- From VSIX: **Extensions → … → Install from VSIX** and select the built `.vsix`.
- Or install from the marketplace if published.

Reload Cursor if prompted. You get a **Drive mode button** in the status bar (and **Toggle Drive Mode** in the command palette). With Drive on, the mic listens but only activates on the **wake word** (or use **Activate Voice Input** / `Ctrl+Shift+M` to open chat and start speaking).

### 2. Register the Drive MCP server

**Option A — Deep link (recommended)**
- Turn on Drive (e.g. **Toggle Drive Mode** or `Ctrl+Shift+D` / `Cmd+Shift+D`).
- When the MCP server starts, Cursor may show a prompt to add the server; accept it.
- Or open the link shown in **Output → Drive** (e.g. `http://127.0.0.1:7891/mcp`). That registers the server with the **actual** port (including fallback).

**Option B — Manual**
- Open **Output → Drive** and note the line: `MCP server: listening on port N`.
- In the workspace, edit `.cursor/mcp.json` (create if missing) and add:

```json
{
  "mcpServers": {
    "cursor-drive": {
      "url": "http://127.0.0.1:N/mcp"
    }
  }
}
```

Replace `N` with the port from the output (e.g. `7891` or `7892` if fallback was used).
- Restart Cursor or run **Reload MCP Client** so Cursor picks up the server.

### 3. Confirm MCP Apps are enabled

- In Cursor Settings, search for **Cursor Drive** or `cursorDrive.mcp.enableApps`.
- Default is **true**; leave it on for inline MCP App UI.

### 4. Run the demo (Cursor 2.6+)

1. Enable Drive and open the Agent (Composer) view.
2. In chat, ask the agent to use the Agent Screen, e.g.:
   *“Call agent_screen_activity and log a short status so I can see the MCP App.”*
3. When the agent calls `agent_screen_activity` (or `agent_screen_file` / `agent_screen_decision`), the tool result includes an MCP App reference.
4. In Cursor 2.6+, the reply should show the **inline MCP App** (Activity / Files / Decisions) in the chat.

If you don’t see the inline UI, confirm Cursor version is 2.6+ and that **cursorDrive.mcp.enableApps** is `true`. Check **Output → Drive** for errors.

### 5. Optional: Agent Screen panel

- **View → Agent Screen** (or `Ctrl+Shift+S` / `Cmd+Shift+S`) shows the same activity in a panel.
- With `cursorDrive.agentScreen.autoOpen` defaulting to `true`, the panel opens when Drive activates.

---

## Troubleshooting

| Issue | What to check |
|-------|----------------|
| MCP server not listed | Output → Drive for “listening on port N”; use that port in `.cursor/mcp.json` or the deep link. |
| Port in use | Drive tries 7891–7905; output shows “fallback from 7891”. Use the port shown. |
| No inline MCP App in chat | Cursor 2.6+; `cursorDrive.mcp.enableApps` = true; agent actually called an agent_screen_* tool. |
| Wrong port in mcp.json | After changing port or fallback, update `url` to `http://127.0.0.1:<actualPort>/mcp` and reload MCP. |
