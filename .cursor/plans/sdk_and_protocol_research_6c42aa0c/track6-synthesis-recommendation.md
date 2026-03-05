# Track 6: Synthesis and Recommendation

**Plan:** sdk_and_protocol_research_6c42aa0c  
**Inputs:** Tracks 1–5 deliverables  
**Framework:** Fit, Effort, Lock-in, Overlap

---

## 1. Summary of Track Findings

| Track | Key Finding | Recommendation |
|-------|-------------|----------------|
| **1. Copilot SDK** | Drive already covers most features (operators, approval gates, MCP tools). Main gap: `on_pre_tool_use`-style arg modification. | Do not adopt. Optional: add `modifiedArgs` to `GateResult`. |
| **2. ACP Protocol** | ACP targets Editor↔Agent; Drive is an MCP tool server. Different protocol layer. | Reject ACP for core bridge. Use permission/streaming patterns as inspiration. |
| **3. ACP Python SDK** | SessionAccumulator, ToolCallTracker, PermissionBroker already ported. StreamObserver, default_environment worth considering. | No new ports required. Optional: StreamObserver tap (low effort). |
| **4. Agentic Frameworks** | LangGraph, CrewAI, Semantic Kernel assume framework-owned execution. Drive operators are Cursor agents. | Stay self-contained. Revisit LangGraph patterns only if multi-step branching becomes validated need. |
| **5. Cursor CLI** | `agent acp` exists (hidden). Feasible to spawn and drive via ACP SDK. Adds headless, parallel sessions, CI. | Prototype as complement. Keep extension-based Drive as primary path. |

---

## 2. Decision Framework Applied

### Copilot SDK

| Criterion | Assessment |
|-----------|------------|
| **Fit** | Low — built for Copilot CLI; Drive is Cursor-native |
| **Effort** | Low for `modifiedArgs` only; high for full adoption |
| **Lock-in** | Medium — GitHub release cycle |
| **Overlap** | High — operators, gates, tools already exist |

**Verdict:** Reject adoption. Optional micro-enhancement: `modifiedArgs` in approval gates.

---

### ACP Protocol

| Criterion | Assessment |
|-----------|------------|
| **Fit** | Low — Editor↔Agent; Drive is tool server |
| **Effort** | High — new protocol, role change |
| **Lock-in** | Medium — ACP open but Copilot-centric |
| **Overlap** | High — would duplicate session, permission, streaming |

**Verdict:** Reject for core bridge. Use patterns as design inspiration.

---

### ACP Python SDK Patterns

| Criterion | Assessment |
|-----------|------------|
| **Fit** | Medium — core patterns already ported |
| **Effort** | Low for StreamObserver; done for others |
| **Lock-in** | Low — patterns, not dependency |
| **Overlap** | High — SessionAccumulator, PermissionBroker, ToolCallTracker in place |

**Verdict:** No new ports required. Optional: StreamObserver for telemetry.

---

### Agentic Frameworks

| Criterion | Assessment |
|-----------|------------|
| **Fit** | Low — wrong abstraction (framework-owned vs Cursor agents) |
| **Effort** | High — re-architecture or bridge |
| **Lock-in** | Medium–High — LangChain, CrewAI, Microsoft |
| **Overlap** | High — operatorRegistry, ROLE_TEMPLATES, MCP tools |

**Verdict:** Stay self-contained. Revisit only if complex branching workflows validated.

---

### Cursor CLI (agent acp)

| Criterion | Assessment |
|-----------|------------|
| **Fit** | Medium — complement, not replacement |
| **Effort** | Medium — prototype, document, integrate |
| **Lock-in** | Low — hidden command risk; ACP SDK is open |
| **Overlap** | Low — adds headless, CI, parallel sessions |

**Verdict:** Prototype. Treat as complementary path.

---

## 3. Concrete Next Steps

### Approved (Do)

| Item | Scope | Priority |
|------|-------|----------|
| **Prototype `agent acp`** | Spawn Cursor Agent CLI, use `@agentclientprotocol/sdk`, implement `requestPermission` and `sessionUpdate`. Document options and limitations. | Medium |
| **Document research** | Add `docs/research/sdk-protocol-framework-research-2026-03.md` (or similar) summarizing all tracks and this synthesis. | High |

### Optional (Consider)

| Item | Scope | Priority |
|------|-------|----------|
| **`modifiedArgs` in approval gates** | Add optional `modifiedArgs` to `GateResult` if arg modification before tool execution is needed. | Low |
| **StreamObserver tap** | Add `addObserver(callback)` to JSON-RPC connections for telemetry/logging. | Low |
| **ACP permission UX inspiration** | Review ACP `request_permission` options (allow_once, reject_once, etc.) for future `approvalGates` UX. | Low |

### Rejected (Do Not)

| Item | Rationale |
|------|-----------|
| Adopt Copilot SDK | Wrong host; Drive already has equivalents |
| Adopt ACP for core bridge | Different protocol layer; Drive is tool server |
| Adopt agentic framework | Wrong abstraction; Cursor owns execution |
| Replace extension with CLI | Extension remains primary; CLI is complement |

---

## 4. Outcome Summary

**Single recommendation document:**

1. **Copilot SDK:** Do not adopt. Optional: `modifiedArgs` in gates.
2. **ACP:** Reject for core bridge. Use permission/streaming patterns as inspiration.
3. **Agentic frameworks:** Stay self-contained. Revisit LangGraph-style patterns only if multi-step branching becomes validated.
4. **Cursor CLI:** Prototype `agent acp` as complement. Keep extension-based Drive as primary.

**Concrete next steps:**
- Prototype `agent acp` + ACP SDK integration
- Document research findings in `docs/research/`
- Consider `modifiedArgs` and StreamObserver as low-priority enhancements
