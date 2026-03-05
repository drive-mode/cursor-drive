# Requirements Traceability Matrix

Lightweight mapping of PRD requirements to plan TODOs and acceptance scenarios. Scoped to Cursor Drive.

## Columns


| Requirement/PRD                              | Plan TODO                                 | Acceptance scenario                                                                           | Implementation status |
| -------------------------------------------- | ----------------------------------------- | --------------------------------------------------------------------------------------------- | --------------------- |
| **prd-voice-io**                             |                                           |                                                                                               |                       |
| Voice pipeline (filler, glossary, sanitizer) | f0-2-voice-pipeline                       | Filler cleaner, glossary expander, sanitizer tested; activation word detection works          | Implemented           |
| Prompt optimizer                             | pipeline-wiring-mvp                       | promptOptimizer.ts reads config, calls routing model, QuickPick diff, returns approved prompt | Implemented           |
| Wake/submit words                            | pipeline-wiring-mvp                       | Wake word strips and activates; submit word strips and submits without optimization           | Implemented           |
| TTS, response formatter                      | f0-2-voice-pipeline, f0-4-session-persona | TTS speaks formatted output; interrupt works                                                  | Implemented           |
| **prd-session-persona**                      |                                           |                                                                                               |                       |
| Response formatter, session memory           | f0-4-session-persona                      | Formatter compresses to verbosity; session memory tracks turns/tasks                          | Implemented           |
| Drive-persona skill                          | f0-4-session-persona                      | drive-persona skill wired; persona shapes AI behavior                                         | Implemented           |
| Proactive steering                           | mvp-gaps (not yet planned)                | Idle detection, commitment tracking, nudge on pending                                         | Pending               |
| **prd-multi-agent**                          |                                           |                                                                                               |                       |
| AgentRegistry, CommsAgent, MCP tools         | f0-5-multi-agent                          | Registry, spawn, switch, merge; comms agent batches updates                                   | Implemented           |
| Tangent keyword wiring                       | pipeline-wiring-mvp                      | "tangent [task]" at input start → operatorRegistry.spawn(); status bar update                  | Implemented           |
| **prd-safety-config**                        |                                           |                                                                                               |                       |
| Approval gates, tool allowlist, config       | f0-3-safety-config                        | Pre/post gates, allowlist, config reader all implemented and tested                           | Implemented           |
| Mode switching confirmation                  | drive_set_mode                           | requireConfirmation=true → QuickPick before mode switch (MCP drive_set_mode)                   | Implemented           |
| Privacy defaults                             | ADR-0005                                  | No transcript persistence, no audio retention, redacted logs                                  | Partial               |
| **prd-cursor-integration**                   |                                           |                                                                                               |                       |
| Hybrid plugin + extension                    | f0-1-drive-mode-participant               | 18 src modules, 8 with tests; plugin layer in .cursor/                                        | Implemented           |
| Status bar, ShareScreen, MCP bridge          | f0-6-cursor-integration                   | Status bar, share-screen tabs, MCP bridge; diagnostics command                                | Implemented           |
| Extension activation                         | fix-extension-activation                  | Extension activates in dev-host without error                                                 | In progress           |


## Child plan coverage


| Child plan        | Plan TODOs                                                                                                                           | Status    |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------ | --------- |
| mvp-gaps          | prompt-optimizer, wake-submit-words, tangent-wiring, mode-confirm                                                                    | Completed |
| test-coverage     | 10 module tests (extension, mcpServer, config, driveMode, statusBar, agentRegistry, commsAgent, responseFormatter, tts, shareScreen) | Pending   |
| docs-overhaul     | restructure, fix stale, index, reference docs, commands, skills, rules                                                               | Completed |
| code-optimization | model selection dedup, config caching, regex caching, AgentRegistry O(1), bounded queues, HTML template                              | Pending   |


## References

- Root plan: [cursor-drive.plan.md](../../.cursor/plans/cursor-drive.plan.md)
- PRDs: [docs/prd/](../prd/README.md)
- ADRs: [docs/architecture/adr/](../architecture/adr/README.md)
- Implemented features flow: [docs/design/ux/features-implemented-flow.md](../design/ux/features-implemented-flow.md)
