# Track 3: ACP Python SDK Patterns

**Source:** [agentclientprotocol/python-sdk](https://github.com/agentclientprotocol/python-sdk)  
**Context:** Cursor Drive is TypeScript. We may want to port useful patterns from ACP Python SDK into the `cursor-sdk` layer.

---

## 1. Key Abstractions

### 1.1 Transport

| Component | Location | Description |
|-----------|----------|-------------|
| `spawn_stdio_transport` | `transports.py` | Launch subprocess, expose stdin/stdout as asyncio streams. Graceful shutdown: close stdin → wait → terminate → kill. |
| `default_environment` | `transports.py` | Trimmed env (PATH, HOME, etc.) for subprocess spawn; mirrors MCP best practices. |
| `stdio_streams` | `stdio.py` | Create stdio asyncio streams; Windows uses thread feeder + custom stdout transport. |
| `spawn_agent_process` / `spawn_client_process` | `stdio.py` | Context managers that spawn subprocess and bind to `ClientSideConnection` / `AgentSideConnection`. |
| `Connection` | `connection.py` | Minimal JSON-RPC 2.0 over newline-delimited JSON. `send_request`, `send_notification`, receive loop, `add_observer`. |
| `ClientSideConnection` | `client/connection.py` | Typed RPC methods (`initialize`, `new_session`, `prompt`, etc.) over `Connection`. |

**Value for Drive:** Low today. Drive uses MCP-over-HTTP and `beforeSubmitPrompt`; it does not spawn ACP agents or use stdio. Becomes relevant if we adopt Option A (Drive as ACP client).

**Port effort:** High — asyncio/subprocess semantics differ from Node; `@agentclientprotocol/sdk` already covers TS transport.

---

### 1.2 Streaming

| Component | Location | Description |
|-----------|----------|-------------|
| NDJSON framing | `connection.py` | `readline()` → parse JSON → dispatch. Outgoing: `json.dumps` + newline. |
| `StreamObserver` | `connection.py` | `add_observer(callback)` — callback receives every raw JSON-RPC message (incoming/outgoing). Fire-and-forget; supports async. |
| Helper builders | `helpers.py` | `text_block`, `image_block`, `update_agent_message`, `start_tool_call`, `update_tool_call`, `tool_content`, `plan_entry`, etc. Build Pydantic models with correct discriminators. |
| `session_update` | Client interface | Agent streams `session/update` notifications; client receives `ToolCallStart`, `ToolCallProgress`, `AgentMessageChunk`, etc. |

**Value for Drive:** Medium. `StreamObserver` is a low-cost telemetry tap. Helper builders would standardise payload construction if we wire ACP. Drive’s streaming today is Cursor-native (no ACP).

**Port effort:**  
- StreamObserver: **Low** — single callback registration, ~20 lines.  
- Helper builders: **Medium** — many functions; Drive would need TS equivalents for ACP payload shapes.

---

### 1.3 Permission Broker

| Component | Location | Description |
|-----------|----------|-------------|
| `PermissionBroker` | `contrib/permissions.py` | Wraps `requestPermission` RPC. Accepts `session_id`, `requester` (async callback), optional `tracker`, `default_options`. `request_for(external_id, tool_call?, content?, options?)` builds `RequestPermissionRequest` and calls requester. |
| `default_permission_options` | `contrib/permissions.py` | Returns `(approve, approve_for_session, reject)` as `PermissionOption` models. |
| `MissingToolCallError` / `MissingPermissionOptionsError` | `contrib/permissions.py` | Validation errors when config is incomplete. |

**Value for Drive:** Already ported. Drive’s `PermissionBroker` maps to `approvalGates.ts` instead of ACP RPC. Same conceptual role.

**Port effort:** Done. Drive version is ~70 lines, adapted for `getGateResult()`.

---

### 1.4 Session Accumulator

| Component | Location | Description |
|-----------|----------|-------------|
| `SessionAccumulator` | `contrib/session_state.py` | Merges `SessionNotification` updates. Handles `ToolCallStart`, `ToolCallProgress`, `AgentPlanUpdate`, `CurrentModeUpdate`, `AvailableCommandsUpdate`, `UserMessageChunk`, `AgentMessageChunk`, `AgentThoughtChunk`. Late-arrival tolerance for tool_call updates. `subscribe(callback)`; `snapshot()` returns immutable `SessionSnapshot`. |
| `SessionSnapshot` | Python | `session_id`, `tool_calls` (dict), `plan_entries`, `current_mode_id`, `available_commands`, `user_messages`, `agent_messages`, `agent_thoughts`. |
| `_MutableToolCallState` | Python | Internal state; `apply_start`, `apply_progress`, `snapshot()` → `ToolCallView`. |
| `SessionNotificationMismatchError` | Python | Raised when notification is for different session and `auto_reset_on_session_change=False`. |

**Value for Drive:** Already ported. Drive’s `SessionAccumulator` is simplified (no `plan_entries`, `available_commands`, `agent_thoughts`). Sufficient for Agent Screen today.

**Port effort:** Done. Possible future enhancement: add `plan_entries`, `agent_thoughts` if we adopt richer ACP session model.

---

### 1.5 Tool Call Tracker

| Component | Location | Description |
|-----------|----------|-------------|
| `ToolCallTracker` | `contrib/tool_calls.py` | `start(external_id, title, kind?, status?, ...)` → `ToolCallStart`. `progress()`, `append_stream_text()` → `ToolCallProgress`. `view()`, `tool_call_model()`, `forget()`. Uses `_TrackedToolCall` with `raw_input`, `raw_output`, `content`, `locations`, `kind`. |
| `TrackedToolCallView` | Python | Immutable view: `tool_call_id`, `title`, `kind`, `status`, `content`, `locations`, `raw_input`, `raw_output`. |
| `id_factory` | Python | Optional UUID factory for internal IDs. |

**Value for Drive:** Already ported. Drive’s version uses `args`/`result` strings; Python has richer `content`/`locations`/`kind`. Sufficient for current use.

**Port effort:** Done. Possible future: add `kind`, `locations` if we align with ACP schema.

---

## 2. Summary Table

| Abstraction | Description | Value for Drive | Port Effort |
|-------------|-------------|-----------------|-------------|
| **Transport** | stdio spawn, NDJSON Connection, ClientSideConnection | Low (Drive uses MCP) | High |
| **Streaming** | StreamObserver, helper builders | Medium (telemetry; ACP payloads) | Low / Medium |
| **Permission Broker** | requestPermission wrapper, default options | High (already ported) | Done |
| **Session Accumulator** | Merge SessionNotification, late-arrival, subscribe | High (already ported) | Done |
| **Tool Call Tracker** | start/progress/append_stream_text, views | High (already ported) | Done |

---

## 3. Prioritised Port List

### Already ported (no action)

1. **SessionAccumulator** — `src/cursor-sdk/sessionAccumulator.ts`
2. **ToolCallTracker** — `src/cursor-sdk/toolCallTracker.ts`
3. **PermissionBroker** — `src/cursor-sdk/permissionBroker.ts`
4. **AcpRequestError** — `src/cursor-sdk/errors.ts`

### Worth porting next

| Priority | Item | Effort | Rationale |
|----------|------|--------|-----------|
| 1 | **StreamObserver tap** | Low | Add `addObserver(callback)` to any JSON-RPC connection. Enables telemetry, logging, debugging without touching core dispatch. Drive’s MCP bridge or future ACP client could expose this. |
| 2 | **default_environment** | Low | Trimmed env for subprocess spawn. Useful when spawning ACP agents (e.g. Gemini CLI) or other child processes. ~30 lines. |
| 3 | **Helper builders** (subset) | Medium | `textBlock`, `toolContent`, `updateToolCall` — if we adopt ACP payload formats. Start with the ones needed for `session/update` notifications. |

### Defer

| Item | Reason |
|------|--------|
| Full transport layer | `@agentclientprotocol/sdk` exists; Drive doesn’t need stdio spawn yet. |
| Python `SessionSnapshot` extras | `plan_entries`, `agent_thoughts`, `available_commands` — add only if we wire ACP session model. |
| Python `ToolCallTracker` extras | `kind`, `locations`, `content` — add only if we align with ACP schema. |

---

## 4. References

- [ACP Python SDK README](https://github.com/agentclientprotocol/python-sdk)
- [Contrib docs](https://agentclientprotocol.github.io/python-sdk/contrib/)
- [Quickstart](https://agentclientprotocol.github.io/python-sdk/quickstart/)
- [ACP transports spec](https://agentclientprotocol.com/protocol/transports)
- Drive research: `docs/research/sdk-protocol-framework-research-2026-02.md`
- Drive cursor-sdk: `src/cursor-sdk/`
