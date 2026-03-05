# ADR-0021: Agent Orchestration Enhancement

## Status
Proposed

## Metadata
- Date: 2026-02-24
- Deciders: Cursor Drive maintainers
- Related: ADR-0004 (Multi-Agent Registry), ADR-0014 (Agent Orchestration Strategy), ADR-0016 (Terminology and Hierarchy)

## Context

Drive's `operatorRegistry` (established in ADR-0004, renamed per ADR-0016) handles the full operator lifecycle: spawn, dismiss, switch, and merge. ADR-0014 introduced A2A protocol support and the lead+worker reference architecture. The current implementation works but is unstructured — all operators are spawned with the same generic configuration, and there is no mechanism for an operator to signal that it needs help.

Industry patterns point to two enhancements:

1. **Role templates** — OpenAI Swarm uses role-based handoffs; CrewAI defines agent roles with backstories and goals; Claude Code uses lead+worker with distinct capabilities. A common thread: agents with declared roles produce more focused, higher-quality output than generic agents.
2. **Escalation** — When an agent is stuck or uncertain, it should be able to flag this rather than produce low-confidence output. This requires a structured escalation path from child to parent operator.

Additionally, the A2A `/tasks` endpoint in `mcpServer.ts` currently uses request-response. For long-running tasks, SSE streaming would allow real-time status updates to external agents.

## Decision

**ADOPT** incremental enhancements to the operator orchestration layer:

### 1. Role Templates

Add role templates to operator spawn configuration:

```typescript
operatorRegistry.spawn({
  name: "review-agent",
  role: "reviewer",        // template key
  parentId: leadOperator.id,
  scope: ["src/pipeline.ts", "src/approvalGates.ts"]
});
```

Each role template defines:
- **Default system prompt prefix** — role-specific instructions prepended to the operator's context
- **Permission preset** — role-appropriate capability set (per ADR-0016 hierarchy)
- **Suggested tools** — MCP tools the role typically needs

Initial role catalog (3 templates):

| Role | Preset | Prompt focus | Typical tools |
|------|--------|-------------|---------------|
| `reviewer` | readonly | Code review, identify issues, suggest fixes | `agent_list`, `share_screen_activity` |
| `implementer` | standard | Write code, run tests, fix issues | all standard tools |
| `tester` | standard | Write and run tests, report results | `share_screen_activity`, terminal tools |

Templates are defaults, not constraints. The spawning operator can override any template field. Role templates are defined in a `roleTemplates.ts` module, not hardcoded in the registry.

### 2. Escalation Threshold

Add an escalation mechanism for operators to signal low confidence:

- Operators can call a new `agent_escalate` MCP tool with a reason and confidence level
- The parent operator receives an escalation event via the existing CommsAgent notification channel
- The parent can choose to: take over the task, provide additional context, or dismiss the child

Escalation is opt-in. Operators that do not call `agent_escalate` behave exactly as they do today.

```
Child operator (reviewer)
  │
  ├── confidence drops below threshold
  │
  └── calls agent_escalate(reason: "cannot determine if race condition exists", confidence: 0.3)
        │
        └── Parent operator receives notification
              │
              ├── option: take over (dismiss child, handle directly)
              ├── option: provide context (send additional files/instructions)
              └── option: acknowledge (child continues with lower confidence noted)
```

### 3. A2A SSE Streaming

Enhance the A2A `/tasks` endpoint in `mcpServer.ts` with Server-Sent Events:

- `POST /tasks` creates a task (existing behavior, unchanged)
- `GET /tasks/:id/stream` returns an SSE stream of task status updates
- Status transitions: `pending` → `in_progress` → `completed` | `failed` | `escalated`
- Backward-compatible: clients that do not use SSE continue polling `/tasks/:id`

### Deferred: Full Orchestration Engine

A LangGraph-style orchestration engine with graph-based workflows, cycles, and conditional branching is deferred (consistent with ADR-0014). Drive operators are Cursor agents, not arbitrary LLM workers. The lead+worker pattern with role templates and escalation covers current needs without introducing graph complexity.

## Alternatives Considered

1. **Full orchestration engine (LangGraph-style)** — Introduces graph definition language, state management, and cycle detection. Over-complex for Drive's current use case of 2-3 concurrent operators with simple delegation. Deferred, not rejected — revisit if Drive needs multi-step workflows with branching.
2. **External framework (CrewAI, AutoGen)** — Wrong abstraction layer. These frameworks manage LLM workers with their own execution loops. Drive operators are Cursor agents that execute within Cursor's existing agent runtime. Adopting an external framework would create a parallel execution layer. Rejected.
3. **No enhancement** — Misses easy wins. Role templates require minimal code but significantly improve operator focus. Escalation addresses a real gap (operators silently producing low-confidence output). Rejected.

## Consequences

**Positive:**
- Structured operator roles improve output quality and reduce prompt engineering per spawn
- Escalation provides a safety net for uncertain operators
- A2A SSE streaming enables real-time interop with external agents
- All enhancements are backward-compatible

**Negative:**
- Role template catalog must be maintained as new patterns emerge
- Escalation adds a new MCP tool (`agent_escalate`) and notification path to test
- SSE streaming adds connection management complexity to `mcpServer.ts`
- Slight complexity increase in `operatorRegistry` spawn path

## Migration Strategy

Additive. No breaking changes to existing operator flows:

- **Role templates:** The `role` field on spawn config is optional. Operators spawned without a role behave exactly as today. Templates are loaded from `roleTemplates.ts` at registry initialization.
- **Escalation:** The `agent_escalate` MCP tool is registered alongside existing agent tools. Operators that never call it are unaffected. Parent notification uses the existing CommsAgent channel.
- **A2A SSE:** The `/tasks/:id/stream` endpoint is new. Existing `/tasks` and `/tasks/:id` endpoints are unchanged. Clients that do not use SSE continue working.

## Open Questions

- **Role template catalog:** Start with 3 templates (reviewer, implementer, tester). What other roles are needed? `planner`? `debugger`? Gather usage data before expanding.
- **Escalation threshold:** Should confidence thresholds be configurable per role template, or global? Initial implementation: per-template with a global fallback.
- **A2A spec versioning:** The A2A protocol is at v0.1.0. How do we version Drive's A2A endpoints as the spec evolves? Consider `Accept` header versioning.
- **Escalation UX:** How should escalation events appear in the Agent Screen? As a distinct card type? As a highlighted activity feed entry?
