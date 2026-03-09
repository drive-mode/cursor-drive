---
planId: mcp_install_link_and_extension_api
planType: task
parentPlanId: cursor-drive
childPlanIds: []
dependsOn: []
todos:
  - id: mcp-install-readme
    content: MCP install link in README
    status: completed
  - id: mcp-ext-api
    content: MCP Extension API registerServer/unregisterServer
    status: completed
isProject: false
---

# MCP install link and Extension API — plan and implementation

## Reconciliation

- **Task 1 (README):** MCP one-click install link added under Installation. Format and base64 config documented.
- **Task 2 (Extension API):** `vscode.cursor.mcp.registerServer` / `unregisterServer` wired in extension.ts; guards for missing API. Uses `actualPort` from mcpServer.
- **Phase gate:** Extension runs; MCP registration works when API present.

**References:**
- [MCP Install Links](https://cursor.com/docs/context/mcp/install-links) — deeplink format and config encoding
- [MCP — Using the Extension API](https://cursor.com/docs/context/mcp#using-the-extension-api)
- [MCP Extension API Reference](https://cursor.com/docs/context/mcp-extension-api)

---

## Task 1: MCP install link in README

### Done

- **Install link format:** `cursor://anysphere.cursor-deeplink/mcp/install?name=$NAME&config=$BASE64_ENCODED_CONFIG`
- **Config encoded:** Full single-server object `{"drive":{"url":"http://127.0.0.1:7891/mcp"}}` → base64 → `eyJkcml2ZSI6eyJ1cmwiOiJodHRwOi8vMTI3LjAuMC4xOjc4OTEvbWNwIn19`
- **README:** Added subsection **MCP one-click install** under Installation (after "Press **F5**…") with:
  - Clickable link to install Drive MCP
  - Copy-paste code block with the full URL
  - Note that the extension must be running so the server is listening on port 7891

### Optional follow-up

- **Deep link in code:** `registerMcpViaDeepLink` in `extension.ts` currently base64-encodes only `{ url: "..." }`. Cursor’s install-links docs use the full object `{ "drive": { "url": "..." } }`. Align the in-app deep link with that so the first-run "Register" flow and the README link write the same config.

---

## Task 2: MCP Extension API — review and implementation

### Review result

- **Current state (before change):** Drive did **not** use the MCP Extension API. The server was exposed only via:
  1. Manual or pluginInstaller merge into `.cursor/mcp.json`
  2. Optional first-run deep link (`registerMcpViaDeepLink`) opening the install URL

- **API:** `vscode.cursor.mcp.registerServer(config)` and `vscode.cursor.mcp.unregisterServer(serverName)` (see [MCP Extension API Reference](https://cursor.com/docs/context/mcp-extension-api)). Config for HTTP: `{ name, server: { url, headers? } }`.

### Implementation (done)

- **Register:** In `extension.ts`, after the MCP server is listening and we have `actualPort`, call `vscode.cursor.mcp.registerServer({ name: "drive", server: { url: \`http://127.0.0.1:${actualPort}/mcp\` } })` when the API exists. Use `actualPort` (not fixed 7891) so fallback ports work.
- **Unregister:** In `deactivate()`, call `vscode.cursor.mcp.unregisterServer("drive")` if we registered in this session. Track with module-level `mcpRegisteredByExtensionApi`.
- **Guards:** Check `(vscode as any).cursor?.mcp?.registerServer` / `unregisterServer` before calling so the extension runs in environments where the API is absent (e.g. plain VS Code).

### Design choice

- **Hybrid:** Keep existing mcp.json merge in pluginInstaller and the deep link flow. Programmatic registration runs when the API is present and gives immediate MCP without editing files; mcp.json and install link remain for other clients and for when the extension is not loaded.

### Gotchas

- Port: always use `actualPort` from `mcpServer.getPort()`.
- API may be undefined in some builds; no-op when missing.
