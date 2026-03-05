---
name: SDK and Protocol Research
overview: Research Copilot SDK, ACP protocol, and agentic frameworks to determine which ideas, patterns, or integrations Cursor Drive should adopt -- using parallel subagents for each research track.
todos:
  - id: copilot-sdk-audit
    content: "Track 1: Audit Copilot SDK (Python + TS) features -- catalog /fleet, tool orchestration, BYOK, agent skills, parallel execution. Compare each to Drive's existing capabilities. Sources: github/copilot-sdk repo, docs/, python/ folders."
    status: pending
  - id: acp-protocol-eval
    content: "Track 2: Evaluate ACP protocol -- session model, prompt lifecycle, permission flows, streaming. Compare to Drive's MCP-over-HTTP bridge. Determine if ACP adds value or creates redundancy. Sources: ACP spec repo, Copilot ACP server docs, ACP registry."
    status: pending
  - id: acp-python-sdk-patterns
    content: "Track 3: Extract reusable patterns from ACP Python SDK -- transport abstractions, streaming helpers, permission brokers, session accumulators. Identify what's worth porting to TypeScript for a cursor-sdk layer. Source: agentclientprotocol/python-sdk."
    status: pending
  - id: agentic-framework-scan
    content: "Track 4: Survey agentic orchestration frameworks (LangGraph, CrewAI, AutoGen, Semantic Kernel, etc.). Assess fit with Drive's multi-operator model. Produce short pros/cons for top 3 and recommend adopt vs. stay self-contained."
    status: pending
  - id: cursor-cli-feasibility
    content: "Track 5: Investigate Cursor CLI programmatic integration -- can it be driven in server mode like Copilot CLI's --acp? Would wrapping it give Drive capabilities beyond the extension API? Produce feasibility assessment."
    status: pending
  - id: synthesize-recommendation
    content: "Track 6 (sequential, after 1-5): Synthesize findings into a single recommendation using the decision framework (fit, effort, lock-in, overlap). Produce concrete next steps for approved items."
    status: pending
isProject: false
---

# SDK, ACP, and Agentic Framework Research

## Context

Cursor Drive is a Cursor/VS Code extension (TypeScript). It already has an MCP server bridge (`src/mcpServer.ts`) for tool exposure. The question is whether to adopt external SDKs, protocols, or patterns to accelerate capability.

Key tension: Copilot SDK is designed for Copilot CLI integration, not Cursor. But it's open-source, so we can extract high-value patterns. ACP is editor-agnostic and could complement or replace our MCP bridge.

## Research tracks (each maps to a parallel subagent todo)

### Track 1: Copilot SDK feature audit

- Source: [github/copilot-sdk](https://github.com/github/copilot-sdk), [python/](https://github.com/github/copilot-sdk/tree/main/python), [docs/](https://github.com/github/copilot-sdk/tree/main/docs)
- Goal: Catalog features (e.g. `/fleet`, tool orchestration, BYOK, agent skills, parallel task execution) and assess which are novel vs. already in Drive
- Deliverable: Feature comparison matrix (SDK feature -> Drive equivalent or gap)

### Track 2: ACP protocol evaluation

- Source: [ACP spec](https://github.com/agentclientprotocol/agent-client-protocol), [ACP registry](https://github.com/agentclientprotocol/registry), [Copilot ACP server docs](https://docs.github.com/en/copilot/reference/acp-server)
- Goal: Understand ACP's session/prompt/permission model and compare with Drive's MCP bridge
- Deliverable: Protocol comparison (ACP vs. MCP-over-HTTP as Drive uses today), adoption/rejection recommendation

### Track 3: ACP Python SDK patterns

- Source: [agentclientprotocol/python-sdk](https://github.com/agentclientprotocol/python-sdk)
- Goal: Extract transport, streaming, permission, and helper patterns that could inform a "cursor-sdk" layer
- Deliverable: List of reusable abstractions worth porting to TypeScript

### Track 4: Agentic framework landscape scan

- Goal: Quick survey of orchestration frameworks (LangGraph, CrewAI, AutoGen, Semantic Kernel, etc.) and assess if any would benefit Drive's multi-operator model
- Deliverable: Short pros/cons for top 3 candidates, recommendation on whether to adopt one or stay self-contained

### Track 5: Cursor CLI integration feasibility

- Goal: Determine if/how Cursor CLI can be programmatically driven (like Copilot CLI's `--acp` server mode) and whether wrapping it gives Drive new capabilities beyond what the extension API provides
- Deliverable: Feasibility assessment with concrete integration path or rejection rationale

## Decision framework (applied after research)

For each candidate (SDK, protocol, framework), evaluate:

- **Fit**: Does it align with Drive's voice-first, multi-operator, Cursor-native architecture?
- **Effort**: How much work to integrate vs. build equivalent?
- **Lock-in**: Does adoption create dependency on another vendor's release cycle?
- **Overlap**: Does it duplicate what Drive already has (MCP server, operator registry, pipeline)?

## Outcome

A single recommendation document covering:

- Which Copilot SDK features to port (if any) and how
- Whether to adopt ACP alongside or instead of current MCP bridge
- Whether to adopt an external orchestration framework
- Concrete next steps (with scope estimates) for approved items
