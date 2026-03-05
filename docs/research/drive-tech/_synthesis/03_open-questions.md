# Cross-Topic Synthesis: Open Questions

**Date:** February 2026

Unknowns that need resolution via prototype, investigation, or external signal before full commitment.

---

## 1. MCP Apps Host Rendering Consistency

**Source:** MCP Apps topic (decision: PROTOTYPE, medium confidence)

**Question:** Does Drive's Agent Screen activity feed render consistently across ≥2 MCP Apps hosts?

**Why it matters:** MCP Apps is the path to cross-client portability. If host rendering is inconsistent at the complexity level of Drive's Agent Screen (tabbed UI, live updates, click handlers), the prototype fails and we stay webview-only.

**What we know:**
- MCP Apps spec frozen (2026-01-26), SDK v1.0.1
- Hosts vary in iframe sandbox policies, CSS support, and `postMessage` handling
- VS Code's MCP Apps support is partial — Cursor may need custom handling
- The spec is ~1 month old; edge cases are expected

**Resolution path:** Build Option A prototype (`agentScreenApp.ts`), test in Claude Desktop and VS Code. Evaluate against success criteria (render in ≥2 hosts, live updates <1s, bidirectional messaging works).

**Timeline:** Weeks 1–4 of MCP Apps prototype.

**Decision impact:** If rendering fails → DEFER MCP Apps, stay webview-only. If rendering succeeds → proceed to Option B refactor and expand UI resources.

---

## 2. WhisperKit vs. OpenAI Realtime API for Drive's Voice Pipeline

**Source:** Other Relevant Tech topic (both PROTOTYPE)

**Question:** Which STT backend should be Drive's default? Can both coexist behind a single `SttBackend` interface without UX fragmentation?

**Why it matters:** STT is Drive's biggest gap. The two candidates have fundamentally different trade-offs:

| Dimension | WhisperKit | Realtime API |
|-----------|-----------|--------------|
| Privacy | On-device (ADR-0005 compliant) | Cloud (requires explicit opt-in) |
| Latency | ~460ms STT | Sub-300ms end-to-end |
| Cost | Zero per-request | Audio tokens are expensive |
| Pipeline fit | Text output → existing pipeline | Can bypass pipeline (speech-to-speech) |
| Platform | macOS native, Linux via WhisperLiveKit | Cross-platform (WebSocket) |

**What we know:**
- WhisperKit is the better architectural fit (text output enters normal pipeline, privacy-aligned)
- Realtime API has better latency but conflicts with ADR-0005 strict default and ADR-0010 tiered routing
- Both can implement the same `SttBackend` interface

**Resolution path:** Prototype both. WhisperKit first (privacy-first default), Realtime API second (opt-in cloud mode). Measure latency, accuracy, and user preference. The `stt.ts` abstraction layer lets us swap without pipeline changes.

**Timeline:** WhisperKit prototype in Phase 2. Realtime API prototype in Phase 2 (parallel). Decision in Phase 3 based on prototype results.

**Decision impact:** If WhisperKit latency is acceptable → default. If not → WhisperKit for privacy-mode, Realtime API for performance-mode, user chooses.

---

## 3. Langfuse Self-Hosting Performance Impact

**Source:** Other Relevant Tech topic (decision: PROTOTYPE)

**Question:** Does self-hosted Langfuse add measurable latency to operator workflows? What is the infrastructure footprint?

**Why it matters:** Langfuse is the recommended observability solution. ADR-0005 requires self-hosting (no sending trace data to third-party clouds by default). Self-hosting means Drive users would need PostgreSQL + ClickHouse running locally or on a team server.

**What we know:**
- Langfuse TypeScript SDK is well-maintained, async trace submission
- Self-hosted Langfuse requires PostgreSQL + ClickHouse (Docker compose available)
- Trace submission should be fire-and-forget (no blocking on model call path)
- Production Langfuse handles high throughput; local instance with Drive's volume should be fine

**Resolution path:** Prototype with `observability.ts` wrapper. Measure: (a) trace submission latency overhead on `selectModelForTier()` calls, (b) Langfuse Docker compose resource usage, (c) whether async submission truly never blocks the hot path.

**Timeline:** Phase 2 prototype.

**Decision impact:** If overhead is acceptable (<5ms per call) → ADOPT. If infrastructure footprint is too heavy for individual developers → consider Langfuse Cloud as opt-in alternative, or defer to console-only tracing.

---

## 4. Cursor's Timeline for `registerMcpServerDefinitionProvider`

**Source:** VS Code Extensions topic (decision: MONITOR), Plugins & MCP topic

**Question:** When will Cursor expose the `registerMcpServerDefinitionProvider` API? Will it match VS Code's proposed API?

**Why it matters:** This API would let Drive register its MCP server dynamically at activation time, eliminating the need for users to manually configure `.cursor/mcp.json`. It's the last setup friction point — the plugin installer handles everything else.

**What we know:**
- VS Code has the proposed API in their extension API
- Cursor has not confirmed adoption
- Drive has a stub prepared (Plugins topic, Phase 2) that detects API availability
- Fallback to `.cursor/mcp.json` works today and is handled by the plugin installer

**Resolution path:** Monitor Cursor's API changelog. The dynamic registration stub is ready to activate when the API appears. No blocking work needed.

**Timeline:** Unknown — depends on Cursor's roadmap.

**Decision impact:** When available → activate stub, simplify onboarding. Until then → current `.cursor/mcp.json` approach works fine.

---

## 5. A2A Protocol Spec Stability

**Source:** Other Relevant Tech topic (decision: ADOPT), Agent Teams topic

**Question:** Will A2A v1.0 (currently at v0.3.0, approaching RC) introduce breaking changes to Drive's existing endpoints?

**Why it matters:** Drive already has A2A-compatible endpoints in `mcpServer.ts` (Agent Card, task CRUD, cancel). The ADOPT recommendation adds JSON-RPC compliance, skills array, and `input_required` state. If the spec changes significantly before v1.0, this work may need revision.

**What we know:**
- A2A core (Agent Cards, task lifecycle, JSON-RPC) is stable
- Streaming spec is still evolving
- Linux Foundation governance reduces risk of capricious breaking changes
- Drive's A2A surface is small (4 endpoints)

**Resolution path:** Implement against current spec. Track the A2A GitHub repo for breaking change proposals. Drive's A2A surface is small enough that adapting to v1.0 changes would be a minor update (~1 session).

**Timeline:** A2A v1.0 RC expected mid-2026 (estimate based on current trajectory).

**Decision impact:** Low. Even with breaking changes, the update effort is bounded. The bigger risk is building _too much_ A2A infrastructure before ecosystem adoption validates the investment.

---

## 6. Runtime Monitoring Overhead Threshold

**Source:** Agent Steering topic (decision: ADOPT Phase 3, deferred)

**Question:** What is an acceptable latency overhead for per-event runtime monitoring? How should thresholds be calibrated without production usage data?

**Why it matters:** The runtime monitor (`runtimeMonitor.ts`) processes every `operatorProgress` event. If event processing takes too long, it becomes a bottleneck in multi-operator workflows with high event throughput.

**What we know:**
- Target: <5ms per event, <2% CPU overhead (from Agent Steering implementation plan)
- Monitor logic is simple: counter increments + threshold comparisons (not ML-based)
- Event throughput estimate: 3–10 operators × 5–15 events/minute = 15–150 events/minute
- At 150 events/minute, 5ms/event = 750ms total CPU per minute — negligible

**Resolution path:** The overhead is almost certainly acceptable given the simple logic and low event rate. The real question is threshold calibration: what tool call rates are "normal" vs. "drifting"? This requires production usage data from Phases 1–2 (YAML policies + graduated response in use).

**Timeline:** Defer runtime monitoring (Phase 3) until ≥1 month of production data from Phases 1–2.

**Decision impact:** If overhead is acceptable → proceed with runtime monitoring. Threshold calibration is the harder problem — start with conservative defaults (high thresholds, log-only) and tighten based on data.

---

## 7. AgentBound Complementing toolAllowlist

**Source:** Other Relevant Tech topic (decision: DEFER)

**Question:** Could AgentBound's MCP-level access control annotations complement (not replace) Drive's `toolAllowlist.ts`?

**Why it matters:** `toolAllowlist.ts` enforces permissions at the extension level. AgentBound proposes MCP-level annotations that would let _any_ MCP client enforce permissions, not just Drive. If MCP adopts AgentBound concepts into the core spec, Drive would benefit from standardized permission metadata.

**What we know:**
- AgentBound is a research paper, not a production tool
- No MCP core spec adoption announced
- Drive's `toolAllowlist.ts` is more advanced (operator-aware cascade, config overrides, deny-always-wins)
- AgentBound annotations are metadata-only — they declare permissions but don't enforce them
- Enforcement still depends on the MCP client (Cursor, Claude, etc.)

**Resolution path:** Monitor MCP spec evolution. If AgentBound concepts appear in MCP core spec, add metadata annotations to Drive's tool definitions (Option A from the research — ~zero runtime change). Do NOT replace `toolAllowlist.ts` — it provides enforcement that MCP-level annotations cannot.

**Timeline:** Unknown — depends on MCP spec evolution.

**Decision impact:** If MCP adopts permission primitives → add annotations alongside existing enforcement. If not → no action needed. Either way, `toolAllowlist.ts` remains the enforcement layer.

---

## Summary Table

| # | Question | Resolution method | Timeline | Blocking? |
|---|----------|-------------------|----------|-----------|
| 1 | MCP Apps host rendering | Prototype | Weeks 1–4 | No (webview works today) |
| 2 | WhisperKit vs. Realtime API | Dual prototype | Phase 2 | No (both prototype) |
| 3 | Langfuse self-hosting overhead | Prototype + measurement | Phase 2 | No (console tracing as fallback) |
| 4 | Cursor `registerMcpServerDefinitionProvider` | Monitor | Unknown | No (`.cursor/mcp.json` fallback) |
| 5 | A2A spec stability | Implement + track | Mid-2026 | No (small surface area) |
| 6 | Runtime monitoring overhead | Production data | Post-Phase 2 | No (deferred to Phase 3) |
| 7 | AgentBound + toolAllowlist | Monitor MCP spec | Unknown | No (existing enforcement sufficient) |

**None of these questions are blocking.** All have fallback paths. The prototyping strategy (build, measure, decide) is the correct approach for each.
