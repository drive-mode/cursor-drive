# SDK, Protocol, and Framework Research — Feb 2026

Supporting research for ADR-0023. Five parallel tracks investigated; findings summarised below.

---

## Track 1: GitHub Copilot SDK Feature Audit

**Source:** `github/copilot-sdk` (Technical Preview, Feb 2026) — TypeScript (`nodejs/`) and Python (`python/`) SDKs

### Architecture summary

`@github/copilot-sdk` is a JSON-RPC client that spawns or connects to a headless `copilot` CLI binary. It does **not** embed a model — it shells out to the CLI. The SDK is architecturally inverted relative to Drive: Drive is the server/orchestrator; the Copilot SDK is a remote-controlled client.

### Feature matrix

| # | Feature | What it does | Drive equivalent | Worth porting? |
|---|---------|-------------|-----------------|----------------|
| 1 | `CopilotClient` JSON-RPC transport | Spawns headless CLI, handles reconnect | `src/mcpServer.ts` (HTTP) | No — opposite direction |
| 2 | `createSession` / `resumeSession` | Stateful sessions with `checkpoints/`, `plan.md`, `files/` | `src/sessionMemory.ts` (flat in-memory) | **Yes** — structured checkpoint workspace |
| 3 | `listSessions` with git-context filter | Session CRUD filtered by `cwd`, `gitRoot`, `branch` | No equivalent | Yes (low priority) |
| 4 | `InfiniteSessionConfig` context compaction | Auto-compact at 80% context utilization | GAP | Concept only — add `contextPressure` signal |
| 5 | `SessionHooks` — 6 typed lifecycle hooks | `onPreToolUse`, `onPostToolUse`, `onUserPromptSubmitted`, `onSessionStart`, `onSessionEnd`, `onErrorOccurred` | Pre-tool only (`pipeline.ts`, `approvalGates.ts`) | **Yes** — `onPostToolUse`, `onSessionEnd` |
| 6 | `onPermissionRequest` typed request dispatch | Typed `PermissionRequest` union per kind | String-based capability names | **Yes** — typed union is cleaner |
| 7 | `defineTool` + Zod schema | Typed tool registration helper | Hand-authored JSON in `mcpServer.ts` | Yes — adopt for new tools |
| 8 | `CustomAgentConfig` | Per-agent system prompt, tool subset, `infer` flag | Operators lack per-operator system prompt | Partial — add `systemPrompt` to spawn config |
| 9 | Skills (`skillDirectories`) | Load `SKILL.md` files | Drive already has this identically | N/A — already implemented |
| 10 | `mcpServers` per session | Inbound MCP client consuming external servers | Drive only exposes (outbound); no inbound client | **Yes** — gap to fill |
| 11 | BYOK `ProviderConfig` | `{ type, baseUrl, apiKey, bearerToken }` | Tier-based only, no BYOK | Yes |
| 12 | `listModels()` with `capabilities`, `billing.multiplier`, `policy.state` | Runtime model info | Static tier labels | Yes — runtime capability data |
| 13 | `ReasoningEffort` (`low/medium/high/xhigh`) | Per-session reasoning effort | GAP | Yes (trivial addition) |
| 14 | Session foreground/background push events | TUI lifecycle notifications | Agent Screen knows active operator, no pub-sub | Partial |
| 15 | `MessageOptions.attachments` | Structured file/selection attachments per message | Raw text concatenation in context injection | Yes — improves context quality |
| 16 | Protocol versioning (`sdk-protocol-version.json`) | Version negotiation on connect | No versioning in `mcpServer.ts` | Yes (trivial) |

### Key race-condition fix

`CopilotSession.sendAndWait()` pre-registers the idle listener *before* calling `send()`. Drive's `commsAgent.ts` should adopt this same pattern.

---

## Track 2: ACP Protocol Evaluation

**Sources:** ACP spec (`agentclientprotocol/agent-client-protocol`), registry, Copilot ACP docs

### Protocol internals

ACP is JSON-RPC 2.0 bidirectional with this session lifecycle:
```
initialize → session/new → session/prompt ↔ session/update* → session/prompt response
```

Sessions are resumable via `session/load`. All output (text chunks, tool calls, plan updates) arrives as `session/update` notifications. Permissions are requested lazily per operation via `session/request_permission`, not granted globally at init.

Transport: NDJSON (newline-delimited JSON) over stdio or TCP socket. **Not HTTP**.

### ACP vs MCP comparison

| Dimension | MCP | ACP |
|-----------|-----|-----|
| Who calls whom | LLM calls server's tools | Client (editor) calls agent's methods |
| Where the LLM lives | Inside IDE (Cursor) | Inside agent subprocess |
| Session concept | Stateless per call | Stateful, resumable, session IDs |
| Streaming | Optional SSE | Native NDJSON, required |
| Permission model | Tool schema; host decides | Agent requests per-op; client approves |
| Transport | HTTP+SSE or stdio | stdio or TCP |
| Relationship | Tool provider | Autonomous agent |

**They are complementary.** ACP explicitly references MCP as the tool-wiring mechanism inside an ACP agent session.

### Registry findings

The ACP registry lists ~20 agents: Copilot CLI, Cline, Gemini, Claude-ACP, OpenCode, Goose, Junie, etc. **No editor (Cursor, VS Code, JetBrains) is registered as an ACP client.** Client adoption is nascent.

### Adoption options

**Option A (Drive as ACP client):** Drive spawns ACP agents as operators. Moderate effort, additive, architecturally correct.

**Option B (Drive as ACP agent):** High effort, no identified caller, contradicts Drive's role. Rejected.

### Verdict

Defer. Stay with MCP now. Adopt Option A when a concrete workflow needs an ACP-registered external agent.

---

## Track 3: ACP Python SDK Patterns

**Source:** `agentclientprotocol/python-sdk`

### Key finding: official TypeScript SDK exists

`@agentclientprotocol/sdk` v0.14.1 — 1.5M weekly downloads, Apache 2.0, covers all transport/connection/protocol concerns. **No porting needed for core layer.**

The Python SDK's `contrib/` layer has no TypeScript equivalent yet. Three modules are worth porting:

### `SessionAccumulator`

Receives raw `SessionNotification` stream, merges tool call states with late-arrival tolerance, tracks plan/mode/messages, emits immutable `SessionSnapshot` to subscribers. Maps directly to Agent Screen rendering in `src/agentScreen.ts`.

### `ToolCallTracker`

Maps `externalId → TrackedCall`, emits `ToolCallStart`/`ToolCallProgress`, buffers streaming text, exposes immutable views. Replaces ad-hoc tool-call maps in `pipeline.ts`.

### `PermissionBroker`

Thin class wrapping ACP `requestPermission` RPC, bridging to `approvalGates.ts`. ~50 lines.

### Additional pattern: `StreamObserver` tap

Low-cost way to add telemetry hooks to any ACP connection without modifying connection internals. Plug into Drive's future tracing layer.

---

## Track 4: Agentic Framework Landscape

### Frameworks evaluated

| Framework | Lang | Extension-host safe | Verdict |
|-----------|------|---------------------|---------|
| LangGraph JS | TS/JS | Risky (`async_hooks`, heavy bundle) | Skip |
| AutoGen | Python | No | Skip |
| CrewAI | Python | No | Skip |
| Semantic Kernel (TS) | TS | Theoretically yes, but agent layer is C# only | Skip |
| OpenAI Agents SDK | TS | Yes | Skip (patterns only) |
| XState / Effect-ts | TS | Yes | Patterns only |

### Root cause of all rejections

Every framework assumes it **drives the LLM loop**. Drive's operators are Cursor-managed processes; Drive intercepts prompts via `beforeSubmitPrompt`, it does not execute. Adopting any framework would create a parallel, conflicting execution layer.

### Patterns extracted

1. **Role → sub-mode routing** — operator role informs `driveSubMode` (from CrewAI + LangGraph supervisor)
2. **Handoff input filter** — trim context before injecting into child operator (from OpenAI Agents SDK `inputFilter`)
3. **Named pipeline stages** — explicit `inputGuardrail` + `outputGuardrail` (from OpenAI Agents SDK)
4. **Escalation severity branches** — stall/progress/blocked triggers re-routing (from AutoGen Magentic-One; aligns with ADR-0021)
5. **Lightweight checkpoint persistence** — keyed to operator + stage, stored in `vscode.globalState` (from LangGraph checkpointing)

---

## Track 5: Cursor CLI Programmatic Feasibility

### Findings

- **No server mode.** No `--acp`, `--stdio`, `--port`, or JSON-RPC flag exists.
- **No TypeScript SDK.** No `@cursor/sdk` npm package.
- Drive's existing `cursor_cli_run` / `cursor_cli_run_streaming` already extracts all available capability.
- The CLI is one-shot: spawn → run → exit. Each invocation is stateless unless `--resume <chatId>` is passed.

### CLI commands available

`agent -p` (headless), `--output-format stream-json`, `--resume [chatId]`, `--continue`, `--model`, `--mode plan|ask`, `agent ls`, `agent create-chat`, `agent models`, `agent mcp list`

### Two programmatic surfaces that do exist

1. **`--resume <chatId>` / `--continue`** — stateful multi-turn CLI sessions. Low-effort win: persist `chatId` in `RunCursorCliOptions` return value and pass it on subsequent calls.
2. **Cursor Cloud Agents REST API** (`POST /v0/agents`) — for background headless tasks on GitHub repos. Requires API key + GitHub repo. Useful for a future "background agent" feature; not relevant to local workspace workflows.

### Verdict

Stay with extension API for Drive's core. Keep `cursorCliRunner.ts` as-is. Add `--resume` support as a low-effort improvement.
