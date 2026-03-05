# ADR-0004: In-Memory AgentRegistry with Tangent Keyword Spawning

## Status
Accepted

## Metadata
- Date: 2026-02-19
- Deciders: Cursor Drive maintainers
- Legacy: ADR-0009
- Related: PRD 3 (Multi-Agent Orchestration), ADR-0003
- Note: Terminology superseded by ADR-0016 (agent → operator for Drive workers; ShareScreen → Agent Screen).

## Context

Cursor Drive supports multiple AI agents working in parallel. A user can say "tangent: research rate limiting" to fork a background agent while keeping the current one active. Agents can be switched, merged, paused, and dismissed.

The system must:
1. Track active agents and their contexts
2. Enforce a maximum concurrent agent limit
3. Route messages to the foreground agent
4. Handle background-to-foreground switching
5. Merge agent contexts when work is combined

## Decision

Implement an **in-memory `AgentRegistry`** in `src/agentRegistry.ts`. The registry holds a pool of `AgentContext` objects. State is not persisted to disk — it is session-scoped.

**Spawning** is triggered by:
- The user typing "tangent" (detected by `drive-preprocessor.py` hook, hinted to the AI)
- The AI calling the `agent_spawn` MCP tool
- The `cursorDrive.spawnAgent` VS Code command

**Naming** uses a configured pool: Alpha, Beta, Gamma, Delta, Epsilon... (first available name is assigned). Users can override: `/tangent call it Researcher — explore GraphQL vs REST`.

**Foreground/background**: exactly one agent is "foreground" at a time. The foreground agent receives user messages and is displayed in the ShareScreen. Background agents run asynchronously and notify via the comms agent.

**Comms agent**: a lightweight routing-tier model call that batches completion notifications from background agents and delivers them at natural pauses (after the user's turn completes, or after an idle timeout).

**Merge**: `agent_merge({ source, target })` summarizes the source agent's memory and injects it as a system message into the target agent's context. The source is deactivated (status: `merged`).

## AgentContext Schema

```typescript
interface AgentContext {
  id: string;
  name: string;
  task: string;
  status: 'active' | 'background' | 'paused' | 'completed' | 'merged' | 'dismissed';
  memory: string[];       // bounded array of summarized context entries
  createdAt: Date;
  isForeground: boolean;
}
```

## Rationale

- **In-memory**: Agent state is session-scoped. Persisting to disk would add complexity and stale-state risk without benefit (sessions are short).
- **Tangent keyword**: Natural language spawning ("tangent") is idiomatic for pair programming — it mirrors how humans ask a colleague to "take a tangent" on something.
- **MCP tool for spawning**: The AI itself calls `agent_spawn` when it detects a tangent intent. This keeps the triggering logic in the AI persona (Skill) rather than in hardcoded extension code.
- **Comms agent for notifications**: Background agents completing work must not interrupt the user mid-task. A lightweight batching layer delivers updates at appropriate moments.

## Constraints

- Maximum concurrent agents: `cursorDrive.agents.maxConcurrent` (default: 3). Attempting to spawn beyond limit shows a warning.
- Agents are isolated by default (`cursorDrive.agents.visibility: "isolated"`). They cannot access each other's memory unless configured.
- The comms agent uses the routing tier (cheapest model) to minimize cost.

## Consequences

- **Positive**: Enables parallel work without derailing the main conversation.
- **Positive**: Agents are lightweight — just a named context record plus a bounded memory array.
- **Negative**: In-memory only; agents are lost on extension deactivation or window reload.
- **Negative**: Background agents make asynchronous model calls; must handle cancellation, timeouts, and rate limits gracefully.
