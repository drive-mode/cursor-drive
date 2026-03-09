# ADR Validation Map

Maps each ADR to required tests/checks and closure criteria. Use for verification that architectural decisions are implemented and validated.

## Format


| ADR                                           | Required Validation                                                                                                                                                                                                   | Closure Check                                                                                                        |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| **ADR-0001** Cursor-Native Extension Strategy | Extension activates in Cursor; `@drive` responds to prompts. MCP server health returns 200 on `:7891/health`. ShareScreen updates when AI calls `share_screen_activity`. Status bar reflects Drive mode in real time. | `npm test` passes; extension activates in dev-host; `cursorDrive.diagnose` shows MCP healthy                         |
| **ADR-0002** Hybrid Extension + Plugin        | Extension provides UI (StatusBar, WebviewPanel, Chat Participant). Plugin layer provides skills, rules, commands in `.cursor/`. Both layers coordinated via MCP.                                                      | No UI code in `.cursor/`; no AI behavior in `src/`; MCP tools bridge the two                                         |
| **ADR-0003** MCP Bridge Pattern               | MCP server on `:7891`; all 11 tools implemented; health endpoint; StreamableHTTPServerTransport                                                                                                                       | `tests/mcpServer.test.ts` covers all tool handlers; health endpoint returns 200                                      |
| **ADR-0004** Multi-Agent Registry             | AgentRegistry in-memory; tangent keyword or `agent_spawn` triggers spawn; maxConcurrent enforced; CommsAgent batches background updates                                                                               | `tests/agentRegistry.test.ts`; tangent-wiring TODO in mvp-gaps                                                       |
| **ADR-0005** Privacy Strict Default           | Strict mode default: zero transcript persistence, zero raw audio retention. Debug mode: scoped policy, TTL, deletion. Logs redact sensitive payloads.                                                                 | Strict-mode tests; debug-mode tests; `redacted_dict()` in config logging                                             |
| **ADR-0006** Plan File Placement              | Executable plans (`*.plan.md`) in `.cursor/plans/` only. Non-executable planning refs in `docs/plans/`. Automation targets `.cursor/plans/` exclusively.                                                              | No `*.plan.md` in `docs/plans/`; plan-graph.yaml references `.cursor/plans/`; hooks/plan-runner use `.cursor/plans/` |
| **ADR-0007** Drive Mode Installable Distribution | Extension packages as VSIX; plugin assets installed via extension command into `.cursor/`.                                                                 | `npx vsce package` succeeds; plugin installer runs without error                                                       |
| **ADR-0008** Drive Mode Wrapper Architecture | Drive wraps Cursor modes; `beforeSubmitPrompt` is primary pipeline entry when Drive active.                                                                 | Pipeline runs when Drive active; mode reflected in system prompt                                                      |
| **ADR-0009** Hook-Based Prompt Interception  | `beforeSubmitPrompt` hook intercepts every prompt when Drive active; hook can modify prompt or add context.                                                | drive-preprocessor.py or equivalent runs; prompt flows through pipeline                                                |
| **ADR-0010** Tiered Model Routing            | Tier 0 (deterministic), Tier 1 (cheap), Tier 2 (user's model), Tier 3 (reasoning). No auto-escalation.                                                      | `modelSelector.ts` implements tiers; routing/planning/execution mapped correctly                                        |
| **ADR-0011** Native Mode Compatibility       | Drive sub-modes map 1:1 to Cursor modes (plan→Plan, agent→Agent, ask→Ask, debug→Debug).                                                                     | Status bar shows correct mode; subMode matches Cursor mode                                                             |
| **ADR-0012** Voice Input Integration         | Mic mute/unmute; wake word optional; TTS speaks responses; pipeline: filler-clean → glossary → sanitize → optimize.                                        | fillerCleaner, glossaryExpander, sanitizer, promptOptimizer in pipeline; TTS via MCP                                   |
| **ADR-0013** Mode State Management           | Drive state (active + subMode) persisted to workspaceState; status bar reflects actual Drive+native mode.                                                   | workspaceState stores driveActive, subMode; status bar updates on change                                                |
| **ADR-0014** Agent Orchestration Strategy    | A2A + MCP layering; AgentRegistry v2 lead+worker; Strands eval; LangGraph deferred.                                                                        | operatorRegistry with spawn/switch/merge; MCP tools for operator control                                                 |
| **ADR-0015** Senior Engineer Interaction Model | Concise-first responses; steers proactively; teaches when valuable; response formatter.                                                                    | drive-persona skill; responseFormatter compresses output; "Want details?" pattern                                       |
| **ADR-0016** Drive Terminology and Hierarchy | Operators (not agents) for Drive workers; Agent Screen (S-AS) for panel; MCP tools use operator_* and agent_screen_* with deprecated aliases.             | operator_spawn, agent_screen_activity in use; deprecated aliases log warning                                           |


## Validation by ADR

### ADR-0001 through ADR-0004 (existing cursor-drive ADRs)

- **0001**: Extension activation test; MCP health check; ShareScreen integration test; status bar update test.
- **0002**: Grep/lint: UI code only in `src/`; AI content only in `.cursor/`.
- **0003**: `mcpServer.test.ts` (test-coverage plan); manual `:7891/health` check.
- **0004**: `agentRegistry.test.ts`; tangent wiring in mvp-gaps.

### ADR-0005 (Privacy)

- Strict-mode: assert no transcript/audio persistence at startup.
- Debug-mode: assert retention boundaries and deletion when TTL expires.
- Logging: assert `redacted_dict()` used for config; no raw transcripts in logs.

### ADR-0006 (Plan Placement)

- File placement: `*.plan.md` only in `.cursor/plans/`.
- `docs/plans/` contains traceability-matrix, adr-validation-map, README — no executable plans.
- Plan automation (plan-graph.yaml, plan-runner, registry) references `.cursor/plans/` only.

### ADR-0007 through ADR-0016

- **0007**: VSIX build; plugin installer command installs into `.cursor/`.
- **0008**: Pipeline entry via beforeSubmitPrompt when Drive active.
- **0009**: Hook intercepts prompts; pipeline stages run in order.
- **0010**: modelSelector.ts tier selection; no auto-escalation to Tier 3.
- **0011**: subMode values map to Cursor modes; status bar displays correctly.
- **0012**: fillerCleaner, glossaryExpander, sanitizer, promptOptimizer; TTS via tts_speak.
- **0013**: driveMode.ts persists state; statusBar reflects active + subMode.
- **0014**: operatorRegistry; operator_spawn, operator_switch, operator_merge.
- **0015**: drive-persona skill; responseFormatter; concise-first behavior.
- **0016**: operator_* and agent_screen_* tool names; deprecated share_screen_* aliases.

## References

- ADRs: [docs/architecture/adr/](../architecture/adr/README.md)
- Traceability: [traceability-matrix.md](traceability-matrix.md)
