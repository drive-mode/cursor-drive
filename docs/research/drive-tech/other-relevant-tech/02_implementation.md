# Other Relevant Technologies — Implementation Plan

**Topic:** Integration points, implementation options, testing strategy, and rollout plan for the top 5 highest-impact technologies in Cursor Drive.

**Date:** February 2026

---

## 1. Current State

### Voice Pipeline (`pipeline.ts`)

Drive's prompt pipeline processes text through ordered stages:

```
wake/submit → tangent → filler-clean → glossary-expand → sanitize → optimize → approval-gate → context-inject → route → model-select
```

There is no STT stage. Voice input is a documented gap (ADR-0012 defines the mic model and pipeline order but does not implement STT). TTS works via `tts.ts` (say.js wrapper).

### Model Selection (`modelSelector.ts`)

Tiered routing with 4 tiers: `routing` (cheapest), `planning`, `execution` (user's model), `reasoning` (highest capability). Each `selectModelForTier()` call currently has no tracing, no cost tracking, and no latency measurement.

### MCP Server (`mcpServer.ts`)

Express server on `:7891` with 30+ MCP tools and A2A-compatible task endpoints. A2A endpoints use REST (not JSON-RPC). Agent Card served at `/.well-known/agent.json` and `/.well-known/agent-card.json`.

### Tool Allowlist (`toolAllowlist.ts`)

Capability-based permission enforcement with presets (`readonly`, `standard`, `full`). Operator-aware via `checkPermissionForOperator()`. Config overrides via `cursorDrive.agents.permissions.overrides`.

### Operator Registry (`operatorRegistry.ts`)

Full operator lifecycle: spawn, switch, pause, resume, dismiss, merge, delegate. Permission cascade, depth hierarchy, visibility modes. Events for completion, progress, error.

---

## 2. Top 5 Technologies — Implementation Options

### 2.1 WhisperKit STT (Privacy-First Voice Input)

#### Current state

No STT implementation. `pipeline.ts` expects text input. ADR-0012 defines the pipeline order (filler-clean → sanitize → optimize) but the "voice → text" step is missing.

#### Integration points

| File | Change |
|---|---|
| `src/stt.ts` (new) | WhisperKit process management, audio capture, transcription |
| `src/pipeline.ts` | New stage 0: `sttTranscribe` before `cleanFillerWords` |
| `src/extension.ts` | Mic toggle command, audio stream setup |
| `src/statusBar.ts` | Mic state indicator (muted/unmuted/transcribing) |
| `src/fillerCleaner.ts` | Enhanced filler patterns for STT output |
| `package.json` | WhisperKit dependency or subprocess binary path config |

#### Option A: Subprocess STT (~200 lines)

**Scope:** Run WhisperKit CLI as a subprocess. Pipe audio from microphone → subprocess stdin → read transcription from stdout.

**Implementation:**

1. New `src/stt.ts`:
   - `startListening()` — spawn WhisperKit CLI process with `--model distil-large-v3 --stream`
   - `stopListening()` — kill subprocess
   - `onTranscription(callback)` — emit text chunks as they arrive from stdout
   - Audio capture via Node.js `node-audiorecorder` or OS-native `arecord`/`sox` subprocess

2. `pipeline.ts` changes:
   - New `DriveContext` field: `sttEnabled: boolean`
   - When `sttEnabled && driveActive`, pipeline stage 0 buffers STT text → feeds to `cleanFillerWords`

3. `statusBar.ts` changes:
   - New mic states: `muted`, `unmuted`, `transcribing`
   - Status bar item shows mic icon + state

4. Configuration:
   - `cursorDrive.voice.sttBackend`: `"whisperkit"` | `"whisperLiveKit"` | `"none"`
   - `cursorDrive.voice.sttModel`: `"distil-large-v3"` | `"large-v3-turbo"` | `"large-v3"`
   - `cursorDrive.voice.micDevice`: OS audio device identifier

**Estimated changes:**

| File | ~Lines |
|---|---|
| `src/stt.ts` (new) | +120 |
| `src/pipeline.ts` | +30 |
| `src/extension.ts` | +20 |
| `src/statusBar.ts` | +15 |
| `tests/src/stt.ts` (new) | +80 |
| **Total** | **~265** |

**Complexity:** Medium. Subprocess management, audio capture, and cross-platform audio device selection add complexity. Core pipeline integration is straightforward (STT output is text).

**Time to first value:** 2–3 sessions. Audio capture and subprocess management are the main work; pipeline integration is ~30 lines.

**Risks:**
- Audio capture requires OS-specific tooling (`arecord` on Linux, `sox` on macOS, or a Node.js native addon).
- WhisperKit CLI must be installed on the user's machine (model download, binary availability).
- Subprocess lifecycle management (crash recovery, resource cleanup).

#### Option B: Native Node.js Addon (~500+ lines)

**Scope:** WhisperKit as a native Node.js addon (N-API) compiled into the extension. Direct audio capture via PortAudio bindings. No subprocess.

**Implementation:**

1. Native addon (`native/stt/`) wrapping WhisperKit C++ API via N-API.
2. PortAudio bindings for cross-platform audio capture.
3. TypeScript bindings in `src/stt.ts` calling the native addon.
4. Pre-built binaries for macOS (ARM64), Linux (x86_64 + CUDA).

**Estimated changes:**

| File | ~Lines |
|---|---|
| `native/stt/` (new) | +300 (C++) |
| `src/stt.ts` (new) | +80 |
| `src/pipeline.ts` | +30 |
| Build configuration | +50 |
| Tests | +100 |
| **Total** | **~560** |

**Complexity:** High. Native addon compilation, cross-platform build matrix, PortAudio dependency, pre-built binary distribution.

**Time to first value:** 4–6 sessions. Native addon development and cross-platform testing dominate.

**Risks:**
- Build complexity — native addons must match the Electron Node.js ABI version.
- Distribution — pre-built binaries must cover macOS ARM64, Linux x86_64, Linux ARM64.
- Maintenance burden — native code requires C++ expertise for updates.

#### Recommendation

**Start with Option A (subprocess).** Lower risk, faster time to value, validates the integration without committing to native code. Migrate to Option B only if subprocess overhead (startup latency, memory) proves unacceptable.

---

### 2.2 A2A Protocol Enhancement

#### Current state

A2A endpoints exist in `mcpServer.ts`: Agent Card, task CRUD, task cancellation. REST format (not JSON-RPC). Status mapping covers 5 states. See `../agent-teams/02_implementation.md` for detailed current-state analysis.

#### Integration points

| File | Change |
|---|---|
| `src/mcpServer.ts` | JSON-RPC envelope, additional task states, streaming (SSE), Agent Card enhancement |
| `src/operatorRegistry.ts` | Map approval-gate state to `input_required` |
| `tests/src/mcpServer.ts` | A2A interop tests |

#### Option A: Compliance Gaps Only (~120 lines)

**Scope:** Close the 4 gaps identified in agent-teams research without adding new capabilities.

1. **JSON-RPC envelope:** Wrap existing REST responses in JSON-RPC 2.0 format. Accept both REST and JSON-RPC on task endpoints.
2. **Additional states:** Map operator states to A2A `input_required` (approval gate pending) and `auth_required` (credential needed).
3. **Agent Card enhancement:** Add `skills` array with structured capability metadata. Update to `agent-card.json` as canonical path.
4. **Task metadata:** Return `role`, `depth`, `effectivePreset` in task status responses.

**Estimated changes:**

| File | ~Lines |
|---|---|
| `src/mcpServer.ts` | +80 |
| `src/operatorRegistry.ts` | +10 |
| `tests/src/mcpServer.ts` | +50 |
| **Total** | **~140** |

**Complexity:** Low. All changes extend existing handlers.

#### Option B: Full A2A v0.3.0 Support (~350+ lines)

**Scope:** Everything in Option A plus SSE streaming, push notifications, and Context objects.

1. SSE endpoint for real-time task status streaming.
2. Push notification registration and delivery.
3. A2A Context objects for multi-task conversations (map to `sessionMemory.ts` visibility).
4. A2A JavaScript SDK integration for client-side interop testing.

**Estimated changes:**

| File | ~Lines |
|---|---|
| `src/mcpServer.ts` | +200 |
| `src/operatorRegistry.ts` | +30 |
| `src/sessionMemory.ts` | +40 |
| Tests | +100 |
| **Total** | **~370** |

**Complexity:** Medium. SSE and push notification infrastructure add real-time complexity.

#### Recommendation

**Start with Option A.** Close compliance gaps first. Defer SSE streaming until external agents actually need it (no demand signal yet).

---

### 2.3 Langfuse Observability

#### Current state

No tracing, no cost tracking, no structured evaluation. `AgentScreenPanel` shows live activity; `commsAgent.ts` batches notifications. No persistent trace data.

#### Integration points

| File | Change |
|---|---|
| `src/tracing.ts` (new) | Langfuse SDK wrapper, trace/span management |
| `src/modelSelector.ts` | Wrap `selectModelForTier()` with trace spans |
| `src/pipeline.ts` | Instrument pipeline stages with child spans |
| `src/operatorRegistry.ts` | Operator lifecycle events as trace events |
| `package.json` | `langfuse` dependency |

#### Option A: Model Call Tracing (~150 lines)

**Scope:** Instrument `modelSelector.ts` to trace every model call with tier, model, token count, latency, and cost.

1. New `src/tracing.ts`:
   - `initTracing(config)` — initialize Langfuse client (self-hosted URL or cloud)
   - `startTrace(name, metadata)` → trace ID
   - `startSpan(traceId, name, metadata)` → span ID
   - `endSpan(spanId, output, metadata)` — record latency, tokens, cost
   - `endTrace(traceId)` — flush trace

2. `modelSelector.ts` changes:
   - `selectModelForTier()` wrapped: start span before model call, end span after, record tier, model name, token usage, estimated cost.

3. Configuration:
   - `cursorDrive.observability.langfuseUrl`: self-hosted Langfuse URL (default: `http://localhost:3000`)
   - `cursorDrive.observability.langfuseEnabled`: boolean (default: `false`)
   - `cursorDrive.observability.langfusePublicKey` / `langfuseSecretKey`: API credentials

**Estimated changes:**

| File | ~Lines |
|---|---|
| `src/tracing.ts` (new) | +80 |
| `src/modelSelector.ts` | +30 |
| `src/extension.ts` | +10 (init) |
| `tests/src/tracing.ts` (new) | +50 |
| **Total** | **~170** |

**Complexity:** Low. Langfuse TypeScript SDK is well-documented. Wrapping `selectModelForTier()` is non-invasive.

**Time to first value:** 1 session. Model call tracing provides immediate value for debugging and cost awareness.

#### Option B: Full Pipeline + Operator Tracing (~400+ lines)

**Scope:** Everything in Option A plus pipeline stage instrumentation, operator lifecycle tracing, and session-level cost aggregation.

1. `pipeline.ts` — each stage (filler-clean, sanitize, optimize, route, model-select) becomes a child span with timing.
2. `operatorRegistry.ts` — spawn, delegate, merge, dismiss emit trace events. Operator-scoped traces.
3. `commsAgent.ts` — notification delivery timing.
4. Session-level trace aggregation: total cost, total tokens, operator breakdown.
5. Langfuse evaluation hooks: post-hoc scoring of operator outputs.

**Estimated changes:**

| File | ~Lines |
|---|---|
| `src/tracing.ts` (new) | +120 |
| `src/modelSelector.ts` | +30 |
| `src/pipeline.ts` | +60 |
| `src/operatorRegistry.ts` | +50 |
| `src/commsAgent.ts` | +20 |
| `src/extension.ts` | +15 |
| Tests | +120 |
| **Total** | **~415** |

**Complexity:** Medium. Cross-cutting instrumentation across multiple modules. Trace correlation (linking operator spans to pipeline spans) requires careful ID management.

#### Recommendation

**Start with Option A.** Model call tracing alone provides significant value (cost visibility, latency debugging). Expand to pipeline and operator tracing in a follow-up phase.

---

### 2.4 AgentBound ACL — MCP-Level Permission Enforcement

#### Current state

`toolAllowlist.ts` enforces permissions at the Drive extension level. Capabilities (`fileRead`, `fileWrite`, `terminalExecute`, etc.) are checked per-operator via `checkPermissionForOperator()`. This is application-level enforcement — the MCP protocol itself has no permission concept.

#### Integration points

| File | Change |
|---|---|
| `src/mcpServer.ts` | Permission manifest in server metadata, per-tool permission annotations |
| `src/toolAllowlist.ts` | Map AgentBound manifest permissions to Drive capability presets |

#### Option A: Declarative Tool Annotations (~80 lines)

**Scope:** Annotate each MCP tool with its required capabilities. Publish the permission manifest in the server's metadata. No runtime enforcement change (Drive's existing `toolAllowlist.ts` continues to enforce).

1. Each MCP tool in `mcpServer.ts` gets a `requiredCapabilities` field in its metadata:
   ```
   tts_speak: { requiredCapabilities: ["modelCall"] }
   agent_screen_file: { requiredCapabilities: ["fileRead"] }
   operator_spawn: { requiredCapabilities: ["modelCall"] }
   ```

2. Server metadata includes a `permissions` section listing all capabilities the server may exercise.

3. MCP clients that support AgentBound can read the manifest and make informed grant decisions.

**Estimated changes:**

| File | ~Lines |
|---|---|
| `src/mcpServer.ts` | +60 |
| `tests/src/mcpServer.ts` | +30 |
| **Total** | **~90** |

**Complexity:** Low. Metadata-only change. No runtime behavior change.

#### Option B: MCP-Level Enforcement (~250+ lines)

**Scope:** Everything in Option A plus runtime enforcement at the MCP transport layer, before Drive's application-level `toolAllowlist.ts` check.

1. MCP server middleware that checks caller permissions against tool requirements before executing the tool handler.
2. Runtime permission request flow: if a tool requires a capability the caller hasn't granted, return a permission-request response instead of executing.
3. Permission grant/deny tracking with audit logging.

**Estimated changes:**

| File | ~Lines |
|---|---|
| `src/mcpServer.ts` | +120 |
| `src/toolAllowlist.ts` | +50 |
| `src/mcpPermissionMiddleware.ts` (new) | +60 |
| Tests | +80 |
| **Total** | **~310** |

**Complexity:** Medium. Middleware interception at the MCP layer. Requires clear separation between MCP-level and application-level enforcement.

#### Recommendation

**Defer both options.** Drive's `toolAllowlist.ts` is already more sophisticated than AgentBound (operator hierarchy, cascade, config overrides). Wait for AgentBound primitives to land in the MCP core spec before investing. If investing early, start with Option A (metadata-only, zero runtime risk).

---

### 2.5 Parallel Tool Calling — Operator Efficiency

#### Current state

Cursor's agent harness already handles parallel tool execution. Drive's MCP tools are individually defined in `mcpServer.ts`. No explicit parallel-safety annotations or schema optimization.

#### Integration points

| File | Change |
|---|---|
| `src/mcpServer.ts` | Parallel-safety annotations, schema optimization |
| Documentation | Tool parallelism guide for operator authors |

#### Option A: Schema Review + Annotations (~50 lines)

**Scope:** Review all 30+ MCP tools for parallel-safety. Add metadata indicating which tools can be called in parallel and which have ordering constraints.

1. Audit each tool in `mcpServer.ts`:
   - **Parallel-safe:** `agent_screen_file` (read), `tts_speak`, `drive_mode_status`, `operator_list` — pure reads or idempotent actions.
   - **Order-dependent:** `operator_spawn` → `operator_switch` (must spawn before switching), `operator_delegate` → `operator_merge` (must delegate before merging).

2. Add `parallelSafe: boolean` to tool metadata.

3. Optimize tool `description` strings for token efficiency — concise but semantically complete.

**Estimated changes:**

| File | ~Lines |
|---|---|
| `src/mcpServer.ts` | +40 (metadata annotations) |
| `docs/reference/mcp-tools.md` | +30 (parallelism notes) |
| **Total** | **~70** |

**Complexity:** Very low. Metadata and documentation only.

#### Option B: Schema Compiler Integration (~200+ lines)

**Scope:** Everything in Option A plus LLM-Tool Compiler integration for automatic schema compression.

1. Build step that compiles MCP tool schemas into compressed representations.
2. Serve compressed schemas to models that support tool compilation.
3. Fallback to full schemas for models that don't.

**Estimated changes:**

| File | ~Lines |
|---|---|
| `src/mcpServer.ts` | +40 |
| `src/toolSchemaCompiler.ts` (new) | +100 |
| Build scripts | +30 |
| Tests | +50 |
| **Total** | **~220** |

**Complexity:** Medium. Compiler integration is research-stage; schema compression format is not standardized.

#### Recommendation

**Adopt Option A immediately.** Zero risk, immediate token savings from optimized descriptions. Defer Option B (schema compiler) until the tool compilation format stabilizes.

---

## 3. Tests and Evaluations

### 3.1 WhisperKit STT (Option A)

```
✓ stt.startListening() spawns WhisperKit subprocess
✓ stt.stopListening() kills subprocess and cleans up
✓ stt.onTranscription() receives text chunks from subprocess stdout
✓ Pipeline processes STT text through filler-clean → sanitize → optimize
✓ Pipeline skips STT when sttEnabled is false (no regression)
✓ Status bar shows correct mic state (muted/unmuted/transcribing)
✓ Configuration change (backend, model) restarts STT subprocess
```

### 3.2 A2A Enhancement (Option A)

```
✓ Task creation returns JSON-RPC 2.0 envelope
✓ Task status includes role, depth, effectivePreset
✓ Operator at approval gate maps to A2A input_required
✓ Agent Card at /.well-known/agent-card.json includes skills array
✓ REST format still accepted (backward compatibility)
✓ External HTTP client can complete full task lifecycle
```

### 3.3 Langfuse Tracing (Option A)

```
✓ Tracing disabled by default (no Langfuse calls when disabled)
✓ selectModelForTier() emits span with tier, model, tokens, latency
✓ Trace includes cost estimate based on model pricing
✓ Multiple model calls in one pipeline run linked to same trace
✓ Tracing failure does not break model selection (graceful degradation)
✓ Configuration change (URL, keys) reinitializes Langfuse client
```

### 3.4 AgentBound Annotations (Option A)

```
✓ Each MCP tool has requiredCapabilities in metadata
✓ Server metadata includes permissions section
✓ Annotations are consistent with toolAllowlist.ts capability definitions
✓ No runtime behavior change (existing tests pass unmodified)
```

### 3.5 Parallel Tool Calling (Option A)

```
✓ parallelSafe metadata present on all MCP tools
✓ Parallel-safe tools have no ordering dependencies
✓ Order-dependent tools correctly marked as not parallel-safe
✓ Tool descriptions are concise and under token budget
```

### 3.6 Evaluation Criteria

| Criterion | Target | Measurement |
|---|---|---|
| No regression in existing tests | 100% pass rate | `npm test` |
| STT latency (WhisperKit) | <600ms utterance → text | Benchmark in test |
| Trace overhead (Langfuse) | <5ms per span | Benchmark in test |
| Tool schema token count | <80% of current count | Token counter script |
| A2A endpoint compliance | JSON-RPC 2.0 valid | Schema validation test |

---

## 4. Rollout Plan

### Phase 1: Quick Wins (Parallel Tool Calling + Langfuse Model Tracing)

**Target:** Next 1–2 sessions.

1. Review and annotate MCP tool parallel-safety metadata
2. Optimize tool description strings for token efficiency
3. Add `tracing.ts` with Langfuse SDK wrapper
4. Instrument `modelSelector.ts` with trace spans
5. Add configuration keys for Langfuse (disabled by default)
6. Write tests

**Validation:** All existing tests pass. New tracing tests pass. Tool description token count reduced.

### Phase 2: Voice Input Prototype (WhisperKit STT)

**Target:** 2–3 sessions after Phase 1.

1. New `stt.ts` module with subprocess WhisperKit management
2. Pipeline stage 0 integration
3. Status bar mic state indicator
4. Configuration for backend, model, mic device
5. Write tests (mocked subprocess for CI, integration test for local)

**Validation:** STT subprocess starts and transcribes. Pipeline processes STT text correctly. Existing pipeline tests pass unchanged.

### Phase 3: A2A Compliance (Enhancement)

**Target:** 1 session after Phase 2.

1. JSON-RPC envelope for task endpoints
2. Additional task states (`input_required`, `auth_required`)
3. Agent Card enhancement (skills array)
4. Richer task metadata (role, depth, preset)
5. A2A interop tests with external HTTP client

**Validation:** A2A endpoints return valid JSON-RPC. External client completes full task lifecycle.

### Phase 4: Expanded Observability (Langfuse Pipeline + Operator Tracing)

**Target:** After Phase 3.

1. Instrument `pipeline.ts` stages with child spans
2. Instrument `operatorRegistry.ts` lifecycle with trace events
3. Session-level cost aggregation
4. Langfuse evaluation hooks (post-hoc scoring)

**Validation:** Full pipeline trace visible in Langfuse UI. Operator lifecycle events linked to traces.

### Phase 5: Security Annotations (AgentBound, Deferred)

**Target:** When MCP spec adopts permission primitives.

1. Add `requiredCapabilities` metadata to MCP tools
2. Publish permission manifest in server metadata
3. Test with AgentBound-compatible client (when available)

**Gate:** MCP core spec includes permission primitives.
