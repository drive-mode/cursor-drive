# ADR-0003: Local MCP Server as AI-to-Extension Bridge

## Status
Accepted

## Metadata
- Date: 2026-02-19
- Deciders: Cursor Drive maintainers
- Legacy: ADR-0008
- Related: ADR-0001, ADR-0002

## Context

Cursor Drive needs the AI to be able to:
- Update the ShareScreen Webview with activity events in real time
- Trigger OS-level TTS speech
- Change the Status Bar mode indicator
- Spawn, switch, and manage agents in the AgentRegistry

The Cursor AI (chat model) cannot call VS Code APIs directly — it can only generate text and call MCP tools. The VS Code extension host can call VS Code APIs but is not reachable by the model. A bridge is required.

## Decision

The extension starts a **local HTTP MCP server** on port `:7891` (configurable). Cursor's native MCP client (configured via `.cursor/mcp.json`) connects to it. When the AI wants to update the UI or manage agents, it calls an MCP tool. The extension's MCP server handles the tool call and invokes the appropriate VS Code API.

```
Cursor AI ──(HTTP POST)──► mcpServer.ts :7891 ──► VS Code APIs
                  MCP tool call              (webview, statusBar, tts)
```

The MCP server is implemented with `@modelcontextprotocol/sdk` using `StreamableHTTPServerTransport`.

## Tool Contract

| Tool | Handled by | VS Code API called |
|------|------------|-------------------|
| `tts_speak` | `tts.ts` | `say.js` (OS TTS) |
| `tts_stop` | `tts.ts` | `say.js` stop |
| `share_screen_activity` | `shareScreen.ts` | `webview.postMessage()` |
| `share_screen_file` | `shareScreen.ts` | `webview.postMessage()` |
| `share_screen_decision` | `shareScreen.ts` | `webview.postMessage()` |
| `drive_set_mode` | `driveMode.ts` | `EventEmitter` → statusBar update |
| `agent_spawn` | `agentRegistry.ts` | In-memory AgentContext creation |
| `agent_switch` | `agentRegistry.ts` | Foreground agent update |
| `agent_list` | `agentRegistry.ts` | Returns agent array |
| `agent_dismiss` | `agentRegistry.ts` | Agent deactivation |
| `agent_merge` | `agentRegistry.ts` | Context transfer + deactivation |

## Rationale

- **MCP is Cursor-native**: Cursor has built-in MCP client support. Tools appear in the AI's context without prompt injection.
- **Loose coupling**: The AI does not need to know about VS Code APIs. The extension does not need to know about model internals.
- **Testable**: MCP tools have typed inputs/outputs. They can be called from tests without the AI.
- **Observable**: Health endpoint at `:7891/health` enables diagnostics (`cursorDrive.diagnose` command).

## Consequences

- **Positive**: Clean contract; AI and extension are loosely coupled.
- **Positive**: MCP tools are self-documenting via JSON Schema (visible in Cursor's MCP tool list).
- **Negative**: Extension must be running for tools to work. If extension is inactive, tool calls fail silently.
- **Negative**: Port `:7891` must be free. Port-in-use at startup must surface a clear error.
- **Negative**: Local HTTP adds a small latency overhead per tool call (~1ms on loopback).

## Alternatives Considered

- **`stdio` MCP server**: Would require spawning a separate process; more complex lifecycle management.
- **Direct extension API calls**: AI cannot call extension APIs; not possible.
- **Polling via workspace state**: High latency; no real-time events.
