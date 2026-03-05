---
name: Native Mode Alignment
overview: "Align router.ts RouteMode and driveMode.ts SubMode with Cursor's actual native modes (Agent/Plan/Ask/Debug). Replace the parallel plan/run/direct/collab routing model. Wire mode switching."
planType: task
planId: native-mode-alignment
parentPlanId: cursor-drive
childPlanIds: []
dependsOn: [architecture-vision-foundation]
todos:
  - id: nma-01-route-mode-refactor
    content: "Refactor src/router.ts: replace RouteMode union type ('plan' | 'run' | 'direct' | 'collab') with Cursor-native-aligned type ('plan' | 'agent' | 'ask' | 'debug'). Update route() function to map keyword patterns to the new mode set. Update routeToSubMode() or equivalent mapping function. Acceptance: no references to 'run' or 'collab' or 'direct' RouteMode values remain; router tests updated and passing; npm run compile succeeds."
    status: completed
  - id: nma-02-submode-mapping
    content: "Update src/driveMode.ts SubMode type: rename/align to ('plan' | 'agent' | 'ask' | 'debug' | 'off'). Remove or remap 'direct' — decision per ADR-0011 (map to 'ask' or remove). Update createDriveModeManager() and all state transitions to use new mode names. Acceptance: SubMode contains exactly (off | plan | agent | ask | debug); no 'direct' or 'collab' values remain; driveMode tests pass."
    status: completed
  - id: nma-03-quickpick-debug
    content: "Add 'debug' to the cursorDrive.setSubMode QuickPick in src/extension.ts. The current QuickPick (line 76-82 of extension.ts) lists Off/Plan/Agent/Ask/Direct — update to Off/Plan/Agent/Ask/Debug. Update the command description in package.json if needed. Acceptance: Debug appears in setSubMode QuickPick; selecting Debug sets subMode to 'debug'; npm run compile succeeds."
    status: completed
  - id: nma-04-mcp-tool-update
    content: "Update the drive_set_mode MCP tool handler in src/mcpServer.ts to accept the new mode enum (plan | agent | ask | debug | off). Remove 'direct' and 'collab' from the accepted values. Update tool description/schema. Acceptance: drive_set_mode rejects unknown modes; accepts all 5 valid modes; existing MCP tool tests updated and passing."
    status: completed
  - id: nma-05-statusbar-mode-reflect
    content: "Update src/statusBar.ts to display the Drive sub-mode using the new Cursor-native-aligned names. Ensure the status bar label correctly shows 'Drive > Plan', 'Drive > Agent', 'Drive > Ask', 'Drive > Debug' and the active agent name. Fix the statusBar call in extension.ts to pass agentRegistry as the second argument (currently missing). Acceptance: status bar shows correct mode name for all 5 states; agentRegistry is passed to createDriveStatusBar; npm run compile succeeds."
    status: completed
  - id: nma-06-router-tests
    content: "Update tests/router.test.ts for the new mode enum. Remove test cases using 'run', 'direct', 'collab' mode expectations. Add test cases for 'agent' and 'debug' mode routing. Acceptance: all router tests pass with new mode names; coverage maintained for keyword routing patterns; npm test passes."
    status: completed
isProject: false
---

# Native Mode Alignment

## Purpose

Drive's sub-modes must map 1:1 to Cursor's native modes. The current router uses a parallel mode model (`plan/run/direct/collab`) that has no correspondence to what Cursor actually exposes. This creates confusion and breaks the mode-wrapper architecture.

## Current vs target mode mapping

| Current (router.ts RouteMode) | Current (driveMode.ts SubMode) | Target (both) | Cursor Native Mode |
|---|---|---|---|
| `plan` | `plan` | `plan` | Plan mode |
| `run` | `agent` | `agent` | Agent mode |
| `direct` | `direct` | ~~removed~~ → `ask` | Ask mode |
| `collab` | _(not present)_ | ~~removed~~ | _(no equivalent)_ |
| _(not present)_ | `off` | `off` | _(Drive inactive)_ |
| _(not present)_ | _(not present)_ | `debug` | Debug mode |

**'direct' mode disposition:** Per ADR-0011, 'direct' maps to Ask mode (`ask`). The intent of 'direct' (skip AI, direct to Cursor) aligns with Ask mode behavior.

**'collab' mode disposition:** Per ADR-0011, 'collab' is removed. It had no Cursor native equivalent and its intended behavior (collaborative discussion) is covered by Ask mode.

## Dependency note

This plan depends on `architecture-vision-foundation` because ADR-0011 (Native Mode Compatibility) must be accepted before the mapping decisions above are finalized. The mapping table is provisional and should be verified against ADR-0011 before implementing nma-01 and nma-02.

## Files impacted

| File | Change |
|---|---|
| `src/router.ts` | RouteMode type + route() logic |
| `src/driveMode.ts` | SubMode type + state machine |
| `src/extension.ts` | setSubMode QuickPick; statusBar call fix |
| `src/mcpServer.ts` | drive_set_mode tool schema + handler |
| `src/statusBar.ts` | Display labels for new mode names |
| `tests/router.test.ts` | Updated mode expectations |
| `package.json` | setSubMode enum values (if declared) |

## Execution strategy

**Executor role:** Implementer.

**Subagent fan-out:**
- Batch A: nma-01 + nma-02 (parallel — both are type/logic changes, no inter-dependency)
- Batch B: nma-03 + nma-04 + nma-05 (parallel — all depend on nma-01/02 being done)
- Batch C: nma-06 (after nma-01 settles the new mode names)

**Phase gate before pipeline-wiring-mvp:** RouteMode and SubMode must use the same mode names. router.ts and driveMode.ts must both compile and pass tests.

**Delegation trigger:** Spawn a subagent for nma-01 + nma-02 together since they need to stay in sync.

**Verification:** `npm run compile` and `npm test` must pass. Check `package.json` contributes.configuration for SubMode enum.

## Reconciliation

**Completed:** 2025-02-24. All 6 TODOs implemented.

| Task | Outcome |
|------|---------|
| nma-01 | RouteMode refactored to plan/agent/ask/debug. Slash: /plan→plan, /run→agent, /drive→agent. Keywords: plan→plan, debug→debug, agent→agent, default→ask. Legacy direct driveSubMode maps to ask. |
| nma-02 | SubMode refactored to plan/agent/ask/debug/off. Removed direct. isSubMode and defaultSubMode exclude off when activating. |
| nma-03 | QuickPick: Direct replaced with Debug. modeMap updated. |
| nma-04 | drive_set_mode: enum off/plan/agent/ask/debug. off sets active=false. |
| nma-05 | statusBar: modeLabel uses Title Case (Plan, Agent, Ask, Debug). operatorRegistry already passed from extension. |
| nma-06 | Router tests: run/collab/direct expectations → agent/ask. Added debug keyword tests. |

**Additional changes:**
- `src/modelSelector.ts`: `tierForMode` updated for plan|agent|ask|debug (all non-plan → execution).
- `src/pipeline.ts`: Drive-inactive pass-through `direct` → `ask`.
- `package.json`: defaultSubMode enum removed `direct`.
