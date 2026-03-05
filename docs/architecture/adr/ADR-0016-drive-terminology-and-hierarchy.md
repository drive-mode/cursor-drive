# ADR-0016: Drive Terminology and Hierarchy

## Status
Accepted

## Metadata
- Date: 2026-02-23
- Deciders: Cursor Drive maintainers
- Related: ADR-0004 (superseded for terminology), ADR-0008 (mode wrapper)

## Context

Two naming collisions cause confusion:

1. **"Agent" ambiguity**: Drive's spawned workers were called "agents," but Cursor already uses "Agent" for its native autonomous mode (`SubMode = "agent"`). Config keys like `cursorDrive.agents.maxConcurrent`, UI text "Manage Agents," and MCP tools `agent_spawn` collide with Cursor's own Agent concept.

2. **ShareScreen misnomer**: "Share Screen" implies screensharing with another person. The feature actually shows what Drive's workers are doing in the user's own workspace — a window into the agent's workspace, not a shared screen.

## Decision

### Hierarchy

| Level | Term | Definition |
|-------|------|------------|
| **Drive** | Handler / director | The AI pair-programming layer that wraps Cursor modes and orchestrates work |
| **Operator** | Spawned worker | Drive's senior autonomous worker; can spawn its own subagents via Cursor's Task tool |
| **Agent** | Cursor native | Cursor's built-in Agent mode (`SubMode = "agent"`) or subagents spawned by operators |

Drive → Operators (Drive concept) → Agents (Cursor native subagents spawned by operators).

### Renames

- **Drive workers**: "agent" → "operator" everywhere except `SubMode = "agent"` in `driveMode.ts` (that literal refers to Cursor's native Agent mode and must remain).
- **ShareScreen**: "Share Screen" → "Agent Screen" (S-AS). The panel shows operator activity in the workspace; "Agent Screen" frames it as a view into the agent's workspace.

### MCP Deprecation Strategy

Old tool names remain as deprecated aliases that call new implementations and log a one-time warning:

| Old (deprecated) | New |
|------------------|-----|
| `agent_spawn` | `operator_spawn` |
| `agent_switch` | `operator_switch` |
| `agent_list` | `operator_list` |
| `agent_pause` | `operator_pause` |
| `agent_resume` | `operator_resume` |
| `agent_dismiss` | `operator_dismiss` |
| `agent_merge` | `operator_merge` |
| `share_screen_activity` | `agent_screen_activity` |
| `share_screen_file` | `agent_screen_file` |
| `share_screen_decision` | `agent_screen_decision` |

Deprecation warning format: `"Tool agent_spawn is deprecated; use operator_spawn instead."`

## Rationale

- **Operator**: Unambiguous. An operator is a senior worker that operates on the codebase; it can spawn Cursor's native subagents. No collision with Cursor's Agent mode.
- **Agent Screen (S-AS)**: Accurately describes a screen showing agent/operator activity in the workspace. Short form "S-AS" for brevity.
- **Deprecation aliases**: Existing skill files and plugin rules continue to work; migration is gradual.

## Consequences

- **Positive**: Clear hierarchy; no semantic collision between Drive config and Cursor modes.
- **Positive**: Config keys `cursorDrive.operators.*` and `cursorDrive.agentScreen.*` are self-documenting.
- **Negative**: Migration effort across src, docs, MCP tools, and .cursor/ assets.
- **Mitigated**: Deprecation aliases prevent breaking existing integrations.
