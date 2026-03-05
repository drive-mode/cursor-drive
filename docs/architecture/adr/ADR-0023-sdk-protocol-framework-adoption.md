# ADR-0023: SDK, Protocol, and Framework Adoption Strategy

## Status

Accepted

## Metadata

- Date: 2026-02-27
- Deciders: Cursor Drive maintainers
- Related: ADR-0003 (MCP Bridge Pattern), ADR-0004 (Multi-Agent Registry), ADR-0010 (Tiered Model Routing), ADR-0014 (Agent Orchestration Strategy), ADR-0021 (Agent Orchestration Enhancement)

## Context

A research sprint across five parallel tracks evaluated whether Cursor Drive should adopt external SDKs, protocols, or orchestration frameworks. The candidates were:

1. **GitHub Copilot SDK** (`@github/copilot-sdk`, Python + TypeScript)
2. **Agent Client Protocol (ACP)** + official TypeScript SDK (`@agentclientprotocol/sdk`)
3. **ACP Python SDK** contrib patterns (`SessionAccumulator`, `ToolCallTracker`, `PermissionBroker`)
4. **Agentic orchestration frameworks** (LangGraph, AutoGen, CrewAI, Semantic Kernel, OpenAI Agents SDK)
5. **Cursor CLI programmatic integration** (server mode, JSON-RPC)

Drive's constraints:
- TypeScript VS Code extension; runs inside extension host (no subprocess spawning for orchestration, no Docker, bundle-size sensitive)
- Core prompt pipeline hooks via `beforeSubmitPrompt` — Drive does **not** run the LLM, it intercepts and routes Cursor's native modes
- Existing MCP HTTP server on port 7891 exposing tools to AI operators
- Multi-operator registry with permission presets (readonly / standard / full) and cascade hierarchy
- GitHub Copilot subscription is a separate, user-unfriendly requirement to layer on top of Cursor

---

## Decisions

### 1. GitHub Copilot SDK — Do NOT adopt as dependency; port 6 targeted patterns

**Rejected as a dependency.** The SDK is architecturally inverted: `@github/copilot-sdk` is a *client* that drives a Copilot CLI subprocess over JSON-RPC. Drive is a VS Code *extension* that wraps Cursor native modes. Adding it would:
- Require shipping the Copilot CLI binary (tens of MB)
- Introduce a second subscription requirement (Copilot on top of Cursor)
- Duplicate session management, tool routing, and model selection Drive already owns
- Still in "Technical Preview" with no SLA

**Adopted patterns (port to native TypeScript, no SDK dependency):**

| # | Pattern | Source location | Target in Drive | Priority |
|---|---------|----------------|-----------------|----------|
| 1 | Structured session persistence (`checkpoints/ + plan.md + files/` per operator) | `nodejs/src/session.ts` | `src/persistentMemory.ts` + `src/operatorRegistry.ts` | Medium |
| 2 | Typed `PermissionRequest` union (`kind: "shell" \| "write" \| "mcp" \| "read" \| "url" \| "custom-tool"`) | `nodejs/src/types.ts` | `src/approvalGates.ts`, `src/toolAllowlist.ts` | High |
| 3 | `onPostToolUse` hook (post-tool audit, result transform, context injection) | `nodejs/src/hooks.ts` | `src/pipeline.ts` — add post-submit stage | High |
| 4 | `ProviderConfig` BYOK object (`type`, `baseUrl`, `apiKey`, `bearerToken`) | `nodejs/src/types.ts` | `src/modelSelector.ts` | Medium |
| 5 | `listSessions` filter by git context (`cwd`, `gitRoot`, `repository`, `branch`) | `nodejs/src/client.ts` | `src/operatorRegistry.ts` | Low |
| 6 | `ReasoningEffort` field (`"low" \| "medium" \| "high" \| "xhigh"`) | `nodejs/src/types.ts` | `src/modelSelector.ts`, model call options | Low |

Additional insight: Drive's `commsAgent.ts` `sendAndWait()` should pre-register the idle listener *before* calling `send()` to close the race window (pattern from `CopilotSession.sendAndWait()`).

Protocol versioning gap: add a `driveProtocolVersion` field in `mcpServer.ts` responses and verify on connect (modeled on `sdk-protocol-version.json`).

---

### 2. ACP (Agent Client Protocol) — Defer; clear adoption path for Option A when needed

**Not adopted now.** MCP (Model Context Protocol) and ACP solve different problems and do not conflict:

| Layer | Protocol | Drive's role |
|-------|----------|--------------|
| Tools-to-LLM | MCP | Server (exposes tools to Cursor's LLM) |
| Editor-orchestrates-agent | ACP | Potential future **client** (drives external ACP agents) |

Drive's HTTP MCP bridge remains correct and unchanged.

**ACP Option A (Drive as ACP client)** is the only architecturally sound direction: Drive spawns ACP-compliant agents (Copilot CLI, Gemini, Goose, etc.) as named operators and routes their `session/update` stream to the Agent Screen. This is additive and does not change existing code.

**Trigger for adoption:** implement Option A when any of these is true:
- A user workflow needs to run an ACP-registered agent (Copilot CLI, Goose, etc.) as a Drive operator
- Cursor itself exposes an ACP client interface Drive should bridge to
- The `cursor_cli_run_streaming` path needs to be replaced with a more standardized subprocess model

Implementation path when trigger fires (moderate effort, ~300–500 LOC):
1. `npm install @agentclientprotocol/sdk`
2. Add `AcpOperatorAdapter` that spawns an ACP agent via stdio, wraps it in `ClientSideConnection`, routes `session/update` → Agent Screen, handles `session/request_permission` → `approvalGates.ts`
3. Register in `OperatorRegistry` with `type: "acp"` operator option
4. Wire `operator_spawn` MCP tool to accept optional `acpCommand` param

**ACP Option B (Drive as ACP agent)** is rejected: high effort, no identified client, contradicts Drive's role as the in-editor orchestration layer.

---

### 3. ACP Python SDK contrib patterns — Port three modules as `cursor-sdk` internal layer

**Adopted.** The TypeScript ACP SDK (`@agentclientprotocol/sdk`) covers transport, connection, and protocol interfaces. Three contrib modules from the Python SDK have **no TypeScript equivalent yet** and provide immediate value:

| Module | Lines | Target integration |
|--------|-------|--------------------|
| `SessionAccumulator` | ~150 | `src/agentScreen.ts` — live merged snapshot for Agent Screen rendering |
| `ToolCallTracker` | ~100 | `src/pipeline.ts` — stateful tool call state without ad-hoc maps |
| `PermissionBroker` | ~50 | Bridges ACP `requestPermission` → `src/approvalGates.ts` |

These three files form the `cursor-sdk` internal package (`src/cursor-sdk/`), exporting:

```typescript
export { SessionAccumulator, SessionSnapshot, ToolCallView } from "./sessionAccumulator.js";
export { ToolCallTracker, TrackedToolCallView }              from "./toolCallTracker.js";
export { PermissionBroker, defaultPermissionOptions }        from "./permissionBroker.js";
export { AcpRequestError }                                   from "./errors.js";
```

`@agentclientprotocol/sdk` is the upstream dependency for transport; the above four files are Drive-native additions on top.

This only activates when ACP Option A is implemented. Until then, the modules can be built speculatively as internal utilities since `SessionAccumulator` is directly useful for Agent Screen state management regardless of ACP.

---

### 4. Agentic Orchestration Frameworks — Rejected; 5 patterns extracted

All surveyed frameworks are rejected as dependencies:

| Framework | Reason for rejection |
|-----------|---------------------|
| LangGraph JS | `async_hooks` dependency, heavy bundle, embeds LLM runner loop |
| AutoGen / AutoGen Studio | Python-only; no TypeScript at orchestration layer |
| CrewAI | Python-only |
| Semantic Kernel (TS) | Agent Framework unavailable in TS (C#/Python only) |
| OpenAI Agents SDK | Embeds LLM runner loop; conflicts with Drive's `beforeSubmitPrompt` interception model |

The fundamental mismatch: these frameworks **run the LLM loop themselves**. Drive's operators are Cursor-native AI processes; Drive intercepts and routes, it does not execute.

**Five patterns extracted (zero new dependencies):**

| # | Pattern | Source framework | Implementation target |
|---|---------|-----------------|----------------------|
| 1 | **Role → sub-mode routing** (operator role informs `driveSubMode`: `reviewer → ask`, `implementer → agent`) | CrewAI + LangGraph supervisor | `src/router.ts` — consult operator role when selecting sub-mode |
| 2 | **Handoff input filter** (trim/summarise context before injecting into child operator) | OpenAI Agents SDK `inputFilter` | `src/operatorRegistry.ts` — optional `contextFilter` on `delegate()` |
| 3 | **Named pipeline stages: input guardrail + output guardrail** | OpenAI Agents SDK | `src/pipeline.ts` — explicit `outputGuardrail` stage after model call |
| 4 | **Structured escalation with severity tiers** (stall/progress/blocked triggers re-routing) | AutoGen Magentic-One | `src/commsAgent.ts` — branch on `escalation.severity`; already aligns with ADR-0021 |
| 5 | **Lightweight checkpoint keyed to operator + stage** | LangGraph checkpoint store | `src/pipeline.ts` `"checkpoint"` result + `vscode.globalState` persistence |

---

### 5. Cursor CLI Programmatic Integration — Stay current; one low-effort win

**No deeper CLI investment.** Cursor CLI has no server mode, no JSON-RPC/stdio protocol, and no planned equivalent of `copilot --acp --stdio`. The existing `cursor_cli_run` / `cursor_cli_run_streaming` (NDJSON streaming) already extracts all available capability.

**Low-effort win:** persist `chatId` across `cursor_cli_run` invocations using `--resume`. Add `resumeChatId?: string` to `RunCursorCliOptions` and return `chatId` in the result. This gives stateful multi-turn CLI sessions with zero architectural change.

**Future track (not in scope now):** Cursor Cloud Agents REST API (`POST /v0/agents`) for background tasks that run on a repo without blocking the user's editor session. Prerequisites: API key, GitHub-connected repo, stable API surface.

---

## Consequences

### Positive
- No new external framework dependencies added to the bundle
- Six Copilot SDK patterns improve audit clarity, BYOK flexibility, and post-tool observability
- ACP adoption path is defined and bounded; no speculative infrastructure built
- Five framework patterns extracted at zero cost
- `cursor-sdk` internal layer creates a clean home for future SDK-adjacent utilities
- `--resume` CLI improvement is trivial and immediately useful

### Negative
- Typed `PermissionRequest` union requires updating callers in `approvalGates.ts` and `toolAllowlist.ts`
- `cursor-sdk/` adds a new internal package to maintain
- ACP option A, when triggered, requires the `@agentclientprotocol/sdk` npm dependency
- Pattern 1 (role → sub-mode routing) requires coordination with ADR-0021 role template work

### Neutral
- ACP and MCP coexist cleanly; no migration required
- All changes are additive and backward-compatible

## Implementation Priority

| Item | Priority | Complexity | Files affected |
|------|----------|-----------|----------------|
| Typed `PermissionRequest` union | High | Low | `approvalGates.ts`, `toolAllowlist.ts` |
| `onPostToolUse` pipeline hook | High | Low | `pipeline.ts` |
| Role → sub-mode routing | High | Low | `router.ts`, `operatorRegistry.ts` |
| `cursor-sdk/SessionAccumulator` | Medium | Medium | new `src/cursor-sdk/` |
| `cursor-sdk/ToolCallTracker` | Medium | Medium | new `src/cursor-sdk/` |
| Handoff input filter | Medium | Low | `operatorRegistry.ts` |
| Named output guardrail stage | Medium | Low | `pipeline.ts` |
| Structured session persistence | Medium | Medium | `persistentMemory.ts`, `operatorRegistry.ts` |
| `ProviderConfig` BYOK object | Medium | Low | `modelSelector.ts` |
| `--resume` chatId in CLI runner | Low | Trivial | `src/cursorCliRunner.ts` |
| `ReasoningEffort` field | Low | Trivial | `modelSelector.ts` |
| Protocol version field in MCP | Low | Trivial | `mcpServer.ts` |
| ACP Option A adapter | Deferred | Medium | new `src/acpOperatorAdapter.ts` |
| Cloud Agents REST API | Deferred | High | new capability track |
