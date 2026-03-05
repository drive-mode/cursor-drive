# Cross-Topic Synthesis: Overlap and Deduplication

**Date:** February 2026

This document maps the 7 research topics into 5 unified workstreams, identifies overlaps, and specifies what NOT to duplicate.

---

## Workstream 1: Voice Pipeline

**Covers:** WhisperKit STT (Other Tech), OpenAI Realtime API (Other Tech), Web Speech `processLocally` (Other Tech), TTS improvements, `fillerCleaner.ts` enhancements.

### Scope

Build Drive's missing STT capability as a single coherent pipeline stage, not three competing implementations.

| Component | Source topic | Status | Notes |
|-----------|-------------|--------|-------|
| `src/stt.ts` — STT abstraction | Other Tech (WhisperKit) | PROTOTYPE | New module with backend interface |
| WhisperKit subprocess backend | Other Tech | PROTOTYPE (primary) | Privacy-first, on-device, ADR-0005 compliant |
| OpenAI Realtime API backend | Other Tech | PROTOTYPE (secondary) | Opt-in cloud voice mode, requires explicit privacy consent |
| Web Speech `processLocally` backend | Other Tech | DEFER | Draft W3C spec, no Electron support confirmed |
| `pipeline.ts` stage 0 (STT) | Other Tech | PROTOTYPE | Audio → text before `cleanFillerWords()` |
| Enhanced filler patterns | Other Tech | ADOPT | STT output has more filler words than typed text |

### Dependencies

- `pipeline.ts` — STT stage inserts before the existing filler-clean stage.
- `fillerCleaner.ts` — enhanced patterns for STT-specific artifacts.
- ADR-0005 — privacy gate for cloud voice backends.
- ADR-0012 — mic model (mute/unmute, wake word) defines the UX contract.

### Shared Interfaces

```typescript
// src/stt.ts — backend interface (shared by all STT implementations)
interface SttBackend {
  start(audioStream: ReadableStream<Float32Array>): void;
  stop(): void;
  onTranscript: (text: string, isFinal: boolean) => void;
}
```

### Dedupe Notes

- **Do NOT** build three separate STT modules. Build one `stt.ts` with a `SttBackend` interface. WhisperKit and Realtime API are alternative backends behind the same interface.
- **Do NOT** duplicate pipeline wiring. One `sttTranscribe` stage in `pipeline.ts` handles all backends.
- **Do NOT** create a separate voice-mode pipeline path for Realtime API. Instead, let the Realtime API backend produce text transcripts that enter the normal pipeline (even though it _can_ do speech-to-speech, Drive's pipeline stages — filler clean, sanitize, approval gate — must still run).
- **Do NOT** invest in Web Speech until the W3C spec reaches Recommendation and Electron confirms support.

---

## Workstream 2: MCP Infrastructure

**Covers:** MCP Apps (Topic 1), MCP Registry (Other Tech), A2A Protocol enhancement (Other Tech), dynamic MCP registration (Plugins topic), MCP server tool optimization (Other Tech — parallel tool calling).

### Scope

Evolve Drive's MCP server (`mcpServer.ts`) as a unified infrastructure layer: better tool schemas, A2A compliance, UI resources, and preparation for dynamic registration.

| Component | Source topic | Status | Notes |
|-----------|-------------|--------|-------|
| MCP App UI resources | MCP Apps | PROTOTYPE | `ui://cursor-drive/agent-screen` |
| A2A compliance gaps | Other Tech | ADOPT | JSON-RPC, Agent Card skills, `input_required` state |
| Parallel tool calling annotations | Other Tech | ADOPT | `parallelSafe` metadata, description optimization |
| Dynamic MCP registration stub | Plugins & MCP | ADOPT | Detect `registerMcpServerDefinitionProvider`, fallback to `.cursor/mcp.json` |
| MCP Registry publication | Other Tech | DEFER | Spec early-stage; Drive works without auto-discovery |

### Dependencies

- `mcpServer.ts` — all changes target this file or its immediate helpers.
- `agentScreen.ts` / new `agentScreenApp.ts` — MCP App UI resources need a shared HTML builder.
- `operatorRegistry.ts` — A2A task endpoints map to operator lifecycle.
- Agent Teams (Workstream 3) — A2A `/tasks` endpoint needs role support after role templates land.

### Shared Interfaces

The MCP server is already the shared interface. All components register tools/resources on the same `McpServer` instance at `:7891`.

### Dedupe Notes

- **Do NOT** create a separate A2A server. A2A endpoints live on the same `mcpServer.ts` HTTP server (already the case).
- **Do NOT** duplicate Agent Screen HTML. MCP App UI resources and the VS Code webview must share an HTML builder (Option A: `agentScreenApp.ts`, Option B: shared core extraction).
- **Do NOT** add dynamic MCP registration as a hard dependency. It's a stub that detects API availability and falls back gracefully.
- **Do NOT** optimize tool descriptions before annotating parallel-safety. Do both in the same pass — they touch the same tool definitions.

---

## Workstream 3: Operator Intelligence

**Covers:** Agent Steering (Topic 3), Agent Teams (Topic 4), role templates, escalation protocol, permission enhancements, AgentBound (Other Tech), runtime monitoring.

### Scope

One unified track for making operators smarter, safer, and more self-aware. This is the highest-confidence workstream (both Agent Steering and Agent Teams are ADOPT with High confidence).

| Component | Source topic | Status | Notes |
|-----------|-------------|--------|-------|
| YAML declarative policies | Agent Steering | ADOPT (Phase 1) | Block/warn/log/throttle patterns in `drive-policies.yaml` |
| Graduated response | Agent Steering | ADOPT (Phase 2) | `log` and `throttle` gate actions, per-operator escalation tracking |
| Role templates | Agent Teams | ADOPT (Phase 1) | 5 roles with default preset + visibility |
| Escalation protocol | Agent Teams | ADOPT (Phase 1) | `escalationRequested` event, `operator_escalate` MCP tool |
| A2A role + status enrichment | Agent Teams | ADOPT (Phase 2) | Role in `/tasks`, `input_required` state mapping |
| Runtime monitoring | Agent Steering | ADOPT (Phase 3, deferred) | Lightweight operator behavior tracking |
| AgentBound MCP annotations | Other Tech | DEFER | Research-stage; `toolAllowlist.ts` is more advanced |
| Full orchestration engine | Agent Teams | DEFER | Premature; revisit at ≥3 user-reported coordination failures |

### Dependencies

- `operatorRegistry.ts` — role templates and escalation events extend `OperatorContext`.
- `approvalGates.ts` — YAML policies and graduated response extend `GateAction`.
- `toolAllowlist.ts` — YAML policies externalize `PRESET_CAPABILITIES`.
- `mcpServer.ts` — new `operator_escalate` tool, A2A enhancements.
- `commsAgent.ts` — escalation delivery.
- `pipeline.ts` — runtime monitor initialization.

### Shared Interfaces

```typescript
// Shared policy file: drive-policies.yaml
// Consumed by BOTH approvalGates.ts AND toolAllowlist.ts
// Schema: drive-policies.schema.json
```

The YAML policy file is the critical shared artifact. A single `policyLoader` function should parse it once and provide typed config to both `approvalGates.ts` and `toolAllowlist.ts`. Do NOT have each module parse the file independently.

### Dedupe Notes

- **Do NOT** build a separate policy loader per module. One loader, consumed by `approvalGates.ts` and `toolAllowlist.ts`.
- **Do NOT** build escalation (Agent Teams) before YAML policies (Agent Steering). Escalation rules reference policy thresholds defined in the YAML file.
- **Do NOT** build runtime monitoring before graduated response. The monitor triggers graduated responses — the response infrastructure must exist first.
- **Do NOT** implement AgentBound. `toolAllowlist.ts` already provides operator-aware permissions with cascade. AgentBound adds MCP-level annotations that are redundant with Drive's existing system.
- **Do NOT** build the full orchestration engine (Option B from Agent Teams). The operator registry's existing spawn/delegate/merge primitives handle current use cases.

---

## Workstream 4: Observability & Evals

**Covers:** Langfuse (Other Tech), Petri safety testing (Other Tech), HAL/WebArena evals (Other Tech), parallel tool calling performance monitoring.

### Scope

Unified monitoring layer for model calls, operator behavior, and (eventually) safety evaluation.

| Component | Source topic | Status | Notes |
|-----------|-------------|--------|-------|
| `src/observability.ts` — tracing wrapper | Other Tech (Langfuse) | PROTOTYPE | Wraps `modelSelector.ts` calls with span tracing |
| Langfuse self-hosted integration | Other Tech | PROTOTYPE | TypeScript SDK, self-hostable, ADR-0005 compatible |
| Parallel tool calling metrics | Other Tech | ADOPT | Measure parallelism rate, token savings |
| Petri safety simulations | Other Tech | DEFER | Revisit after escalation protocol ships |
| HAL/WebArena eval framework | Other Tech | DEFER | No pair-programming benchmarks exist yet |

### Dependencies

- `modelSelector.ts` — tracing wraps `selectModelForTier()` calls.
- `modelUtils.ts` — underlying model selection that tracing instruments.
- Runtime monitoring (Workstream 3) — observability traces complement steering metrics.
- Langfuse requires self-hosted infrastructure (PostgreSQL + ClickHouse) for ADR-0005 compliance.

### Shared Interfaces

```typescript
// src/observability.ts — trace interface
interface TraceSpan {
  tier: ModelTier;
  model: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  costEstimate?: number;
}
```

### Dedupe Notes

- **Do NOT** build separate tracing for each model call site. One wrapper in `observability.ts` instruments all calls through `modelSelector.ts`.
- **Do NOT** build custom eval infrastructure. Wait for operator usage data (via Langfuse) before designing Drive-specific evals.
- **Do NOT** run Petri simulations until the escalation protocol (Workstream 3) exists — Petri tests agent behavior under stress, which requires richer operator interactions.
- **Do NOT** conflate observability (what happened) with steering (what to do about it). The observability module produces data; the runtime monitor (Workstream 3) acts on it. They share event types but have separate responsibilities.

---

## Workstream 5: Extension Platform

**Covers:** VS Code extension improvements (Topic 6), LM Tools registration, webview accessibility, plugin installer enhancements (Topic 5), marketplace preparation.

### Scope

Polish and harden Drive's extension platform: accessibility compliance, API surface expansion, distribution reliability.

| Component | Source topic | Status | Notes |
|-----------|-------------|--------|-------|
| Agent Screen ARIA roles/regions | VS Code Extensions | ADOPT (Phase 1) | `agentScreen.ts` `buildHtml()` |
| `modelUtils.ts` selector hints | VS Code Extensions | ADOPT (Phase 1) | `onDidChangeChatModels` listener |
| LM Tools registration | VS Code Extensions | ADOPT (Phase 2) | New `lmToolsBridge.ts`, 4 tools |
| Plugin version checking | Plugins & MCP | ADOPT (Phase 1) | `.drive-version` marker in `pluginInstaller.ts` |
| Selective file updates | Plugins & MCP | ADOPT (Phase 1) | Hash comparison in `pluginInstaller.ts` |
| Auto-install on activation | Plugins & MCP | ADOPT (Phase 1) | Trigger in `extension.ts` |
| Marketplace metadata | Plugins & MCP | ADOPT (Phase 3) | Icon, license, VSIX packaging |

### Dependencies

- `agentScreen.ts` — accessibility fixes in `buildHtml()`.
- `modelUtils.ts` — model selection enhancements.
- `pluginInstaller.ts` — version checking and auto-install.
- `extension.ts` — auto-install trigger on activation.
- MCP Apps (Workstream 2) — if MCP App UI is adopted, webview accessibility work also benefits the shared HTML builder.

### Shared Interfaces

No new shared interfaces. All changes are additive to existing modules.

### Dedupe Notes

- **Do NOT** duplicate webview accessibility fixes between the VS Code webview and the MCP App HTML builder. If MCP Apps prototype proceeds, the shared HTML builder from Workstream 2 should include ARIA attributes from the start.
- **Do NOT** build the dual-path `ToolRegistry` abstraction (Option B from VS Code Extensions). LM Tools registration is additive; the MCP bridge remains primary.
- **Do NOT** pursue Chat Participant API or Chat Provider API. Both are unavailable in Cursor and offer no value over the MCP bridge.

---

## Cross-Workstream Dependencies

```
Workstream 3 (Operator Intelligence)
  └─ YAML policies must land before escalation (shared policy file)
  └─ Graduated response must land before runtime monitoring

Workstream 2 (MCP Infrastructure)
  └─ A2A role support depends on Workstream 3 role templates

Workstream 4 (Observability)
  └─ Langfuse traces complement Workstream 3 runtime monitoring
  └─ Petri depends on Workstream 3 escalation protocol

Workstream 1 (Voice Pipeline)
  └─ Independent — can run in parallel with all others

Workstream 5 (Extension Platform)
  └─ Webview ARIA work shared with Workstream 2 MCP Apps HTML builder
```
