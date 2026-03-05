# Agent Teams — Project Impact on Cursor Drive

**Topic:** How multi-agent orchestration patterns affect Drive's existing architecture and roadmap.

**Date:** February 2026

---

## 1. Drive Already Implements the Core Patterns

Drive's operator system is not a toy prototype — it implements the same fundamental patterns that production multi-agent frameworks use, mapped to Cursor's native capabilities.

### Pattern mapping

| Industry pattern | Drive implementation | Source file |
|---|---|---|
| **Role-based teams** | Operators with named pool (Alpha, Beta, …), distinct tasks | `operatorRegistry.ts` → `spawn()` |
| **Handoff / delegation** | `operator_delegate` MCP tool; `/tangent` and `/switch` voice commands | `operatorRegistry.ts` → `delegate()`, `switchTo()` |
| **Lead + worker** | Foreground operator acts as lead; background operators are workers | `operatorRegistry.ts` → `getForeground()`, status `background` |
| **Context merge** | `operator_merge` summarizes source memory into target context | `operatorRegistry.ts` → `merge()` |
| **Cascade dismiss** | Dismissing a parent also dismisses all children | `operatorRegistry.ts` → `dismiss()` |
| **Permission cascade** | Child operator preset capped by parent (deny always wins) | `operatorRegistry.ts` → `minPreset()`, `effectivePreset()` |
| **Context filtering** | Operator-scoped session memory with visibility modes | `sessionMemory.ts` → `forOperator()`, `buildContextForOperator()` |
| **Batched notifications** | CommsAgent queues background updates, delivers at natural pauses | `commsAgent.ts` → `flush()`, `scheduleDelivery()` |
| **Activity monitoring** | Agent Screen shows operator activity, file touches, decisions | `mcpServer.ts` → `agent_screen_*` tools |

### What this means

Drive doesn't need to adopt a multi-agent orchestration framework. It *is* one — purpose-built for the IDE pair-programming context. The industry patterns validate Drive's architectural choices rather than suggesting wholesale replacement.

---

## 2. A2A Endpoints Already Exist — Validate and Extend

Drive's `mcpServer.ts` already implements A2A-compatible endpoints on the MCP server (`:7891`):

| Endpoint | Current state | A2A compliance |
|---|---|---|
| `GET /.well-known/agent.json` | ✅ Returns Agent Card with skills, interfaces, capabilities | Partially compliant — uses `agent.json` path; A2A spec uses `agent-card.json` |
| `POST /tasks` | ✅ Creates task, spawns operator, returns task ID + status | Compliant structure; simplified body format vs A2A JSON-RPC |
| `GET /tasks/:id` | ✅ Returns task status mapped from operator status | Compliant; status mapping (operator → A2A task state) works |
| `POST /tasks/:id/cancel` | ✅ Cancels task, dismisses operator | Compliant |
| SSE streaming | ❌ Not implemented | A2A supports but does not require streaming |

### Gaps to close

1. **Agent Card path**: Drive serves at both `/.well-known/agent.json` and `/.well-known/agent-card.json`. The A2A spec registers `agent-card.json` as the canonical well-known URI. Drive should prefer this path (already aliased).

2. **JSON-RPC envelope**: A2A uses JSON-RPC 2.0 message format for task operations. Drive's current `/tasks` endpoints use plain HTTP REST. Adding a JSON-RPC wrapper would improve interop with A2A clients.

3. **Task status states**: Drive uses 5 states (`submitted`, `working`, `completed`, `failed`, `canceled`). A2A adds `rejected`, `input_required`, and `auth_required`. Drive should map operator states to these when relevant (e.g., an operator hitting an approval gate → `input_required`).

4. **Streaming (SSE)**: Not implemented. Low priority — Drive operators are local and polling is sufficient for the current scale.

---

## 3. OpenAI Handoff Pattern Maps to Tangent/Switch

The OpenAI Agents SDK's handoff model maps directly to Drive's existing voice commands:

| OpenAI concept | Drive equivalent | Mechanism |
|---|---|---|
| `transfer_to_billing()` | `/tangent billing research` | Voice/chat triggers `operator_spawn` via MCP |
| `transfer_to_specialist()` | `/switch Beta` | Voice/chat triggers `operator_switch` via MCP |
| `inputFilter` (context filtering) | Visibility mode (`isolated` / `shared` / `collaborative`) | `sessionMemory.forOperator()` |
| Agent guardrails | Approval gates + tool allowlist | `approvalGates.ts`, `toolAllowlist.ts` |
| Handoff return | `operator_merge` | Source operator's memory injected into target |

The key insight: Drive's tangent/switch commands are handoffs expressed in natural language rather than function calls. The user says "tangent: research rate limiting" — Drive spawns a new operator (handoff), filters context based on visibility (inputFilter equivalent), and the operator works independently. When done, `operator_merge` brings results back (handoff return).

---

## 4. What to Add

### 4.1 Formalized Role Templates

**Current state:** Operators are generic — they have a name and a task string but no formalized role.

**Proposal:** Add optional `role` field to `OperatorContext` with pre-defined templates:

| Role | Default preset | Typical task scope |
|---|---|---|
| `implementer` | `standard` | Code generation, file modifications |
| `reviewer` | `readonly` | Code review, quality checks, no file writes |
| `tester` | `standard` | Run tests, write test files |
| `researcher` | `readonly` | Read code, search codebase, summarize findings |
| `planner` | `readonly` | Generate plans, analyze requirements |

**Value:** Role templates provide semantic meaning to operators beyond just a name. They enable:
- Smarter default permission presets (reviewer is always `readonly`)
- Role-appropriate tool filtering (reviewer doesn't need `git write` tools)
- Better Agent Screen display (show role icon/badge)
- Role-based routing in future orchestration flows

### 4.2 Escalation Protocol

**Current state:** Operators cannot escalate — if a `readonly` operator discovers it needs to write a file, there is no built-in path to request elevated permissions or delegate the write to a more permissioned operator.

**Proposal:** Add escalation mechanism:
1. Operator emits `escalation_requested` event with reason and required capability
2. CommsAgent surfaces escalation to user at next natural pause
3. User approves → Drive either re-spawns with higher preset or delegates to parent
4. User denies → operator receives rejection and adapts

**Value:** Closes the gap where operators silently fail when they lack permissions for discovered-during-execution needs.

### 4.3 Conflict Resolution

**Current state:** If two background operators edit overlapping files, the last `operator_merge` wins. There is no detection of conflicting edits.

**Proposal:** Add lightweight conflict detection:
1. Track file paths touched per operator (already partially done via `agent_screen_file`)
2. On merge, check if target operator has pending changes to same files
3. If conflict detected, surface to user with diff view before merging
4. Future: arbiter operator that reviews conflicting changes

**Value:** Prevents silent data loss when multiple operators work on related code.

---

## 5. Dependencies

| Dependency | Status | Risk |
|---|---|---|
| A2A protocol specification stability | v0.3.0, approaching RC v1.0 | Low — core primitives stable; streaming API may change |
| Cursor native agent API | Stable for current usage; expanding | Low — Drive uses MCP bridge, not direct API |
| MCP SDK (`@modelcontextprotocol/sdk`) | v1.26.0, stable | Low — mature protocol |
| Claude Code Agent Teams API | Experimental | Medium — API may change; Drive integration is reference only |

---

## 6. Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| **Over-complexity** | Medium | High | Incremental adoption: role templates first, escalation second, conflict resolution third |
| **Framework dependency** | Low | High | Drive builds its own orchestration; no external framework dependency. A2A is a protocol, not a library. |
| **A2A spec instability** | Low | Medium | Implement only stable A2A primitives (Agent Card, Task CRUD). Defer streaming/push until RC. |
| **Role template rigidity** | Medium | Low | Templates are optional defaults, not mandatory constraints. Operators can override. |
| **Escalation abuse** | Low | Medium | Rate-limit escalation requests. Approval gate for escalation to prevent automated privilege escalation. |

---

## 7. Summary

Drive's operator system is well-positioned relative to the industry. The core patterns (spawn, delegate, merge, permission cascade, context filtering) are already implemented. The recommended additions — role templates, escalation, and conflict resolution — are incremental enhancements that add value without introducing architectural risk or external framework dependencies.

The key insight from the technology landscape is not "Drive needs a multi-agent framework" but rather "Drive *is* a multi-agent framework optimized for IDE pair-programming, and the industry is validating its design choices."
