---
name: Drive MCP app vs extension
overview: Clarify whether Drive needs to be an extension when "creating Drive as an MCP app," and give the minimal path to start testing ASAP.
todos: []
isProject: false
---

# Drive as MCP App vs Extension — Do We Need the Extension?

## Short answer

**Yes, you need the extension** for the current Drive experience. "Drive as an MCP app" in Cursor 2.6 terms means: the **existing** Drive MCP server (which runs inside the extension) exposes MCP App UI (e.g. `ui://cursor-drive/agent-screen`) so tool results render inline in chat. That is already implemented. No second "MCP app" product is required to test.

To **test ASAP**: install the extension, turn on Drive, register the MCP server (deep link or `.cursor/mcp.json` with the port from Output → Drive), then in Cursor 2.6+ ask the agent to call `agent_screen_activity` (or similar) and confirm inline UI. See [docs/guides/demo-mcp-apps.md](docs/guides/demo-mcp-apps.md).

---

## Product intent: Drive button + listening mic (wake word)

The extension is what gives the user the **Drive mode button** (status bar / toggle) and the **mic that listens while Drive is on** but only activates on the **wake word**. Those are Cursor/VS Code UI and lifecycle features; only the extension can provide them. So we keep the extension and keep working with the current architecture.

---

## Why the extension is required

The Drive MCP server is **in-process** and **stateful**. It is created and started in [src/extension.ts](src/extension.ts) and receives from the extension:

- `driveMgr` (DriveModeManager) — mode and activation state
- `operatorRegistry` — active operators and spawn/dismiss
- `sessionMemory` — workspace-scoped memory
- `persistentMemory`, `stateSyncCoordinator`, `integrationQueue` — optional but used by tools
- `getEnableApps` — reads `cursorDrive.mcp.enableApps` from VS Code config

So the server is a **consumer of extension-owned state**. It does not run as a separate process that Cursor starts via `mcp.json` with `command`/`args`. The extension:

1. Creates and owns all managers (DriveModeManager, OperatorRegistry, SessionMemory, etc.).
2. Starts the HTTP MCP server on localhost (with port fallback).
3. Registers commands, status bar, Agent Screen panel, `beforeSubmitPrompt` hook, voice, etc.

If you removed the extension and tried to run "Drive" as a standalone MCP server (e.g. `npx cursor-drive-mcp` in `mcp.json`), you would have to:

- Run that process yourself (or have Cursor spawn it).
- Recreate or stub DriveModeManager, OperatorRegistry, SessionMemory, etc., inside that process — with no access to Cursor’s UI, workspace state, or prompt pipeline.
- Lose: Drive mode toggle, status bar, Agent Screen panel, prompt interception, TTS, keybindings, and any tool that depends on Cursor APIs.

That would be a **different, minimal product** (tools-only, no Cursor integration), not a drop-in replacement for the current extension.

---

## Terminology


| Term                      | Meaning in this codebase                                                                                                                                                                      |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **MCP server**            | The HTTP server (`DriveMcpServer`) that exposes tools (e.g. `agent_screen_activity`). It runs **inside** the extension process.                                                               |
| **MCP App (Cursor 2.6)**  | Tool results that include `_meta.ui.resourceUri` (e.g. `ui://cursor-drive/agent-screen`) so the host can render inline UI. Drive already does this when `cursorDrive.mcp.enableApps` is true. |
| **"Drive as an MCP app"** | Same as above: the existing extension’s MCP server **is** an MCP app when enableApps is on. No separate app package is required.                                                              |


So: **Drive is already an MCP app** (extension + in-process MCP server with MCP Apps support). You do not need to "make it an extension" separately — it is the extension that embeds the MCP server.

---

## What you need to do to test ASAP

No code or architecture change is required. Use the current setup:

1. **Build and install the extension**
  - `npm run compile` then install the VSIX (Extensions → Install from VSIX) or use the marketplace if published.
2. **Start the MCP server**
  - Turn on Drive (e.g. Toggle Drive Mode or `Ctrl+Shift+D`).
  - In **Output → Drive** confirm: `MCP server: listening on port N`.
3. **Register the MCP server in Cursor**
  - **Option A:** Use the deep link from the output (or any Cursor prompt to add the server); the URL will use the actual port (including fallback).
  - **Option B:** In the workspace, add to `.cursor/mcp.json`:
  `"cursor-drive": { "url": "http://127.0.0.1:N/mcp" }` with `N` = port from step 2. Then reload MCP or restart Cursor.
4. **Confirm MCP Apps**
  - Settings: `cursorDrive.mcp.enableApps` is true by default.
  - Cursor 2.6+: open Agent chat, ask the agent to call `agent_screen_activity` (or show Agent Screen).
  - You should see the inline MCP App UI in the reply.
5. **Optional**
  - Run **Drive: Diagnose** to confirm MCP server port and other APIs.

If something in this flow fails (e.g. port, registration, or inline UI not showing), the next step is to fix that specific issue rather than changing to a standalone MCP-only build.

---

## Optional: standalone MCP-only build (not for ASAP testing)

If later you want a **separate** distributable that is only an MCP server (no extension), for example for non-Cursor hosts or minimal "tools only" use:

- Add a CLI entrypoint (e.g. `bin/drive-mcp-standalone.js`) that:
  - Creates minimal or stub implementations of DriveModeManager, OperatorRegistry, SessionMemory, etc. (no VS Code APIs).
  - Instantiates `DriveMcpServer` with those and a config (port, enableApps).
  - Listens and stays running.
- Users would add to `mcp.json`: `"command": "node", "args": ["path/to/bin/drive-mcp-standalone.js"]` (or `npx`).
- That gives you a tools-only server: no Drive mode, no Agent Screen panel, no prompt hooks. It is a larger, separate effort and not required to begin testing the current MCP Apps flow.

---

## Summary

- **Do we need the extension?** Yes, for the full Drive experience. The MCP server is part of the extension and depends on it.
- **Is Drive already an MCP app?** Yes — the in-extension MCP server supports MCP Apps (inline UI) when `enableApps` is true.
- **What to do to test ASAP:** Install the extension, start Drive, register MCP (deep link or mcp.json with actual port), use Cursor 2.6+ and trigger `agent_screen_`* tools; no architectural change needed.
