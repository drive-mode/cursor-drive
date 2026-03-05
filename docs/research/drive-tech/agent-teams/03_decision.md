# Agent Teams — Decision

**Topic:** Adoption scorecard and recommendation for multi-agent orchestration enhancements in Cursor Drive.

**Date:** February 2026

---

## 1. Scorecard

| Dimension | Score (1–5) | Rationale |
|---|---|---|
| **User value** | 3 | Role templates improve operator UX and defaults. Escalation closes a real usability gap. However, most users currently run 1–2 operators — advanced orchestration value scales with operator count. |
| **Integration complexity** | 2 | Low. All changes extend existing interfaces (`OperatorContext`, `SpawnOptions`, MCP tools). No new abstractions required for Option A. No external dependencies. |
| **Maintenance burden** | 2 | Low. Role templates are a type + defaults table. Escalation is an event + handler. No new runtime, no new process, no new protocol dependency. |
| **Security / privacy risk** | 1 | Minimal. Escalation introduces a permission-request path, but it flows through existing approval gates. No new data exposure — operators already see scoped context. |
| **Lock-in / portability risk** | 1 | None. A2A is an open protocol. Role templates are internal types. No framework dependency introduced. Drive's orchestration remains self-contained. |
| **Ecosystem maturity** | 4 | The patterns (role separation, handoff, escalation) are well-established across LangGraph, CrewAI, OpenAI SDK. A2A protocol is stabilizing (v0.3.0 → RC v1.0). Industry convergence reduces risk. |
| **Time to first value** | 3 | Option A (role templates + escalation) delivers in 1–2 sessions. A2A enhancement in 1 additional session. Full orchestration engine would take 3–5 sessions for unclear benefit. |

**Aggregate:** Low complexity, low risk, moderate value — incremental adoption is the right strategy.

---

## 2. Recommendation

### ADOPT: Incremental Enhancement (Option A)

**What:** Add role templates to operator spawn config, escalation protocol, and enhance A2A endpoints.

**Confidence:** High

**Rationale:**

1. **Drive's operator system is already well-architected.** The existing spawn/delegate/merge/dismiss primitives map 1:1 to industry patterns. The gap is semantic (operators lack formalized roles) and behavioral (no escalation path), not structural.

2. **Role templates are zero-risk, immediate value.** Adding an optional `role` field with sensible defaults (reviewer → readonly, implementer → standard) requires ~60 lines in `operatorRegistry.ts` and improves the operator UX without changing any existing behavior.

3. **Escalation closes a known gap.** When a `readonly` researcher discovers it needs to write a file, it currently has no recourse. An escalation event gives the user visibility and control. This aligns with Drive's approval-gate philosophy (ADR-0005, policy-pack).

4. **A2A enhancement is incremental.** The endpoints already exist. Adding role support and richer status mapping is a small delta on `mcpServer.ts`.

### DEFER: Full Orchestration Engine (Option B)

**What:** LangGraph-style state graph engine for complex multi-operator workflows.

**Confidence:** Medium

**Rationale:**

1. **Drive operators are Cursor agents, not arbitrary LLM workers.** They operate within Cursor's native Agent/Plan/Ask/Debug modes. Complex state graphs assume a level of workflow complexity that Drive's current use cases (tangent research, parallel implementation, code review) don't require.

2. **Premature abstraction.** No user has reported that ad-hoc operator delegation is insufficient. Building a workflow engine before validating the need risks creating dead infrastructure.

3. **Framework duplication risk.** If complex workflows become necessary, it may be better to integrate with an existing framework (LangGraph JS, Strands) rather than building a custom engine. The evaluation of Strands (ADR-0014) is already in progress.

4. **Revisit trigger:** Defer until at least 3 user-reported cases where manual operator coordination failed and a defined workflow would have solved the problem.

---

## 3. Decision Matrix

| Enhancement | Decision | Confidence | Phase | Estimated effort |
|---|---|---|---|---|
| Role templates in `OperatorContext` | **ADOPT** | High | Phase 1 | ~60 lines |
| Escalation protocol (event + MCP tool) | **ADOPT** | High | Phase 1 | ~110 lines |
| CommsAgent escalation delivery | **ADOPT** | High | Phase 1 | ~30 lines |
| A2A `/tasks` with role + richer status | **ADOPT** | High | Phase 2 | ~80 lines |
| Conflict detection on merge | **DEFER** | Medium | Phase 3 | ~100 lines |
| Full orchestration engine | **DEFER** | Medium | Phase 4 | ~800+ lines |
| LangGraph integration | **DEFER** | Low | TBD | Unknown |
| Strands SDK worker runtime | **EVALUATE** | Medium | Per ADR-0014 | Spike |

---

## 4. Success Criteria

### Phase 1 (Role Templates + Escalation)

- [ ] All 5 role templates spawn with correct default preset and visibility
- [ ] Escalation event fires and is delivered via CommsAgent
- [ ] `operator_spawn` MCP tool accepts `role` parameter
- [ ] `operator_escalate` MCP tool works end-to-end
- [ ] All existing tests pass (no regressions)
- [ ] New tests cover role defaults, escalation success/failure paths

### Phase 2 (A2A Enhancement)

- [ ] `POST /tasks` accepts `role` in body
- [ ] `GET /tasks/:id` returns role, depth, effective preset
- [ ] Operator hitting approval gate maps to A2A `input_required` state
- [ ] External HTTP client can create task with role and poll status

---

## 5. Related Decisions

| ADR | Relationship |
|---|---|
| ADR-0004 (Multi-Agent Registry) | Foundation. Role templates extend the registry's operator model. |
| ADR-0014 (Agent Orchestration Strategy) | Strategy. A2A adoption and Strands evaluation are parallel tracks. |
| ADR-0016 (Terminology and Hierarchy) | Naming. Role templates use "operator" terminology per ADR-0016. |
| ADR-0008 (Drive Mode Wrapper) | Context. Sub-mode routing is structurally similar to role-based triage. |
