# Cross-Topic Synthesis: Dependency DAG

**Date:** February 2026

Recommended ordering of workstreams and tasks, with parallelizable batches.

---

## Phase Overview

```
Phase 0 ──► Phase 1 ──► Phase 2 ──► Phase 3
(foundation)  (core)    (prototypes)  (integration)
 ~1 week     ~2 weeks   ~3 weeks      ~2 weeks
```

---

## DAG (Text Representation)

```
PHASE 0 (Foundation — no dependencies, all parallelizable)
├── [0A] Agent Steering: YAML policy file + schema
│         approvalGates.ts + toolAllowlist.ts + drive-policies.schema.json
│         ~130 lines │ Agent Steering Phase 1
│
├── [0B] VS Code: Agent Screen ARIA roles + live regions
│         agentScreen.ts buildHtml()
│         ~35 lines │ VS Code Extensions Phase 1
│
├── [0C] VS Code: modelUtils.ts selector hints + onDidChangeChatModels
│         modelUtils.ts
│         ~35 lines │ VS Code Extensions Phase 1
│
├── [0D] MCP: Parallel tool calling annotations + description optimization
│         mcpServer.ts (tool metadata only)
│         ~70 lines │ Other Tech (Parallel Tool Calling)
│
└── [0E] Plugins: Version checking + selective updates + auto-install
          pluginInstaller.ts + extension.ts
          ~90 lines │ Plugins & MCP Phase 1

          ─── all 5 tasks run in parallel ───


PHASE 1 (Core enhancements — depends on Phase 0)
├── [1A] Operator role templates + escalation protocol
│    │    operatorRegistry.ts + mcpServer.ts + commsAgent.ts
│    │    ~200 lines │ Agent Teams Phase 1
│    │    DEPENDS ON: [0A] (escalation rules reference YAML policy thresholds)
│    │
│    └──► [1B] A2A streaming + role support + input_required state
│              mcpServer.ts A2A endpoints
│              ~140 lines │ Other Tech (A2A) + Agent Teams Phase 2
│              DEPENDS ON: [1A] (A2A /tasks needs role field from registry)
│
├── [1C] Agent Steering: Graduated response (log + throttle actions)
│         approvalGates.ts
│         ~80 lines │ Agent Steering Phase 2
│         DEPENDS ON: [0A] (escalation rules defined in YAML)
│
└── [1D] LM Tools registration (4 Drive tools)
          New lmToolsBridge.ts
          ~170 lines │ VS Code Extensions Phase 2
          DEPENDS ON: [0B] (accessibility fixes should land first)

          ─── [1A]+[1C]+[1D] parallelizable; [1B] waits for [1A] ───


PHASE 2 (Prototypes — parallel with Phase 1 completion)
├── [2A] WhisperKit STT prototype
│         New stt.ts + pipeline.ts stage 0
│         ~265 lines │ Other Tech (WhisperKit)
│         DEPENDS ON: none (new module, pipeline change is additive)
│
├── [2B] MCP Apps prototype (activity feed)
│         mcpServer.ts + new agentScreenApp.ts
│         ~200 lines │ MCP Apps
│         DEPENDS ON: [0B] (ARIA attributes in shared HTML builder)
│         DEPENDS ON: [0D] (tool descriptions optimized before adding UI resources)
│
├── [2C] Langfuse observability prototype
│         New observability.ts + modelSelector.ts wrapper
│         ~170 lines │ Other Tech (Langfuse)
│         DEPENDS ON: none (new module, wraps existing model calls)
│
├── [2D] OpenAI Realtime API prototype (opt-in cloud voice)
│         stt.ts (Realtime backend)
│         ~300 lines │ Other Tech (Realtime API)
│         DEPENDS ON: [2A] (SttBackend interface must exist first)
│
└── [2E] Plugins: Dynamic MCP registration stub
          mcpServer.ts
          ~25 lines │ Plugins & MCP Phase 2
          DEPENDS ON: none (stub detects API availability)

          ─── [2A]+[2B]+[2C]+[2E] parallelizable; [2D] waits for [2A] ───


PHASE 3 (Integration — after prototypes evaluated)
├── [3A] Voice pipeline integration (adopt winning STT backend)
│         stt.ts + pipeline.ts + fillerCleaner.ts + statusBar.ts
│         Effort depends on prototype results
│         DEPENDS ON: [2A] eval + [2D] eval
│
├── [3B] MCP Apps adoption decision
│         If prototype succeeds: Option B refactor (agentScreenCore.ts extraction)
│         ~550 lines (if adopted) │ MCP Apps
│         DEPENDS ON: [2B] eval (rendering in ≥2 hosts?)
│
├── [3C] Observability integration (Langfuse adoption or console-only)
│         observability.ts finalization
│         Effort depends on prototype results
│         DEPENDS ON: [2C] eval (latency overhead acceptable?)
│
├── [3D] Runtime monitoring (Agent Steering Phase 3)
│         New runtimeMonitor.ts + pipeline.ts init
│         ~120 lines │ Agent Steering Phase 3
│         DEPENDS ON: [1C] (graduated response infrastructure)
│         DEPENDS ON: production data from Phases 0–2
│
└── [3E] Marketplace publication
          VSIX metadata, icon, license
          ~10 lines │ Plugins & MCP Phase 3
          DEPENDS ON: [0E] + [1D] (installer + LM Tools should ship first)

          ─── [3A]+[3B]+[3C] parallelizable; [3D] after production data ───
```

---

## Dependency Edges (Adjacency List)

```
[0A] → [1A], [1C]
[0B] → [1D], [2B]
[0C] → (none — leaf for Phase 0)
[0D] → [2B]
[0E] → [3E]
[1A] → [1B]
[1C] → [3D]
[1D] → [3E]
[2A] → [2D], [3A]
[2B] → [3B]
[2C] → [3C]
[2D] → [3A]
```

---

## Parallelizable Batches

| Batch | Tasks | Max parallelism |
|-------|-------|-----------------|
| Phase 0 | [0A], [0B], [0C], [0D], [0E] | 5 |
| Phase 1 | [1A], [1C], [1D] (then [1B] after [1A]) | 3 → 1 |
| Phase 2 | [2A], [2B], [2C], [2E] (then [2D] after [2A]) | 4 → 1 |
| Phase 3 | [3A], [3B], [3C] (then [3D] after data, [3E] after deps) | 3 → 2 |

---

## Critical Path

The longest dependency chain determines the minimum timeline:

```
[0A] → [1A] → [1B] → (Phase 2 starts) → [2A] → [2D] → [3A]
 1w      1w     0.5w                       2w     1w     1w
                                                         ≈ 6.5 weeks
```

However, [2A] can start in parallel with Phase 1 (it has no Phase 1 dependencies), so the practical critical path is:

```
[0A] → [1A] → [1B]       ≈ 2.5 weeks for core operator intelligence
[2A] → [2D] → [3A]       ≈ 4 weeks for voice pipeline (parallel)
```

**Effective timeline: ~4 weeks** to reach Phase 3 decisions on both voice and operator enhancements, assuming reasonable parallelism.

---

## Risk-Ordered Priorities

If resources are constrained and tasks must be serialized:

1. **[0A] YAML policies** — unblocks both steering and role template work
2. **[0D] Parallel tool annotations** — lowest effort, immediate token savings
3. **[1A] Role templates + escalation** — highest user-visible impact
4. **[2A] WhisperKit STT prototype** — addresses the biggest architectural gap
5. **[0B] Webview ARIA** — accessibility baseline, unblocks MCP Apps prototype
6. **[2C] Langfuse prototype** — closes observability gap
7. **[2B] MCP Apps prototype** — cross-client portability validation
8. **[1C] Graduated response** — refines steering for multi-operator scenarios
9. **[1D] LM Tools registration** — VS Code discoverability
10. **[0E] Plugin installer enhancements** — distribution reliability

Items 1–3 should ship together as the first release. Items 4–7 form the prototype batch. Items 8–10 are polish.

---

## DEFER Queue (Re-evaluate Triggers)

| Deferred item | Source | Re-evaluate when |
|---------------|--------|------------------|
| Full orchestration engine | Agent Teams | ≥3 user-reported coordination failures |
| Standalone MCP package | Plugins & MCP | ≥3 requests for Drive tools outside Cursor |
| Dual-path ToolRegistry | VS Code Extensions | Cursor confirms `registerTool` support |
| MCP Registry publication | Other Tech | Registry spec reaches RC |
| AgentBound annotations | Other Tech | MCP core spec adopts permission primitives |
| ACP adapter | Other Tech | Cursor announces ACP support |
| Petri safety simulations | Other Tech | Escalation protocol (Phase 1) ships |
| Web Speech processLocally | Other Tech | W3C Recommendation + Electron support |
| HAL/WebArena evals | Other Tech | ≥100 operator sessions logged in Langfuse |
| Runtime monitoring | Agent Steering | ≥1 month production data from Phases 0–2 |
