---
name: MVP Gaps
overview: "SUPERSEDED by pipeline-wiring-mvp.plan.md (realigned for hook-based pipeline architecture). All remaining work tracked in pipeline-wiring-mvp."
planType: task
planId: mvp-gaps
parentPlanId: cursor-drive
childPlanIds: []
dependsOn: []
todos:
  - id: prompt-optimizer
    content: "SUPERSEDED — see pipeline-wiring-mvp TODO pwm-05."
    status: cancelled
  - id: wake-submit-words
    content: "SUPERSEDED — see pipeline-wiring-mvp TODO pwm-06."
    status: cancelled
  - id: tangent-wiring
    content: "SUPERSEDED — see pipeline-wiring-mvp TODO pwm-07."
    status: cancelled
  - id: mode-confirm
    content: "SUPERSEDED — see pipeline-wiring-mvp TODO pwm-02 (approval gates)."
    status: cancelled
isProject: false
---

# MVP Gaps Plan

P0 features referenced in PRDs that have config/interfaces defined but no runtime implementation yet.

## Context

All 18 `src/` modules are implemented. These gaps are missing *wiring* or missing *modules* that PRDs require before the extension is considered MVP-complete.

## Gap details

### promptOptimizer.ts (`prompt-optimizer`)

Referenced in `docs/design/architecture/cursor-drive-walkthrough.md` and `docs/prd/prd-voice-io.md`. The walkthrough shows the pipeline with a `promptOptimizer.ts` step between filler cleaner and router. This file does not exist.

Required behavior:
1. Read `promptOptimizer.enabled` and `promptOptimizer.autoApprove` from config
2. Skip if disabled or if prompt is short + clean (`wasModified=false` and `!looksLikeDictation()`)
3. Call routing-tier model with `OPTIMIZER_SYSTEM_PROMPT` (preserve ALL intent, rewrite for clarity)
4. If `autoApprove=false`: show `vscode.window.showQuickPick` with "Use optimized" / "Use original" / "Edit"
5. Return the approved prompt

### Wake/submit word detection (`wake-submit-words`)

Config keys `cursorDrive.wakeWord` (default: `"hey drive"`) and `cursorDrive.submitWord` (default: `"send it"`) exist in `config.ts` and `package.json` but are not used anywhere.

Required behavior:
- Wake word: if raw input starts with wake word, strip it and activate Drive
- Submit word: if raw input ends with submit word, strip it and immediately submit without optimization prompt

### Tangent keyword wiring (`tangent-wiring`)

`config.ts` defines `agents.tangentKeyword` (default: `"tangent"`). `agentRegistry.ts` has `spawn()`. Neither is connected to the input pipeline.

Required behavior:
- Detect `tangent [task description]` at start of cleaned input
- Call `agentRegistry.spawn(undefined, taskDescription)`
- Acknowledge in response: "Spawned Beta to handle [task]. Continuing with current work."
- Update status bar via `onAgentChange`

### Mode switching confirmation (`mode-confirm`)

`config.ts` defines `modeSwitching.requireConfirmation` (default: `true`) but `drive_set_mode` MCP tool and `cursorDrive.toggle` command both switch modes without checking this setting.

Required behavior:
- Before any mode switch: if `requireConfirmation=true`, show QuickPick "Switch to [mode]? Yes / No"
- Cancel the switch if user selects No
- Bypass for programmatic switches during tests (token cancellation check)
