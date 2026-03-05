# Agent Steering — Decision

**Prepared:** February 2026

---

## Scorecard

| Criterion | Score (1–5) | Rationale |
|---|---|---|
| **User value** | 4 | Reduces false-positive safety interruptions, enables team-customizable policies, adds runtime safety net for multi-operator workflows. Does not unlock a fundamentally new capability — enhances an existing one. |
| **Integration complexity** | 2 (low) | Drive already has the pipeline, operator lifecycle, and permission system. Enhancements are additive. No new external dependencies, no protocol changes, no breaking API changes. |
| **Maintenance burden** | 2 (low) | YAML policy format is simple and well-understood. Runtime monitor is a lightweight event listener (~120 lines). No new infrastructure services. Schema validation catches malformed policies at load time. |
| **Security / privacy risk** | 1 (minimal) | Agent steering is inherently a security improvement. No new data collection, no new network calls, no PII handling. Aligns with ADR-0005 privacy-strict default. Runtime monitoring operates on metadata (tool call counts), not content. |
| **Lock-in / portability risk** | 1 (minimal) | All implementation is local TypeScript. YAML policy format is standard. No vendor-specific SDK, no cloud service dependency. Pattern is portable to any agent system. |
| **Ecosystem maturity** | 4 | Pipeline-stage guardrails are production-proven (NeMo, Guardrails AI). Least-privilege cascades are well-established. Runtime governance is research-stage but the concepts are sound and Drive's implementation would be simple (counters + thresholds, not ML-based anomaly detection). |
| **Time to first value** | 4 | Phase 1 (YAML policy configs) delivers value in one development cycle. Extends existing code, no new infrastructure. Users gain customizable policies immediately. |

**Composite:** 18/35 weighted toward value and feasibility; 4/35 weighted toward risk (all low).

---

## Recommendation

### **ADOPT** — Incremental enhancement of existing system

Proceed with Option A (swap-first) from the implementation options. Enhance Drive's existing agent steering infrastructure with:

1. **Declarative policy configuration** (Phase 1) — YAML-based policy file unifying block/warn patterns and capability presets.
2. **Graduated response** (Phase 2) — extend gate actions with log and throttle levels; add per-operator escalation tracking.
3. **Runtime monitoring** (Phase 3, deferred) — lightweight operator behavior monitoring with graduated containment. Defer until operator usage patterns are established.

### Confidence: High

**Why high confidence:**

- **Validated pattern.** Drive already implements the pipeline-stage guardrail pattern that the industry considers best practice. The enhancement is an evolution, not an experiment.
- **Low integration risk.** All changes are additive to existing modules. No refactoring of pipeline architecture, no new external dependencies, no changes to the operator lifecycle model.
- **Clear gap.** The absence of runtime governance and declarative policies are objective gaps, not speculative improvements. Real multi-operator scenarios (3+ operators working in parallel) surface the need for better steering.
- **Bounded scope.** Phase 1 is ~130 lines of production code. Phase 2 adds ~80 lines. Phase 3 adds ~120 lines. Each phase is independently valuable and independently revertible.

---

## Rationale

### Drive already has the foundation

The four modules surveyed — `approvalGates.ts`, `toolAllowlist.ts`, `sanitizer.ts`, `pipeline.ts` — plus `operatorRegistry.ts` cover three of the four core agent steering concerns (permission enforcement, content guardrails, policy governance). The remaining concern (runtime monitoring) maps directly onto the existing operator event system.

### Industry validates the pattern

NeMo Guardrails' pipeline-stage architecture, which Drive independently implemented, is the most widely adopted guardrail pattern in production LLM applications. Drive's approach is already aligned with industry best practice.

### Enhancement is low-risk, high-value

- **Low risk:** No new dependencies, no new protocols, no architectural refactoring. Each phase is a small, focused PR.
- **High value:** Declarative policies enable team customization without extension updates. Graduated responses reduce false-positive user frustration. Runtime monitoring prevents operator drift in multi-operator scenarios.

### Start with declarative policies, add runtime monitoring later

Phase 1 (YAML policies) has immediate, concrete value and near-zero risk. Phase 3 (runtime monitoring) has higher value but depends on understanding real-world operator behavior patterns. Shipping Phase 1 first generates the usage data needed to calibrate Phase 3 thresholds.

---

## Decision Boundary

Re-evaluate this decision if:

- **Scale changes.** If Drive supports 20+ concurrent operators, reconsider Option B (unified SteeringEngine) from the implementation options.
- **External steering SDK emerges.** If NeMo Guardrails ships a TypeScript SDK or an equivalent TypeScript-native guardrail framework reaches maturity, evaluate adopting it instead of maintaining custom steering code.
- **False-positive rate exceeds 2%.** If real-world usage shows that regex-based patterns produce unacceptable false-positive rates, consider adding a Tier 1 classifier stage (per ADR-0010) for ambiguous cases.
- **Compliance requirements.** If enterprise users require audit-grade steering logs with tamper-evident records, escalate to Option B with a dedicated AuditLog component.
