# Agent Steering — Project Impact

**Prepared:** February 2026
**Scope:** How agent steering research applies to Cursor Drive — what's already in place, what's missing, what to add, dependencies, and risks.

---

## What Drive Already Has

Drive implements two of the four core agent steering patterns identified in the technology survey. This is a strong foundation.

### Pipeline-Stage Guardrails (implemented)

`pipeline.ts` orchestrates a multi-stage prompt pipeline:

```
wake/submit → tangent → filler-clean → glossary-expand → sanitize
  → prompt-optimize → approval-gate → context-inject → route → model-select
```

Each stage has a single responsibility and passes its output to the next. This matches the pipeline-stage pattern validated by NeMo Guardrails and is the architectural backbone of Drive's safety model.

### Least-Privilege Permission Cascade (implemented)

`operatorRegistry.ts` enforces permission hierarchy at spawn time:

- **Depth-0 operators** (user-spawned) default to `standard`.
- **Depth-1+ operators** (spawned by other operators) default to `readonly`.
- **Cascade rule:** child preset is capped by parent's effective preset via `minPreset()`.
- **Config overrides** can only restrict, never grant beyond the registry preset.

`toolAllowlist.ts` enforces these presets at capability-check time with three tiers: `readonly` (fileRead, gitRead, modelCall), `standard` (+ fileWrite, terminalExecute, gitWrite), `full` (+ webSearch).

### Approval Gates (implemented)

`approvalGates.ts` provides binary block/warn safety gates:

- **Block patterns** — `rm -rf`, `del /f /s /q`, `format c:`, `rmdir /s` → hard block, no override.
- **Warn patterns** — `revert`, `hard reset`, `force push`, `drop database`, etc. → modal confirmation dialog.
- **Configurable** — users can add custom block/warn patterns via `cursorDrive.approvalGates.blockPatterns` and `.warnPatterns` settings.

### Injection Defense (implemented)

`sanitizer.ts` strips injection patterns from prompts:

- Detects `ignore previous instructions`, `<system>` tags, `[END OF PROMPT]`, `NEW INSTRUCTIONS:`, jailbreak tokens.
- Truncates prompts exceeding configurable max length (default 2000 chars).
- Reports which patterns were found for audit logging.

---

## Gaps

### Gap 1: No Runtime Governance

Drive checks prompts at submission time (input guardrails) and responses at return time (output guardrails). There is **no continuous monitoring during operator execution**.

An operator that passes initial approval can proceed to execute an unbounded sequence of tool calls without further steering checks. If an operator's behavior drifts from its assigned task — e.g., a "refactor auth" operator starts modifying database schemas — nothing detects or intervenes.

**Risk without mitigation:** Operator drift goes undetected until the user manually notices unexpected changes. In multi-operator scenarios with background operators, drift may not be noticed at all.

**What the research suggests:** MI9's graduated containment model (log → warn → throttle → pause → terminate) and AgentGuardian's execution trace monitoring directly address this gap. Drive's operator lifecycle states (`active`, `background`, `paused`, `completed`) already provide the state machine needed for graduated intervention.

### Gap 2: No Declarative Policy Configuration

Drive's safety policies are defined in three places:

1. **Hard-coded RegExp arrays** in `approvalGates.ts` (default block/warn patterns).
2. **VS Code settings** (`cursorDrive.approvalGates.blockPatterns`, `.warnPatterns`) — flat string arrays compiled to RegExp at runtime.
3. **Hard-coded presets** in `toolAllowlist.ts` (`PRESET_CAPABILITIES` object).

There is no unified policy format. Adding a new policy requires either modifying source code or understanding the specific VS Code setting format. Policies cannot be version-controlled independently of the extension, shared across teams, or audited as a cohesive set.

**Risk without mitigation:** Policy management does not scale. Teams with different security requirements cannot easily customize guardrails. Policy changes require either extension updates or manual settings edits.

**What the research suggests:** NeMo's Colang files and the broader industry trend toward YAML/JSON policy definitions. A single `drive-policies.yaml` (or equivalent) would unify block/warn patterns, capability presets, and runtime monitoring thresholds in one auditable, version-controlled file.

### Gap 3: No Graduated Response

`approvalGates.ts` has two response levels: `warn` (modal dialog) and `block` (hard stop). There is no intermediate or escalating response. An operator that triggers a warn pattern once gets the same treatment as one that triggers it repeatedly.

**What the research suggests:** MI9's graduated containment: first occurrence → log; repeated → warn; persistent → throttle (rate-limit tool calls); continued → pause operator; extreme → terminate. This aligns with Drive's existing operator status lifecycle.

---

## What to Add

### 1. Runtime Drift Detection for Operators

Add a lightweight monitoring stage to the pipeline (or as a parallel observer) that tracks:

- **Tool call frequency** — per operator, per capability, per time window.
- **Task scope adherence** — compare recent tool calls against the operator's assigned task description.
- **Anomaly detection** — flag statistical deviation from the operator's baseline behavior profile.

When drift is detected, trigger graduated containment using existing operator lifecycle transitions: `active` → `paused` (with notification to user via Agent Screen).

### 2. User-Customizable Policy YAML

Introduce a `drive-policies.yaml` (workspace-local or user-scoped) that consolidates:

- Block patterns (replacing `cursorDrive.approvalGates.blockPatterns` setting).
- Warn patterns (replacing `cursorDrive.approvalGates.warnPatterns` setting).
- Capability presets (augmenting `cursorDrive.agents.permissions.overrides`).
- Runtime monitoring thresholds (tool call rate limits, drift sensitivity).

The extension loads this file at activation and watches for changes. VS Code settings remain as a fallback for users who prefer the settings UI.

### 3. Enhanced Approval Gates with Graduated Response

Extend `approvalGates.ts` to support:

- **Log level** — record the event, no user interruption. For first-time low-severity triggers.
- **Throttle level** — rate-limit the operator's tool calls for a cooldown period.
- **Escalation tracking** — count triggers per operator per session; escalate response level on repeated triggers.

---

## Dependencies

**None blocking.** Drive already has the architectural foundation:

- `pipeline.ts` provides the stage pipeline for adding a monitoring stage.
- `operatorRegistry.ts` provides the operator lifecycle states for graduated containment.
- `toolAllowlist.ts` provides the capability enforcement layer for dynamic permission adjustment.
- `approvalGates.ts` provides the safety gate pattern for enhanced response levels.

All enhancements are additive. No external libraries or services required.

---

## Risks

### Over-Engineering Guardrails

**Risk:** Building a comprehensive steering engine that is more complex than Drive's current scale requires. Drive currently supports 3–10 concurrent operators. A full FSM-based governance engine designed for hundreds of agents would be premature.

**Mitigation:** Start with the simplest useful increment — YAML policy configs. Add runtime monitoring only after operator usage patterns are established and the need is validated by real user scenarios.

### False-Positive Blocks Frustrating Users

**Risk:** Overly aggressive guardrails block legitimate operations. The research benchmark is 0.38% false-refusal rate (Constitutional AI classifiers). Drive's current regex-based block patterns could have a higher false-positive rate in practice, especially with custom user-defined patterns.

**Mitigation:** Default policies should be conservative (few patterns, high confidence). The graduated response model (log before warn, warn before block) reduces user-facing interruptions. Provide clear override mechanisms and policy audit tooling.

### Policy Configuration Complexity

**Risk:** A YAML policy format adds a learning curve. Users who currently configure block patterns via VS Code settings may find a separate policy file confusing.

**Mitigation:** VS Code settings remain as first-class fallback. The YAML file is opt-in for teams that need structured, version-controlled policies. Ship with a well-commented default template.

### Runtime Monitoring Overhead

**Risk:** Continuous monitoring of operator behavior adds latency and resource consumption.

**Mitigation:** MiniScope demonstrates 1–6% overhead for permission hierarchy monitoring. Drive's monitoring should be lighter (simple counters and thresholds, not full trace analysis). Profile before and after to validate.
