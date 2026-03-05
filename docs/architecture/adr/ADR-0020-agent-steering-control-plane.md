# ADR-0020: Agent Steering and Control Plane

## Status
Proposed

## Metadata
- Date: 2026-02-24
- Deciders: Cursor Drive maintainers
- Related: ADR-0005 (Privacy-Strict Default), ADR-0010 (Tiered Model Routing), ADR-0014 (Agent Orchestration Strategy)

## Context

Drive has pipeline-stage guardrails that enforce safety at specific points:

- `approvalGates.ts` — blocks high-impact actions (PR creation, code changes) unless explicitly approved
- `toolAllowlist.ts` — restricts MCP tool access based on operator permission presets
- `sanitizer.ts` — redacts secrets from log output and prompt payloads

These are effective but static. The block/allow patterns are hardcoded, and there is no runtime visibility into operator behavior over time. Industry is converging on two complementary patterns:

1. **Declarative policy configuration** — users define guardrail rules in config files (YAML/JSON), not code
2. **Runtime governance** — systems monitor agent behavior at runtime and flag drift from expected patterns

Drive needs both: user-customizable policies (so teams can tune safety without forking the extension) and runtime monitoring (so operators that drift from expected behavior are flagged before causing harm).

## Decision

**ADOPT** incremental enhancement in two phases. No external framework dependency.

### Phase 1: YAML-Driven Policy Configuration

Extend `approvalGates.ts` to load block/warn patterns from user configuration:

```yaml
# cursorDrive.steering.policies (in VS Code settings or .cursor/drive.yaml)
policies:
  - pattern: "rm -rf"
    action: block
    reason: "Destructive command blocked by policy"
  - pattern: "force push"
    action: warn
    reason: "Force push requires explicit confirmation"
  - pattern: "production"
    action: warn
    reason: "Production-related action flagged for review"
```

- Policies are evaluated at Tier 0 (regex matching, no model call) per ADR-0010
- User-defined policies merge with built-in defaults; user policies cannot weaken built-in blocks
- Configuration schema extends `reference/config-schema.md`

### Phase 2: Runtime Monitoring Pipeline Stage

Add a monitoring stage to `pipeline.ts` that tracks operator behavior patterns:

- **Action frequency:** Flag operators that exceed a configurable action-per-minute threshold
- **Scope drift:** Flag operators that access files outside their declared working scope
- **Escalation rate:** Flag operators that repeatedly trigger approval gates (suggests the operator is fighting the guardrails)

Monitoring emits structured events to the activity feed (S-AS) via existing `share_screen_activity` MCP tool. No external telemetry — all data stays local per ADR-0005.

### Phase 3 (Deferred): SteeringEngine Class

A dedicated `SteeringEngine` class that unifies policy evaluation, monitoring, and response modification is deferred. The current module-per-concern architecture (`approvalGates.ts`, `toolAllowlist.ts`, `sanitizer.ts`, new monitor) is sufficient. Consolidation into a single engine is warranted only when cross-cutting policy logic (e.g., "if operator hit 3 warnings in the last minute, auto-downgrade its preset") requires shared state across modules.

## Alternatives Considered

1. **NVIDIA NeMo Guardrails** — Full-featured guardrail framework with Colang policy language. Rejected: requires GPU for optimal performance, Python runtime dependency, and is designed for conversational AI safety (topical rails, fact-checking) rather than IDE agent action governance. Overkill for Drive's use case.
2. **Guardrails AI** — Cloud-hosted validation service. Rejected: conflicts with ADR-0005 privacy-strict default (sends prompts to external service for validation). Local-only mode exists but requires Python runtime.
3. **Build SteeringEngine immediately** — Over-engineering for current needs. The phased approach validates the policy and monitoring patterns before committing to a unified engine.

## Consequences

**Positive:**
- Users can customize safety policies without code changes
- Runtime monitoring provides visibility into operator behavior
- No new dependencies — built on existing modules and Tier 0 evaluation
- Privacy-preserving: all monitoring data stays local

**Negative:**
- YAML policy schema must be designed carefully to avoid user confusion
- Runtime monitoring adds per-action overhead (mitigated by Tier 0 evaluation — regex, not model calls)
- Phase 2 monitoring thresholds require tuning; initial defaults may be too noisy or too quiet

## Migration Strategy

Swap-first. Both phases are additive:

- **Phase 1:** YAML policies extend the existing VS Code settings schema. `approvalGates.ts` gains a policy loader that reads from config. Existing hardcoded patterns become the built-in defaults. No breaking changes.
- **Phase 2:** Runtime monitor is a new pipeline stage in `pipeline.ts`. It observes actions after they pass approval gates. Existing pipeline stages are unchanged. The monitor is enabled via `cursorDrive.steering.enableMonitor` (default `true`).

## Open Questions

- **Policy YAML format:** The schema above is illustrative. Should patterns support glob syntax, regex, or both? Should there be a `scope` field to limit policies to specific operator roles?
- **Monitoring overhead threshold:** What is the acceptable per-action latency budget for the monitor stage? Target: <1ms (Tier 0 regex matching).
- **Alert fatigue:** How should monitoring alerts be surfaced without overwhelming the activity feed? Consider batching or severity-based filtering.
