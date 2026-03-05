# Cross-Topic Synthesis: Executive Summary

**Date:** February 2026
**Scope:** 7 technology topics evaluated for Cursor Drive v0.3+

---

## What Matters Most

Three things define Drive's near-term trajectory:

1. **Voice pipeline (STT gap).** Drive is voice-first (ADR-0012) but has no speech-to-text implementation. `pipeline.ts` processes text; the mic→text step is missing. WhisperKit is the strongest candidate (privacy-aligned per ADR-0005, on-device, ~460ms latency). OpenAI Realtime API is a secondary option for opt-in cloud voice. This is the single largest architectural gap.

2. **Steering enhancements.** The existing guardrail stack (`approvalGates.ts`, `toolAllowlist.ts`, `sanitizer.ts`) is production-grade for single-operator use. Multi-operator scenarios (3+ operators in parallel) surface gaps: no declarative policy configuration, no runtime monitoring, no graduated response beyond block/warn. YAML-based policies and lightweight runtime monitoring close these gaps incrementally.

3. **Operator role system.** `operatorRegistry.ts` manages lifecycle well (spawn/switch/merge/dismiss/delegate) but operators lack semantic roles. Adding role templates (implementer, reviewer, tester, researcher, planner) with default presets and an escalation protocol closes usability gaps when operators hit permission boundaries.

---

## Decision Summary

| # | Topic | Decision | Confidence | Key rationale |
|---|-------|----------|------------|---------------|
| 1 | MCP Apps | **PROTOTYPE** | Medium | Portable Agent Screen via MCP App UI resources. Validate in ≥2 hosts before committing. |
| 2 | Cursor Computer Use | **PROTOTYPE** | Medium-High | Cursor lock-in is intentional project strategy. Prototype with community MCP screenshot tools now; monitor Cloud Agents API. |
| 3 | Agent Steering | **ADOPT** | High | Incremental enhancement of existing pipeline-stage guardrails. YAML policies → graduated response → runtime monitoring. |
| 4 | Agent Teams | **ADOPT** incremental / **DEFER** full engine | High / Medium | Role templates + escalation extend existing operator system. Full orchestration engine is premature. |
| 5 | Plugins & MCP Server | **ADOPT** | High | Hybrid architecture (ADR-0002) is working. Version checking, auto-install, dynamic MCP registration prep. |
| 6 | VS Code Extensions | **ADOPT** | High | LM Tools registration + webview accessibility. MCP bridge (ADR-0003) validated as primary path. |
| 7 | Other Relevant Tech | Mixed | Mixed | ADOPT: A2A enhancement, parallel tool calling. PROTOTYPE: WhisperKit, Langfuse, OpenAI Realtime. DEFER: MCP Registry, AgentBound, ACP, Petri, Web Speech, HAL/Evals. |

**Totals:** 3 ADOPTs, 4 PROTOTYPEs, 0 DEFERs at topic level (plus 6 individual DEFERs within Other Relevant Tech).

---

## Immediate Next Actions

| Priority | Action | Effort | Owner module |
|----------|--------|--------|--------------|
| **P0** | Implement steering YAML policies (Phase 1) | ~130 lines | `approvalGates.ts`, `toolAllowlist.ts` |
| **P0** | Add operator role templates + escalation | ~200 lines | `operatorRegistry.ts`, `mcpServer.ts`, `commsAgent.ts` |
| **P0** | Annotate MCP tools for parallel-safety | ~70 lines | `mcpServer.ts` |
| **P1** | Begin WhisperKit STT prototype | ~200 lines | New `stt.ts`, `pipeline.ts` stage 0 |
| **P1** | Set up MCP Apps prototype (activity feed) | ~200 lines | `mcpServer.ts`, new `agentScreenApp.ts` |
| **P1** | Close A2A compliance gaps (JSON-RPC, Agent Card) | ~140 lines | `mcpServer.ts` |
| **P2** | Begin Langfuse observability prototype | ~170 lines | `modelSelector.ts` wrapper |
| **P2** | LM Tools registration + webview ARIA | ~205 lines | New `lmToolsBridge.ts`, `agentScreen.ts` |

---

## Risk Posture

**Conservative: swap-first, feature-flagged.**

Every recommended change follows the swap-first pattern established across all 7 topic evaluations:

- **Additive, not structural.** No changes require architectural refactoring. All modifications extend existing modules (`pipeline.ts`, `operatorRegistry.ts`, `mcpServer.ts`, `toolAllowlist.ts`, `approvalGates.ts`).
- **Feature-flagged.** MCP Apps (`cursorDrive.mcp.enableApps`), runtime monitoring thresholds, and cloud voice mode all gate behind configuration flags.
- **Independently revertible.** Each enhancement is a PR-sized diff. Reverting one does not affect others.
- **No new external dependencies** for ADOPT items. Prototypes add optional dependencies (WhisperKit subprocess, Langfuse SDK) behind feature flags.

The single highest-risk item is MCP Apps host rendering consistency — mitigated by prototyping before commitment.

---

## Investment Thesis

**Drive's architecture is sound. The enhancements are incremental, not structural.**

The research across all 7 topics confirms that Drive's core modules — the prompt pipeline (`pipeline.ts`), operator registry (`operatorRegistry.ts`), MCP bridge (`mcpServer.ts`), permission system (`toolAllowlist.ts`), and safety gates (`approvalGates.ts`) — are well-aligned with industry best practices. The gaps are:

1. **STT input** — a known, planned gap (ADR-0012 defines the model but not the implementation).
2. **Declarative policy configuration** — the patterns exist; they need to be externalized to YAML.
3. **Operator semantics** — the lifecycle primitives exist; operators need role metadata.
4. **Observability** — model calls have no tracing; Langfuse fills this gap cleanly.
5. **Cross-client portability** — MCP Apps offer a standards-based path to serve Agent Screen outside VS Code.

None of these require rethinking the architecture. Total estimated new/modified production code across all ADOPT and PROTOTYPE items: ~1,500 lines. The foundation holds.
