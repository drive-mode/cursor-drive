---
planId: cursor-drive
planType: project
childPlanIds: [cursor-drive-orchestrator, readme-redesign, repo-health-and-baseline, s_as_screen_capture_impl, sdk_and_protocol_research_6c42aa0c, cursor_plugin_marketplace_and_mcp_apps_implementation]
dependsOn: []
name: Cursor Drive Feature Plan
overview: "Cursor Drive: behavioral toggle/wrapper around Cursor native modes (Agent/Plan/Ask/Debug). Voice-first, multi-agent, share-screen. Integration via beforeSubmitPrompt hook + MCP server. NOT an @drive chat participant."
todos:
  - id: f0-1-drive-mode-participant
    content: "Hybrid plugin+extension architecture complete: Cursor plugin layer (skills/drive-persona, rules, commands, mcp.json) + VS Code extension (status bar, TTS, share-screen webview, MCP server on :7891). 18 src modules, 8 with tests."
    status: completed
  - id: f0-2-voice-pipeline
    content: Filler cleaner, glossary expander, sanitizer implemented and tested. Activation word detection done. promptOptimizer.ts missing — tracked in pipeline-wiring-mvp plan.
    status: completed
  - id: f0-3-safety-config
    content: Approval gates, tool allowlist, config reader all implemented and tested. Mode-switch confirmation enforcement remains — tracked in pipeline-wiring-mvp plan.
    status: completed
  - id: f0-4-session-persona
    content: Session memory implemented. Drive-persona skill wired. Response formatter and proactive steering not yet built — tracked in pipeline-wiring-mvp plan.
    status: completed
  - id: f0-5-multi-agent
    content: AgentRegistry, MCP agent tools all implemented. Tangent keyword wiring into input pipeline missing — tracked in pipeline-wiring-mvp plan.
    status: completed
  - id: f0-6-cursor-integration
    content: Status bar, share-screen WebviewPanel, MCP bridge all implemented. ShareScreen renders activity/files/decisions tabs. Diagnostics command working.
    status: completed
  - id: hh-migration-followup
    content: Add ADR-0005/0006, traceability matrix, remove Discord/hh refs. See hh-migration-followup.plan.md.
    status: completed
  - id: docs-overhaul
    content: Restructure docs/, fix stale content, create reference docs. See docs-overhaul.plan.md.
    status: completed
  - id: fix-extension-activation
    content: SUPERSEDED by quality-performance plan. Fix extension activation error in dev-host.
    status: cancelled
  - id: old-mvp-gaps
    content: SUPERSEDED by pipeline-wiring-mvp plan (realigned for hook-based pipeline). See pipeline-wiring-mvp.plan.md.
    status: cancelled
  - id: old-test-coverage
    content: SUPERSEDED by quality-performance plan (merged with optimization). See quality-performance.plan.md.
    status: cancelled
  - id: old-code-optimization
    content: SUPERSEDED by quality-performance plan (merged with test coverage). See quality-performance.plan.md.
    status: cancelled
  - id: workstream-arch
    content: "Architecture & vision foundation: ADRs for mode wrapper, hook-based ingress, native mode compat. Vision-invariants rule. See archive/architecture-vision-foundation.plan.md."
    status: completed
  - id: workstream-hook
    content: "Hook-based prompt pipeline: beforeSubmitPrompt contract, pipeline design, extension wiring. See archive/hook-prompt-pipeline.plan.md."
    status: completed
  - id: workstream-mode
    content: "Native mode alignment: router RouteMode + driveMode SubMode mapped to Cursor native modes. See archive/native-mode-alignment.plan.md."
    status: completed
  - id: workstream-pipeline
    content: "Pipeline wiring + MVP features: wire 9 orphaned modules, promptOptimizer, wake words. See archive/pipeline-wiring-mvp.plan.md."
    status: completed
  - id: workstream-cleanup
    content: ".cursor/ cleanup + docs alignment: remove dead files, fix @drive references, update PRDs. See archive/cursor-docs-cleanup.plan.md."
    status: completed
  - id: workstream-quality
    content: "Quality + performance: tests, optimization, activation fix. See archive/quality-performance.plan.md."
    status: completed
  - id: workstream-agent-orch
    content: "Agent orchestration frameworks: A2A protocol layer, Claude Code Agent Teams bridge, AgentRegistry v2 design (lead+worker, mailbox), CommsAgent rescue, Strands eval. See archive/agent-orchestration-frameworks.plan.md."
    status: completed
  - id: workstream-senior-ux
    content: "Senior engineer UX philosophy: pair-programming philosophy doc, expanded persona skill (steering, rhythm, teaching moments, proactive behavior), UX ADR. See archive/senior-engineer-ux.plan.md."
    status: completed
  - id: workstream-browser-dev
    content: "Browser dev workflow: cursor serve-web setup, Playwright automation, visual regression tests for AgentScreen, one-command dev scripts. See archive/browser-dev-workflow.plan.md."
    status: completed
  - id: workstream-terminology-sas
    content: "Terminology and S-AS overhaul: rename Drive workers from 'agent' to 'operator', rename ShareScreen to Agent Screen (S-AS) with interactive enhancements, add granular config settings. See archive/terminology-sas-overhaul.plan.md."
    status: completed
  - id: workstream-openclaw
    content: "OpenClaw capability scrape: gap analysis + adoption of patterns (per-operator tool policy, memory isolation, checkpoint/resume, skill gating, comms batching, persistent memory). See openclaw_capability_scrape_8fa228d1.plan.md."
    status: completed
  - id: workstream-state-sync
    content: "Drive state sync: close tso-06, wire sessionMemory.addTurn in pipeline response path, update root plan workstream statuses, run plan-sync. See cursor_drive_state_sync_95317c89.plan.md."
    status: completed
  - id: workstream-wire-and-fix
    content: "Wire and fix Drive: wire PersistentMemory + operator-scoped pipeline, expose depth/parent/preset in MCP tools, fix .cursor/ assets (skills, hooks, agents, rules). See wire_and_fix_drive_886a9ffa.plan.md."
    status: completed
  - id: workstream-ux-polish
    content: "Drive UX polish + Auto-MCP: deep-link MCP registration, audio chimes, wake-word acknowledgment, dev-settings preset. See drive_ux_polish_and_auto-mcp_deb68d21.plan.md."
    status: completed
  - id: workstream-voice-journey
    content: "Voice user journey storyboard: design doc for install→configure→use→repeat cycle, friction point audit and prioritization. See voice_user_journey_storyboard_59290404.plan.md."
    status: completed
  - id: workstream-sas-capture
    content: "S-AS screen capture: Phase 1 CLI NDJSON streaming into AgentScreen in real time; Phase 2 Cloud Agent status + conversation via polling; Phase 3 video/screenshot artifact tab. See s_as_screen_capture_impl.plan.md."
    status: completed
  - id: workstream-native-cmds
    content: "Cursor native commands wire-up: sync composerMode.* with setSubMode, add focusAgentView/reloadMcp/openWebviewDevTools/stopVoice/injectFilesToComposer commands, upgrade voice and diagnose. See cursor_native_commands_wire_4b8e2c17.plan.md."
    status: completed
isProject: true
---

# Cursor Drive Feature Plan

## Purpose

Root plan for the Cursor Drive VS Code extension. Tracks phase completion across all child workstreams.

Drive is a **behavioral toggle/wrapper** around Cursor's native modes (Agent/Plan/Ask/Debug). It is NOT an `@drive` chat participant. Integration is via `beforeSubmitPrompt` hook + local MCP server at `:7891`.

## Architecture

```
Cursor Drive
├── Cursor Plugin Layer   (.cursor/)        — skills, rules, commands, hooks, mcp.json
│   └── beforeSubmitPrompt hook            — drive-preprocessor.py (pipeline entry)
├── VS Code Extension     (src/)            — 20+ TypeScript modules
│   ├── Drive toggle      driveMode.ts     — active + subMode (plan/agent/ask/debug/off)
│   ├── Pipeline          pipeline.ts      — runPipeline(): filler → glossary → sanitize → approvalGates → router
│   ├── Routing           router.ts → modelSelector.ts → modelUtils.ts
│   ├── Multi-operator    operatorRegistry.ts ← mcpServer.ts ← Cursor AI
│   ├── UI                statusBar.ts, agentScreen.ts, tts.ts
│   ├── Session           sessionMemory.ts, promptOptimizer.ts
│   └── Comms             commsAgent.ts (batched operator notifications)
└── MCP Bridge            :7891  — operator_*, agent_screen_*, drive_* tools; A2A endpoints
```

## Workstream history

Phases 1–4 executed and archived. See `.cursor/plans/archive/` for full history.


| Phase | Plans                                                                                               | Status     |
| ----- | --------------------------------------------------------------------------------------------------- | ---------- |
| 1     | architecture-vision-foundation, cursor-docs-cleanup, browser-dev-workflow, terminology-sas-overhaul | ✓ archived |
| 2     | hook-prompt-pipeline, native-mode-alignment, senior-engineer-ux, agent-orchestration-frameworks     | ✓ archived |
| 3     | pipeline-wiring-mvp                                                                                 | ✓ archived |
| 4     | quality-performance                                                                                 | ✓ archived |
| 5     | openclaw-capability-scrape, wire-and-fix-drive, drive-ux-polish                                     | ✓ done     |
| 6     | cursor-drive-state-sync, voice-user-journey-storyboard, cursor-native-commands-wire                 | ✓ done     |
| 7     | s-as-screen-capture-impl (Phase 1), command-discovery, layout-integration, extension-compat         | ✓ done     |


## References

- [PRD: Voice I/O](../../docs/prd/prd-voice-io.md)
- [PRD: Session + Persona](../../docs/prd/prd-session-persona.md)
- [PRD: Multi-Agent Orchestration](../../docs/prd/prd-multi-agent.md)
- [PRD: Safety + Configuration](../../docs/prd/prd-safety-config.md)
- [PRD: Cursor Integration](../../docs/prd/prd-cursor-integration.md)
- [Architecture docs](../../docs/architecture/README.md)
