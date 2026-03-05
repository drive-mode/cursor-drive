# Track 4: Agentic Framework Scan

**Plan:** sdk_and_protocol_research_6c42aa0c  
**Deliverable:** Survey of orchestration frameworks, fit assessment with Drive's multi-operator model, and adoption recommendation

---

## 1. Framework Overview

| Framework | Primary Language | Model | Maturity |
|-----------|------------------|-------|----------|
| **LangGraph** | Python, JS/TS (`@langchain/langgraph`) | State graph, nodes + edges, checkpointing | Production-ready (1.0 Oct 2025) |
| **CrewAI** | Python only | Role-based agents, Crews, Tasks | Prototyping-focused |
| **AutoGen** | Python, .NET | Procedural, manual orchestration | Microsoft unified stack (Oct 2025) |
| **Semantic Kernel** | C#, Python, Java; unofficial TS port | Skills, planner, sequential/concurrent/handoff | Enterprise, Azure-centric |
| **VoltAgent** | TypeScript | Supervisor orchestration, MCP support | Open-source, newer |
| **OpenAI Agents SDK** | TypeScript | Multi-agent, handoffs, streaming | Lightweight, provider-agnostic |

---

## 2. Top 3 Candidates: Pros and Cons

### LangGraph

**Pros:**
- Production-ready: checkpointing, pause/resume, cyclic graphs for retry
- Explicit state management; deterministic execution paths
- JS/TS support via `@langchain/langgraph` (StateGraph, Pregel runtime)
- Strong observability (LangSmith tracing)
- Human-in-the-loop first-class; conditional branching, parallel execution
- Widely adopted (Klarna, Replit, Elastic; ~6M monthly downloads)

**Cons:**
- Steep learning curve; graph/state expertise required
- Three abstraction layers (LangGraph → LangChain → providers)
- Rigid upfront state definition; complexity grows with graph size
- Requires infrastructure for production (LangSmith, persistence)

---

### CrewAI

**Pros:**
- Low learning curve; intuitive Agent/Crew/Task object model
- Fast prototyping; role-based agents with personas, goals, backstories
- Seamless state management and agent coordination out-of-the-box
- Pre-built tools; clean syntax

**Cons:**
- **Python only** — no TypeScript; would require subprocess/HTTP bridge
- "Complexity wall" at production scale: unpredictable loops, cluttered context
- 3× higher token overhead vs. alternatives
- Logging and debugging problematic; difficult to refine for complex systems
- Scaling constraints under strict SLAs

---

### Semantic Kernel

**Pros:**
- Enterprise integration (Azure, Microsoft ecosystem)
- Multiple orchestration patterns: sequential, concurrent, handoff, group chat
- Skills/planner model aligns with tool-based workflows
- Official C#/Python/Java; community TypeScript port exists

**Cons:**
- **No official TypeScript** — unofficial port (`lordkiz/semantic-kernel-typescript`) only
- Agent orchestration still experimental
- Microsoft-centric; lock-in to Azure tooling for full value
- Heavier abstraction; overkill for simple delegation

---

## 3. Drive's Multi-Operator Model (Codebase Summary)

Drive's architecture is distinct from these frameworks:

| Aspect | Drive | Typical Framework |
|--------|-------|-------------------|
| **Execution** | Cursor's Agent runtime runs operators | Framework runs its own LLM workers |
| **Entry point** | `beforeSubmitPrompt` hook + MCP tools | Framework's main loop |
| **Operators** | Cursor agents (spawned via `operator_spawn` MCP tool) | Framework-managed agents |
| **Hierarchy** | `parentId`, `depth`, cascade dismiss, permission presets | Varies; often flat or crew-based |
| **Roles** | `implementer`, `reviewer`, `tester`, `researcher`, `planner` (ROLE_TEMPLATES) | Framework-defined or custom |
| **Permissions** | `readonly` / `standard` / `full`; child capped by parent | Usually uniform or config-based |
| **Stack** | TypeScript extension host, Python hooks | Python or framework-specific |

**Key files:** `src/operatorRegistry.ts`, `src/mcpServer.ts`, `.cursor/rules/operator-hierarchy.mdc`

---

## 4. Fit Assessment

### Voice-First

- **Drive:** Pipeline (filler clean, glossary, sanitize, optimize) + TTS + status bar. Voice is the primary input surface.
- **Frameworks:** None address voice. They assume text prompts or API calls.
- **Fit:** N/A — frameworks do not replace or augment Drive's voice pipeline.

### Multi-Operator

- **Drive:** Hierarchical spawn (parent/child), cascade dismiss, depth-based preset capping. Operators are Cursor agents; spawning is via MCP tool calls from within a Cursor agent turn.
- **Frameworks:** LangGraph uses graph nodes (not parent/child operators); CrewAI uses Crews with flat or hierarchical tasks; Semantic Kernel uses agent patterns. All assume the framework *owns* agent execution.
- **Fit:** **Poor** — Drive operators execute inside Cursor's runtime. Frameworks would introduce a parallel execution layer. ADR-0021: "Drive operators are Cursor agents, not arbitrary LLM workers."

### Cursor-Native

- **Drive:** Wraps Agent/Plan/Ask/Debug; `beforeSubmitPrompt` is the pipeline entry; MCP server at `:7891` exposes tools.
- **Frameworks:** Standalone runtimes; no VS Code extension integration; no Cursor hook awareness.
- **Fit:** **Poor** — Frameworks are not designed for extension-host integration or Cursor's prompt interception model.

### Language

- **Drive:** TypeScript (extension), Python (hooks).
- **Fit:** LangGraph has JS/TS; CrewAI and AutoGen are Python-only. Semantic Kernel has unofficial TS. VoltAgent and OpenAI Agents SDK are TS-native but still assume framework-owned execution.

---

## 5. Decision Framework Summary

| Criterion | LangGraph | CrewAI | Semantic Kernel |
|-----------|-----------|--------|-----------------|
| **Fit** | Low — wrong abstraction (graph vs. Cursor agents) | Low — Python, wrong layer | Low — no official TS, wrong layer |
| **Effort** | High — graph engine, state, persistence | High — subprocess bridge, re-architect | High — port or bridge |
| **Lock-in** | Medium — LangChain ecosystem | Medium — CrewAI releases | High — Microsoft/Azure |
| **Overlap** | High — would duplicate operator lifecycle | High — role concepts overlap ROLE_TEMPLATES | High — skills overlap MCP tools |

---

## 6. Recommendation

### **Stay Self-Contained**

Do not adopt an external orchestration framework for Drive's multi-operator model.

### Rationale

1. **Wrong abstraction layer** (ADR-0021)
   - Frameworks manage LLM workers with their own execution loops.
   - Drive operators are Cursor agents that execute within Cursor's existing agent runtime.
   - Adopting a framework would create a parallel execution layer and duplicate responsibilities.

2. **Drive's model is already well-suited**
   - `operatorRegistry` with spawn, parentId, depth, cascade, and ROLE_TEMPLATES covers current needs.
   - Lead+worker pattern with role templates and escalation (ADR-0021) addresses structured delegation.
   - MCP tools (`operator_spawn`, `operator_switch`, etc.) provide the orchestration surface.

3. **Cursor-native integration is non-negotiable**
   - Frameworks have no `beforeSubmitPrompt` awareness, no extension-host integration.
   - Drive must remain a behavioral wrapper; frameworks assume they own the main loop.

4. **Language and runtime mismatch**
   - CrewAI, AutoGen: Python-only; would require subprocess/HTTP bridge and re-architecture.
   - LangGraph JS/TS: Still assumes graph-based execution, not Cursor agent turns.
   - Semantic Kernel: No official TS; unofficial port adds maintenance risk.

5. **Deferred, not rejected**
   - If Drive later needs multi-step workflows with branching, cycles, or complex conditional routing, revisit LangGraph-style patterns.
   - Gate: At least 3 user-reported cases where manual operator coordination failed (per `docs/research/drive-tech/agent-teams/02_implementation.md`).

### What to adopt instead

- **Incremental enhancements** (already in ADR-0021): role templates, escalation, A2A SSE streaming.
- **Pattern inspiration:** LangGraph's checkpointing and human-in-loop could inform future Agent Screen or pipeline design — as design references, not framework adoption.
- **TypeScript-native options (VoltAgent, OpenAI Agents SDK):** Monitor for patterns (e.g. MCP integration, handoffs) that could inform Drive's MCP tool design; do not adopt as orchestration engines.

---

## 7. Summary Table

| Question | Answer |
|----------|--------|
| Adopt LangGraph? | No — wrong abstraction; Cursor owns execution |
| Adopt CrewAI? | No — Python-only; wrong layer |
| Adopt Semantic Kernel? | No — no official TS; wrong layer |
| Stay self-contained? | **Yes** — operatorRegistry + role templates + escalation suffice |
| Revisit when? | If complex multi-step workflows with branching become validated need |

---

## Sources

- [LangGraph vs CrewAI vs AutoGen (Likhon)](https://brlikhon.engineer/blog/multi-agent-orchestration-langgraph-vs-crewai-vs-autogen-for-enterprise-workflows)
- [LangGraph vs CrewAI Production 2025](https://xcelore.com/blog/langgraph-vs-crewai/)
- [LangGraph JS/TS Reference](https://reference.langchain.com/javascript/langchain-langgraph)
- [Semantic Kernel Agent Orchestration](https://learn.microsoft.com/en-us/semantic-kernel/frameworks/agent/agent-orchestration/)
- [AutoGen Microsoft Research](https://www.microsoft.com/en-us/research/project/autogen/)
- [VoltAgent TypeScript Framework](http://voltagent.dev/)
- [OpenAI Agents SDK](https://github.com/openai/openai-agents-js)
- Drive: `src/operatorRegistry.ts`, `src/mcpServer.ts`, `docs/architecture/adr/ADR-0021-agent-orchestration-enhancement.md`, `docs/research/drive-tech/agent-teams/02_implementation.md`, `.cursor/rules/operator-hierarchy.mdc`
