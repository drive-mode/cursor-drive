# Track 2: ACP Protocol Evaluation

**Plan:** sdk_and_protocol_research_6c42aa0c  
**Deliverable:** Protocol comparison and adoption recommendation for Cursor Drive

---

## 1. ACP Protocol Summary

The [Agent Client Protocol (ACP)](https://agentclientprotocol.com/) standardizes communication between code editors/IDEs and coding agents. It is editor-agnostic and suitable for local (stdio) and remote (HTTP/WebSocket) scenarios.

### Session Model

- **Sessions** represent a conversation thread between Client and Agent. Each session has a unique `sessionId`, maintains its own context and history.
- **Creation:** `session/new` with `cwd` and `mcpServers` → returns `sessionId`.
- **Resumption:** `session/load` (optional, requires `loadSession` capability) replays conversation via `session/update` notifications.
- **Multiple concurrent sessions** per connection supported.
- Sessions establish working directory and MCP server configuration; the Agent connects to MCP servers (stdio, HTTP, or SSE) as specified by the Client.

### Prompt Lifecycle

1. **Client → Agent:** `session/prompt` with user message (text, images, resources).
2. **Agent processing:** LLM responds with content and/or tool calls.
3. **Agent → Client:** `session/update` notifications stream:
   - `plan` (task breakdown with priority/status)
   - `agent_message_chunk` (text)
   - `tool_call` / `tool_call_update` (status: pending → in_progress → completed)
4. **Permission:** Agent may call `session/request_permission` before executing tools; Client responds with allow/reject/cancelled.
5. **Completion:** Agent responds to `session/prompt` with `stopReason` (end_turn, max_tokens, max_requests, refused, cancelled).
6. **Cancellation:** Client sends `session/cancel`; Agent aborts and returns `cancelled`.

### Permission Flows

- **Bidirectional:** Agent calls `session/request_permission` with `toolCall` and `options` (allow_once, reject_once, allow_always, reject_always).
- **Client response:** `{ outcome: "selected", optionId }` or `{ outcome: "cancelled" }`.
- Clients may auto-allow/reject per user settings.
- Permission gates tool execution; no execution until Client grants (or auto-grants).

### Streaming

- **JSON-RPC notifications** (`session/update`) stream real-time output.
- Content types: text, image, audio, resource (embedded), resource_link.
- Tool calls stream status and content (text, diff, terminal).
- Reuses MCP `ContentBlock` structure for compatibility.
- NDJSON over stdio for local; HTTP/WebSocket for remote (work in progress).

---

## 2. Protocol Comparison: ACP vs. MCP-over-HTTP (Drive)

| Dimension | ACP | Drive MCP-over-HTTP |
|----------|-----|----------------------|
| **Role** | Client↔Agent protocol (editor talks to agent) | Server↔Client protocol (agent talks to tools) |
| **Transport** | stdio (primary), HTTP/WebSocket (remote WIP) | StreamableHTTP on `:7891/mcp` |
| **Session** | Explicit `session/new`, `sessionId`, multi-session | Stateless; `sessionIdGenerator` for transport only, no app-level sessions |
| **Prompt flow** | `session/prompt` → `session/update` → `session/prompt` response | No prompt API; Cursor sends prompts via Composer, Drive intercepts via `beforeSubmitPrompt` |
| **Streaming** | `session/update` notifications (plan, chunks, tool status) | Tool results returned synchronously; Cursor CLI streaming via `/run` SSE, not MCP |
| **Permissions** | `session/request_permission` (Agent→Client) | `approvalGates` + `checkPermissionForOperator`; tool-level allowlists |
| **Tool model** | Agent executes tools; may use Client `fs`, `terminal` | Drive *is* the MCP server; Cursor invokes tools; Drive has no Agent role |
| **MCP usage** | Agent connects to MCP servers (Client config) | Drive exposes MCP tools; Cursor is the MCP client |

### Architectural Mismatch

- **ACP:** Editor (Client) ↔ Agent (subprocess or remote). The Agent is the one doing coding; the Client provides environment (files, terminals, permissions).
- **Drive:** Cursor is the agent host. Drive is an extension that exposes MCP tools. Cursor’s Agent calls Drive’s tools; Drive does not run or host an agent.

Drive’s MCP bridge is a **tool server**. ACP is an **agent–client protocol**. They address different layers:

```
ACP:    [Editor] ←→ [Agent] ←→ [MCP servers]
Drive:  [Cursor Agent] ←→ [Drive MCP server] ←→ [Drive runtime]
```

### Overlap and Gaps

| ACP feature | Drive equivalent | Notes |
|-------------|------------------|-------|
| Session context | `SessionMemory`, `OperatorRegistry` | Drive has operators, not ACP sessions |
| Permission requests | `approvalGates`, `toolAllowlist` | Different flow; Drive gates at tool invocation |
| Streaming output | `cursor_cli_run_streaming`, Agent Screen | Via tools/SSE, not ACP notifications |
| Plan display | `agent_screen_plan_update` | Tool-driven, not `session/update` plan |
| Tool execution | MCP `tools/call` | Drive tools are called by Cursor; no Agent→Client tool flow |

---

## 3. Adoption / Rejection Recommendation

### Recommendation: **Reject ACP adoption for Drive’s core bridge**

### Rationale

1. **Different protocol layer**
   - ACP is for Editor↔Agent. Drive is an MCP tool server used by Cursor’s Agent.
   - Adopting ACP would require Drive to act as an ACP Agent. That would duplicate Cursor’s agent role and add a second protocol stack.

2. **Redundancy with existing design**
   - Drive already has: session memory, operator registry, approval gates, Agent Screen, pipeline.
   - ACP’s session/prompt/permission model would sit alongside these without clear benefit, since Cursor owns the prompt flow.

3. **Transport mismatch**
   - ACP’s primary transport is stdio (Copilot CLI `--acp --stdio`). Drive uses HTTP (StreamableHTTP).
   - ACP remote HTTP/WebSocket is still WIP. Drive’s MCP-over-HTTP is production-ready and aligned with MCP’s direction.

4. **MCP is the right abstraction for Drive**
   - Drive exposes capabilities as MCP tools. Cursor discovers and invokes them.
   - MCP is the standard for tool/context exposure; ACP is for agent–editor orchestration.

5. **ACP patterns as inspiration only**
   - ACP’s permission model (`request_permission` with options) could inform future `approvalGates` UX.
   - `session/update`-style streaming could inform Agent Screen or CLI streaming design.
   - These are design references, not protocol adoption.

### When ACP *would* make sense

- If Drive ever ran its **own** agent (e.g. a sub-agent) that needed to talk to an editor: ACP would be appropriate for that Agent↔Editor channel.
- If Cursor added native ACP client support and Drive wanted to plug in as an ACP Agent: that would require a major architectural shift (Drive as agent host, not tool server).

### Summary

| Criterion | Assessment |
|-----------|------------|
| **Fit** | Low — ACP targets Editor↔Agent; Drive is a tool server |
| **Effort** | High — new protocol, role change, transport work |
| **Lock-in** | Medium — ACP is open (agentclientprotocol.com) but GitHub/Copilot-centric |
| **Overlap** | High — would duplicate session, permission, streaming concepts |

**Conclusion:** Keep the MCP-over-HTTP bridge. Do not adopt ACP for Drive’s core integration. Use ACP’s permission and streaming patterns as inspiration for incremental improvements to `approvalGates` and Agent Screen.

---

## Sources

- [ACP Introduction](https://agentclientprotocol.com/get-started/introduction)
- [ACP Protocol Overview](https://agentclientprotocol.com/protocol/overview)
- [ACP Session Setup](https://agentclientprotocol.com/protocol/session-setup)
- [ACP Prompt Turn](https://agentclientprotocol.com/protocol/prompt-turn)
- [ACP Tool Calls](https://agentclientprotocol.com/protocol/tool-calls)
- [ACP Content](https://agentclientprotocol.com/protocol/content)
- [ACP Architecture](https://agentclientprotocol.com/get-started/architecture)
- [GitHub Copilot ACP Server](https://docs.github.com/en/copilot/reference/acp-server)
- [ACP Spec Repo](https://github.com/agentclientprotocol/agent-client-protocol)
- [ACP Registry](https://github.com/agentclientprotocol/registry)
- Drive: `src/mcpServer.ts`, `docs/reference/mcp-overview.md`, `docs/research/drive-tech/plugins-and-mcp-server/02_implementation.md`
