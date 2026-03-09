---
planId: terminology-sas-overhaul
planType: task
parentPlanId: cursor-drive
childPlanIds: []
dependsOn: []
name: Terminology and S-AS Overhaul
overview: Rename Drive's multi-agent workers from 'agent' to 'operator' (resolving collision with Cursor's native Agent mode). Rename ShareScreen to Agent Screen (S-AS) with interactive enhancements. Add granular operator and agentScreen config settings. Align all docs, plans, and MCP tools with backward-compatible aliases.
todos:
  - id: tso-01-adr-terminology
    content: "Write docs/architecture/adr/ADR-0016-drive-terminology-and-hierarchy.md. Define hierarchy: Drive (handler) -> Operators (spawned workers, Drive concept) -> Agents (Cursor native subagents spawned by operators). Document: why 'agent' is ambiguous (collision with Cursor's native Agent mode in SubMode); why 'operator' resolves it; migration path for MCP tool names (deprecation aliases); ShareScreen -> Agent Screen (S-AS) naming rationale. Acceptance: file exists, status=Accepted, hierarchy table present, semantic collision documented, MCP deprecation strategy defined."
    status: completed
  - id: tso-02-config-schema
    content: "Update package.json config schema. (1) Rename cursorDrive.agents.maxConcurrent -> cursorDrive.operators.maxConcurrent (default: 3, description: 'Max simultaneous Drive operators. Each operator is a senior autonomous worker that can spawn its own subagents.'). (2) Add cursorDrive.operators.maxSubAgentsPerOperator (number, default: 4, description: 'Max Cursor Task-tool subagents each operator can spawn concurrently.'). (3) Add cursorDrive.operators.defaultPermissionPreset (enum: standard/readonly/full, default: standard). (4) Add cursorDrive.operators.namePool (array, default: ['Alpha','Beta','Gamma','Delta','Epsilon','Zeta','Eta','Theta']). (5) Rename cursorDrive.shareScreen.enabled -> cursorDrive.agentScreen.enabled. (6) Rename cursorDrive.shareScreen.autoOpen -> cursorDrive.agentScreen.autoOpen. (7) Add cursorDrive.agentScreen.displayMode (enum: tab/panel/bottomLog, default: tab). (8) Add cursorDrive.agentScreen.clickBehavior (enum: openInEditor/openInNewWindow, default: openInEditor). (9) Add cursorDrive.agentScreen.showPlanProgress (boolean, default: true). Acceptance: all 9 keys present in package.json with correct types and descriptions; npm run compile passes."
    status: completed
  - id: tso-03-commands-update
    content: "Update package.json contributes.commands and keybindings. Rename: cursorDrive.agents -> cursorDrive.operators ('Manage Operators'), cursorDrive.spawnAgent -> cursorDrive.spawnOperator ('Spawn New Operator'), cursorDrive.showShareScreen -> cursorDrive.showAgentScreen ('Show Agent Screen'), cursorDrive.clearShareScreen -> cursorDrive.clearAgentScreen ('Clear Agent Screen'). Update keybinding for show command (Ctrl+Shift+S / Cmd+Shift+S -> showAgentScreen). Acceptance: command IDs updated; palette titles use 'Operator'/'Agent Screen'; keybindings work; npm run compile passes."
    status: completed
  - id: tso-04-src-registry-rename
    content: "Rename src/agentRegistry.ts to src/operatorRegistry.ts. Inside the file, rename: AgentStatus -> OperatorStatus, AgentContext -> OperatorContext, AgentRegistry -> OperatorRegistry (class), all internal variable names using 'agent' that refer to operators. Update all imports in: src/extension.ts, src/mcpServer.ts, src/statusBar.ts, src/toolAllowlist.ts, src/sessionMemory.ts. Critical exception: do NOT rename the SubMode 'agent' literal in src/driveMode.ts -- that refers to Cursor's native Agent mode. Acceptance: src/operatorRegistry.ts exists; src/agentRegistry.ts deleted or re-exports from new file; all imports updated; npm run compile passes; npm test passes."
    status: completed
  - id: tso-05-src-agentscreen-rename
    content: "Rename src/shareScreen.ts to src/agentScreen.ts. Inside the file, rename: ShareScreenPanel -> AgentScreenPanel, viewType constant from 'cursorDrive.shareScreen' to 'cursorDrive.agentScreen', panel title from 'Drive — Share Screen' to 'Drive — Agent Screen', switchAgent method updates title to '${name} — Agent Screen', empty state text from 'Waiting for agent activity...' to 'Waiting for operator activity...', agentName parameter references to operatorName in logActivity/logFile/logDecision/switchAgent/ActivityEvent. Update all imports in src/extension.ts and src/mcpServer.ts. Acceptance: src/agentScreen.ts exists; ShareScreenPanel references replaced; npm run compile passes; npm test passes."
    status: completed
  - id: tso-06-extension-ui-strings
    content: "Update src/extension.ts UI strings and command registrations. (1) Update all command handler registrations to use new IDs (operators, spawnOperator, showAgentScreen, clearAgentScreen). (2) Update QuickPick labels: 'Drive Agents' -> 'Drive Operators', 'No active agents' -> 'No active operators', 'Spawn first operator', 'Spawn new operator', 'Dismiss operator', 'Select an operator to switch to, or manage', 'Dismiss which operator?', 'What should this operator work on?', 'Name for this operator (leave blank for default)', 'Operator ${name} spawned.', 'Drive: max concurrent operators (${n}) reached.'. (3) Mode picker label: '$(rocket) Agent' stays as-is (refers to Cursor's native Agent mode). (4) Status bar 'No Agent' -> 'No Operator'. Acceptance: no 'agent'/'Agent' strings remain in UI-facing text except where referring to Cursor's Agent mode; npm run compile passes."
    status: completed
  - id: tso-07-mcp-tools-migration
    content: "Update src/mcpServer.ts MCP tool names with backward-compatible deprecated aliases. New tool names: operator_spawn, operator_switch, operator_list, operator_pause, operator_resume, operator_dismiss, operator_merge; agent_screen_activity, agent_screen_file, agent_screen_decision. Old tool names (agent_spawn, agent_switch, etc.; share_screen_activity, etc.) remain registered as aliases that call the new implementations and log a deprecation warning: 'Tool agent_spawn is deprecated; use operator_spawn instead.' Update tool descriptions to use 'operator' terminology. Update agent_name parameters in screen tools to operator_name. Acceptance: both old and new tool names work; deprecated aliases log warning; npm run compile passes; MCP tool list in mcpServer.ts updated."
    status: completed
  - id: tso-08-sas-enhanced-clicks
    content: "Enhance src/agentScreen.ts (S-AS) click interactivity. (1) Activity items: make file path mentions in activity text clickable -- detect href-like text matching file paths and wrap in clickable spans; on click, send openFile message to extension host. Respect agentScreen.clickBehavior config. (2) Ctrl+click highlight-and-ask: add Ctrl+click listener to activity items and decision items; on Ctrl+click, show a floating input overlay 'Ask about this...' positioned near the clicked element; on submit, post askAboutItem message with element text to extension host; extension routes it through Drive pipeline as a contextual question. (3) Update ActivityEvent interface if needed. Acceptance: file paths in activity feed are clickable; Ctrl+click shows input; input submission posts message; npm run compile passes."
    status: completed
  - id: tso-09-sas-plan-progress
    content: "Add plan progress overlay to src/agentScreen.ts. When cursorDrive.agentScreen.showPlanProgress is true: (1) Add a collapsible 'Plan Progress' section at top of the panel above the tabs. (2) Section shows: active plan name, X/Y TODO progress bar, currently in_progress TODO highlighted. (3) Data sourced by MCP tool call or extension host push -- add a new MCP tool agent_screen_plan_update(planId, planName, completedCount, totalCount, currentTodo) to push updates. (4) Clicking the in_progress TODO sends openPlanTodo message to extension host, which opens the .plan.md file. Acceptance: plan progress section renders when enabled; progress bar shows correct counts; TODO click opens plan file; npm run compile passes."
    status: completed
  - id: tso-10-sas-display-modes
    content: "Implement agentScreen.displayMode config in src/agentScreen.ts and src/extension.ts. 'tab' mode: current behavior (beside editor, retains existing behavior). 'panel' mode: create panel in vscode.window.createWebviewPanel with ViewColumn.Beside but in bottom area if Cursor supports it, otherwise fall back to 'tab'. 'bottomLog' mode: display minimal activity-only log as a collapsible Output Channel (vscode.window.createOutputChannel('Drive Agent Screen')) instead of a full webview. Wire the config read in AgentScreenPanel.createOrShow(). Acceptance: displayMode config is read on panel creation; 'tab' works as before; 'bottomLog' creates Output Channel for activity events; npm run compile passes."
    status: completed
  - id: tso-11-docs-terminology-update
    content: "Update documentation to use 'operator' for Drive's spawned workers. Files to update: docs/prd/prd-multi-agent.md (124 refs -- rename Drive-spawned 'agents' to 'operators'; keep 'agent' where referring to Cursor subagents), docs/reference/config-schema.md (rename agents.* to operators.*, shareScreen.* to agentScreen.*), docs/reference/mcp-tools.md (add operator_* tools, mark agent_* as deprecated), docs/reference/commands-and-shortcuts.md (rename commands), docs/architecture/adr/ADR-0004-multi-agent-registry.md (add note: superseded by ADR-0016 for terminology). Key nuance: keep 'agent' where it refers to Cursor's native Agent mode or generic AI agent concepts. Acceptance: prd-multi-agent, config-schema, mcp-tools, commands docs updated; no Drive-worker references remain as 'agent' in those files."
    status: completed
  - id: tso-12-cursor-skills-commands-update
    content: "Update .cursor/ skills and commands to use 'operator' terminology. Files: .cursor/skills/drive-persona/SKILL.md (replace 'agents' referring to spawned workers with 'operators'; keep 'agent' for Cursor Agent mode refs), .cursor/commands/tangent.md (spawning an 'operator' not an 'agent'), .cursor/commands/switch.md (switching between 'operators'), .cursor/commands/merge.md (merging 'operators'), .cursor/commands/cursor-drive-handoff.md (update all multi-agent/operator references). Also update docs/reference/mcp-tools.md if not done in tso-11. Acceptance: all .cursor/ skill/command files use 'operator' for Drive's spawned workers; no misleading 'agent' references remain in user-facing .cursor content."
    status: completed
isProject: false
---

# Terminology and S-AS Overhaul

## Purpose

Two problems addressed together:

1. **Semantic collision**: Drive's spawned workers are called "agents" but Cursor already uses "Agent" for its native Agent mode (`SubMode = "agent"`). This creates confusion in config keys, UI text, and code. The rename to "operator" creates an unambiguous hierarchy: Drive (handler) → Operators (spawned workers) → Agents (Cursor's built-in subagents that operators can spin up).
2. **ShareScreen misnomer**: "Share Screen" implies screensharing with another person. The actual feature shows what the operator/agent is doing in the user's own repo. Renaming to "Agent Screen" (S-AS) accurately describes a window into the agent's workspace.

## Hierarchy model

```
Drive (the AI handler/director)
  │
  ├── Operator Alpha (spawned by Drive or user via "tangent")
  │     ├── Can execute tasks with autonomy
  │     ├── Has its own memory, tool permissions, TTS voice
  │     └── Can spawn subagents via Cursor's Task tool
  │
  ├── Operator Beta (background)
  │     └── ...
  │
  └── Agent Screen (S-AS)
        └── Live view of what operators are doing in the workspace
```

The config key `cursorDrive.operators.maxConcurrent: 3` means "max 3 senior operator teammates at once." Each operator can spin up its own Cursor Task-tool subagents up to `maxSubAgentsPerOperator`.

## Semantic collision: "agent" stays in one place

`SubMode = "plan" | "agent" | "ask" | "debug"` in `src/driveMode.ts` is **not renamed**. The `"agent"` value here refers to Cursor's native Agent mode (what Cursor calls its autonomous code-execution mode). This must remain `"agent"` so Drive's mode switching maps to Cursor's actual mode names.

All other uses of "agent" for Drive's spawned workers are renamed to "operator."

## S-AS design overview

The Agent Screen (S-AS) becomes an interactive view:

- **Tab mode**: existing webview panel beside editor (enhanced with file-path click-through from activity feed)
- **Bottom log mode**: lightweight Output Channel feed for minimal footprint
- **Plan progress overlay**: shows active plan + current TODO, driven by MCP push
- **Ctrl+click to ask**: highlight any item and ask Drive a contextual question
- **Operator workspace framing**: panel title "Alpha's Workspace", not "Alpha -- Share Screen"

## Backward compatibility

MCP tool name aliases ensure existing skill files and plugin rules don't break:

- `agent_spawn`, `agent_switch`, etc. remain as deprecated aliases that call `operator_`* implementations and log a one-time warning
- `share_screen_`* remain as deprecated aliases calling `agent_screen_`*

## Execution strategy

**Executor role:** Implementer for all TODOs.

**Subagent fan-out:**

- Batch A: tso-01 (ADR) — document first; sets canonical terminology
- Batch B (parallel): tso-02 + tso-03 (package.json schema + commands) — independent
- Batch C (parallel): tso-04 + tso-05 (registry rename + screen rename) — independent file renames
- Batch D (parallel): tso-06 + tso-07 (extension.ts UI strings + MCP tools) — after B and C
- Batch E (parallel): tso-08 + tso-09 + tso-10 (S-AS enhancements) — after tso-05
- Batch F (parallel): tso-11 + tso-12 (docs + .cursor/) — can run from Batch A onwards

**Phase gate:** After Batch C, run `npm run compile` + `npm test` before proceeding to D and E.

**Delegation trigger:** Spawn a subagent if tso-04 and tso-05 file renames require coordinated import updates across 6+ files simultaneously.

**Verification:** After all TODOs, run `npm run compile` and `npm test`. Check that `SubMode "agent"` still works. Test `operator_spawn` and deprecated `agent_spawn` both work.

---

## Reconciliation

All 12 TODOs completed. Summary of changes:


| Area         | Changes                                                                                                                                                                                                                 |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ADR**      | ADR-0016 defines hierarchy: Drive → Operators → Agents (Cursor native). Documents semantic collision, MCP deprecation strategy, ShareScreen → Agent Screen rationale.                                                   |
| **Config**   | `cursorDrive.operators.`* (maxConcurrent, maxSubAgentsPerOperator, defaultPermissionPreset, namePool); `cursorDrive.agentScreen.`* (enabled, autoOpen, displayMode, clickBehavior, showPlanProgress).                   |
| **Commands** | `cursorDrive.operators`, `cursorDrive.spawnOperator`, `cursorDrive.showAgentScreen`, `cursorDrive.clearAgentScreen`. Keybinding Ctrl+Shift+S → showAgentScreen.                                                         |
| **Source**   | `agentRegistry.ts` → `operatorRegistry.ts`; `shareScreen.ts` → `agentScreen.ts`. AgentStatus/AgentContext/AgentRegistry → OperatorStatus/OperatorContext/OperatorRegistry. SubMode `"agent"` unchanged (Cursor native). |
| **MCP**      | New tools: `operator_`*, `agent_screen_`*, `agent_screen_plan_update`. Deprecated aliases: `agent_*`, `share_screen_*` (log warning, call new impl).                                                                    |
| **S-AS**     | File path clickability in activity feed; Ctrl+click ask overlay; plan progress section; displayMode tab/panel/bottomLog (bottomLog = Output Channel).                                                                   |
| **Docs**     | prd-multi-agent, config-schema, mcp-tools, commands-and-shortcuts updated. ADR-0004 note: superseded by ADR-0016 for terminology.                                                                                       |
| **.cursor/** | drive-persona SKILL, tangent/switch/merge commands, cursor-drive-handoff use operator terminology.                                                                                                                      |


**Verification:** `npm run compile` and `npm test` pass. SubMode `"agent"` in driveMode.ts unchanged.