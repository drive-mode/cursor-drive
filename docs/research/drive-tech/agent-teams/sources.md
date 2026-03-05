# Agent Teams — Sources

**Topic:** References and bibliography for multi-agent orchestration research.

**Date:** February 2026

---

## Frameworks

### LangGraph
- [LangGraph documentation](https://langchain-ai.github.io/langgraph/) — Official docs for stateful graph-based agent orchestration
- [LangGraph multi-agent tutorial](https://langchain-ai.github.io/langgraph/tutorials/multi_agent/multi-agent-collaboration/) — Supervisor + worker pattern walkthrough
- [LangGraph JS SDK](https://langchain-ai.github.io/langgraphjs/) — JavaScript/TypeScript SDK

### CrewAI
- [CrewAI documentation](https://docs.crewai.com/) — Role-based team orchestration framework
- [CrewAI Flows](https://docs.crewai.com/concepts/flows) — Multi-crew workflow composition

### AutoGen (Microsoft)
- [AutoGen documentation](https://microsoft.github.io/autogen/) — Event-driven async multi-agent framework
- [AutoGen GroupChat](https://microsoft.github.io/autogen/docs/reference/agentchat/groupchat/) — Multi-agent conversation management

### OpenAI Agents SDK
- [OpenAI Agents SDK — Handoffs](https://openai.github.io/openai-agents-js/guides/handoffs/) — Handoff-based delegation pattern
- [OpenAI Agents SDK — JavaScript](https://openai.github.io/openai-agents-js/) — TypeScript/JavaScript agent SDK
- [OpenAI Agents SDK — Guardrails](https://openai.github.io/openai-agents-js/guides/guardrails/) — Input/output validation for agents

### Claude Code Agent Teams
- [Claude Code Agent Teams](https://code.claude.com/docs/en/agent-teams) — Lead + worker pattern for coding tasks
- [Claude Code MCP integration](https://code.claude.com/docs/en/mcp) — MCP server registration for Claude Code

### AWS Strands Agents
- [Strands Agents TypeScript SDK](https://strandsagents.com/latest/documentation/docs/api-reference/typescript/) — TypeScript agent SDK
- [Strands Agents McpClient](https://strandsagents.com/latest/documentation/docs/api-reference/typescript/classes/McpClient.html) — MCP client for connecting to MCP servers
- [AWS: Strands Agents & MCP](https://aws.amazon.com/blogs/opensource/open-protocols-for-agent-interoperability-part-3-strands-agents-mcp/) — Strands + MCP integration guide

---

## Protocols

### A2A (Agent2Agent)
- [A2A Protocol Specification](https://a2a-protocol.org/latest/specification/) — Full protocol specification (v0.3.0)
- [A2A Key Concepts](https://a2a-protocol.org/latest/topics/key-concepts/) — Agent Cards, Tasks, Messages, Parts
- [A2A JavaScript SDK](https://github.com/a2aproject/a2a-js) — Official JavaScript/TypeScript SDK
- [A2A announcement (Google)](https://developers.googleblog.com/en/a2a-a-new-era-of-agent-interoperability) — Original announcement (April 2025)

### MCP (Model Context Protocol)
- [MCP Specification](https://modelcontextprotocol.io/specification/) — Agent-to-tool protocol
- [MCP Transport Future](https://blog.modelcontextprotocol.io/posts/2025-12-19-mcp-transport-future/) — Stateless transport direction
- [MCP Apps](https://modelcontextprotocol.io/docs/extensions/apps) — UI extension for MCP tools

### ACP (Agent Client Protocol)
- [JetBrains × Zed ACP announcement](https://blog.jetbrains.com/ai/2025/10/jetbrains-zed-open-interoperability-for-ai-coding-agents-in-your-ide) — Cross-IDE agent protocol (October 2025)

---

## Industry Analysis

- [Agent Orchestration 2026 guide](https://iterathon.tech/blog/ai-agent-orchestration-frameworks-2026) — Framework comparison and production patterns
- [Production agentic AI systems guide](https://brlikhon.engineer/blog/building-production-agentic-ai-systems-in-2026-langgraph-vs-autogen-vs-crewai-complete-architecture-guide) — Architecture patterns for production multi-agent systems
- [Gartner: 40% agentic AI cancellation by 2027](https://www.gartner.com/en/newsroom/) — Risk analysis for enterprise agent adoption

---

## Security and Safety

- [AgentBound — MCP Access Control](https://arxiv.org/abs/2510.21236) — Declarative permission model for MCP servers (October 2025)
- [MiniScope — Least-privilege tools](https://arxiv.org/abs/2512.11147) — Auto-reconstruct permission hierarchies (December 2025)
- [AgentGuardian — Context-aware ACL](https://arxiv.org/abs/2601.10440) — Runtime behavior monitoring (January 2026)
- [Anthropic Petri — Automated safety auditing](https://anthropic.com/research/petri-open-source-auditing) — Multi-turn simulation for agent safety testing (October 2025)

---

## Observability

- [Langfuse — LLM Observability](https://langfuse.com/docs/tracing) — Open-source tracing and evaluation platform
- [LangSmith — LangChain tracing](https://smith.langchain.com/) — Distributed tracing for LangGraph agents

---

## Cursor Drive Internal References

| Document | Relevance |
|---|---|
| [ADR-0004: Multi-Agent Registry](../../architecture/adr/ADR-0004-multi-agent-registry.md) | Foundation — in-memory operator registry, tangent spawning |
| [ADR-0014: Agent Orchestration Strategy](../../architecture/adr/ADR-0014-agent-orchestration-strategy.md) | Strategy — A2A adoption, Claude Code reference architecture, Strands evaluation |
| [ADR-0016: Drive Terminology and Hierarchy](../../architecture/adr/ADR-0016-drive-terminology-and-hierarchy.md) | Naming — operator/agent distinction, MCP tool deprecation strategy |
| [A2A Protocol Research](../a2a-protocol-research.md) | Research — A2A spec details, Agent Card schema, integration path |
| [Claude Code Agent Teams Bridge](../claude-code-agent-teams-bridge.md) | Integration — MCP registration, validated tools, team setup |
| [Strands Agents Evaluation](../strands-agents-evaluation.md) | Evaluation — TypeScript SDK, McpClient compatibility |
| [Technology Landscape 2026](../technology-landscape-2026.md) | Context — Agent Teams section (§4), related technologies |
| `src/operatorRegistry.ts` | Source — Operator lifecycle, permission cascade, delegation |
| `src/commsAgent.ts` | Source — Batched notifications, background operator updates |
| `src/mcpServer.ts` | Source — MCP tools, A2A endpoints, Agent Card |
| `src/sessionMemory.ts` | Source — Token-budgeted memory, operator scoping, compaction |
