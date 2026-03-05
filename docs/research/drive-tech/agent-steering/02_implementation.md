# Agent Steering — Implementation Options

**Prepared:** February 2026
**Scope:** Current state, integration points, implementation options, testing strategy, and rollout plan for agent steering enhancements in Cursor Drive.

---

## Current State

### `approvalGates.ts` — Safety Gates

- **Block patterns:** 4 default RegExp patterns (rm -rf, del /f /s /q, format c:, rmdir /s). Hard block with error message — no user override.
- **Warn patterns:** 10 default RegExp patterns (revert, hard reset, force push, drop database, etc.). Modal confirmation dialog — user can proceed or cancel.
- **Custom patterns:** Users add additional block/warn patterns via VS Code settings (`cursorDrive.approvalGates.blockPatterns`, `.warnPatterns`). Compiled to RegExp at runtime, cached until config changes.
- **Two check functions:** `checkPrompt()` scans the full prompt text. `checkResponse()` extracts code blocks first, then scans them (or the full response if no code blocks found).
- **API:** `getGateResult(text)` returns `{ action: "allow" | "warn" | "block", reason?, pattern? }`.

### `toolAllowlist.ts` — Permission Enforcement

- **Three presets:** `readonly` (fileRead, gitRead, modelCall), `standard` (+ fileWrite, terminalExecute, gitWrite), `full` (+ webSearch).
- **Two API paths:**
  - Name-based: `checkPermission(agentName, capability)` — uses config default + per-name overrides.
  - Operator-aware: `checkPermissionForOperator(op, capability)` — uses registry-stored preset (cascade applied at spawn) + per-name config overrides. Deny always wins.
- **No runtime context:** Permissions are static for the lifetime of an operator. No adjustment based on observed behavior.

### `sanitizer.ts` — Injection Defense

- **6 injection patterns:** `ignore previous instructions`, `<system>` tags, `[END OF PROMPT]`, `disregard above`, `NEW INSTRUCTIONS:`, jailbreak tokens (DAN, GPT-4 DAN).
- **Truncation:** Configurable max length (default 2000 chars), smart word-boundary truncation with `[truncated]` marker.
- **Return value:** Reports which patterns were found (`injectionPatternsFound[]`) for audit purposes.

### `pipeline.ts` — Orchestration

- **Full stage sequence:** wake/submit word → tangent → filler-clean → glossary-expand → sanitize → prompt-optimize → approval-gate → persistent-context-inject → session-context-inject → route → model-select.
- **Approval gate integration:** Checks `getGateResult()` inline. Block returns `{ ok: false, blocked: true }`. Warn triggers `checkPrompt()` modal dialog.
- **No post-execution monitoring:** Pipeline runs once at prompt submission. No further steering during or after agent execution.

### `operatorRegistry.ts` — Operator Lifecycle

- **Status states:** `active`, `background`, `completed`, `merged`, `paused`.
- **Cascade:** Child operators capped by parent's effective preset via `minPreset()`.
- **Event system:** `operatorCompleted`, `operatorProgress`, `operatorError`, `taskDelegated` events.
- **Cascade dismiss:** Dismissing an operator cascades to all children.

---

## Integration Points

### 1. `pipeline.ts` — Add Runtime Monitoring Stage

**Where:** After the pipeline's initial run, as a parallel observer that monitors ongoing operator activity.

**Mechanism:** Register a listener on `operatorRegistry.events` for `operatorProgress` events. Each event triggers a lightweight steering check:

```
operatorProgress event → runtimeMonitor.check(operatorId, action)
  → if anomaly: graduated response via operatorRegistry state transitions
```

The monitor does not add a stage to the synchronous pipeline. It runs asynchronously on every operator action, keeping prompt submission latency unchanged.

### 2. `toolAllowlist.ts` — Enhance with Declarative Config

**Where:** Replace `PRESET_CAPABILITIES` hard-coded object with a loader that reads from `drive-policies.yaml` (falling back to the current hard-coded defaults).

**Mechanism:** On activation, load YAML policy file → parse into `PresetCapabilities` map → cache. Watch file for changes → invalidate cache. The existing `checkPermissionForOperator()` API stays unchanged; only the data source changes.

### 3. `approvalGates.ts` — Add Programmable Policies

**Where:** Extend `GateAction` type from `"allow" | "warn" | "block"` to `"allow" | "log" | "warn" | "throttle" | "block"`. Load block/warn/log/throttle patterns from `drive-policies.yaml` instead of (only) VS Code settings.

**Mechanism:** The YAML policy file defines pattern groups with actions and escalation rules:

```yaml
gates:
  - pattern: "rm\\s+-rf"
    action: block
  - pattern: "force\\s+push"
    action: warn
    escalation:
      repeat_threshold: 3
      escalate_to: block
```

`getCachedGateConfig()` merges YAML policies with VS Code settings (VS Code settings remain as override layer).

---

## Option A: Swap-First (Incremental Enhancement)

**Philosophy:** Extend existing modules with minimal architectural change. Each enhancement is a PR-sized diff.

### Changes

| Module | Change | ~Lines |
|---|---|---|
| `approvalGates.ts` | Add `"log"` and `"throttle"` gate actions. Add escalation tracking (per-operator trigger counts). Load patterns from YAML file (with settings fallback). | ~80 |
| `toolAllowlist.ts` | Add YAML policy loader for preset definitions. `PRESET_CAPABILITIES` becomes a cached getter instead of a const. | ~50 |
| `runtimeMonitor.ts` (new) | Lightweight module that listens to operator events, tracks tool call frequency per operator, compares against thresholds, triggers graduated responses via `operatorRegistry` state transitions. | ~120 |
| `pipeline.ts` | Initialize runtime monitor after pipeline setup. Wire it to `operatorRegistry.events`. | ~15 |
| `drive-policies.schema.json` (new) | JSON Schema for the YAML policy file. Enables validation and editor autocompletion. | ~40 |

**Total:** ~300 lines of new/modified production code.

### Strengths

- Low risk. Each change is independently testable and deployable.
- No architectural refactoring. Existing module boundaries preserved.
- Incremental rollout: ship YAML policies first, runtime monitoring second.

### Weaknesses

- Steering logic remains spread across three modules. No single "control plane" view.
- Policy loading duplicated (YAML parsing in both `approvalGates` and `toolAllowlist`).
- Runtime monitor is a new module but not deeply integrated with the existing safety stack.

---

## Option B: Clean Refactor (Unified Steering Engine)

**Philosophy:** Extract a `SteeringEngine` class that unifies approval gates, tool allowlist, sanitizer, and runtime monitoring under a single control plane.

### Architecture

```
SteeringEngine
├── PolicyLoader        — reads drive-policies.yaml, merges with VS Code settings
├── GateEvaluator       — evaluates block/warn/log/throttle rules (replaces approvalGates logic)
├── PermissionResolver  — resolves operator capabilities (replaces toolAllowlist logic)
├── SanitizeStage       — injection pattern stripping (wraps sanitizer)
├── RuntimeMonitor      — tracks operator behavior, triggers graduated responses
└── AuditLog            — records all steering decisions for transparency
```

### Changes

| Module | Change | ~Lines |
|---|---|---|
| `steeringEngine.ts` (new) | Facade class coordinating all steering subsystems. Single `evaluate(prompt, operator)` and `monitor(operatorEvent)` API. | ~150 |
| `policyLoader.ts` (new) | YAML/JSON policy file parser with schema validation. Watches for file changes. Merges with VS Code settings. | ~80 |
| `runtimeMonitor.ts` (new) | Same as Option A but integrated as a `SteeringEngine` component with access to policy thresholds and audit log. | ~120 |
| `approvalGates.ts` | Retain as thin wrapper delegating to `SteeringEngine.gateEvaluator`. Backward-compatible API preserved. | ~-20 (simplification) |
| `toolAllowlist.ts` | Retain as thin wrapper delegating to `SteeringEngine.permissionResolver`. Backward-compatible API preserved. | ~-15 (simplification) |
| `pipeline.ts` | Replace direct `approvalGates` and `sanitizer` calls with `steeringEngine.evaluate()`. | ~10 |
| `drive-policies.schema.json` (new) | Same as Option A. | ~40 |

**Total:** ~400 lines of new/modified production code. Net new after simplification: ~350.

### Strengths

- Single control plane. All steering decisions visible in one place.
- Policy loading centralised. One parser, one cache, one file watcher.
- Runtime monitor has full context (gate history, permission state, audit log).
- Easier to test holistically — one `SteeringEngine` instance with mock dependencies.

### Weaknesses

- Larger initial diff. Higher review burden.
- Existing callers of `approvalGates` and `toolAllowlist` need to be updated (or thin wrappers maintained).
- Risk of over-engineering if Drive's scale doesn't grow beyond 3–10 operators.

---

## Recommendation

**Option A (swap-first)** for the first iteration. Rationale:

1. Drive's current scale (3–10 operators) does not require a unified control plane.
2. Each enhancement can ship independently: YAML policies → graduated responses → runtime monitoring.
3. If the runtime monitor proves valuable, refactor to Option B in a subsequent cycle when the interface is battle-tested.

Option B becomes the right choice when: (a) the runtime monitor is in production, (b) policy management spans more than two modules, and (c) audit logging is a user-facing feature.

---

## Tests and Evaluations

### Policy Evaluation Benchmarks

- **Gate throughput:** Measure `getGateResult()` latency with 50, 100, 200 patterns. Target: <1ms for 100 patterns.
- **YAML load time:** Measure policy file parse + validation time for realistic policy files (10–50 rules). Target: <50ms.
- **Cache invalidation:** Verify that file-watcher triggers re-parse without stale reads.

### False-Positive Rate Measurement

- **Test corpus:** Collect 500+ real-world coding prompts (from Cursor forums, internal usage, open-source agent benchmarks).
- **Measure:** False-positive rate (legitimate prompts blocked or warned) for default patterns and representative custom patterns.
- **Target:** <1% false-positive rate for default patterns. Benchmark against the 0.38% rate from Constitutional AI classifiers.

### Adversarial Prompt Testing

- **Injection resistance:** Test sanitizer against known prompt injection attacks (OWASP LLM Top 10 prompt injection examples, Garak attack library).
- **Pattern evasion:** Test block/warn patterns against common evasion techniques (unicode substitution, whitespace injection, case variation).
- **Escalation testing:** Verify graduated response escalation with simulated repeated triggers.

### Runtime Monitor Testing

- **Drift detection accuracy:** Simulate operator behavior profiles with injected anomalies. Measure detection rate and false-alarm rate.
- **Graduated response correctness:** Verify state transitions (log → warn → throttle → pause) trigger at correct thresholds.
- **Performance overhead:** Profile runtime monitor event processing. Target: <5ms per event, <2% CPU overhead.

---

## Rollout Plan

### Phase 1: Declarative Policy Configuration

**Scope:** YAML policy file support for block/warn patterns and capability presets.

**Steps:**
1. Define `drive-policies.schema.json` (JSON Schema for the YAML format).
2. Implement policy loader in `approvalGates.ts` — merge YAML patterns with VS Code settings.
3. Implement policy loader in `toolAllowlist.ts` — load preset definitions from YAML (fallback to hard-coded defaults).
4. Ship default `drive-policies.example.yaml` with documentation.
5. Tests: policy loading, merge precedence, schema validation, cache invalidation.

**Timeline:** ~1 development cycle.

### Phase 2: Graduated Response

**Scope:** Extend `GateAction` with `"log"` and `"throttle"` actions. Add per-operator escalation tracking.

**Steps:**
1. Extend `GateAction` type and `applyGate()` function.
2. Add escalation state tracking (trigger counts per operator per session).
3. Wire throttle action to operator rate limiting (configurable via YAML).
4. Tests: escalation sequences, throttle timing, reset on operator dismiss.

**Prerequisite:** Phase 1 (policies define escalation rules).

### Phase 3: Runtime Monitoring

**Scope:** Continuous operator behavior monitoring with graduated containment.

**Steps:**
1. Create `runtimeMonitor.ts` — listen to operator events, track tool call patterns.
2. Wire to `operatorRegistry.events` from `pipeline.ts` initialization.
3. Define monitoring thresholds in `drive-policies.yaml`.
4. Implement graduated response: detect drift → log → warn → pause operator.
5. Surface monitoring status in Agent Screen panel.
6. Tests: drift detection, graduated response, performance profiling.

**Prerequisite:** Phase 2 (graduated response infrastructure). Defer until operator usage patterns are established from real-world usage.
