---
planId: architecture-vision-foundation
planType: task
parentPlanId: cursor-drive
childPlanIds: []
dependsOn: []
name: Architecture & Vision Foundation
overview: "Establish the architectural foundation for Drive as a mode-wrapper: ADRs for mode wrapper, hook-based ingress, native mode compatibility, voice integration, and mode state management. Codify vision invariants. Fix duplicate ADR numbering."
todos:
  - id: avf-01-adr-mode-wrapper
    content: "Write docs/architecture/adr/ADR-0008-drive-mode-wrapper-architecture.md. Decision: Drive wraps Cursor native modes (Agent/Plan/Ask/Debug) as a behavioral layer; beforeSubmitPrompt hook is the primary pipeline entry; @drive participant is fallback only. Cover: what wrapping means, extension points, invariants. Acceptance: file exists, status=Accepted, covers mode-wrapper contract and beforeSubmitPrompt as primary pipeline."
    status: completed
  - id: avf-02-adr-hook-ingress
    content: "Write docs/architecture/adr/ADR-0009-hook-based-prompt-interception.md. Decision: beforeSubmitPrompt hook intercepts every prompt when Drive is active. Cover: hook capabilities (modify vs context-only), Python hook vs extension boundary, fallback when Drive inactive. Acceptance: file exists, status=Accepted, hook capabilities clearly documented, extension/hook boundary defined."
    status: completed
  - id: avf-03-adr-native-mode-compat
    content: "Write docs/architecture/adr/ADR-0011-native-mode-compatibility.md. Decision: Drive sub-modes map 1:1 to Cursor native modes (plan→Plan, agent→Agent, ask→Ask, debug→Debug); 'direct' mode is retired. Cover: mapping table, extension points Drive can/cannot modify, compatibility guarantees. Acceptance: file exists, mapping table present, 'direct' mode disposition documented."
    status: completed
  - id: avf-04-adr-voice-integration
    content: "Write docs/architecture/adr/ADR-0012-voice-input-integration.md. Decision: mic button is mute/unmute for continuous listening; wake word is optional, not required for activation; TTS speaks AI responses; pipeline is filler-clean → sanitize → optimize. Acceptance: file exists, mic mute/unmute model documented, wake word as optional described, TTS integration points specified."
    status: completed
  - id: avf-05-adr-mode-state
    content: "Write docs/architecture/adr/ADR-0013-mode-state-management.md. Decision: Drive state (active + subMode) is persisted to workspaceState; SubMode maps to Cursor mode enum; status bar reflects actual Drive+native mode. Cover: state persistence strategy, synchronization model, what happens on deactivation. Acceptance: file exists, state machine documented, persistence mechanism specified."
    status: completed
  - id: avf-06-fix-adr-numbering
    content: "Rename docs/architecture/adr/ADR-0001-drive-mode-installable-distribution.md to ADR-0007-drive-mode-installable-distribution.md. Update all internal references (its own header, docs/architecture/adr/README.md). Verify no other file still references it as ADR-0001. Acceptance: only one file is named ADR-0001-*; README.md ADR table is consistent; no broken cross-references."
    status: completed
  - id: avf-07-update-adr-0001
    content: "Update docs/architecture/adr/ADR-0001-cursor-native-ingress-strategy.md: add section documenting why @drive ChatParticipant was removed (vscode.chat.createChatParticipant not supported in Cursor), what replaced it (beforeSubmitPrompt hook + commands + status bar), and the rationale. Change status to Superseded-by ADR-0009. Acceptance: ADR-0001 contains removal rationale, references ADR-0009, status updated."
    status: completed
  - id: avf-08-vision-invariants-rule
    content: "Create .cursor/rules/vision-invariants.mdc with alwaysApply: true. Content must codify: (1) Drive is a behavioral toggle/wrapper around Cursor native modes, NOT @drive participant as primary UX; (2) beforeSubmitPrompt hook is the primary pipeline entry when Drive is active; (3) Drive sub-modes map 1:1 to Cursor native modes; (4) @drive participant may exist as fallback only; (5) mic button is mute/unmute. Acceptance: file exists, all 5 invariants present, alwaysApply: true."
    status: completed
  - id: avf-09-adr-agent-orchestration
    content: "Write docs/architecture/adr/ADR-0014-agent-orchestration-strategy.md. Decision: (1) A2A protocol for agent-to-agent interop alongside MCP for agent-to-tool — A2A Task endpoints on DriveMcpServer at :7891; (2) Claude Code Agent Teams lead+worker pattern as reference architecture for AgentRegistry v2; (3) AWS Strands Agents TypeScript SDK as evaluation candidate for worker runtime; (4) LangGraph deferred (Python-heavy, overkill); (5) OpenClaw not applicable (messaging gateway, not coding agent framework). Cover: A2A+MCP layering diagram, registry v2 design rationale, deferred framework rationale. Acceptance: file exists, status=Accepted, covers A2A+MCP layering, AgentRegistry v2 reference architecture, and deferred frameworks with rationale."
    status: completed
isProject: false
---

# Architecture & Vision Foundation

## Purpose

Establish the architectural ground truth before any pipeline implementation work begins. All subsequent workstreams depend on the decisions documented here.

The core problem: the entire documentation layer assumes `@drive` ChatParticipant is primary UX, but the code already removed it. Cursor doesn't support `vscode.chat.createChatParticipant`. Drive must be a behavioral wrapper via `beforeSubmitPrompt` hook.

## Vision invariants (non-negotiable)

1. Drive is a **behavioral toggle/wrapper** around Cursor's native modes (Agent/Plan/Ask/Debug)
2. `beforeSubmitPrompt` hook is the primary pipeline entry when Drive is active
3. Drive sub-modes map 1:1 to Cursor native modes
4. `@drive` participant may exist as dormant fallback only — never primary UX
5. Mic button is mute/unmute for continuous listening (wake word is optional)

## ADR numbering plan

Current state: two files share ADR-0001. This plan resolves it:


| New number | File                                | Reason                                                    |
| ---------- | ----------------------------------- | --------------------------------------------------------- |
| ADR-0001   | cursor-native-ingress-strategy      | Update to document @drive removal; superseded by ADR-0009 |
| ADR-0002   | hybrid-extension-plugin-strategy    | Keep                                                      |
| ADR-0003   | local-mcp-server-bridge             | Keep                                                      |
| ADR-0004   | in-memory-agent-registry            | Keep                                                      |
| ADR-0005   | privacy-strict-default              | Keep                                                      |
| ADR-0006   | plan-file-placement                 | Keep                                                      |
| ADR-0007   | drive-mode-installable-distribution | Rename from old ADR-0001                                  |
| ADR-0008   | drive-mode-wrapper-architecture     | **NEW**                                                   |
| ADR-0009   | hook-based-prompt-interception      | **NEW**                                                   |
| ADR-0010   | tiered-model-routing                | Keep (already exists)                                     |
| ADR-0011   | native-mode-compatibility           | **NEW**                                                   |
| ADR-0012   | voice-input-integration             | **NEW**                                                   |
| ADR-0013   | mode-state-management               | **NEW**                                                   |


## Execution strategy

**Executor role:** Implementer. All tasks are documentation writes — no code changes.

**Subagent fan-out:** ADR writes avf-01 through avf-05 can be parallelized (up to 4 at once). avf-06 and avf-07 can run concurrently. avf-08 runs last (depends on avf-01 to confirm invariants).

**Recommended batches:**

- Batch A (parallel): avf-01, avf-02, avf-03, avf-04
- Batch B (parallel): avf-05, avf-06, avf-07
- Batch C (sequential): avf-08

**Phase gate:** Before starting hook-prompt-pipeline or native-mode-alignment, verify:

- ADR-0009 exists and documents hook capabilities
- ADR-0011 exists and documents sub-mode mapping
- vision-invariants.mdc exists

**Delegation trigger:** Spawn a subagent if writing 2+ ADRs simultaneously.

**Verification:** After all TODOs complete, check that docs/architecture/adr/ has no duplicate numbers and README.md is consistent.

## Reconciliation

All 9 TODOs completed. Verified:

- **ADR files**: ADR-0008, ADR-0009, ADR-0011, ADR-0012, ADR-0013, ADR-0014 created; ADR-0007 created (renamed from duplicate ADR-0001); ADR-0001 updated with @drive removal rationale and Superseded-by ADR-0009.
- **Numbering**: Only one file named ADR-0001-* (cursor-native-ingress-strategy); no duplicate ADR-0001.
- **README consistency**: docs/architecture/adr/README.md and docs/architecture/README.md index tables include ADR-0007 through ADR-0014.
- **vision-invariants.mdc**: Created with alwaysApply: true; all 5 invariants present.

**Residual risks**: ADR-0009 documents hook capabilities (modify vs context-only) based on typical Cursor hook contracts; actual Cursor behavior may differ — hook-prompt-pipeline plan should validate. ADR-0014 A2A is early spec (v0.1.0); implementation may require adaptation.

**Evidence**: All new ADR files exist; ADR-0001-drive-mode-installable-distribution.md deleted; ADR-0007-drive-mode-installable-distribution.md exists; vision-invariants.mdc exists.