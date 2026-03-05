# Other Relevant Technologies — Decision

**Topic:** Adoption scorecard and recommendation for 11 technologies relevant to Cursor Drive.

**Date:** February 2026

---

## 1. Scorecard


| Dimension                  | Weight | Description                                                      |
| -------------------------- | ------ | ---------------------------------------------------------------- |
| **User value**             | High   | How much does this technology improve the Drive user experience? |
| **Privacy alignment**      | High   | Does it comply with ADR-0005 privacy-strict default?             |
| **Integration complexity** | Medium | How much Drive code must change?                                 |
| **Maintenance burden**     | Medium | Ongoing cost of keeping the integration working?                 |
| **Ecosystem maturity**     | Medium | Is the technology stable enough to build on?                     |
| **Lock-in risk**           | Low    | Does it create vendor or framework dependency?                   |


---

## 2. Per-Technology Assessment

### 2.1 OpenAI Realtime API


| Dimension              | Score (1–5) | Rationale                                                                                        |
| ---------------------- | ----------- | ------------------------------------------------------------------------------------------------ |
| User value             | 5           | Best-in-class voice experience. Sub-300ms latency. Speech-to-speech eliminates STT→LLM→TTS chain |
| Privacy alignment      | 1           | Sends raw audio to OpenAI cloud. Directly conflicts with ADR-0005 strict default                 |
| Integration complexity | 3           | Requires parallel voice-mode pipeline path, bypasses `modelSelector.ts` tiered routing           |
| Maintenance burden     | 2           | Stable API. SDK maintenance is straightforward                                                   |
| Ecosystem maturity     | 5           | Production API. Well-documented. Growing ecosystem                                               |
| Lock-in risk           | 5           | OpenAI-only. No equivalent from other providers                                                  |


**Aggregate:** Highest voice quality but fundamentally misaligned with Drive's privacy architecture.

---

### 2.2 WhisperKit / WhisperLiveKit


| Dimension              | Score (1–5) | Rationale                                                                   |
| ---------------------- | ----------- | --------------------------------------------------------------------------- |
| User value             | 5           | Fills Drive's biggest gap (STT). Enables the voice-first vision of ADR-0012 |
| Privacy alignment      | 5           | On-device. Audio never leaves the machine. Full ADR-0005 compliance         |
| Integration complexity | 3           | New `stt.ts` module, pipeline stage 0, cross-platform audio capture         |
| Maintenance burden     | 3           | Open-source dependency. Model updates. Platform-specific issues             |
| Ecosystem maturity     | 4           | Production-ready on macOS. Linux/CUDA support via WhisperLiveKit is newer   |
| Lock-in risk           | 1           | MIT license. Multiple model options. No vendor dependency                   |


**Aggregate:** Best fit for Drive. Privacy-aligned, high value, manageable complexity.

---

### 2.3 Google A2A Protocol


| Dimension              | Score (1–5) | Rationale                                                                      |
| ---------------------- | ----------- | ------------------------------------------------------------------------------ |
| User value             | 3           | Enables external agent collaboration. Value scales with A2A ecosystem adoption |
| Privacy alignment      | 5           | Protocol-level. No data sharing requirement. Agents choose what to expose      |
| Integration complexity | 2           | Endpoints already exist in `mcpServer.ts`. Close compliance gaps only          |
| Maintenance burden     | 2           | Protocol spec, not library. Minimal ongoing maintenance                        |
| Ecosystem maturity     | 3           | v0.3.0, approaching RC v1.0. Core stable; streaming evolving                   |
| Lock-in risk           | 1           | Open protocol. Linux Foundation governance                                     |


**Aggregate:** Low risk, incremental effort on existing foundation. Clear adoption path.

---

### 2.4 MCP Stateless Transport & Registry


| Dimension              | Score (1–5) | Rationale                                                                       |
| ---------------------- | ----------- | ------------------------------------------------------------------------------- |
| User value             | 2           | Auto-discovery is nice-to-have. Drive users manually start the MCP server today |
| Privacy alignment      | 5           | No privacy implication                                                          |
| Integration complexity | 2           | Drive already speaks HTTP. Registry publication is a startup step               |
| Maintenance burden     | 2           | Depends on registry spec stability                                              |
| Ecosystem maturity     | 2           | Stateless transport specified. Registry spec is early-stage                     |
| Lock-in risk           | 1           | Open protocol                                                                   |


**Aggregate:** Low value today. Wait for spec stability before investing.

---

### 2.5 AgentBound — MCP Access Control


| Dimension              | Score (1–5) | Rationale                                                                                |
| ---------------------- | ----------- | ---------------------------------------------------------------------------------------- |
| User value             | 2           | Drive's `toolAllowlist.ts` already enforces permissions. AgentBound adds MCP-level layer |
| Privacy alignment      | 5           | Security feature; enhances privacy posture                                               |
| Integration complexity | 2           | Metadata annotations only (Option A). No runtime change                                  |
| Maintenance burden     | 1           | Metadata-only; near-zero maintenance                                                     |
| Ecosystem maturity     | 1           | Research paper. No production adoption. Not in MCP core spec                             |
| Lock-in risk           | 1           | Open specification                                                                       |


**Aggregate:** Conceptually aligned but premature. Drive's existing permissions are more advanced.

---

### 2.6 JetBrains + Zed ACP


| Dimension              | Score (1–5) | Rationale                                                               |
| ---------------------- | ----------- | ----------------------------------------------------------------------- |
| User value             | 2           | Would enable Drive in JetBrains/Zed. But Drive's users are Cursor users |
| Privacy alignment      | 5           | Protocol-level. No privacy implication                                  |
| Integration complexity | 4           | Requires full ACP adapter. Cursor has no ACP support                    |
| Maintenance burden     | 4           | Cross-IDE compatibility testing. Two protocol stacks (MCP + ACP)        |
| Ecosystem maturity     | 1           | Draft spec. JetBrains and Zed only                                      |
| Lock-in risk           | 1           | Open protocol                                                           |


**Aggregate:** Speculative. No demand signal from Drive users. High effort for uncertain return.

---

### 2.7 Langfuse


| Dimension              | Score (1–5) | Rationale                                                                         |
| ---------------------- | ----------- | --------------------------------------------------------------------------------- |
| User value             | 4           | Closes real observability gap. Cost tracking, latency debugging, operator tracing |
| Privacy alignment      | 5           | Self-hostable. No vendor data dependency. ADR-0005 compatible                     |
| Integration complexity | 2           | Wrap `modelSelector.ts` calls. TypeScript SDK is well-documented                  |
| Maintenance burden     | 3           | Self-hosted infra (PostgreSQL + ClickHouse). SDK updates                          |
| Ecosystem maturity     | 5           | v2.x in production. Active community. Well-maintained TypeScript SDK              |
| Lock-in risk           | 1           | Open-source. Self-hosted. Data stays local                                        |


**Aggregate:** High value, mature, privacy-aligned. Strong candidate for prototype.

---

### 2.8 Anthropic Petri


| Dimension              | Score (1–5) | Rationale                                                               |
| ---------------------- | ----------- | ----------------------------------------------------------------------- |
| User value             | 1           | Developer/maintainer value only. Users don't interact with safety tests |
| Privacy alignment      | 5           | CI-only. No runtime data handling                                       |
| Integration complexity | 2           | Define test scenarios. Run in CI pipeline                               |
| Maintenance burden     | 2           | Scenario maintenance. Model cost for simulation runs                    |
| Ecosystem maturity     | 3           | Open-source. Used internally at Anthropic. Growing adoption             |
| Lock-in risk           | 1           | Open-source                                                             |


**Aggregate:** Nice-to-have safety layer. Low priority until Drive has more complex operator interactions.

---

### 2.9 Web Speech API processLocally


| Dimension              | Score (1–5) | Rationale                                                                 |
| ---------------------- | ----------- | ------------------------------------------------------------------------- |
| User value             | 3           | Zero-deployment STT. But quality and availability are uncertain           |
| Privacy alignment      | 4           | `processLocally: true` keeps audio on-device — if the browser respects it |
| Integration complexity | 2           | Browser API. Low code. But Electron compatibility is unknown              |
| Maintenance burden     | 1           | Browser-maintained. No Drive-side dependency                              |
| Ecosystem maturity     | 1           | Draft W3C extension. Chromium experimental flag only                      |
| Lock-in risk           | 2           | Browser/OS dependency for on-device models                                |


**Aggregate:** Attractive in theory but too nascent. Standardization and Electron compatibility are blockers.

---

### 2.10 Parallel Tool Calling + LLM-Tool Compiler


| Dimension              | Score (1–5) | Rationale                                                                   |
| ---------------------- | ----------- | --------------------------------------------------------------------------- |
| User value             | 3           | Faster operator workflows. Token savings with 30+ tools                     |
| Privacy alignment      | 5           | No privacy implication                                                      |
| Integration complexity | 1           | Cursor already supports parallel calling. Schema review is metadata-only    |
| Maintenance burden     | 1           | Annotations and descriptions. Near-zero ongoing cost                        |
| Ecosystem maturity     | 5           | Parallel calling is standard in frontier models. Compiler is research-stage |
| Lock-in risk           | 1           | Standard model capability                                                   |


**Aggregate:** Lowest effort, immediate benefit. Adopt now.

---

### 2.11 HAL + WebArena Verified


| Dimension              | Score (1–5) | Rationale                                                         |
| ---------------------- | ----------- | ----------------------------------------------------------------- |
| User value             | 1           | Research/benchmarking value. No direct user impact                |
| Privacy alignment      | 5           | Evaluation infrastructure. No runtime data                        |
| Integration complexity | 4           | Need Drive-specific benchmarks. No existing pair-programming eval |
| Maintenance burden     | 3           | Benchmark suite creation and maintenance                          |
| Ecosystem maturity     | 2           | Early. No IDE-specific or voice-first benchmarks                  |
| Lock-in risk           | 1           | Open frameworks                                                   |


**Aggregate:** Premature. Revisit when Drive has enough operator usage to define meaningful evals.

---

## 3. Decision Matrix


| Technology                    | Recommendation | Confidence | Top dimension            | Rationale                                                                                                                          |
| ----------------------------- | -------------- | ---------- | ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| **OpenAI Realtime API**       | **PROTOTYPE**  | Medium     | User value (5)           | Best voice UX but cloud-only. Prototype as opt-in "cloud voice" mode with explicit privacy consent. Do not make default.           |
| **WhisperKit**                | **PROTOTYPE**  | High       | Privacy (5) + Value (5)  | Privacy-first STT that fills Drive's biggest gap. Start with subprocess integration (Option A). Aligns with ADR-0005 and ADR-0012. |
| **A2A Protocol**              | **ADOPT**      | High       | Complexity (2)           | Endpoints already exist. Close compliance gaps (JSON-RPC, states, Agent Card). Incremental effort.                                 |
| **MCP Registry**              | **DEFER**      | Medium     | Maturity (2)             | Registry spec is early-stage. Drive already works without auto-discovery. Revisit when registry semantics finalize.                |
| **AgentBound**                | **DEFER**      | Medium     | Maturity (1)             | Research-stage. Drive's `toolAllowlist.ts` is more advanced. Wait for MCP core spec adoption.                                      |
| **ACP**                       | **DEFER**      | High       | Maturity (1)             | No Cursor support. Speculative investment for uncertain return. Monitor adoption.                                                  |
| **Langfuse**                  | **PROTOTYPE**  | High       | Value (4) + Maturity (5) | Mature, self-hostable, privacy-compatible. Start with `modelSelector.ts` tracing (Option A). Real operational gap.                 |
| **Petri**                     | **DEFER**      | Medium     | Value (1)                | Nice-to-have. Drive's approval gates and tool allowlist cover current safety needs. Revisit post-escalation protocol.              |
| **Web Speech processLocally** | **DEFER**      | High       | Maturity (1)             | Draft spec. No Electron support confirmed. WhisperKit is the better bet for on-device STT.                                         |
| **Parallel Tool Calling**     | **ADOPT**      | High       | Complexity (1)           | Already available. Review tool schemas for parallel-safety. Optimize descriptions for token efficiency. Zero risk.                 |
| **HAL / WebArena**            | **DEFER**      | Medium     | Complexity (4)           | No pair-programming benchmarks exist. Need more operator usage data before eval infrastructure is meaningful.                      |


---

## 4. Recommendation Summary

### ADOPT (implement now)


| Technology                | Action                                               | Estimated effort |
| ------------------------- | ---------------------------------------------------- | ---------------- |
| **A2A Protocol**          | Close 4 compliance gaps in `mcpServer.ts`            | ~140 lines       |
| **Parallel Tool Calling** | Annotate tool parallel-safety, optimize descriptions | ~70 lines        |


### PROTOTYPE (validate, then decide)


| Technology              | Action                                   | Estimated effort |
| ----------------------- | ---------------------------------------- | ---------------- |
| **WhisperKit STT**      | Subprocess integration, pipeline stage 0 | ~265 lines       |
| **Langfuse**            | Model call tracing in `modelSelector.ts` | ~170 lines       |
| **OpenAI Realtime API** | Opt-in cloud voice mode prototype        | ~300 lines       |


### DEFER (monitor, revisit when conditions change)


| Technology                    | Revisit trigger                                                 |
| ----------------------------- | --------------------------------------------------------------- |
| **MCP Registry**              | Registry spec reaches RC                                        |
| **AgentBound**                | MCP core spec adopts permission primitives                      |
| **ACP**                       | Cursor announces ACP support                                    |
| **Petri**                     | Drive implements escalation protocol (post-agent-teams Phase 1) |
| **Web Speech processLocally** | W3C Recommendation + Electron support confirmed                 |
| **HAL / WebArena**            | ≥100 operator sessions logged with Langfuse                     |


---

## 5. Priority Order

Based on user value, privacy alignment, and effort:

1. **Parallel Tool Calling** — adopt now, ~70 lines, immediate token savings
2. **A2A Protocol** — adopt now, ~140 lines, close existing gaps
3. **Langfuse** — prototype, ~170 lines, close observability gap
4. **WhisperKit STT** — prototype, ~265 lines, fill the biggest architectural gap
5. **OpenAI Realtime API** — prototype, ~300 lines, opt-in cloud voice

Items 1–2 can be done in a single session. Items 3–4 are 1–2 sessions each. Item 5 depends on a privacy policy decision.

---

## 6. Success Criteria

### ADOPT items

- All MCP tools annotated with `parallelSafe` metadata
- Tool description token count reduced by ≥20%
- A2A task endpoints return valid JSON-RPC 2.0
- Agent Card includes skills array
- Approval gate state maps to A2A `input_required`
- All existing tests pass (no regressions)

### PROTOTYPE items

- WhisperKit subprocess starts and transcribes English speech with <600ms latency
- STT text enters pipeline and produces correct model-select output
- Langfuse traces visible in self-hosted Langfuse UI
- Each model call shows tier, model, tokens, latency, cost estimate
- Tracing disabled by default; no Langfuse calls when disabled
- OpenAI Realtime API prototype handles 30-second voice conversation

---

## 7. Related Decisions


| ADR / Doc                               | Relationship                                                                   |
| --------------------------------------- | ------------------------------------------------------------------------------ |
| ADR-0005 (Privacy Strict Default)       | Gate. Voice technologies must comply or require explicit opt-in                |
| ADR-0010 (Tiered Model Routing)         | Constraint. Realtime API bypasses tiered routing; must be handled as exception |
| ADR-0012 (Voice Input Integration)      | Foundation. Defines mic model, pipeline order, TTS integration                 |
| ADR-0014 (Agent Orchestration Strategy) | Context. A2A adoption and Strands evaluation are parallel tracks               |
| Agent Teams research                    | Context. A2A gaps already identified; this extends the implementation plan     |
| Agent Steering research                 | Context. AgentBound complements steering guardrails                            |


