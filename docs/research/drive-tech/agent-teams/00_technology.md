# Agent Teams — Technology Landscape

**Topic:** Multi-agent orchestration — frameworks, protocols, and emerging patterns for coordinating teams of AI agents.

**Date:** February 2026

---

## 1. Overview

Multi-agent orchestration enables teams of AI agents with distinct roles to collaborate on complex tasks. Rather than a single monolithic agent handling everything, work is decomposed across specialized agents that communicate, delegate, and merge results. The field has moved from research prototypes to production systems: 67% of large enterprises run autonomous agents in production (2026), with the agent platform market at $10.86B.

Three architectural philosophies dominate:

| Philosophy | Representative | Core idea |
|---|---|---|
| **Graph-based** | LangGraph | Stateful directed graphs with explicit control flow, checkpointing, and retry |
| **Team-based** | CrewAI, Claude Code Agent Teams | Role-based teams with collaborative delegation and a lead coordinator |
| **Message-based** | AutoGen | Event-driven async message passing between conversational agents |

A fourth pattern — **handoff-based delegation** (OpenAI Agents SDK) — overlaps with team-based approaches but emphasizes lightweight tool-like transfers between agents rather than formal team membership.

The **A2A protocol** (Google, 2025) provides cross-framework interoperability, enabling agents built with different frameworks to discover and collaborate without sharing internal state.

---

## 2. Framework Comparison

### 2.1 LangGraph

**Architecture:** Stateful directed graphs where nodes are agent steps and edges encode control flow (conditional routing, loops, branches). State is checkpointed at each node, enabling retry, rollback, and human-in-the-loop interrupts.

**Key primitives:**
- `StateGraph` — defines nodes and edges
- Checkpointer — persists state for recovery
- `Command` — dynamic node routing within graph execution
- Subgraphs — compose smaller graphs into larger workflows

**Strengths:**
- Enterprise governance: distributed tracing, audit trails, retry policies
- Deterministic control flow with explicit conditional edges
- First-class support for human-in-the-loop at any node
- Multi-language: Python and JavaScript SDKs

**Weaknesses:**
- Higher complexity for simple workflows — graph definition overhead
- Python-centric ecosystem; JS SDK less mature
- Overkill for 2–3 agent scenarios

**Production pattern:** Supervisor node delegates to worker nodes; workers return results to supervisor for aggregation. Conditional edges route based on worker output (e.g., "needs review" → reviewer node, "approved" → merge node).

### 2.2 CrewAI

**Architecture:** Role-based teams where each agent has a defined role, goal, and backstory. A `Crew` orchestrates agents through `Task` objects with defined expected outputs.

**Key primitives:**
- `Agent` — role, goal, backstory, tools, LLM binding
- `Task` — description, expected output, assigned agent
- `Crew` — team composition, process (sequential or hierarchical)
- `Flow` — multi-crew workflows with event-driven state management

**Strengths:**
- Rapid team composition with minimal boilerplate
- Collaborative delegation: agents can ask other agents for help mid-task
- Built-in memory (short-term, long-term, entity-based)
- Lower barrier to entry than LangGraph

**Weaknesses:**
- Less control over execution order compared to graph-based approaches
- Opinionated abstractions may not fit all use cases
- Smaller ecosystem than LangGraph

**Production pattern:** Sequential crew where Researcher → Writer → Reviewer each complete their task before handoff.

### 2.3 AutoGen (Microsoft)

**Architecture:** Event-driven async message passing. Agents communicate through messages; no central orchestrator unless explicitly added. Supports multi-turn conversations between agents.

**Key primitives:**
- `ConversableAgent` — base agent with send/receive
- `GroupChat` — multi-agent conversation manager
- `GroupChatManager` — speaker selection, turn management
- Async runtime with message queues

**Strengths:**
- Natural fit for conversation-centric workflows
- Async-first: agents process messages independently
- Flexible topology: peer-to-peer, hub-and-spoke, or broadcast

**Weaknesses:**
- Less structured than graph-based approaches; harder to debug complex flows
- Speaker selection in group chat can be unpredictable
- Python-only SDK

**Production pattern:** Group chat with a manager selecting which agent speaks next based on conversation context.

### 2.4 OpenAI Agents SDK

**Architecture:** Handoff-based delegation. Agents transfer control to specialists via `transfer_to_[agent]()` tool calls. The SDK wraps this as a tool the LLM can invoke, making delegation feel like a function call.

**Key primitives:**
- `Agent` — instructions, tools, handoffs, model binding
- `Handoff` — transfer to another agent with optional `inputFilter`
- `Runner` — executes agent loop, handles tool calls and handoffs
- `Guardrail` — input/output validation before/after agent runs

**Strengths:**
- Simple mental model: delegation = tool call
- `inputFilter` controls what context the next agent sees (privacy, token efficiency)
- Built-in guardrails for input/output validation
- Tracing and observability built in

**Weaknesses:**
- OpenAI-centric (uses OpenAI API by default; adapters available but unofficial)
- Less suited for complex multi-step workflows with cycles
- Relatively new (2025); smaller community than LangGraph

**Production pattern:** Triage agent classifies user intent, hands off to billing/refund/FAQ specialist with filtered context.

### 2.5 Claude Code Agent Teams

**Architecture:** Lead + worker pattern. A lead agent receives user requests, decomposes them into subtasks, and delegates to worker agents. Workers execute focused tasks and post results to a mailbox; the lead consumes results at natural boundaries.

**Key primitives:**
- Lead agent — task decomposition and result aggregation
- Worker agents — focused task execution
- Mailbox — async result posting and consumption
- Shared filesystem — workers read/write files in a shared workspace

**Strengths:**
- Designed for coding tasks: workers operate on files, run tests, check builds
- Lead maintains coherent plan across workers
- Simple coordination model (mailbox, not complex message routing)

**Weaknesses:**
- Experimental feature; API surface may change
- Tightly coupled to Claude Code ecosystem
- Limited customization of coordination logic

---

## 3. A2A Protocol — Cross-Framework Interoperability

The Agent2Agent (A2A) protocol, originally developed by Google and donated to the Linux Foundation, provides a standard for agent-to-agent communication independent of framework choice. It complements MCP (agent-to-tool) by enabling agents to discover, delegate to, and collaborate with other agents without sharing internal state or tools.

### Core concepts

| Concept | Description |
|---|---|
| **Agent Card** | JSON manifest at `/.well-known/agent-card.json` describing agent capabilities, skills, auth, and supported interfaces |
| **Task** | Stateful work unit with lifecycle: submitted → working → completed/failed/canceled |
| **Message** | Communication unit containing Parts (text, data, file) |
| **Part** | Content atom: TextPart, DataPart, FilePart |
| **Context** | Shared conversation thread across multiple tasks |

### Task lifecycle

```
submitted → working → completed
                   → failed
                   → canceled
                   → input_required (interrupted, awaiting user input)
                   → auth_required (interrupted, awaiting credentials)
```

### Transport

- JSON-RPC 2.0 over HTTP (request/response)
- Server-Sent Events (SSE) for real-time streaming updates
- Push notifications for long-running tasks

### Why A2A matters

A2A solves the "framework island" problem. A LangGraph agent, a CrewAI crew, and a custom agent can all expose Agent Cards and communicate through A2A Tasks — no shared SDK required. For IDE-integrated agents like Cursor Drive's operators, A2A enables collaboration with external agents (CI/CD bots, design reviewers, security scanners) through a standard protocol.

### Current state

- **Spec version:** v0.3.0, approaching RC v1.0
- **Adoption:** 50+ enterprise partners; SDKs for Python, JavaScript, Go
- **Maturity:** Emerging but stabilizing rapidly. Core primitives (Agent Card, Task, Message) are stable; streaming and push notification APIs are still evolving.

---

## 4. Emerging Patterns

### 4.1 Role Separation

The triage → specialist pattern is the most widely adopted multi-agent architecture. A front-line agent classifies the request and routes to a specialist. This maps to intent classification in traditional systems but uses LLM-powered routing.

**Example:** User asks "why is auth failing?" → Triage routes to Debug specialist (not Plan or Ask specialist).

**Drive parallel:** Drive's sub-mode routing (`plan`, `agent`, `ask`, `debug`) is structurally identical to triage → specialist. The `driveMode.ts` sub-mode selection is the triage step; the Cursor native mode is the specialist.

### 4.2 Handoff with Context Filtering

When one agent delegates to another, the entire conversation history is often too large or contains irrelevant context. The OpenAI Agents SDK introduced `inputFilter` — a function that selects which messages the receiving agent sees.

**Patterns:**
- **Remove all history:** Specialist starts fresh with only the delegation prompt
- **Summary filter:** Inject a 1-sentence summary of prior context
- **Role filter:** Only pass messages from agents with specific roles

**Drive parallel:** Drive's `sessionMemory.ts` already implements operator-scoped context via visibility modes (`isolated`, `shared`, `collaborative`). Isolated visibility is equivalent to "remove all history"; collaborative visibility is equivalent to "pass with attribution."

### 4.3 Escalation

Child agents escalate to parent agents when they lack capability or confidence. This is the inverse of delegation: work flows upward rather than downward.

**Patterns:**
- **Confidence threshold:** Agent checks its own confidence score; escalates if below threshold
- **Tool unavailable:** Agent needs a tool it doesn't have access to (permission cascade)
- **Timeout escalation:** Task exceeds time budget; parent decides whether to continue, retry, or abandon

**Drive parallel:** Drive's permission cascade (child cannot exceed parent preset) creates natural escalation boundaries — a `readonly` operator cannot write files, so it must escalate file-write actions to its parent.

### 4.4 Conflict Resolution

When multiple agents work on overlapping scope, their outputs may conflict (e.g., two agents edit the same file differently). Resolution strategies:

- **Last-writer-wins:** Simple but lossy — later edits overwrite earlier ones
- **Merge:** Git-style 3-way merge of agent outputs
- **Arbiter agent:** A dedicated agent reviews conflicting outputs and synthesizes a resolution
- **Operator vote:** Multiple agents propose; a supervisor selects the best

**Drive parallel:** Drive's `merge()` function in `operatorRegistry.ts` implements a summarize-and-inject merge strategy. The source operator's memory is summarized and injected into the target's context. This is closer to "arbiter" than "last-writer-wins."

### 4.5 Monitoring and Observability

Production multi-agent systems require:
- **Distributed tracing** — follow a request across agent boundaries
- **Checkpointing** — save state for recovery and debugging
- **Human-in-the-loop gates** — pause execution for approval at critical points
- **Cost tracking** — per-agent model call costs and token usage

**Drive parallel:** Drive's `AgentScreenPanel` provides real-time operator activity visibility. The `commsAgent.ts` batches notifications at natural pauses. The `approvalGates.ts` implements human-in-the-loop for high-impact actions. Cost tracking is not yet implemented.

---

## 5. Comparison Matrix

| Dimension | LangGraph | CrewAI | AutoGen | OpenAI Agents SDK | A2A Protocol | Claude Code Teams |
|---|---|---|---|---|---|---|
| **Architecture** | Stateful graph | Role-based teams | Event-driven messages | Handoff tools | HTTP+JSON-RPC | Lead+worker |
| **Language** | Python, JS | Python | Python | Python, JS | Language-agnostic | Claude Code |
| **State management** | Checkpointed graph | Crew memory | Conversation history | Runner state | Task lifecycle | Filesystem + mailbox |
| **Delegation model** | Graph edges | Task assignment | Message passing | `transfer_to_*()` | Task creation | Lead decomposition |
| **Context filtering** | Node-scoped state | Agent backstory | Message selection | `inputFilter` | Message parts | Worker isolation |
| **Interop** | LangSmith ecosystem | CrewAI only | AutoGen only | OpenAI API | Cross-framework | Claude Code only |
| **Complexity** | High | Medium | Medium | Low | Low (protocol) | Low |
| **Maturity** | Established | Established | Established | Emerging | Emerging | Experimental |

---

## 6. Industry Trajectory

The multi-agent orchestration space is converging on several consensus positions:

1. **MCP + A2A is the protocol stack.** MCP for agent-to-tool; A2A for agent-to-agent. Most frameworks are adding A2A support alongside existing MCP integration.

2. **Lead + worker is the dominant production pattern.** Whether called supervisor/worker (LangGraph), crew/agent (CrewAI), or lead/teammate (Claude Code), the pattern is consistent: one coordinator decomposes, delegates, and aggregates.

3. **Handoff > message passing for most use cases.** Structured handoff (OpenAI SDK, A2A Tasks) is replacing unstructured message passing for production systems. It provides clearer boundaries, better observability, and simpler debugging.

4. **Context filtering is essential at scale.** Passing full conversation history to every agent is a token cost and privacy problem. The industry is standardizing on filtered handoff.

5. **Gartner warning: 40% cancellation rate by 2027.** Multi-agent systems add complexity. The industry is learning that "more agents" is not always better — focused agents with clear roles outperform large agent swarms.
