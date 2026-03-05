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

## References

- ADRs: [docs/architecture/adr/](../architecture/adr/README.md)
- Traceability: [traceability-matrix.md](traceability-matrix.md)

