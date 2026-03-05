# Claude Code Agent Teams Bridge

Research and setup for registering Cursor Drive's MCP server with Claude Code and validating agent team sessions can call Drive tools.

## Overview

Claude Code supports MCP (Model Context Protocol) for connecting to external tools. Agent Teams (experimental) let multiple Claude Code instances work together with a lead coordinating teammates. Drive's MCP server at `http://127.0.0.1:7891/mcp` can be registered so Claude Code sessions (including agent team teammates) can invoke Drive tools.

## Prerequisites

1. **Drive extension running**: Start Cursor with the Drive extension loaded, or run the extension in development mode so the MCP server listens on port 7891.
2. **Claude Code CLI**: Install [Claude Code](https://code.claude.com) and ensure `claude` is on your PATH.

## MCP Registration

### Add Drive as HTTP MCP server

```bash
claude mcp add --transport http cursor-drive http://127.0.0.1:7891/mcp
```

For project-scoped config (shared via `.mcp.json`):

```bash
claude mcp add --transport http --scope project cursor-drive http://127.0.0.1:7891/mcp
```

### Verify registration

```bash
claude mcp list
claude mcp get cursor-drive
```

Within Claude Code, use `/mcp` to check server status.

## Validated Tools

When Drive's MCP server is connected, Claude Code can call these tools:

| Tool | Purpose |
|------|---------|
| `tts_speak` | Speak text aloud via Drive TTS |
| `tts_stop` | Stop ongoing TTS |
| `agent_screen_activity` | Push activity to Drive Agent Screen |
| `agent_screen_file` | Record file touch in Agent Screen |
| `agent_screen_decision` | Record decision in Agent Screen |
| `operator_spawn` | Spawn a new operator (tangent) |
| `operator_switch` | Switch foreground operator |
| `operator_list` | List active operators |
| `operator_pause` / `operator_resume` / `operator_dismiss` | Pause, resume, or dismiss operator |
| `operator_merge` | Merge source operator into target |
| `drive_set_mode` | Set Drive sub-mode (ask, agent, plan, debug) |

**Deprecated aliases** (still work, log warning): `agent_spawn`, `agent_switch`, `share_screen_activity`, etc.

## Agent Teams Integration

1. **Enable agent teams** (experimental):

   In Claude Code settings or environment:
   ```json
   { "env": { "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1" } }
   ```

2. **Start a team** that uses Drive: Ask Claude to create an agent team. Teammates can call Drive tools (e.g. `operator_spawn`, `agent_screen_activity`) if the Drive MCP server is registered.

3. **Lead delegates to Drive**: The lead can instruct teammates to use Drive tools for parallel work (e.g. spawn operators for different subtasks, report activity to the Agent Screen).

## Limitations

- **Auth**: Drive's local server uses no authentication. Suitable for local development only.
- **Streaming**: Drive's MCP transport is Streamable HTTP; Claude Code supports HTTP transport.
- **Availability**: Drive must be running (Cursor with Drive extension loaded). If the server is down, the MCP connection will fail.
- **Port**: Default 7891. Override via `cursorDrive.mcp.port` in settings.

## Working Config Example

`.mcp.json` (project root or user config):

```json
{
  "mcpServers": {
    "cursor-drive": {
      "url": "http://127.0.0.1:7891/mcp",
      "transport": "http"
    }
  }
}
```

## References

- [Claude Code MCP](https://code.claude.com/docs/en/mcp)
- [Claude Code Agent Teams](https://code.claude.com/docs/en/agent-teams)
- [Drive MCP Tools](../../reference/mcp-tools.md)
- ADR-0014: Agent Orchestration Strategy
