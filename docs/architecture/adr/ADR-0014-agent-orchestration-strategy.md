# ADR-0014: Agent Orchestration Strategy

## Status
Accepted

## Metadata
- Date: 2026-02-23
- Deciders: Cursor Drive maintainers
- Supersedes: none
- Superseded by: none
- Related: ADR-0004 (AgentRegistry v1), ADR-0003 (MCP bridge)

## Context

Cursor Drive has an in-memory AgentRegistry (ADR-0004) with tangent spawning and MCP tools. For agent-to-agent interop and future multi-agent scaling, we need a strategy that:
- Enables agents to delegate work to other agents
- Complements MCP (agent-to-tool) with agent-to-agent communication
- Aligns with industry standards and Cursor's ecosystem

## Decision

### 1. A2A Protocol for Agent-to-Agent Interop

Adopt the **Agent2Agent (A2A) protocol** alongside MCP for agent-to-tool interop. A2A (Google, 2025) enables agent-to-agent collaboration without sharing internal state or tools. MCP (Anthropic) connects agents to tools and resources.

**Layering:**
- **MCP**: Agent ↔ Tools, APIs, resources (existing Drive MCP server at `:7891`)
- **A2A**: Agent ↔ Agent (Task endpoints on DriveMcpServer at `:7891`)

DriveMcpServer will expose A2A Task endpoints on the same `:7891` port, allowing external agents to discover and invoke Drive agents via the A2A contract (Agent Cards, JSON-RPC over HTTP).

```
┌─────────────────────────────────────────────────────────────────┐
│                    Drive MCP Server (:7891)                      │
│                                                                  │
│  MCP (agent→tool)          A2A (agent→agent)                     │
│  ├── tts_speak             ├── Task discovery (Agent Cards)     │
│  ├── share_screen_*        ├── Task create/update/complete       │
│  ├── agent_spawn           └── Async task handoff                 │
│  ├── agent_switch                                               │
│  └── ...                                                        │
└─────────────────────────────────────────────────────────────────┘
         ▲                                    ▲
         │ MCP tools                          │ A2A Task endpoints
         │                                    │
    Cursor AI                            External agents
    (Drive agents)                      (other A2A-capable agents)
```

### 2. Claude Code Agent Teams as Reference Architecture for AgentRegistry v2

Use **Claude Code Agent Teams** lead+worker pattern as the reference architecture for AgentRegistry v2:
- **Lead agent**: Receives user requests, delegates subtasks to workers, aggregates results
- **Worker agents**: Execute focused tasks, return results to lead
- **Mailbox pattern**: Workers post results; lead consumes at natural boundaries

This aligns with Cursor's native multi-agent model and provides a clear upgrade path from the current in-memory registry.

### 3. AWS Strands Agents TypeScript SDK as Evaluation Candidate

**AWS Strands Agents** TypeScript SDK is an evaluation candidate for the worker runtime. It provides:
- TypeScript-native agent orchestration
- Integration with AWS Bedrock and other model providers
- Structured task execution

Evaluate Strands for worker agent execution when implementing AgentRegistry v2. No commitment until evaluation completes.

### 4. LangGraph Deferred

**LangGraph** is deferred. Rationale:
- Python-heavy; Drive's extension and hooks are TypeScript/Python split — adding LangGraph would pull orchestration into Python, fragmenting the stack
- Overkill for Drive's current scale (2–3 concurrent agents, simple lead/worker)
- Revisit if Drive needs complex multi-step workflows with cycles and branching

### 5. OpenClaw Not Applicable

**OpenClaw** is not applicable. It is a messaging gateway and voice-channel orchestrator, not a coding agent framework. Drive's agent orchestration is about code-focused agents (plan, implement, debug). OpenClaw patterns (Voice Wake, skills format) may inform voice integration (ADR-0012) but do not apply to agent orchestration.

## AgentRegistry v2 Design Rationale

| Aspect | v1 (ADR-0004) | v2 direction |
|--------|---------------|--------------|
| Spawning | Tangent keyword, MCP tool | Lead delegates via A2A Task |
| Communication | CommsAgent batches notifications | Mailbox; lead consumes worker results |
| Interop | MCP only | MCP + A2A |
| Worker runtime | In-process, Cursor subagent | Evaluate Strands or similar for dedicated workers |

## Consequences

**Positive**: A2A + MCP provides complete agent ecosystem; lead+worker pattern is well-understood; TypeScript alignment via Strands evaluation.

**Negative**: A2A is early (v0.1.0); DriveMcpServer must implement A2A endpoints; Strands evaluation may show gaps.

## References

- ADR-0004: In-memory AgentRegistry
- ADR-0003: MCP bridge pattern
- [A2A Protocol](https://google.github.io/A2A/) — Google Agent2Agent specification
- [OpenClaw Integration Analysis](../../research/openclaw-integration-analysis.md) — OpenClaw as messaging gateway, not agent framework
