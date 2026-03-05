# Other Relevant Technologies — Risks and Mitigations

**Topic:** Risk analysis across all 11 technologies, grouped by risk type.

**Date:** February 2026

---

## 1. Risk Registry

### R1: Vendor Lock-In — OpenAI Realtime API

| Field | Detail |
|---|---|
| **Category** | Vendor lock-in |
| **Likelihood** | High |
| **Impact** | High |
| **Technologies** | OpenAI Realtime API |
| **Description** | The Realtime API is OpenAI-exclusive. No equivalent speech-to-speech API exists from Anthropic, Google, or open-source providers. Building Drive's voice pipeline on the Realtime API creates a hard dependency on OpenAI for the core voice experience. If OpenAI changes pricing, rate limits, or API terms, Drive has no fallback. |
| **Mitigation** | (1) Never make Realtime API the default voice backend. Position it as opt-in "cloud voice" mode alongside privacy-first WhisperKit default. (2) Design `stt.ts` with a backend abstraction (`SttBackend` interface) so that WhisperKit, Realtime API, and future providers are interchangeable. (3) Keep WhisperKit as the primary STT path — it's open-source with no vendor dependency. |
| **Residual risk** | Low after mitigation. Realtime API lock-in is contained to an optional mode. Core voice pipeline uses open-source STT. |

---

### R2: Privacy / Data Exposure — Cloud Voice Processing

| Field | Detail |
|---|---|
| **Category** | Privacy / Data |
| **Likelihood** | High (if Realtime API is used) |
| **Impact** | High |
| **Technologies** | OpenAI Realtime API, Web Speech API (without `processLocally`) |
| **Description** | Sending raw audio to cloud services directly violates ADR-0005 privacy-strict default. Voice data is biometric — more sensitive than text transcripts. Users who enable cloud voice may not understand the privacy implications. Even with consent, retained audio on provider servers creates long-term exposure risk. |
| **Mitigation** | (1) ADR-0005 compliance: cloud voice requires explicit opt-in with clear disclosure ("audio will be sent to OpenAI"). (2) No audio retention policy: configure Realtime API with zero-retention data processing agreement where available. (3) Session-scoped consent: cloud voice consent expires at session end; users must re-enable each session. (4) Audit logging: log when cloud voice is active (but never log audio content). (5) Default to WhisperKit — on-device, no audio transmission. |
| **Residual risk** | Medium. Cloud voice inherently transmits audio. Mitigations reduce exposure surface but cannot eliminate it. Users who opt in accept residual risk. |

---

### R3: Privacy / Data Exposure — Langfuse Trace Data

| Field | Detail |
|---|---|
| **Category** | Privacy / Data |
| **Likelihood** | Medium |
| **Impact** | Medium |
| **Technologies** | Langfuse |
| **Description** | Langfuse traces capture prompt text, model responses, token counts, and metadata. If Langfuse cloud is used instead of self-hosted, this data leaves the user's machine. Even self-hosted, trace data persists in PostgreSQL/ClickHouse and may contain sensitive code context. |
| **Mitigation** | (1) Self-hosted Langfuse only as default configuration. Never auto-configure cloud Langfuse. (2) Redact sensitive content in trace spans — log prompt structure (tier, route decision) but not full prompt text unless debug mode is enabled. (3) TTL on trace data — configure ClickHouse retention to auto-delete traces after configurable period (default: 30 days). (4) Disabled by default — `cursorDrive.observability.langfuseEnabled` defaults to `false`. |
| **Residual risk** | Low after mitigation. Self-hosted with redaction and TTL limits exposure. |

---

### R4: Supply Chain — WhisperKit Model Distribution

| Field | Detail |
|---|---|
| **Category** | Supply chain |
| **Likelihood** | Low |
| **Impact** | Medium |
| **Technologies** | WhisperKit / WhisperLiveKit |
| **Description** | WhisperKit requires downloading ~1.5GB model files from external repositories (Hugging Face or Argmax CDN). Model integrity must be verified. A compromised model could produce manipulated transcriptions or execute arbitrary code if the model loading path has vulnerabilities. |
| **Mitigation** | (1) Pin model versions and verify SHA-256 checksums after download. (2) Document supported model versions in Drive configuration reference. (3) Support air-gapped installation: allow users to provide model files from a local path without downloading. (4) Monitor WhisperKit release notes for security advisories. |
| **Residual risk** | Very low after mitigation. Checksum verification and version pinning are standard practice. |

---

### R5: Supply Chain — Langfuse Dependency

| Field | Detail |
|---|---|
| **Category** | Supply chain |
| **Likelihood** | Low |
| **Impact** | Medium |
| **Technologies** | Langfuse |
| **Description** | Adding `langfuse` as an npm dependency introduces a supply chain surface. The Langfuse TypeScript SDK has its own dependencies. A compromised version could exfiltrate trace data or inject malicious code. |
| **Mitigation** | (1) Pin exact version in `package.json`. (2) Audit dependency tree with `npm audit` before adoption. (3) Langfuse SDK calls are behind a feature flag (`langfuseEnabled: false` default) — if the dependency is compromised, users who haven't enabled it are unaffected. (4) Consider vendoring the SDK if the dependency tree is small. |
| **Residual risk** | Very low. Feature flag containment + version pinning. |

---

### R6: Maintenance Burden — Cross-Platform Audio Capture

| Field | Detail |
|---|---|
| **Category** | Maintenance burden |
| **Likelihood** | High |
| **Impact** | Medium |
| **Technologies** | WhisperKit STT (Option A: subprocess) |
| **Description** | Audio capture from the microphone is OS-specific. macOS uses CoreAudio or `sox`, Linux uses ALSA/PulseAudio or `arecord`, Windows uses different APIs entirely. Drive must maintain cross-platform audio capture code or dependencies. Different OS versions and audio configurations will produce different bugs. |
| **Mitigation** | (1) Start with macOS only (WhisperKit's primary platform). Linux via WhisperLiveKit is a separate phase. (2) Use a well-maintained Node.js audio library (e.g., `node-audiorecorder`) that abstracts platform differences. (3) Graceful degradation: if audio capture fails, disable STT and show clear error message with troubleshooting link. (4) Document supported platforms and known limitations. |
| **Residual risk** | Medium. Cross-platform audio is inherently fragile. Limiting to macOS-first reduces initial burden. |

---

### R7: Maintenance Burden — Multiple Voice Backends

| Field | Detail |
|---|---|
| **Category** | Maintenance burden |
| **Likelihood** | Medium |
| **Impact** | Medium |
| **Technologies** | OpenAI Realtime API, WhisperKit, Web Speech API |
| **Description** | If Drive supports multiple STT backends (WhisperKit + Realtime API + future options), each backend requires its own integration code, testing, configuration, and documentation. The backend abstraction in `stt.ts` must accommodate different capabilities (e.g., Realtime API is speech-to-speech while WhisperKit is STT-only). |
| **Mitigation** | (1) Design `SttBackend` interface with minimal common surface (start, stop, onTranscription). Backend-specific features (e.g., Realtime API's direct voice output) are opt-in extensions. (2) Limit supported backends: WhisperKit (default) + Realtime API (opt-in). Defer Web Speech until spec stabilizes. (3) One test suite with backend-agnostic tests + backend-specific integration tests. |
| **Residual risk** | Low with 2 backends. Increases if more backends are added. |

---

### R8: Ecosystem Churn — A2A Protocol Spec Changes

| Field | Detail |
|---|---|
| **Category** | Ecosystem churn |
| **Likelihood** | Medium |
| **Impact** | Low |
| **Technologies** | A2A Protocol |
| **Description** | A2A is at v0.3.0, approaching RC v1.0. Spec changes between v0.3.0 and v1.0 could break Drive's A2A endpoints. Streaming (SSE) and push notification APIs are specifically flagged as evolving. |
| **Mitigation** | (1) Implement only stable A2A primitives (Agent Card, Task CRUD). Defer SSE streaming and push notifications until RC v1.0. (2) Pin to v0.3.0 semantics. (3) Drive's A2A surface is minimal (4-6 endpoints) — even a breaking spec change requires ~50-80 lines of updates. (4) Track A2A spec releases in research docs; update when RC ships. |
| **Residual risk** | Very low. Minimal surface + stable subset strategy. |

---

### R9: Ecosystem Churn — MCP Registry Instability

| Field | Detail |
|---|---|
| **Category** | Ecosystem churn |
| **Likelihood** | High |
| **Impact** | Low |
| **Technologies** | MCP Stateless Transport & Registry |
| **Description** | MCP Registry semantics are not finalized. Query format, trust model, versioning, and server metadata schema are all in flux. Early adoption risks building on APIs that change significantly. |
| **Mitigation** | Defer. Do not implement registry publication until the spec stabilizes. Drive's MCP server works without registry. Revisit when registry reaches RC or when a major MCP client (Cursor, Claude Desktop) announces registry support. |
| **Residual risk** | None. Deferral eliminates risk. |

---

### R10: Ecosystem Churn — ACP Specification

| Field | Detail |
|---|---|
| **Category** | Ecosystem churn |
| **Likelihood** | High |
| **Impact** | Low |
| **Technologies** | ACP (Agent Client Protocol) |
| **Description** | ACP is a draft spec from JetBrains and Zed. It could change significantly, merge with MCP, or fail to gain adoption outside its initial sponsors. Building ACP support in Drive without Cursor adoption is wasted work. |
| **Mitigation** | Defer. Monitor ACP spec evolution. Only invest if Cursor announces ACP support or Drive targets multi-IDE distribution. |
| **Residual risk** | None. Deferral eliminates risk. |

---

### R11: Ecosystem Churn — AgentBound Adoption

| Field | Detail |
|---|---|
| **Category** | Ecosystem churn |
| **Likelihood** | High |
| **Impact** | Low |
| **Technologies** | AgentBound |
| **Description** | AgentBound is a research paper with a reference implementation. It has no production adoption and is not part of the MCP core spec. The permission model may never be standardized, or may be standardized differently than the current proposal. |
| **Mitigation** | Defer runtime integration. Drive's `toolAllowlist.ts` already provides more advanced permission enforcement (operator hierarchy, cascade). If MCP core spec adopts permission primitives, adapt Drive's metadata to conform. |
| **Residual risk** | None. Deferral eliminates risk. |

---

### R12: Integration Risk — Realtime API Pipeline Bypass

| Field | Detail |
|---|---|
| **Category** | Architecture |
| **Likelihood** | High (if Realtime API is adopted) |
| **Impact** | Medium |
| **Technologies** | OpenAI Realtime API |
| **Description** | The Realtime API handles voice-in → model reasoning → voice-out in a single call, bypassing Drive's carefully designed pipeline stages (filler-clean, sanitize, optimize, approve, route, model-select). This means ADR-0010 tiered routing, ADR-0005 sanitization, and approval gates are all bypassed in voice mode. |
| **Mitigation** | (1) Realtime API sessions still receive text transcript as a side-channel. Run transcript through sanitizer and approval gates before allowing model output to be spoken. (2) Treat Realtime API as a "fast path" with post-hoc validation rather than pre-hoc pipeline. (3) If validation fails, interrupt the voice response via `tts_stop`. (4) Document the pipeline bypass clearly — operators in voice mode have different safety properties than text mode. |
| **Residual risk** | Medium. Post-hoc validation is weaker than pre-hoc pipeline stages. Acceptable for opt-in cloud voice mode. |

---

### R13: Performance — WhisperKit Memory and GPU Contention

| Field | Detail |
|---|---|
| **Category** | Performance |
| **Likelihood** | Medium |
| **Impact** | Medium |
| **Technologies** | WhisperKit |
| **Description** | WhisperKit large-v3 model requires ~1.5GB VRAM. On machines where GPU is also used for LLM inference (e.g., local models via Ollama), WhisperKit and the LLM may compete for VRAM, causing performance degradation for both. |
| **Mitigation** | (1) Default to `distil-large-v3` (smaller model, lower VRAM) for machines with limited GPU memory. (2) Allow configuration of model size based on available resources. (3) If GPU contention is detected (inference latency spike), fall back to CPU inference with a user notification. (4) Document VRAM requirements per model variant. |
| **Residual risk** | Low with distil-large-v3 default. Medium if user selects large-v3 on a constrained machine. |

---

## 2. Risk Matrix

| Risk | Category | Likelihood | Impact | Mitigation effectiveness | Residual |
|---|---|---|---|---|---|
| R1: Vendor lock-in (Realtime API) | Lock-in | High | High | High (optional mode, backend abstraction) | Low |
| R2: Cloud audio exposure | Privacy | High | High | Medium (opt-in consent, but audio still transmitted) | Medium |
| R3: Langfuse trace data | Privacy | Medium | Medium | High (self-hosted, redaction, TTL) | Low |
| R4: WhisperKit model supply chain | Supply chain | Low | Medium | High (checksums, version pinning) | Very Low |
| R5: Langfuse npm dependency | Supply chain | Low | Medium | High (feature flag, version pin) | Very Low |
| R6: Cross-platform audio | Maintenance | High | Medium | Medium (macOS-first, graceful degradation) | Medium |
| R7: Multiple voice backends | Maintenance | Medium | Medium | High (backend abstraction, limit to 2) | Low |
| R8: A2A spec changes | Ecosystem | Medium | Low | High (stable subset, minimal surface) | Very Low |
| R9: MCP Registry instability | Ecosystem | High | Low | High (defer) | None |
| R10: ACP spec churn | Ecosystem | High | Low | High (defer) | None |
| R11: AgentBound adoption | Ecosystem | High | Low | High (defer) | None |
| R12: Pipeline bypass (Realtime) | Architecture | High | Medium | Medium (post-hoc validation) | Medium |
| R13: GPU contention (WhisperKit) | Performance | Medium | Medium | High (smaller default model) | Low |

---

## 3. Risk by Technology

| Technology | Top risk | Residual after mitigation |
|---|---|---|
| **OpenAI Realtime API** | R2: Cloud audio exposure | Medium |
| **WhisperKit** | R6: Cross-platform audio | Medium |
| **Web Speech processLocally** | R10-equivalent: spec instability | None (deferred) |
| **A2A Protocol** | R8: Spec changes | Very Low |
| **MCP Registry** | R9: Spec instability | None (deferred) |
| **ACP** | R10: Spec churn | None (deferred) |
| **AgentBound** | R11: No adoption | None (deferred) |
| **Petri** | None significant | N/A |
| **Langfuse** | R3: Trace data privacy | Low |
| **HAL / WebArena** | None significant (deferred) | N/A |
| **Parallel Tool Calling** | None significant | N/A |

---

## 4. Monitoring Plan

| Signal | Measurement | Threshold | Action |
|---|---|---|---|
| Realtime API opt-in rate | Config telemetry (if enabled) | >10% of sessions | Validate privacy disclosure is clear. Consider more prominent warning |
| WhisperKit STT accuracy | Filler cleaner input quality | WER >5% reported | Switch to larger model or adjust filler patterns |
| STT subprocess crashes | Error log count | >3 per session | Investigate audio capture compatibility. Consider native addon migration |
| Langfuse trace volume | ClickHouse storage | >1GB/week | Tune sampling rate or increase TTL aggression |
| A2A external task creation | Server logs | Any | Track adoption. Validates A2A investment |
| Model call cost (via Langfuse) | Per-session cost | >$0.50/session | Review tiered routing. Check for unnecessary Tier 2/3 calls |

---

## 5. Contingency

| If… | Then… |
|---|---|
| WhisperKit subprocess is too slow or unstable | Migrate to native Node.js addon (Option B) |
| Realtime API pricing becomes prohibitive | Remove opt-in cloud voice. WhisperKit remains default |
| Langfuse self-hosting is too complex for users | Add managed Langfuse option with privacy disclosure. Or build lightweight built-in tracing |
| A2A v1.0 RC breaks Drive's endpoints | Budget 1 session for endpoint updates (~80 lines) |
| MCP spec adopts AgentBound permissions | Add permission manifest to Drive's MCP server metadata |
| Cross-platform audio capture is unmanageable | Restrict STT to macOS. Document as platform limitation |
| Multiple voice backends become maintenance burden | Drop least-used backend. Keep only WhisperKit |
