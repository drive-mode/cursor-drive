# Other Relevant Technologies — Sources

**Topic:** References and bibliography for 11 technologies relevant to Cursor Drive.

**Date:** February 2026

---

## Voice / STT / TTS

### OpenAI Realtime API
- [OpenAI Realtime API documentation](https://platform.openai.com/docs/guides/realtime) — Full API reference for speech-to-speech (August 2025)
- [OpenAI Realtime API announcement](https://openai.com/index/introducing-the-realtime-api/) — Launch announcement and architecture overview (August 2025)
- [OpenAI Realtime API WebRTC guide](https://platform.openai.com/docs/guides/realtime-webrtc) — WebRTC transport for browser-based voice (2025)
- [GPT-4o Realtime model card](https://platform.openai.com/docs/models/gpt-4o-realtime) — Model capabilities, pricing, and limitations (2025)

### WhisperKit / WhisperLiveKit
- [WhisperKit GitHub](https://github.com/argmaxinc/WhisperKit) — On-device Whisper inference for Apple Silicon (MIT license) (2024–2025)
- [WhisperKit benchmarks](https://huggingface.co/spaces/argmaxinc/whisperkit-benchmarks) — Latency and accuracy benchmarks by device and model variant (2025)
- [WhisperLiveKit GitHub](https://github.com/QuentinFuworworworx/WhisperLiveKit) — Real-time streaming STT with WebSocket support, extending WhisperKit to Linux/CUDA (July 2025)
- [Argmax blog: WhisperKit performance](https://www.argmax.com/blog/whisperkit) — Architecture and optimization details (2025)

### Web Speech API processLocally
- [W3C Web Speech API specification](https://wicg.github.io/speech-api/) — Current draft specification (2025)
- [Chrome processLocally intent to ship](https://chromestatus.com/feature/5765462028492800) — Chromium implementation status (April 2025)
- [Web Speech API MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API) — Developer reference and browser compatibility

---

## Protocol / Interop

### Google Agent2Agent (A2A) Protocol
- [A2A Protocol Specification](https://a2a-protocol.org/latest/specification/) — Full protocol specification v0.3.0 (2025)
- [A2A Key Concepts](https://a2a-protocol.org/latest/topics/key-concepts/) — Agent Cards, Tasks, Messages, Parts (2025)
- [A2A JavaScript SDK](https://github.com/a2aproject/a2a-js) — Official JavaScript/TypeScript SDK (2025)
- [A2A announcement (Google Developers Blog)](https://developers.googleblog.com/en/a2a-a-new-era-of-agent-interoperability) — Original announcement (April 2025)
- [A2A Linux Foundation donation](https://www.linuxfoundation.org/press/linux-foundation-launches-a2a-protocol) — Governance transition announcement (2025)

### MCP Stateless Transport & Registry
- [MCP Transport Future](https://blog.modelcontextprotocol.io/posts/2025-12-19-mcp-transport-future/) — Stateless transport direction and registry vision (December 2025)
- [MCP Specification](https://modelcontextprotocol.io/specification/) — Core protocol specification (2024–2026)
- [MCP Streamable HTTP transport](https://modelcontextprotocol.io/specification/2025-03-26/basic/transports#streamable-http) — HTTP transport specification (March 2025)
- [MCP Server Registry discussion](https://github.com/modelcontextprotocol/specification/discussions) — Community discussion on registry semantics (2025)

### JetBrains + Zed ACP (Agent Client Protocol)
- [JetBrains × Zed ACP announcement](https://blog.jetbrains.com/ai/2025/10/jetbrains-zed-open-interoperability-for-ai-coding-agents-in-your-ide) — Joint announcement of cross-IDE agent protocol (October 2025)
- [ACP specification draft](https://github.com/ACP-Project/acp-spec) — Draft protocol specification (October 2025)
- [Zed ACP integration blog](https://zed.dev/blog/acp) — Zed's perspective on agent interoperability (October 2025)

---

## Security / Permissions

### AgentBound — MCP Access Control
- [AgentBound paper (arXiv)](https://arxiv.org/abs/2510.21236) — "AgentBound: Declarative Access Control for MCP Servers" (October 2025)
- [AgentBound reference implementation](https://github.com/agentbound/agentbound) — Reference implementation of the permission model (2025)

### Anthropic Petri — Automated Safety Auditing
- [Petri announcement (Anthropic)](https://anthropic.com/research/petri-open-source-auditing) — Open-source automated safety auditing agent (October 2025)
- [Petri GitHub](https://github.com/anthropics/petri) — Source code and documentation (October 2025)
- [Petri: Multi-turn simulation for agent safety](https://anthropic.com/research/agent-safety-testing) — Research paper on simulation methodology (2025)

---

## Observability / Evals

### Langfuse
- [Langfuse documentation](https://langfuse.com/docs) — Full platform documentation (2025–2026)
- [Langfuse tracing guide](https://langfuse.com/docs/tracing) — Distributed tracing for LLM applications (2025)
- [Langfuse TypeScript SDK](https://langfuse.com/docs/sdk/typescript/guide) — TypeScript/JavaScript integration guide (2025)
- [Langfuse self-hosting guide](https://langfuse.com/docs/deployment/self-host) — Docker Compose deployment instructions (2025)
- [Langfuse evaluation framework](https://langfuse.com/docs/scores/overview) — Custom metrics and model-graded evaluations (2025)
- [Langfuse GitHub](https://github.com/langfuse/langfuse) — Open-source repository (MIT license) (2023–2026)

### HAL + WebArena Verified
- [HAL (Holistic Agent Leaderboard)](https://hal.science/agent-leaderboard) — Unified agent benchmarks (2025)
- [WebArena](https://webarena.dev/) — Web-based agent benchmark suite (2024–2025)
- [WebArena Verified paper](https://arxiv.org/abs/2504.01382) — Human-verified subset with corrected annotations (2025)
- [SWE-bench](https://www.swebench.com/) — Coding agent benchmark (included in HAL) (2024–2025)

---

## Performance

### Parallel Tool Calling + LLM-Tool Compiler
- [OpenAI parallel function calling](https://platform.openai.com/docs/guides/function-calling/parallel-function-calling) — OpenAI documentation on parallel tool calls (2024–2025)
- [Anthropic tool use — parallel calls](https://docs.anthropic.com/en/docs/build-with-claude/tool-use#parallel-tool-calls) — Claude parallel tool execution (2025)
- [LLM-Tool Compiler research](https://arxiv.org/abs/2507.09557) — Schema compression for tool-augmented LLMs (2025)
- [Cursor parallel agent execution](https://cursor.com/blog/cloud-agents) — Up to 8 parallel agents via git worktrees (2025)

---

## Related Technologies (from other research modules)

### MiniScope — Least-Privilege Tools
- [MiniScope paper (arXiv)](https://arxiv.org/abs/2512.11147) — Auto-reconstruct permission hierarchies for MCP tools (December 2025)

### AgentGuardian — Context-Aware ACL
- [AgentGuardian paper (arXiv)](https://arxiv.org/abs/2601.10440) — Runtime behavior monitoring for agents (January 2026)

---

## Cursor Drive Internal References

| Document | Relevance |
|---|---|
| [ADR-0005: Privacy Strict Default](../../architecture/adr/ADR-0005-privacy-strict-default.md) | Gate for voice technology decisions. No raw audio retention, no transcript persistence by default |
| [ADR-0010: Tiered Model Routing](../../architecture/adr/ADR-0010-tiered-model-routing.md) | Constraint. Realtime API bypasses tiered routing; Langfuse traces tier selection |
| [ADR-0012: Voice Input Integration](../../architecture/adr/ADR-0012-voice-input-integration.md) | Foundation. Defines mic model, pipeline order, STT gap |
| [ADR-0014: Agent Orchestration Strategy](../../architecture/adr/ADR-0014-agent-orchestration-strategy.md) | Context. A2A adoption alongside MCP |
| [Agent Teams research](../agent-teams/) | Context. A2A gaps, operator patterns, orchestration strategy |
| [Agent Steering research](../agent-steering/) | Context. Guardrail patterns, policy enforcement |
| [MCP Apps research](../mcp-apps/) | Context. MCP ecosystem evolution |
| [Technology Landscape 2026](../technology-landscape-2026.md) | Context. Broader technology survey |
| `src/pipeline.ts` | Source — Voice pipeline stages, STT integration point |
| `src/modelSelector.ts` | Source — Tiered model routing, Langfuse trace target |
| `src/toolAllowlist.ts` | Source — Permission enforcement, AgentBound comparison |
| `src/mcpServer.ts` | Source — MCP tools, A2A endpoints, Agent Card |
| `src/operatorRegistry.ts` | Source — Operator lifecycle, permission cascade |
| `src/tts.ts` | Source — TTS via say.js, voice output |
