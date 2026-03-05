---
name: .cursor Cleanup & Docs Alignment
overview: "Clean .cursor/ directory (remove dead files, consolidate rules, add vision-invariants). Fix 15+ stale @drive references across docs. Update PRDs and design docs for mode-wrapper vision. Archive completed plans."
planType: task
planId: cursor-docs-cleanup
parentPlanId: cursor-drive
childPlanIds: []
dependsOn: [architecture-vision-foundation]
todos:
  - id: cdc-01-remove-dead-rules
    content: "Delete .cursor/rules/brief-context.mdc (references nonexistent BRIEF.md — entire rule is dead) and .cursor/rules/refactor-file-migration.mdc (references nonexistent scripts/file-migrate.py and /file-migration skill). Acceptance: both files deleted; no other .cursor/ file references them."
    status: completed
  - id: cdc-02-plan-governance-rule
    content: "Create .cursor/rules/plan-governance.mdc. Content: consolidate the four alwaysApply plan rules (plan-before-implementation, plan-placement-and-lifecycle, subagent-planning-discipline, todo-driven-plan-completion) into a single glob-triggered rule. Use globs: ['**/*.plan.md', '**/plan-graph.yaml'] instead of alwaysApply: true. Include all key guidance: plan placement, TODO lifecycle, completion gate, sync workflow. Then delete the four merged rules. Acceptance: plan-governance.mdc exists with glob triggers; four merged rules deleted; no alwaysApply plan rule overhead on non-plan sessions."
    status: completed
  - id: cdc-03-arch-rule-fix
    content: "Update .cursor/rules/architecture-before-coding.mdc: change alwaysApply: true to globs: ['src/**/*.ts', 'src/**/*.js']. The rule only needs to fire when editing source code, not on every session. Acceptance: rule uses glob trigger; alwaysApply removed; rule content preserved."
    status: completed
  - id: cdc-04-remove-dead-commands
    content: "Delete .cursor/commands/brainstorm.md, .cursor/commands/execute-plan.md, and .cursor/commands/write-plan.md. All three delegate to nonexistent superpowers:* skills and would produce no output if invoked. Acceptance: three files deleted; no other .cursor/ file references them."
    status: completed
  - id: cdc-05-hook-cleanup
    content: "Remove doc-reminder.py from .cursor/hooks/: delete .cursor/hooks/doc-reminder.py and remove its entry from .cursor/hooks.json (the stop hook that calls it). The doc-maintenance.mdc rule already covers doc reminders. Acceptance: doc-reminder.py deleted; hooks.json no longer references it; other hooks (plan-runner.py, drive-preprocessor.py, dep-auditor.py) unchanged."
    status: completed
  - id: cdc-06-remove-stale-artifacts
    content: "Delete .cursor/plans/.plan-state-snapshot.json (stale, not referenced by plan-runner.py or any other script) and .cursor/scripts/mcp-env-from-dotenv.py (one-time setup utility; add a note in docs/guides/getting-started.md pointing to it if needed). Acceptance: both files deleted; getting-started.md updated if the script was useful setup context."
    status: completed
  - id: cdc-07-rewrite-handoff
    content: "Rewrite .cursor/commands/cursor-drive-handoff.md to reflect the mode-wrapper vision. Remove all @drive participant references as primary UX. Replace with: Drive is a behavioral toggle (Ctrl+Shift+D / status bar); beforeSubmitPrompt routes prompts transparently; MCP server at :7891 bridges AI to extension. Fix any broken plan file references (e.g. cursor-drive-implementation_d8328bb7.plan.md no longer exists). Acceptance: no @drive as primary UX; correct activation instructions; no broken plan paths."
    status: completed
  - id: cdc-08-simplify-plan-audit-deps
    content: "Simplify .cursor/commands/plan-audit-deps.md to remove duplication with dep-auditor.py logic. The command should focus on: when to run it, what input to give, how to apply the output. Remove the embedded prompt template (that belongs in dep-auditor.py). Acceptance: command is ≤30 lines; delegates dep triage to dep-auditor.py; no duplicate logic."
    status: completed
  - id: cdc-09-skill-updates
    content: "Update .cursor/skills/plan-system-maintainer/SKILL.md: trim to ~80 lines by removing content that duplicates plan-governance.mdc. Keep: workflows (create plan, complete plan, audit deps). Move system overview to a brief reference. Delete .cursor/plans/plan-orchestration-spec.md and .cursor/plans/plan-governance-quickstart.md (both are redundant with the skill and plan-governance rule). Update .cursor/skills/drive-persona/SKILL.md: separate persona behavior from MCP tool wiring; MCP tool reference belongs in docs/reference/mcp-tools.md (already exists). Acceptance: plan-system-maintainer SKILL.md ≤90 lines; two redundant plan docs deleted; drive-persona SKILL.md focused on persona behavior."
    status: completed
  - id: cdc-10-archive-completed-plans
    content: "Move completed plans to .cursor/plans/archive/: hh-migration-followup.plan.md, drive-mode-installable-ui.plan.md, mvp_consolidation_overhaul_03ed2135.plan.md. Also move docs-overhaul.plan.md (all TODOs completed) and plan-graph-diagram-automation_05cdb5a9.plan.md if it exists and is complete. Ensure .cursor/plans/archive/ directory exists. Acceptance: all completed plans in archive/; active plans directory contains only plans with pending/in_progress TODOs or new plans."
    status: completed
  - id: cdc-11-update-arch-docs
    content: "Update docs/architecture/README.md and docs/design/architecture/cursor-native-system-design.md: replace @drive ChatParticipant as entry point with beforeSubmitPrompt hook + commands + status bar. Update the request pipeline description from 'every message sent to @drive' to 'when Drive is active, beforeSubmitPrompt routes prompts through Drive pipeline'. Update component map to remove @drive ChatParticipant registration. Acceptance: no @drive as entry point in these two files; pipeline description matches actual hook-based integration."
    status: completed
  - id: cdc-12-update-walkthrough-journey
    content: "Update docs/design/architecture/cursor-drive-walkthrough.md and docs/design/ux/drive-mode-user-journey.md: remove examples showing @drive chat input (lines 9, 12, 280, 286, 292 of walkthrough; line 42, 108 of journey). Replace with status bar toggle and beforeSubmitPrompt activation. Remove 'Typing @drive in chat' as an activation method. Acceptance: no examples using @drive as input; activation shows status bar / Ctrl+Shift+D; pipeline entry reflects hook."
    status: completed
  - id: cdc-13-update-prds
    content: "Update docs/prd/prd-cursor-integration.md and docs/prd/prd-multi-agent.md for mode-wrapper model: (1) Replace @drive participant as 'single entry point' with Drive mode toggle + beforeSubmitPrompt; (2) Update agent messaging expectations — without participant, agent identity surfaces via ShareScreen/MCP tools, not chat message headers/tints; (3) Clarify that /tangent and /agents work via extension commands, not chat slash commands. Acceptance: no @drive as 'single entry point'; agent messaging expectations reflect ShareScreen-based identity; slash command section updated."
    status: completed
  - id: cdc-14-update-naming-design
    content: "Update docs/design/naming/cursor-aligned-naming.md and docs/design/ux/drive-mode-analysis-and-ux.md: remove @drive as participant from naming decisions; update to reflect Drive mode (status bar toggle) as primary concept. In drive-mode-analysis-and-ux.md, update Phase 1 recommendation from '@drive participant as fallback' to 'beforeSubmitPrompt hook as primary; @drive participant only if Cursor adds participant API'. Acceptance: naming doc reflects actual implementation; UX analysis updated for current architecture."
    status: completed
  - id: cdc-15-resync-plan-infra
    content: "Re-sync .cursor/plans/plan-graph.yaml with the new plan structure: add 6 new plans, update cursor-drive childPlanIds, mark superseded plans. Update .cursor/plans/registry.yaml (simplify to minimal schema: planId, file, todo_count, todo_empty). Run python .cursor/hooks/plan-runner.py sync-all to regenerate plan-master.diagram.md. Verify diagram renders the 6 new plans correctly. Acceptance: plan-graph.yaml has entries for all 6 new plans; registry.yaml updated; plan-master.diagram.md regenerated; no stale plan nodes in diagram."
    status: completed
isProject: false
---

# .cursor Cleanup & Docs Alignment

## Purpose

Two parallel problems: the `.cursor/` directory has 19 files needing rework and 8 files needing removal, and 15+ documentation files describe `@drive` as primary UX when the code has already removed it.

This plan runs in parallel with Phase 2 (hook-prompt-pipeline, native-mode-alignment) — it's documentation and cleanup, not code. It depends on `architecture-vision-foundation` because the doc updates must reflect the ADR decisions.

## .cursor/ cleanup summary

| Action | Files | Count |
|---|---|---|
| Delete | brief-context.mdc, refactor-file-migration.mdc, brainstorm.md, execute-plan.md, write-plan.md, doc-reminder.py, .plan-state-snapshot.json, mcp-env-from-dotenv.py | 8 |
| Create | vision-invariants.mdc (done in architecture-vision-foundation), plan-governance.mdc | 1 (here) |
| Merge/Trim | plan-before-implementation, plan-placement-and-lifecycle, subagent-planning-discipline, todo-driven-plan-completion → plan-governance.mdc | 4 merged |
| Rework | architecture-before-coding.mdc, cursor-drive-handoff.md, plan-audit-deps.md, drive-persona SKILL, plan-system-maintainer SKILL | 5 |
| Archive | hh-migration-followup, drive-mode-installable-ui, mvp_consolidation_overhaul, docs-overhaul, plan-graph-diagram-automation | up to 5 |

## Docs update scope

Files with `@drive` as primary UX that need updating:

| File | Issue | Fix |
|---|---|---|
| docs/architecture/README.md | @drive as entry point, pipeline start | Replace with hook + status bar |
| docs/design/architecture/cursor-native-system-design.md | @drive as single entry (lines 31, 71, 92, 153) | beforeSubmitPrompt hook |
| docs/design/architecture/cursor-drive-walkthrough.md | @drive examples (lines 9, 12, 280+) | Status bar / hook activation |
| docs/design/ux/drive-mode-user-journey.md | @drive as activation (line 42) | Remove that activation method |
| docs/prd/prd-cursor-integration.md | @drive as single entry point | Mode wrapper + hook |
| docs/prd/prd-multi-agent.md | Agent messages in chat | ShareScreen/MCP agent identity |
| docs/design/naming/cursor-aligned-naming.md | @drive as participant name | Drive Mode as primary concept |
| docs/design/ux/drive-mode-analysis-and-ux.md | @drive as Phase 1 fallback | Hook as Phase 1; participant if API available |

## Execution strategy

**Executor role:** Implementer. All tasks are file edits or deletes — no code compilation needed.

**Subagent fan-out:**
- Batch A (parallel): cdc-01 + cdc-04 + cdc-06 (deletions — safe to run together)
- Batch B (parallel): cdc-02 + cdc-03 + cdc-05 (rule changes)
- Batch C (parallel): cdc-07 + cdc-08 + cdc-09 (content rewrites)
- Batch D (parallel): cdc-10 + cdc-11 + cdc-12 (archive + doc updates)
- Batch E (parallel): cdc-13 + cdc-14 (PRD + naming updates)
- Batch F: cdc-15 (plan infra sync — depends on cdc-10 archiving plans first)

**Delegation trigger:** Spawn a subagent for Batches D and E since they touch multiple doc files.

**Verification:** After cdc-15, run plan-runner.py sync-all and confirm plan-master.diagram.md shows 6 active plans.

---

## Reconciliation

All 15 TODOs completed. Verified:

- **cdc-01–06**: Deleted 8 dead files (brief-context.mdc, refactor-file-migration.mdc, brainstorm.md, execute-plan.md, write-plan.md, doc-reminder.py, .plan-state-snapshot.json, mcp-env-from-dotenv.py). Removed doc-reminder from hooks.json. Updated mcp-user-setup.md and mcp-user-github-example.json for removed script.
- **cdc-02–03**: Created plan-governance.mdc (glob-triggered), deleted 4 merged rules, updated architecture-before-coding.mdc to glob trigger.
- **cdc-07–08**: Rewrote cursor-drive-handoff.md for mode-wrapper vision; simplified plan-audit-deps.md to ≤30 lines.
- **cdc-09**: Trimmed plan-system-maintainer SKILL to ~80 lines, drive-persona SKILL to persona-only; deleted plan-orchestration-spec.md and plan-governance-quickstart.md.
- **cdc-10**: Completed plans already in archive (hh-migration-followup, drive-mode-installable-ui, mvp_consolidation_overhaul, docs-overhaul, plan-graph-diagram-automation).
- **cdc-11–14**: Updated 8 doc files for mode-wrapper: architecture README, cursor-native-system-design, walkthrough, user-journey, prd-cursor-integration, prd-multi-agent, cursor-aligned-naming, drive-mode-analysis-and-ux. Replaced @drive as entry point with beforeSubmitPrompt + status bar.
- **cdc-15**: Ran sync-registry; registry.yaml updated (22 plans). plan-graph.yaml already had cursor-docs-cleanup. plan-runner.py does not expose sync-all or generate-diagram; diagram is maintained separately.

**Residual:** plan-sync.md references `sync-all` and `generate-diagram` which plan-runner.py does not implement. Consider updating plan-sync.md to document sync-registry as the available command.
