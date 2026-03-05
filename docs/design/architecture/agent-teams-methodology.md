# Agent Teams Methodology

Drive's approach to multi-operator coordination, inspired by Claude-style agent teams and subagent patterns. **Not** an implementation of an external orchestration framework — Drive stays self-contained.

## Core principles

1. **Operators = team members** — Each Drive operator is a distinct team member with a role, permission preset, and depth in the hierarchy.
2. **No external orchestration framework** — LangGraph, AutoGen, CrewAI, Semantic Kernel, OpenAI Agents SDK all run the LLM loop themselves. Drive intercepts via `beforeSubmitPrompt`; it does not execute. Adopting a framework would create a parallel, conflicting execution layer.
3. **Patterns over frameworks** — Extract specific patterns from the ecosystem and implement them natively in Drive.

## Patterns to adopt

| Pattern | Source | Target in Drive |
|---------|--------|-----------------|
| **Role → sub-mode routing** | CrewAI, LangGraph supervisor | `src/router.ts` — operator role informs `driveSubMode` (e.g. `reviewer` → `ask`, `implementer` → `agent`) |
| **Handoff input filter** | OpenAI Agents SDK `inputFilter` | `src/operatorRegistry.ts` — optional `contextFilter` on `delegate()` to trim/summarise context before injecting into child operator |
| **Named pipeline stages** | OpenAI Agents SDK | `src/pipeline.ts` — explicit `inputGuardrail` + `outputGuardrail` stages |
| **Escalation severity tiers** | AutoGen Magentic-One | `src/commsAgent.ts` — branch on `escalation.severity`; aligns with ADR-0021 |
| **Checkpoint/resume** | LangGraph checkpoint store | `src/pipeline.ts` `"checkpoint"` result + `vscode.globalState` persistence |

## MVP vs target state

| Aspect | MVP | Target |
|--------|-----|--------|
| **Orchestration** | Single foreground operator; tangents spawn in background | Lead + workers; shared task list; mailbox messaging |
| **Role routing** | Sub-mode from user or default | Operator role template drives sub-mode automatically |
| **Handoff** | Raw context injection | Filtered context before delegate |
| **Escalation** | Block/warn via approval gates | Structured severity (stall/progress/blocked) with re-routing |

## Relationship to other docs

- [agent-registry-v2-design.md](agent-registry-v2-design.md) — shared task list, mailbox, file-lock
- [cursor-native-system-design.md](cursor-native-system-design.md) — overall pipeline and MCP bridge
- ADR-0014 (Agent Orchestration Strategy), ADR-0021 (Agent Orchestration Enhancement)

## Implementation notes

- Role → sub-mode routing requires coordination with ADR-0021 role template work.
- Handoff input filter is a low-effort addition to `operatorRegistry.delegate()`.
- MCP Apps (SEP-1865) may be considered when Cursor supports them; until then, `AgentScreenPanel` remains the primary UI surface.
