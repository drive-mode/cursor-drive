# Agent Teams — Risks and Mitigations

**Topic:** Risk analysis for adopting multi-agent orchestration enhancements in Cursor Drive.

**Date:** February 2026

---

## 1. Risk Registry

### R1: Over-Complexity — Adding orchestration features users don't need

| Field | Detail |
|---|---|
| **Category** | Architecture |
| **Likelihood** | Medium |
| **Impact** | High |
| **Description** | Drive currently serves users running 1–3 operators for focused tasks (tangent research, parallel implementation). Adding workflow engines, complex routing, or elaborate role hierarchies could bloat the codebase without corresponding user value. The Gartner prediction of 40% multi-agent project cancellation by 2027 suggests the industry is learning this lesson. |
| **Mitigation** | Incremental adoption only. Phase 1 adds role templates (optional field) and escalation (event-based, consumers can ignore). No workflow engine until validated by ≥3 user-reported coordination failures. Every new feature must justify itself against the question: "Does this help a user running 2 operators on a real coding task?" |
| **Residual risk** | Low after mitigation. Optional fields and event-based escalation have near-zero maintenance burden if unused. |

---

### R2: Framework Dependency — Accidentally coupling Drive to an external framework

| Field | Detail |
|---|---|
| **Category** | Architecture / Lock-in |
| **Likelihood** | Low |
| **Impact** | High |
| **Description** | The temptation to adopt LangGraph, CrewAI, or Strands as a runtime could introduce a heavy dependency. These frameworks evolve rapidly — breaking changes, Python-centric ecosystems, and opinionated abstractions could constrain Drive's design. ADR-0014 already deferred LangGraph for this reason. |
| **Mitigation** | Drive builds its own orchestration layer. A2A is a wire protocol (HTTP + JSON-RPC), not a library dependency. Strands is an evaluation candidate (ADR-0014), not a commitment. If an external framework is ever adopted, it would be as an optional worker runtime behind an abstraction boundary. |
| **Residual risk** | Low. No framework dependency is introduced in the recommended plan. |

---

### R3: A2A Protocol Instability — Spec changes break Drive's endpoints

| Field | Detail |
|---|---|
| **Category** | External dependency |
| **Likelihood** | Low–Medium |
| **Impact** | Medium |
| **Description** | A2A is at v0.3.0, approaching RC v1.0. Core primitives (Agent Card, Task, Message) are stable, but streaming (SSE) and push notification APIs are still evolving. A spec change could require endpoint updates. |
| **Mitigation** | Implement only stable A2A primitives. Drive's current A2A endpoints use Task CRUD and Agent Card — both stable. SSE streaming is explicitly deferred. Pin to A2A v0.3.0 semantics; track spec evolution in research docs. Update only when RC v1.0 ships. |
| **Residual risk** | Low. Drive's A2A surface is minimal (4 endpoints). Even a breaking spec change would require ~50 lines of updates. |

---

### R4: Escalation Abuse — Automated agents exploit escalation to bypass permissions

| Field | Detail |
|---|---|
| **Category** | Security |
| **Likelihood** | Low |
| **Impact** | Medium |
| **Description** | If escalation is exposed as an MCP tool, an AI agent could repeatedly call `operator_escalate` to request elevated permissions, potentially circumventing the readonly/standard/full cascade. |
| **Mitigation** | (1) Escalation requests require user approval — they flow through the existing approval gate mechanism, not automatic grant. (2) Rate-limit escalation: max 3 escalation requests per operator per session. (3) Escalation does not change the operator's preset directly — it surfaces a request to the user, who decides whether to re-spawn or delegate. (4) Log all escalation attempts for audit. |
| **Residual risk** | Very low. Escalation is a notification, not a permission grant. The user always has final authority. |

---

### R5: Role Template Rigidity — Roles constrain operators unnecessarily

| Field | Detail |
|---|---|
| **Category** | Usability |
| **Likelihood** | Medium |
| **Impact** | Low |
| **Description** | Pre-defined roles (implementer, reviewer, tester, researcher, planner) may not cover all use cases. A user might want a "security auditor" or "documentation writer" role. Rigid role definitions could feel limiting. |
| **Mitigation** | Roles are optional. The `role` field is `OperatorRole | undefined` — operators without a role behave exactly as they do today. Role templates provide defaults (preset, visibility) that can be overridden at spawn time. Future: allow user-defined role templates via configuration (`cursorDrive.operators.customRoles`). |
| **Residual risk** | Very low. Roles add defaults; they don't restrict. |

---

### R6: Conflict on Merge — Two operators edit the same file, merge loses data

| Field | Detail |
|---|---|
| **Category** | Data integrity |
| **Likelihood** | Medium |
| **Impact** | Medium |
| **Description** | Drive's `merge()` function summarizes source operator memory and injects it into target context. If both operators modified the same file, the merge is at the memory/context level, not the file level. File conflicts are not detected — the last state on disk wins. |
| **Mitigation** | Phase 3 adds conflict detection: track `touchedFiles` per operator, check for overlap on merge, surface conflict to user before proceeding. Until Phase 3, document the limitation: operators working on overlapping files should coordinate via `collaborative` visibility mode, which preserves attribution in shared context. |
| **Residual risk** | Medium until Phase 3 conflict detection is implemented. Low after. |

---

### R7: Agent Screen Noise — Too many operators overwhelm the Activity feed

| Field | Detail |
|---|---|
| **Category** | Usability |
| **Likelihood** | Low–Medium |
| **Impact** | Low |
| **Description** | As operator count grows (especially with delegation chains), the Agent Screen activity feed could become noisy. Each operator emits activity events, file touches, and decisions. With 3+ operators, the feed may be hard to follow. |
| **Mitigation** | (1) Agent Screen already filters by active operator tab. (2) Role templates enable role-based filtering (e.g., "show only implementer activity"). (3) CommsAgent already batches and summarizes — background operator updates are condensed. (4) Future: collapsible operator sections in Agent Screen. |
| **Residual risk** | Low. Current batching and tab-based filtering handle 3 operators well. Revisit if max concurrent exceeds 5. |

---

### R8: Test Coverage Gap — New features not adequately tested

| Field | Detail |
|---|---|
| **Category** | Quality |
| **Likelihood** | Low |
| **Impact** | Medium |
| **Description** | Adding role templates and escalation introduces new code paths. If not thoroughly tested, regressions could affect existing operator behavior (spawn, delegate, merge). |
| **Mitigation** | Implementation plan (02_implementation.md) specifies comprehensive test suites: role default tests, escalation event tests, MCP tool tests, multi-operator scenario tests, and A2A interop tests. Existing tests must pass with zero regressions before merge. |
| **Residual risk** | Very low with specified test plan. |

---

## 2. Risk Matrix

| Risk | Likelihood | Impact | Mitigation effectiveness | Residual |
|---|---|---|---|---|
| R1: Over-complexity | Medium | High | High (incremental adoption) | Low |
| R2: Framework dependency | Low | High | High (no dependency) | Low |
| R3: A2A instability | Low–Medium | Medium | High (stable subset only) | Low |
| R4: Escalation abuse | Low | Medium | High (approval gate + rate limit) | Very Low |
| R5: Role rigidity | Medium | Low | High (optional + overridable) | Very Low |
| R6: Merge conflicts | Medium | Medium | Medium (Phase 3) | Medium → Low |
| R7: Agent Screen noise | Low–Medium | Low | High (existing filtering) | Low |
| R8: Test coverage | Low | Medium | High (specified test plan) | Very Low |

---

## 3. Monitoring Plan

| Signal | Measurement | Threshold | Action |
|---|---|---|---|
| Operator spawn count per session | Extension telemetry (if enabled) | >5 regular spawns | Investigate: are users hitting orchestration limits? |
| Escalation request frequency | Log count | >10 per session | Review: are operators escalating too often? Role defaults may be wrong. |
| A2A task creation from external clients | Server logs | Any | Track adoption — validates A2A investment. |
| Merge conflict rate | Conflict detection (Phase 3) | >20% of merges | Prioritize conflict resolution automation. |
| Test failure rate after changes | CI pipeline | Any new failure | Block merge; investigate regression. |

---

## 4. Contingency

| If… | Then… |
|---|---|
| Role templates prove too rigid | Add `cursorDrive.operators.customRoles` config for user-defined templates |
| Escalation is never used | Remove `operator_escalate` tool; keep event for future use |
| A2A spec breaks Drive endpoints | Pin to v0.3.0 semantics; update on RC v1.0 only |
| Full orchestration engine is needed | Evaluate LangGraph JS or Strands before building custom (per ADR-0014) |
| Conflict on merge causes data loss | Immediate: require `collaborative` visibility for multi-operator file editing. Medium-term: Phase 3 conflict detection. |
