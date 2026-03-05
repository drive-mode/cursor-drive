# Track 1: Copilot SDK Feature Audit

**Plan:** `sdk_and_protocol_research_6c42aa0c`  
**Deliverable:** Feature catalog, comparison matrix, and assessment for Cursor Drive adoption.

---

## 1. Feature Catalog (SDK Feature → Description)

| SDK Feature | Description |
|-------------|-------------|
| **Architecture** | SDK communicates with Copilot CLI via JSON-RPC. SDK manages CLI process lifecycle; can connect to external CLI server. |
| **Platforms** | Python, TypeScript/Node.js, Go, .NET. All expose same API surface. |
| **BYOK (Bring Your Own Key)** | Session-level provider config: OpenAI, Azure, Anthropic, Ollama, vLLM, Foundry Local. API key or bearer token. No Entra ID/managed identity. |
| **Session model** | `create_session()` with model, provider, tools, system_message, streaming, hooks. Session emits events (assistant.message, session.idle, etc.). |
| **Custom tools** | `@define_tool` decorator + Pydantic params (Python); `Tool` object with schema + handler (all SDKs). Can override built-in tools with `overrides_built_in_tool=True`. |
| **Tool orchestration** | Session hooks: `on_pre_tool_use` (allow/deny/modify args), `on_post_tool_use` (modify results). Tool call → handler → result flow. |
| **MCP integration** | Copilot CLI connects to MCP servers; SDK passes MCP config via plugins. Tools from MCP available to agent. |
| **Agent skills** | `SKILL.md` files in plugin `skills/` dirs. First-found-wins precedence. Skills provide instructions/context to agent. |
| **Custom agents** | `agents.md` / `.agent.md` in plugin `agents/` dirs. Persona, system message, pre-written context. |
| **Parallel execution** | `/fleet` CLI command: parallel subagent execution to break down plans concurrently. Mission Control: multi-repo task assignment, parallel runs. SDK: multiple `create_session()` calls = parallel sessions. |
| **Built-in task tool** | Sub-agent delegation. Fails in BYOK mode (auth context not inherited). |
| **Streaming** | `streaming: true` → `assistant.message_delta`, `assistant.reasoning_delta` events. |
| **Infinite sessions** | Auto context compaction at thresholds. Persist state to workspace dir. |
| **ask_user tool** | `on_user_input_request` handler lets agent ask user questions mid-run. |
| **Session hooks** | `on_pre_tool_use`, `on_post_tool_use`, `on_user_prompt_submitted`, `on_session_start`, `on_session_end`, `on_error_occurred`. |
| **Image support** | Attachments via `attachments` param; `view` tool reads images from filesystem. |

---

## 2. Feature Comparison Matrix (SDK Feature → Drive Equivalent or Gap)

| SDK Feature | Drive Equivalent | Gap / Notes |
|-------------|------------------|-------------|
| **Architecture** | MCP server (StreamableHTTPServerTransport) on port 7891; Cursor CLI runner (`cursorCliRunner`) | Drive wraps Cursor, not Copilot CLI. Different host. |
| **BYOK** | Cursor subscription; user's model via Cursor | Drive uses Cursor's model routing. No direct BYOK—user configures Cursor. |
| **Session model** | Operator registry; `drive_run_pipeline`; session memory per operator | Drive has operators, not SDK-style sessions. Pipeline is prompt-level. |
| **Custom tools** | MCP tools in `mcpServer.ts`; 40+ tools registered | Drive exposes tools via MCP. No decorator pattern; manual `mcpServer.tool()`. |
| **Tool orchestration** | `approvalGates` (allow/log/warn/block); `toolAllowlist` (preset-based); `PermissionBroker` (ACP bridge) | Drive has approval gates and allowlist. No `on_pre_tool_use`-style arg modification. |
| **MCP integration** | Drive *is* an MCP server. Cursor connects to Drive. | Drive is the tool provider; Copilot CLI consumes MCP. Inverted relationship. |
| **Agent skills** | `.cursor/skills/*/SKILL.md` (Cursor IDE skills) | Cursor skills ≠ Copilot plugin skills. Different loading model. |
| **Custom agents** | Operator roles (implementer, reviewer, tester, researcher, planner) + `ROLE_TEMPLATES` | Drive has semantic roles with preset + systemHint. No agents.md-style files. |
| **Parallel execution** | `operator_spawn`, `operator_list`, A2A `/tasks` API; `getMaxConcurrent` cap | Drive has multi-operator parallelism. No `/fleet`-style plan breakdown. |
| **Built-in task tool** | `operator_spawn`, `operator_delegate` | Drive has spawn/delegate. No auth-inheritance issue (Cursor handles auth). |
| **Streaming** | `cursor_cli_run_streaming`; Agent Screen events | Drive streams CLI output to Agent Screen. |
| **Infinite sessions** | `SessionMemory`; `persistent_memory_*` tools | Drive has session + persistent memory. No auto-compaction. |
| **ask_user tool** | Clarification handler; tangent confirmation | Drive has clarification flow. No generic ask_user callback. |
| **Session hooks** | Pipeline stages (filler-clean, sanitize, route, approval-gate) | Drive has pipeline, not session hooks. Different granularity. |
| **Image support** | Not in Drive MCP tools | Gap: Drive does not expose image/attachment handling. |

---

## 3. Assessment: Novel vs. Already in Drive

### Novel (Worth Considering)

| Item | Why novel | Effort |
|------|-----------|--------|
| **on_pre_tool_use arg modification** | Copilot lets hooks modify tool args before execution. Drive's approval gates only allow/deny. | Low: add optional `modifiedArgs` to gate result. |
| **ask_user / on_user_input_request** | Generic "agent asks user" callback. Drive has clarification but not a first-class tool. | Medium: new MCP tool or pipeline stage. |
| **Infinite sessions / compaction** | Auto context management. Drive has memory but no compaction. | High: new compaction pipeline. |
| **Plugin marketplace / skills loading** | Copilot's plugin.json + marketplace.json. Drive uses Cursor skills; no plugin distribution. | Out of scope: different host. |

### Already in Drive (No Adoption Needed)

| Item | Drive equivalent |
|------|------------------|
| Multi-operator parallelism | `operator_spawn`, A2A `/tasks` |
| Permission presets | `toolAllowlist`, `ROLE_TEMPLATES` |
| Approval gates | `approvalGates`, `PermissionBroker` |
| Custom tools | MCP tools in `mcpServer.ts` |
| Semantic roles | implementer, reviewer, tester, researcher, planner |
| Streaming | `cursor_cli_run_streaming`, Agent Screen |
| Session memory | `SessionMemory`, `persistent_memory_*` |

### Not Applicable (Different Context)

| Item | Reason |
|------|--------|
| BYOK | Drive uses Cursor; user configures Cursor's model. |
| Copilot CLI server | Drive wraps Cursor CLI, not Copilot. |
| /fleet plan breakdown | Copilot CLI feature; Cursor has no equivalent. Drive's parallelism is operator-based. |
| Plugin agents/skills | Copilot plugin system; Cursor uses `.cursor/skills/`. |

---

## 4. Summary

**Fit:** Copilot SDK is built for Copilot CLI integration. Drive is Cursor-native. Most SDK features map to existing Drive capabilities (operators, approval gates, MCP tools, roles).

**Effort:** Low-value adoption. The only clearly adoptable pattern is `on_pre_tool_use`-style arg modification in approval gates—small extension to `GateResult`.

**Lock-in:** Adopting Copilot SDK would create dependency on GitHub's release cycle. Drive is self-contained.

**Overlap:** High. Drive already has operator parallelism, permission presets, approval gates, tool exposure, and session memory. The SDK's value is in its Copilot CLI integration, which Drive does not use.

**Recommendation:** Do not adopt Copilot SDK. Consider adding optional `modifiedArgs` to `approvalGates` if arg modification is needed. Otherwise, stay self-contained.
