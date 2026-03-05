# Cross-Topic Synthesis: Recommended Architecture Changes

**Date:** February 2026

Cross-topic integration design: new modules, enhanced modules, swap-first strategy, and standardization targets.

---

## New Modules

### 1. `src/stt.ts` — STT Abstraction Layer

**Purpose:** Fill Drive's biggest gap (ADR-0012). Provide a backend-agnostic STT interface that `pipeline.ts` calls as stage 0.

**Architecture:**

```
                    ┌── WhisperKit subprocess (privacy-first, ADR-0005)
Audio stream ──► stt.ts ──┤
                    ├── OpenAI Realtime API (opt-in cloud, feature-flagged)
                    └── Web Speech (future, DEFER)
```

**Interface:**

```typescript
export interface SttBackend {
  readonly name: string;
  start(audioStream: ReadableStream<Float32Array>): void;
  stop(): void;
  onTranscript: (text: string, isFinal: boolean) => void;
  onError: (error: Error) => void;
}

export interface SttConfig {
  backend: "whisperkit" | "realtime" | "webspeech";
  modelPath?: string;          // WhisperKit model location
  language?: string;           // ISO 639-1
  vadThresholdMs?: number;     // Voice activity detection silence threshold
}

export function createSttBackend(config: SttConfig): SttBackend;
export function transcribe(audio: Float32Array[]): Promise<string>;  // one-shot convenience
```

**Backend selection:** Configuration-driven via `cursorDrive.stt.backend` (default: `"whisperkit"`). Falls back gracefully — if WhisperKit binary is not found, log warning and disable STT.

**Privacy gate:** Realtime API backend requires `cursorDrive.stt.allowCloudAudio: true` (default: `false`). Aligns with ADR-0005 strict default.

**Estimated effort:** ~200 lines for WhisperKit subprocess backend + interface. ~100 additional for Realtime API backend.

---

### 2. `src/steeringEngine.ts` — Unified Steering (Future, Option B)

**Note:** This module is recommended for Phase 3+ only, after Option A (incremental enhancement of existing modules) proves the runtime monitor's value. Documented here for architectural planning.

**Purpose:** Unify `approvalGates.ts`, `toolAllowlist.ts`, `sanitizer.ts`, and `runtimeMonitor.ts` under a single control plane.

For the immediate term, **do NOT build this.** Instead, enhance the existing modules:

- `approvalGates.ts` — add YAML policy loading, `log`/`throttle` gate actions
- `toolAllowlist.ts` — load presets from shared YAML file
- New `runtimeMonitor.ts` — lightweight event listener on `operatorRegistry.events`

The `SteeringEngine` facade becomes worthwhile when: (a) runtime monitoring is in production, (b) audit logging is a user-facing feature, (c) operator scale reaches 20+.

**Estimated effort (future):** ~150 lines facade + refactoring of existing modules.

---

### 3. `src/observability.ts` — Tracing Wrapper

**Purpose:** Instrument all model calls with span tracing. Langfuse-compatible but not Langfuse-dependent.

**Architecture:**

```
modelSelector.ts ──► observability.wrap(tier, fn) ──► Langfuse SDK (if enabled)
                                                   └── Console trace (always, debug level)
```

**Interface:**

```typescript
export interface TraceSpan {
  traceId: string;
  spanId: string;
  tier: ModelTier;
  model: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  costEstimate?: number;
  operatorId?: string;
  metadata?: Record<string, unknown>;
}

export function wrapModelCall<T>(
  tier: ModelTier,
  operatorId: string | undefined,
  fn: () => Promise<T>
): Promise<T>;

export function getTraceHistory(limit?: number): TraceSpan[];
```

**Activation:** Gated by `cursorDrive.observability.enabled` (default: `false`). When disabled, `wrapModelCall` is a no-op pass-through with zero overhead.

**Langfuse integration:** Optional. When `cursorDrive.observability.langfuseUrl` is set, traces are forwarded to Langfuse. Self-hosted Langfuse is recommended for ADR-0005 compliance.

**Estimated effort:** ~170 lines.

---

### 4. `src/runtimeMonitor.ts` — Operator Behavior Monitor (Phase 3)

**Purpose:** Track operator tool call patterns and trigger graduated responses when behavior drifts.

**Architecture:**

```
operatorRegistry.events ──► runtimeMonitor.check(operatorId, action)
                             ├── Within thresholds → log
                             ├── Approaching limits → warn user
                             └── Exceeds limits → pause operator via registry
```

**Interface:**

```typescript
export interface MonitorConfig {
  maxToolCallsPerMinute: number;      // default: 30
  maxFileWritesPerMinute: number;     // default: 10
  maxEscalationsPerSession: number;   // default: 5
  alertThresholdPercent: number;      // default: 80 (warn at 80% of limit)
}

export class RuntimeMonitor {
  constructor(registry: OperatorRegistry, config?: Partial<MonitorConfig>);
  start(): void;
  stop(): void;
  check(operatorId: string, action: string): void;
  getMetrics(operatorId: string): OperatorMetrics;
}
```

**Estimated effort:** ~120 lines. Deferred until operator usage patterns are established.

---

## Enhanced Modules

### 5. Enhanced `pipeline.ts` — STT Stage + Runtime Monitor Init

**Current state:** 11-stage text processing pipeline (wake/submit → tangent → filler-clean → glossary → sanitize → optimize → approval-gate → persistent-context → session-context → route → model-select).

**Changes:**

| Change | Where in pipeline | Effort |
|--------|-------------------|--------|
| Add STT stage 0 | Before wake/submit word detection | ~20 lines |
| Initialize runtime monitor | After pipeline setup (async, non-blocking) | ~15 lines |

**STT integration point:**

```
[NEW] sttTranscribe ──► wake/submit word ──► tangent ──► filler-clean ──► ...
```

When STT is active, audio is transcribed to text before entering the existing pipeline. When STT is inactive (default), the pipeline behaves identically to today. The STT stage is a pure prepend — no existing stages change.

**Swap-first strategy:** The STT stage checks `cursorDrive.stt.enabled` (default: `false`). When disabled, the stage is a no-op. Existing tests pass without modification.

---

### 6. Enhanced `mcpServer.ts` — MCP Apps + A2A + Role Support

**Current state:** 30+ MCP tools, A2A task endpoints, HTTP server on `:7891`.

**Changes:**

| Change | Source workstream | Effort |
|--------|-------------------|--------|
| Register `ui://cursor-drive/agent-screen` resource | MCP Infrastructure | ~30 lines |
| Augment tool results with `_meta.ui.resourceUri` | MCP Infrastructure | ~60 lines |
| A2A JSON-RPC compliance (wrap REST in JSON-RPC envelope) | MCP Infrastructure | ~50 lines |
| A2A Agent Card: add `skills` array | MCP Infrastructure | ~20 lines |
| Map approval gate → A2A `input_required` state | MCP Infrastructure | ~20 lines |
| Add `role` parameter to `operator_spawn` tool | Operator Intelligence | ~15 lines |
| Add `operator_escalate` tool | Operator Intelligence | ~40 lines |
| Enhance `/tasks` with role + richer status | Operator Intelligence | ~30 lines |
| Annotate tools with `parallelSafe` metadata | MCP Infrastructure | ~40 lines |
| Optimize tool descriptions (reduce token count ≥20%) | MCP Infrastructure | ~30 lines |

**Swap-first strategy:** MCP App resources gated by `cursorDrive.mcp.enableApps` (default: `false`). A2A enhancements are backward-compatible — existing REST callers continue working alongside JSON-RPC. Role parameter is optional in `operator_spawn`.

---

### 7. Enhanced `operatorRegistry.ts` — Roles + Escalation

**Current state:** Full lifecycle (spawn/switch/pause/resume/dismiss/merge/delegate), permission cascade, depth hierarchy, event system.

**Changes:**

| Change | Effort |
|--------|--------|
| Add `OperatorRole` type: `"implementer" \| "reviewer" \| "tester" \| "researcher" \| "planner"` | ~10 lines |
| Add `role?: OperatorRole` and `escalationThreshold?: number` to `OperatorContext` | ~5 lines |
| Role defaults table (preset + visibility per role) | ~15 lines |
| Apply role defaults in `spawn()` when `role` is provided | ~15 lines |
| Add `escalationRequested` event | ~15 lines |
| `emitEscalation(id, reason, requiredCapability)` method | ~10 lines |

**Swap-first strategy:** `role` is optional in `SpawnOptions`. If not provided, behavior is identical to today. Existing tests pass without modification. Role defaults can be overridden by explicit `preset` and `visibility` in `SpawnOptions`.

---

### 8. Enhanced `approvalGates.ts` — YAML Policies + Graduated Response

**Current state:** 4 block patterns, 10 warn patterns. Binary action: `allow | warn | block`. Config via VS Code settings only.

**Changes:**

| Change | Effort |
|--------|--------|
| Load patterns from `drive-policies.yaml` (merge with VS Code settings) | ~40 lines |
| Extend `GateAction`: add `"log"` and `"throttle"` | ~15 lines |
| Per-operator escalation tracking (trigger counts per session) | ~25 lines |
| Escalation rules in YAML: `repeat_threshold` → `escalate_to` | ~20 lines |

**Swap-first strategy:** When no `drive-policies.yaml` exists, behavior is identical to today (hard-coded defaults + VS Code settings). The YAML file is additive, not required.

---

### 9. Enhanced `toolAllowlist.ts` — YAML Preset Definitions

**Current state:** `PRESET_CAPABILITIES` is a hard-coded const. Three presets: readonly, standard, full.

**Changes:**

| Change | Effort |
|--------|--------|
| Load preset definitions from `drive-policies.yaml` (fallback to hard-coded) | ~40 lines |
| Share YAML parser with `approvalGates.ts` via common loader | ~10 lines (import) |

**Swap-first strategy:** `PRESET_CAPABILITIES` becomes a cached getter that reads YAML on first access and re-reads on file change. When no YAML exists, returns the current hard-coded values.

---

## Standardization Targets

### Event Types

Standardize operator event types across the codebase:

```typescript
// Currently in operatorRegistry.ts — formalize and export
export type OperatorEventType =
  | "operatorCompleted"
  | "operatorProgress"
  | "operatorError"
  | "taskDelegated"
  | "escalationRequested"  // new (Agent Teams)
  | "operatorMonitorAlert"; // new (Runtime Monitor)
```

### Operator Lifecycle Hooks

Formalize pre/post hooks for operator state transitions:

```typescript
export interface OperatorLifecycleHooks {
  onBeforeSpawn?: (options: SpawnOptions) => SpawnOptions | false;
  onAfterSpawn?: (operator: OperatorContext) => void;
  onBeforeDismiss?: (operator: OperatorContext) => boolean;
  onAfterDismiss?: (operator: OperatorContext) => void;
  onEscalation?: (operatorId: string, reason: string) => void;
}
```

These hooks enable the runtime monitor and observability layer to instrument operator lifecycle without modifying `operatorRegistry.ts` internals.

### Permission Interfaces

The shared `drive-policies.yaml` schema standardizes how permissions, gate rules, and monitoring thresholds are defined:

```yaml
# drive-policies.yaml — single source of truth
presets:
  readonly: [fileRead, gitRead, modelCall]
  standard: [fileRead, fileWrite, terminalExecute, gitRead, gitWrite, modelCall]
  full: [fileRead, fileWrite, terminalExecute, gitRead, gitWrite, webSearch, modelCall]

gates:
  - pattern: "rm\\s+-rf"
    action: block
  - pattern: "force\\s+push"
    action: warn
    escalation:
      repeat_threshold: 3
      escalate_to: block

monitoring:
  maxToolCallsPerMinute: 30
  maxFileWritesPerMinute: 10
  alertThresholdPercent: 80
```

### MCP Tool Schema Conventions

Standardize across all 30+ MCP tools in `mcpServer.ts`:

| Convention | Example |
|-----------|---------|
| `parallelSafe: true/false` metadata | Read-only tools are parallel-safe; state-changing tools are not |
| Description ≤50 tokens | Reduce total tool description payload by ≥20% |
| Consistent `z.string().describe()` format | Short phrase, no trailing period |
