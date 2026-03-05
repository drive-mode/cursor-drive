---
name: Pipeline Wiring & MVP Features
overview: "Wire all 9 orphaned src/ modules into the beforeSubmitPrompt pipeline. Implement remaining MVP features: promptOptimizer, wake/submit word activation logic, tangent wiring, installPluginToWorkspace registration. Supersedes mvp-gaps.plan.md."
planType: task
planId: pipeline-wiring-mvp
parentPlanId: cursor-drive
childPlanIds: []
dependsOn: [hook-prompt-pipeline, native-mode-alignment]
todos:
  - id: pwm-01-wire-filler-sanitizer
    content: "Wire fillerCleaner, glossaryExpander, and sanitizer into the pipeline (from hook-prompt-pipeline plan). Verify correct stage order: cleanFillerWords → expandGlossary → sanitizePrompt. Confirm each is called with Drive-active check in place. Acceptance: unit test confirms all three are called in order on an active Drive pipeline; each skipped when Drive is off; npm run compile passes."
    status: completed
  - id: pwm-02-wire-approval-gates
    content: "Wire approvalGates.checkPrompt() as a pre-routing gate in the pipeline. When the gate returns 'block', the pipeline stops and returns the gate reason to the user (via vscode.window.showWarningMessage or MCP tool response). When 'warn', show a confirmation QuickPick. Acceptance: blocked prompt stops pipeline; warn prompt shows confirmation; approved prompt continues; test cases for all three paths pass."
    status: completed
  - id: pwm-03-wire-router-modelselector
    content: "Wire router.route() → modelSelector.tierForMode() → model selection into the pipeline output. RouteDecision from router feeds into modelSelector to pick the appropriate tier. Acceptance: pipeline output includes RouteDecision and selected model tier; router and modelSelector are called in sequence; npm run compile passes."
    status: completed
  - id: pwm-04-wire-session-memory
    content: "Wire sessionMemory.buildContextString() into the pipeline as a context augmentation step before routing. Inject the context string as a prefix or system prompt addendum. Update SessionMemory to record each turn after the response. Acceptance: buildContextString output is included in the prompt context; session turns are recorded; memory respects token budget (existing behavior); npm run compile passes."
    status: completed
  - id: pwm-05-prompt-optimizer
    content: "Implement src/promptOptimizer.ts. Read promptOptimizer.enabled and promptOptimizer.autoApprove from config. Skip if disabled or if prompt is short+clean. Call routing-tier model with OPTIMIZER_SYSTEM_PROMPT (preserve ALL intent, rewrite for clarity). If autoApprove=false: show vscode.window.showQuickPick with 'Use optimized' / 'Use original' / 'Edit'. Return the approved prompt. Wire into pipeline between sanitize and approval-gate stages. Acceptance: file exists; optimizer skipped when disabled; QuickPick shown when autoApprove=false; optimizer result used when approved; npm run compile passes."
    status: completed
  - id: pwm-06-wake-submit-words
    content: "Implement wake word and submit word activation logic (beyond just stripping). Wake word ('hey drive'): if raw input starts with wake word AND Drive is inactive, activate Drive (call driveMgr.setActive(true)) then strip the word. Submit word ('send it'): if raw input ends with submit word, strip it and set a skipOptimizer flag to bypass the promptOptimizer. Config keys wakeWord and submitWord already exist. Acceptance: wake word activates Drive when inactive; submit word sets skip flag; both are stripped from final prompt; tests for activation and skip-flag paths pass."
    status: completed
  - id: pwm-07-tangent-wiring
    content: "Detect tangent keyword at the start of the pipeline (before filler clean). When 'tangent [task]' is detected: call agentRegistry.spawn(undefined, taskDescription), update status bar via onAgentChange, acknowledge in output. Keyword is configurable via agents.tangentKeyword. Acceptance: tangent keyword triggers spawn; task description passed to spawn; status bar updates; acknowledge message shown; test for tangent detection and spawn call passes."
    status: completed
  - id: pwm-08-registration-fixes
    content: "Fix two known wiring gaps in src/extension.ts: (1) Register cursorDrive.installPluginToWorkspace command (declared in package.json line 73-76 but never registered in activate()); (2) Fix createDriveStatusBar call to pass agentRegistry as second argument (currently only driveMgr is passed, so status bar never shows agent name or background count). Acceptance: installPluginToWorkspace command is registered and functional; status bar shows active agent name when agentRegistry has an active agent; npm run compile passes."
    status: completed
isProject: false
---

# Pipeline Wiring & MVP Features

## Purpose

9 TypeScript pipeline modules exist in `src/` but are completely orphaned — not wired into any flow in `extension.ts`. This plan wires them all into the `beforeSubmitPrompt` pipeline established by `hook-prompt-pipeline`, using the native mode alignment from `native-mode-alignment`.

## Orphaned modules to wire

| Module | Pipeline stage | Status |
|---|---|---|
| `fillerCleaner.ts` | Stage 2: filler removal | Implemented, not wired |
| `glossaryExpander.ts` | Stage 3: phrase expansion | Implemented, not wired |
| `sanitizer.ts` | Stage 4: injection protection | Implemented, not wired |
| `approvalGates.ts` | Stage 5: safety gate | Implemented, not wired |
| `router.ts` | Stage 7: intent routing | Implemented, not wired |
| `modelSelector.ts` | Stage 8: model tier selection | Implemented, not wired |
| `sessionMemory.ts` | Stage 6: context injection | Implemented, not wired |
| `toolAllowlist.ts` | Per-agent capability check | Implemented, not wired |
| `pluginInstaller.ts` | Workspace installer | Implemented, command not registered |

## MVP features to implement

| Feature | PRD | Current state |
|---|---|---|
| `promptOptimizer.ts` | PRD 1 (Voice I/O) | Missing — not implemented |
| Wake/submit word activation | PRD 1 (Voice I/O) | Stripping exists; activation logic missing |
| Tangent keyword wiring | PRD 3 (Multi-Agent) | Registry exists; pipeline not connected |
| Mode switching confirmation | PRD 4 (Safety) | Config exists; enforcement missing |

Note: mode switching confirmation is covered in pwm-02 (approval gate wires in the pattern) and the `drive_set_mode` MCP tool update is in native-mode-alignment.

## Dependency notes

- Depends on `hook-prompt-pipeline` for the `runPipeline()` orchestration function
- Depends on `native-mode-alignment` for the correct RouteMode values that router.ts must output
- `toolAllowlist.ts` wiring: checked per-agent on spawn and on each MCP tool call

## Execution strategy

**Executor role:** Implementer.

**Subagent fan-out:**
- Batch A (parallel): pwm-01 + pwm-02 + pwm-03 (independent pipeline stages)
- Batch B (parallel): pwm-04 + pwm-06 + pwm-07 (independent features)
- Batch C: pwm-05 (promptOptimizer — new module, more complex)
- Batch D: pwm-08 (registration fixes — surgical extension.ts changes)

**Phase gate before quality-performance:** All 8 TODOs complete, `npm run compile` and `npm test` pass, end-to-end pipeline runs when Drive is active.

**Delegation trigger:** Spawn a subagent for pwm-05 (promptOptimizer is a new module with LM call, QuickPick UI, and config logic).

**Verification:** Integration test confirming that a prompt with filler words, trigger phrases, and a tangent keyword flows through the full pipeline correctly.

---

## Reconciliation

### Completed (Phase 3)

**pwm-01:** Stage order corrected to `cleanFillerWords → expandGlossary → sanitizePrompt`. All three run when Drive is active; each skipped when Drive is off.

**pwm-02:** Block path shows `vscode.window.showWarningMessage` with gate reason. Warn path uses `checkPrompt()` QuickPick. Approved path continues.

**pwm-03:** Router and modelSelector already wired. Pipeline output includes `RouteDecision` and `model` tier.

**pwm-04:** `sessionMemory.buildContextString()` injected before routing. Turn recording (`addTurn`) is the caller’s responsibility (MCP tool, hook, or response handler).

**pwm-05:** `src/promptOptimizer.ts` implemented. Uses `selectCheapModel`, `OPTIMIZER_SYSTEM_PROMPT`, QuickPick when `autoApprove=false`. Wired between sanitize and approval-gate.

**pwm-06:** Wake word: if inactive and input starts with `wakeWord`, calls `setActive(true)` and strips. Submit word: strips and sets `skipOptimizer` to bypass optimizer. Both configurable via `cursorDrive.wakeWord` and `cursorDrive.submitWord`.

**pwm-07:** Tangent detection before filler. Uses `operatorRegistry.spawn(undefined, task)`. Status bar updates via `operatorRegistry.onDidChange`. Agent Screen logs spawn. Returns `tangentAck` in pipeline result. Keyword: `cursorDrive.agents.tangentKeyword`.

**pwm-08:** `cursorDrive.installPluginToWorkspace` registered; calls `installDrivePluginToWorkspace`. Status bar already receives `operatorRegistry` (unchanged).

### Config

Added to `package.json`: `wakeWord`, `submitWord`, `promptOptimizer.enabled`, `promptOptimizer.autoApprove`, `agents.tangentKeyword`.

### Tests

- `tests/pipeline.test.ts`: wake word activation, submit word stripping, tangent spawn + `tangentAck`.
- All 127 tests pass; `npm run compile` succeeds.
