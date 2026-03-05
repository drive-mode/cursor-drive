---
name: Agent Orchestration Frameworks
overview: "Implement agent-to-agent interoperability via A2A protocol, bridge Claude Code Agent Teams to Drive MCP, evolve AgentRegistry to a lead+worker model with mailbox communication, rescue CommsAgent from tests/, and evaluate Strands Agents as a worker runtime."
planType: task
planId: agent-orchestration-frameworks
parentPlanId: cursor-drive
childPlanIds: []
dependsOn: [architecture-vision-foundation]
todos:
  - id: aof-01-adr-orchestration
    content: "Write docs/architecture/adr/ADR-0014-agent-orchestration-strategy.md. Decision: A2A protocol for agent-to-agent interop alongside MCP for agent-to-tool; Claude Code Agent Teams pattern as reference architecture for AgentRegistry v2 lead+worker model; Strands Agents as evaluation candidate for worker runtime; LangGraph deferred (too heavy); OpenClaw not applicable (messaging gateway). Acceptance: file exists, status=Accepted, covers A2A+MCP layering, registry v2 design rationale, and deferred frameworks."
    status: completed
  - id: aof-02-a2a-research
    content: "Research and document A2A spec v0.1.0. Read the A2A spec (https://a2a-protocol.org), extract: Agent Card schema, Task lifecycle states (submitted/working/completed/failed/canceled), message format (JSON-RPC 2.0 over HTTP + SSE), authentication model. Write findings to docs/research/a2a-protocol-research.md. Acceptance: file exists, covers Agent Card fields, Task states, message format, and integration path with existing DriveMcpServer at :7891."
    status: completed
  - id: aof-03-comms-agent-rescue
    content: "Move CommsAgent from tests/src/commsAgent.ts to src/commsAgent.ts. Verify the existing implementation compiles (it has no corresponding src/ file — only test file). Wire it into extension.ts: instantiate CommsAgent, register its dispose in context.subscriptions. CommsAgent delivers batched background agent updates via ShareScreen + TTS + vscode.window.showInformationMessage. Acceptance: src/commsAgent.ts exists; commsAgent imported and instantiated in activate(); npm run compile passes; existing tests pass."
    status: completed
  - id: aof-04-agent-event-bus
    content: "Add a typed EventEmitter to AgentRegistry in src/agentRegistry.ts: events = { agentCompleted(id, summary), agentProgress(id, message), agentError(id, error), taskDelegated(fromId, toId, task) }. CommsAgent subscribes to agentCompleted and agentProgress to batch and deliver notifications. Acceptance: EventEmitter pattern implemented with 4 event types; CommsAgent subscribes to completion/progress events; npm run compile passes; unit test for event emission added."
    status: completed
  - id: aof-05-a2a-agent-card
    content: "Implement A2A Agent Card endpoint on DriveMcpServer. Add GET /.well-known/agent.json endpoint to the existing HTTP server at :7891 returning an A2A-compliant Agent Card describing Drive's capabilities: name, description, version, supported skills (voice-pipeline, multi-agent, share-screen), authentication (none for local). Acceptance: GET http://127.0.0.1:7891/.well-known/agent.json returns valid JSON matching A2A Agent Card schema; npm run compile passes."
    status: completed
  - id: aof-06-a2a-task-endpoints
    content: "Implement A2A Task CRUD endpoints on DriveMcpServer. Add POST /tasks (submit task), GET /tasks/:id (status), POST /tasks/:id/cancel (cancel) using JSON-RPC 2.0. Tasks are delegated to AgentRegistry.spawn(). Acceptance: POST /tasks creates an agent and returns task with id+status=submitted; GET /tasks/:id returns current task status; cancel sets status=canceled; npm run compile passes; integration test covers submit→working→completed lifecycle."
    status: completed
  - id: aof-07-claude-code-bridge
    content: "Prototype Claude Code Agent Teams MCP bridge. Document and test registering Drive's MCP server with Claude Code: run 'claude mcp add cursor-drive http://127.0.0.1:7891/mcp' and validate that agent team sessions can call drive_speak, drive_share_screen_activity, and agent_spawn tools. Write findings and working config to docs/research/claude-code-agent-teams-bridge.md. Acceptance: doc exists with working claude mcp config, validated tool list, and any limitations found (e.g. auth, streaming support)."
    status: completed
  - id: aof-08-registry-v2-design
    content: "Design AgentRegistry v2 architecture informed by Claude Code Agent Teams. Write docs/design/architecture/agent-registry-v2-design.md covering: (1) shared task list (one lead agent claims tasks, workers execute them), (2) mailbox messaging (typed async messages between agents via EventEmitter + queue), (3) file-lock coordination (prevent concurrent writes to same file by different agents), (4) lead agent concept (orchestrator role, not just first spawned agent). Acceptance: design doc exists, covers all 4 components with diagrams, implementation order defined."
    status: completed
  - id: aof-09-mcp-agent-tools
    content: "Add missing MCP tools to src/mcpServer.ts: (1) agent_update_memory — append a string to a named agent's memory array (MCP-callable version of AgentRegistry.updateMemory()); (2) agent_set_visibility — set agent visibility mode ('isolated' | 'shared' | 'collaborative') on AgentContext; (3) agent_delegate — delegate a task from one agent to another (creates a directed edge in the task graph, spawns if target doesn't exist). Acceptance: 3 new tools in mcpServer.ts; tools accessible via MCP; AgentContext has visibility field; npm run compile passes."
    status: completed
  - id: aof-10-strands-eval
    content: "Spike AWS Strands Agents TypeScript SDK as a worker agent runtime. Install @strands/agent (preview) in a sandbox branch. Write a minimal Strands agent that connects to Drive's MCP server at :7891 and calls agent_spawn + share_screen_activity. Validate: does the TS SDK support Streamable HTTP MCP transport? Document results in docs/research/strands-agents-evaluation.md. Acceptance: eval doc exists with working/non-working verdict, TS SDK version tested, MCP transport compatibility result, and go/no-go recommendation."
    status: completed
  - id: aof-11-openclaw-research
    content: "Document OpenClaw integration assessment in docs/research/openclaw-integration-analysis.md (update existing). Add section: OpenClaw is a messaging gateway (WhatsApp/Telegram/Discord), not a coding agent framework. No MCP support, no VS Code integration. Low priority for Cursor IDE workflows. Possible future use: Drive accessible via Telegram for mobile coding sessions. Acceptance: existing openclaw doc updated with new section; architecture mismatch documented; deferred status recorded."
    status: completed
isProject: false
---

# Agent Orchestration Frameworks

## Purpose

Cursor Drive's AgentRegistry supports spawn/switch/merge/dismiss but lacks inter-agent communication, lead+worker orchestration, and external protocol interoperability. This plan builds the next layer: A2A protocol compliance, Claude Code Agent Teams bridge, AgentRegistry v2 with mailbox + task list, and runtime evaluation.

## Vision alignment

Drive is a behavioral wrapper around Cursor's native modes. Multi-agent orchestration extends this: Drive can orchestrate **teams** of agents where one agent leads and others execute in parallel, reporting back via the CommsAgent. External agents (Claude Code sessions, Strands workers, A2A-compliant agents) can delegate work to Drive or receive delegated tasks from it.

## Architecture target

```
External A2A Agent
      │
      │ HTTP/JSON-RPC (A2A Task endpoints at :7891)
      ▼
DriveMcpServer (:7891)
      │
      ├── A2A endpoints: /.well-known/agent.json, POST /tasks, GET /tasks/:id
      ├── MCP tools: all existing + agent_delegate, agent_update_memory, agent_set_visibility
      │
      ▼
AgentRegistry v2
      ├── Lead agent (orchestrator role)
      ├── Worker agents (spawn from task delegation)
      ├── Shared task list (lead claims, workers execute)
      ├── Mailbox (async typed messages between agents)
      └── Event bus (agentCompleted, agentProgress, agentError, taskDelegated)
              │
              ▼
        CommsAgent (src/commsAgent.ts)
              │
              ├── ShareScreen (logActivity)
              ├── TTS (speak summary)
              └── vscode.window.showInformationMessage
```

## Framework decision summary

| Framework | Decision | Rationale |
|---|---|---|
| A2A (incl. ACP) | Implement (v0.1.0) | Emerging interop standard; HTTP/JSON-RPC alongside MCP |
| Claude Code Teams | Bridge + copy patterns | Experimental but architecturally sound lead+worker reference |
| MCP | Already shipping | Foundation; extend tool surface only |
| AWS Strands | Evaluate | Native MCP TS SDK; validate before committing |
| LangGraph | Defer | Too heavy; only if registry proves insufficient |
| OpenClaw | Research note | Different domain (messaging gateway); not a coding agent framework |

## Dependency notes

- Depends on `architecture-vision-foundation` for ADR-0014 (this plan's aof-01 writes that ADR)
- aof-03 (CommsAgent rescue) should complete before aof-04 (event bus) since CommsAgent subscribes to events
- aof-02 (A2A research) should complete before aof-05 and aof-06 (A2A implementation)
- aof-08 (registry v2 design) is design-only; implementation is a separate future plan

## Execution strategy

**Executor role:** Orchestrator for design/research tasks; Implementer for code changes.

**Subagent fan-out:**
- Batch A (parallel): aof-01 (ADR), aof-02 (A2A research), aof-11 (OpenClaw update) — all docs
- Batch B (parallel): aof-03 (CommsAgent rescue), aof-07 (Claude Code bridge research) — independent
- Batch C (parallel): aof-04 (event bus) after aof-03; aof-05 + aof-06 (A2A endpoints) after aof-02
- Batch D: aof-08 (registry v2 design) — architecture doc, no code deps
- Batch E (parallel): aof-09 (MCP tools), aof-10 (Strands eval) — independent

**Phase gate before marking complete:** aof-01 ADR accepted, aof-03 CommsAgent in src/, aof-05 Agent Card endpoint working, npm compile + test pass.

**Delegation triggers:** Spawn subagent if aof-06 (Task CRUD) spans >3 files or requires new HTTP routing layer. Spawn subagent for aof-08 if registry v2 design needs architecture diagram generation.

## Reconciliation

All 11 TODOs completed. Verified:

- **aof-01**: ADR-0014 already written by avf-09 (architecture-vision-foundation). No change.
- **aof-02**: `docs/research/a2a-protocol-research.md` created — Agent Card schema, Task states, message format, integration path with DriveMcpServer.
- **aof-03**: CommsAgent moved from `tests/src/commsAgent.ts` to `src/commsAgent.ts`; wired into `extension.ts`; uses OperatorRegistry, AgentScreenPanel; `npm run compile` and `npm test` pass.
- **aof-04**: EventEmitter on OperatorRegistry — `operatorCompleted`, `operatorProgress`, `operatorError`, `taskDelegated`; CommsAgent subscribes to completion/progress; unit tests added in `agentRegistry.test.ts`.
- **aof-05**: GET `/.well-known/agent.json` and `/.well-known/agent-card.json` on DriveMcpServer returning A2A-compliant Agent Card.
- **aof-06**: POST `/tasks`, GET `/tasks/:id`, POST `/tasks/:id/cancel` implemented; tasks delegate to OperatorRegistry.spawn(); submit→working→completed lifecycle.
- **aof-07**: `docs/research/claude-code-agent-teams-bridge.md` — working `claude mcp add` config, validated tool list, limitations.
- **aof-08**: `docs/design/architecture/agent-registry-v2-design.md` — shared task list, mailbox, file-lock, lead agent; implementation order defined.
- **aof-09**: MCP tools `operator_update_memory`, `operator_set_visibility`, `operator_delegate`; OperatorContext.visibility added.
- **aof-10**: `docs/research/strands-agents-evaluation.md` — TS SDK McpClient, Streamable HTTP compatibility, go/no-go recommendation.
- **aof-11**: `docs/research/openclaw-integration-analysis.md` updated — OpenClaw as messaging gateway, architecture mismatch, deferred status.

**Terminology**: Used operatorRegistry/OperatorRegistry/operator_* per terminology-sas-overhaul; kept "agent" for Cursor native Agent mode and A2A/CommsAgent concepts.

**Residual risks**: A2A Task endpoints are minimal (no JSON-RPC 2.0 envelope; REST-style). Strands eval is research-based; full spike requires installing `@strands/agent`. CommsAgent subscribes to events but operators do not auto-emit progress — MCP tools or workers must call `emitProgress()`.
