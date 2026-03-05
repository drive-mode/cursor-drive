# Agent Teams — Implementation Plan

**Topic:** Integration points, implementation options, testing strategy, and rollout plan for agent-team enhancements in Cursor Drive.

**Date:** February 2026

---

## 1. Current State

### operatorRegistry.ts

The operator registry is the core multi-agent primitive. It manages the lifecycle of operators (spawn, switch, pause, resume, dismiss, merge) with:

- **Depth hierarchy:** `depth` field tracks spawn ancestry (0 = user-spawned, 1+ = operator-spawned)
- **Permission cascade:** `minPreset()` ensures child preset never exceeds parent's effective preset
- **Cascade dismiss:** Dismissing a parent completes all children
- **Delegation:** `delegate()` spawns target operator at `depth+1` with `readonly` default
- **Merge:** Summarizes source memory and injects into target context
- **Events:** `operatorCompleted`, `operatorProgress`, `operatorError`, `taskDelegated`

**Key types:**
```typescript
OperatorStatus = "active" | "background" | "completed" | "merged" | "paused"
OperatorVisibility = "isolated" | "shared" | "collaborative"
PermissionPreset = "readonly" | "standard" | "full"
```

### commsAgent.ts

Batched notification layer for background operator updates:

- Queues `OperatorUpdate` objects (completion, progress, error)
- Delivers at natural pauses (idle timeout or explicit `flush()`)
- Summarizes multiple updates via routing-tier model call
- Falls back to raw message concatenation if no model available
- Delivers via Agent Screen panel, TTS, and VS Code information message

### mcpServer.ts — A2A Endpoints

The MCP server already exposes A2A-compatible endpoints:

- `GET /.well-known/agent.json` / `/.well-known/agent-card.json` — Agent Card
- `POST /tasks` — Create task → spawn operator → return task record
- `GET /tasks/:id` — Poll task status (mapped from operator status)
- `POST /tasks/:id/cancel` — Cancel task → dismiss operator

Internal A2A state is tracked via `Map<string, A2ATaskRecord>` with states: `submitted`, `working`, `completed`, `failed`, `canceled`.

### sessionMemory.ts

Token-budgeted, operator-scoped memory:

- Entries typed as `turn`, `task`, `pending`, `decision`, `compaction-summary`
- Operator scoping via `forOperator(operatorId, visibility)` returns a filtered view
- Compaction: when entries reach 80% of max, cold half is summarized preserving decisions
- Visibility modes control what operators see of each other's context

---

## 2. Integration Points

### 2.1 operatorRegistry.ts — Role Templates + Escalation

**Add to `OperatorContext`:**
```typescript
/** Optional role template for semantic role assignment. */
role?: OperatorRole;

/** Escalation threshold: number of failed/blocked actions before auto-escalation. */
escalationThreshold?: number;
```

**New type:**
```typescript
type OperatorRole = "implementer" | "reviewer" | "tester" | "researcher" | "planner";
```

**New event:**
```typescript
escalationRequested: (operatorId: string, reason: string, requiredCapability: string) => void;
```

**Role template defaults table (applied at spawn time):**

| Role | Default preset | Default visibility |
|---|---|---|
| `implementer` | `standard` | `shared` |
| `reviewer` | `readonly` | `collaborative` |
| `tester` | `standard` | `shared` |
| `researcher` | `readonly` | `isolated` |
| `planner` | `readonly` | `shared` |

**Spawn logic change:** When `role` is provided in `SpawnOptions`, apply role defaults for `preset` and `visibility` unless explicitly overridden.

### 2.2 mcpServer.ts — Enhanced A2A Endpoints

**Enhance `operator_spawn` tool:**
```typescript
role: z.enum(["implementer", "reviewer", "tester", "researcher", "planner"])
  .optional()
  .describe("Role template for the new operator.")
```

**Enhance A2A `/tasks` endpoint:**
- Add `role` to task creation body (optional)
- Map `input_required` A2A state to operator hitting approval gate
- Return richer task status with operator metadata (role, depth, effective preset)

**Add new MCP tool for escalation:**
```typescript
"operator_escalate": {
  operator_id: z.string(),
  reason: z.string(),
  required_capability: z.string()
}
```

### 2.3 commsAgent.ts — Escalation Delivery

**Extend `OperatorUpdate` type field:**
```typescript
type: "completion" | "progress" | "error" | "escalation"
```

**Escalation delivery:** When an escalation event fires, CommsAgent enqueues it as a high-priority update. On `flush()`, escalation updates are delivered before regular updates.

---

## 3. Implementation Options

### Option A: Swap-First — Role Templates + Escalation (~250 lines)

**Scope:**
1. Add `role` and `escalationThreshold` to `OperatorContext` and `SpawnOptions`
2. Add `OperatorRole` type with 5 role templates
3. Apply role defaults at spawn time (preset, visibility)
4. Add `escalationRequested` event to registry
5. Extend `operator_spawn` MCP tool with `role` parameter
6. Add `operator_escalate` MCP tool
7. Extend CommsAgent to handle escalation updates
8. Enhance A2A `/tasks` to accept `role` in body

**Estimated changes:**

| File | Change type | ~Lines |
|---|---|---|
| `operatorRegistry.ts` | Add role type, extend spawn logic, add escalation event | +60 |
| `mcpServer.ts` | Extend `operator_spawn`, add `operator_escalate`, enhance `/tasks` | +80 |
| `commsAgent.ts` | Handle escalation updates | +30 |
| `tests/operatorRegistry.test.ts` | Role template tests, escalation tests | +60 |
| `tests/mcpServer.test.ts` | MCP tool tests for role and escalation | +40 |
| **Total** | | **~270** |

**Complexity:** Low. All changes extend existing interfaces; no new abstractions.

**Time to first value:** 1–2 sessions. Role templates provide immediate semantic value; escalation closes a known usability gap.

**Risks:** Minimal. Role templates are optional (no breaking change). Escalation is event-based (consumers can ignore it).

### Option B: Full Orchestration Engine (~800+ lines)

**Scope:**
1. Everything in Option A
2. LangGraph-style state graph engine for complex workflows
3. Workflow definition DSL (YAML or TypeScript)
4. Checkpoint/restore for workflow state
5. Conditional routing between operators based on output analysis
6. Workflow templates (e.g., "review pipeline": implement → test → review → merge)

**Estimated changes:**

| File | Change type | ~Lines |
|---|---|---|
| `orchestrationEngine.ts` (new) | State graph, workflow execution, checkpointing | +300 |
| `workflowTemplates.ts` (new) | Pre-defined workflow definitions | +100 |
| `operatorRegistry.ts` | Hook into orchestration engine | +50 |
| `mcpServer.ts` | Workflow management tools | +100 |
| `commsAgent.ts` | Workflow-level notifications | +40 |
| Tests | Workflow execution, conditional routing, checkpoint/restore | +200 |
| **Total** | | **~800+** |

**Complexity:** High. Introduces a new abstraction layer (workflow engine) that must integrate cleanly with the existing operator lifecycle.

**Time to first value:** 3–5 sessions. Significant design work before any user-visible benefit.

**Risks:**
- Premature optimization — Drive operators are Cursor agents, not arbitrary LLM workers. Complex workflows may not materialize as a user need.
- Maintenance burden — a workflow engine is a substantial system to maintain.
- Framework trap — risks recreating what LangGraph already does, but worse.

---

## 4. Tests and Evaluations

### 4.1 Unit Tests (Option A)

**Role template tests (`operatorRegistry.test.ts`):**
```
✓ spawn with role "reviewer" defaults to readonly preset
✓ spawn with role "implementer" defaults to standard preset
✓ spawn with role and explicit preset uses explicit preset (override)
✓ spawn with role and parentId applies cascade (role default capped by parent)
✓ spawn without role preserves existing behavior (no regression)
```

**Escalation tests (`operatorRegistry.test.ts`):**
```
✓ emitEscalation fires escalationRequested event with operator info
✓ escalation event includes reason and required capability
✓ escalation from non-existent operator is no-op
```

**MCP tool tests (`mcpServer.test.ts`):**
```
✓ operator_spawn with role returns role in response
✓ operator_spawn with role applies correct default preset
✓ operator_escalate enqueues escalation in CommsAgent
✓ operator_escalate returns error for unknown operator
✓ A2A POST /tasks with role spawns operator with role
```

### 4.2 Integration Tests

**Multi-operator scenario tests:**
```
✓ Spawn implementer + reviewer → reviewer has readonly, implementer has standard
✓ Implementer delegates to tester → tester spawned at depth+1 with standard (capped by implementer)
✓ Reviewer tries to escalate → escalation event fires, CommsAgent delivers
✓ Dismiss implementer → cascade dismisses delegated tester
✓ Merge researcher into planner → planner receives researcher's memory
```

**A2A interop tests:**
```
✓ External client creates task via POST /tasks → operator spawned
✓ External client polls GET /tasks/:id → status matches operator lifecycle
✓ External client cancels task → operator dismissed
✓ Agent Card at /.well-known/agent-card.json includes role information
```

### 4.3 Evaluation Criteria

| Criterion | Target | Measurement |
|---|---|---|
| No regression in existing tests | 100% pass rate | `npm test` |
| Role template coverage | All 5 roles tested | Unit test count |
| Escalation path coverage | Success + failure + no-op | Unit test count |
| A2A endpoint compliance | Task CRUD + cancel | Integration test count |
| Performance | spawn() < 1ms | Benchmark in test |

---

## 5. Rollout Plan

### Phase 1: Role Templates + Escalation (Option A)

**Target:** Immediate — next implementation session.

1. Add `OperatorRole` type and extend `OperatorContext` with `role` field
2. Implement role defaults in `spawn()` logic
3. Add `escalationRequested` event
4. Extend MCP tools (`operator_spawn` with role, new `operator_escalate`)
5. Extend CommsAgent with escalation handling
6. Write tests
7. Update `.cursor/skills/drive-persona/SKILL.md` to teach persona about roles

**Validation:** All existing tests pass + new role/escalation tests pass.

### Phase 2: A2A Enhancement

**Target:** After Phase 1 stabilizes.

1. Enhance `/tasks` endpoint with role support
2. Add `input_required` status mapping (operator → approval gate → A2A state)
3. Return richer task metadata (role, depth, effective preset)
4. Add A2A integration tests with external HTTP client

**Validation:** A2A endpoints pass interop tests with a standard HTTP client.

### Phase 3: Conflict Detection (Future)

**Target:** When multi-operator file editing becomes a demonstrated user need.

1. Track file paths per operator (extend `OperatorContext` with `touchedFiles: Set<string>`)
2. On merge, check for overlapping file paths
3. Surface conflict to user before proceeding with merge
4. Consider arbiter operator for automated resolution

**Validation:** Conflict detection tests + user feedback.

### Phase 4: Full Orchestration Engine (Deferred)

**Target:** Only if complex multi-step workflows become a validated user need.

Revisit Option B if:
- Users consistently need >3 operators with defined execution order
- Workflow patterns repeat (always: implement → test → review → merge)
- Current ad-hoc delegation proves insufficient for real-world tasks

**Gate:** At least 3 user-reported cases where manual operator coordination failed.
