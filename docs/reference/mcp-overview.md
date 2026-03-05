# MCP Overview — Cursor Drive

How Cursor Drive implements the [Model Context Protocol (MCP)](https://modelcontextprotocol.io/introduction). Maps our setup to the standard MCP concepts.

---

## What is MCP?

MCP lets Cursor connect to external tools, data sources, and services. An MCP server exposes **tools**, **resources**, **prompts**, and **apps** that Cursor's Agent can use during conversations.

---

## Core concepts — what Drive exposes

| Capability | Drive implementation |
|------------|----------------------|
| **Tools** | 40+ tools: TTS, Agent Screen, operators, pipeline, persistence, Cursor CLI, sync, connectors. See [mcp-tools.md](mcp-tools.md). |
| **Resources** | One MCP App resource: `ui://cursor-drive/agent-screen` (activity feed UI). |
| **Prompts** | None. |
| **Apps** | Yes. When `cursorDrive.mcp.enableApps` is true, `agent_screen_activity`, `agent_screen_file`, and `agent_screen_decision` return `_meta.ui.resourceUri` for inline UI in chat. |

---

## Transport

| Transport | Use case | Drive |
|-----------|----------|-------|
| **stdio** | Local server, single user | No |
| **SSE** | Remote server, OAuth | No |
| **Streamable HTTP** | Remote server, OAuth | **Yes** — Drive uses Streamable HTTP |

Drive's MCP server runs inside the VS Code extension host. It binds to `127.0.0.1` and uses `StreamableHTTPServerTransport` from `@modelcontextprotocol/sdk`. Cursor connects via `url: "http://127.0.0.1:7891/mcp"` — the port may be 7892, 7893, etc. if 7891 is in use.

---

## Connecting your server to Cursor

### Config locations

| Location | Scope |
|----------|-------|
| `.cursor/mcp.json` | Project-specific (commit to git for team sharing) |
| `~/.cursor/mcp.json` | Global |

### Drive MCP config

```json
{
  "mcpServers": {
    "drive": {
      "url": "http://127.0.0.1:7891/mcp"
    }
  }
}
```

### Registration methods

1. **Programmatic (Extension API)** — When the extension activates and the API exists, Drive calls `vscode.cursor.mcp.registerServer({ name: "drive", server: { url: "http://127.0.0.1:${port}/mcp" } })`. No mcp.json edit needed.
2. **Plugin installer** — `Drive: Install Drive Plugin to Workspace` merges the Drive server into `.cursor/mcp.json`.
3. **MCP install deeplink** — [README](../../README.md#installation) includes a one-click link. First-run prompt also offers a deep link.
4. **Manual** — Add the config above to `.cursor/mcp.json` or `~/.cursor/mcp.json`.

---

## Config interpolation

Cursor supports variable interpolation in `mcp.json`:

| Variable | Description |
|----------|-------------|
| `${env:NAME}` | Environment variable |
| `${workspaceFolder}` | Project root |
| `${userHome}` | Home directory |
| `${pathSeparator}` or `${/}` | OS path separator |

Drive's config does not use interpolation (no secrets). For other MCP servers you add, use `${env:API_KEY}` etc. to avoid hardcoding.

---

## MCP Apps (interactive UI in chat)

When `cursorDrive.mcp.enableApps` is `true` (default), these tools return interactive UI:

| Tool | Returns `_meta.ui` |
|------|--------------------|
| `agent_screen_activity` | Yes |
| `agent_screen_file` | Yes |
| `agent_screen_decision` | Yes |

The UI resource `ui://cursor-drive/agent-screen` is an activity feed. Requires Cursor 2.6+ (or another host that supports MCP Apps). Progressive enhancement: if the host cannot render Apps, tools still work with text output. See [demo-mcp-apps](../guides/demo-mcp-apps.md).

---

## Images

MCP tools can return images (base64). Drive does not return images; all tool returns use `type: "text"`.

---

## OAuth

Drive does not use OAuth. The server is localhost-only. For other MCP servers that require OAuth, use `auth: { CLIENT_ID, CLIENT_SECRET, scopes }` in mcp.json and register redirect URL `cursor://anysphere.cursor-mcp/oauth/callback`.

---

## Security

| Practice | Drive |
|----------|-------|
| No hardcoded API keys | Yes — no secrets in mcp.json |
| Localhost-only | Yes — binds to `127.0.0.1` only |
| Restricted API keys | N/A — no external auth |
| envFile for stdio | N/A — HTTP transport |

---

## Debugging

| Action | How |
|--------|-----|
| **MCP logs** | Output panel (Cmd+Shift+U / Ctrl+Shift+U) → select "MCP Logs" |
| **Drive output** | Output panel → "Cursor Drive" |
| **Verbosity** | Developer: Set Log Level… → Cursor Drive |
| **Toggle servers** | Settings → Features → Model Context Protocol |
| **Diagnose** | `Drive: Diagnose Drive APIs` command |

---

## Further reading

| Doc | Content |
|-----|---------|
| [mcp-tools.md](mcp-tools.md) | Full tool reference |
| [config-schema.md](config-schema.md) | `cursorDrive.mcp.enableApps`, `cursorDrive.mcp.port` |
| [demo-mcp-apps](../guides/demo-mcp-apps.md) | MCP Apps setup and troubleshooting |
| [MCP reference](https://cursor.com/docs/context/mcp) | Cursor MCP docs |
| [MCP Extension API](https://cursor.com/docs/context/mcp-extension-api) | Programmatic registration |
| [MCP Apps spec](https://modelcontextprotocol.io/extensions/apps/overview) | MCP Apps extension |
