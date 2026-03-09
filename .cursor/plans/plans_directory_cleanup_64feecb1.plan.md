---
name: Plans Directory Cleanup
planId: plans-directory-cleanup
planType: task
parentPlanId: cursor-drive
overview: Archive completed, superseded, and one-time plans to .cursor/plans/archive/, update plan-graph.yaml and cursor-drive.plan.md to reflect current state, then run plan-sync.
todos:
  - id: pdc-01-identify
    content: "Identify plans in .cursor/plans/ that are completed (all todos done), superseded, or one-time meta; run plan-audit.py --dry-run to get current state."
    status: completed
  - id: pdc-02-move
    content: "Move identified plans to .cursor/plans/archive/ (or archive/consolidated/ if merged; archive/irrelevant/ if from other projects)."
    status: pending
  - id: pdc-03-graph
    content: "Update plan-graph.yaml: set archived plans file to .cursor/plans/archive/<name>; add _archived: true; set cursor-drive child_plan_ids to empty or current active."
    status: pending
  - id: pdc-04-cursor-drive
    content: "Update cursor-drive.plan.md (if exists) childPlanIds to reflect current active plans only."
    status: pending
  - id: pdc-05-sync
    content: "Run python .cursor/hooks/plan-runner.py sync-registry; verify registry.yaml and plan-master.diagram.md."
    status: pending
isProject: false
---

# Plans Directory Cleanup

## Current State

**Active plans dir** (`.cursor/plans/`) has 18 plans that should be archived:

| Category | Plans | Reason |
|----------|-------|--------|
| Completed (Phase 1-4) | architecture-vision-foundation, cursor-docs-cleanup, browser-dev-workflow, terminology-sas-overhaul, hook-prompt-pipeline, native-mode-alignment, senior-engineer-ux, agent-orchestration-frameworks, pipeline-wiring-mvp, quality-performance | All TODOs completed via execute-plans |
| Completed (orchestration) | subagent-plan-execution | All 8 TODOs completed |
| Superseded | mvp-gaps, test-coverage, code-optimization, fix_extension_activation_a1a62737 | Replaced by pipeline-wiring-mvp / quality-performance |
| One-time meta | new_plans_integration_535bf867, cursor_drive_planning_overhaul_032e7619, terminology_and_s-as_overhaul_8de6f12f | Integration/overhaul tasks; all TODOs done |

**Stays:** [cursor-drive.plan.md](.cursor/plans/cursor-drive.plan.md) (root project plan — never archived)

**Already in archive:** docs-overhaul, hh-migration-followup, drive-mode-installable-ui, mvp_consolidation_overhaul_03ed2135, plan-graph-diagram-automation_05cdb5a9, bugbot-rules-and-git-strategy

---

## Steps

### 1. Move plan files to archive

Move these 18 files to `.cursor/plans/archive/`:

```
architecture-vision-foundation.plan.md
cursor-docs-cleanup.plan.md
browser-dev-workflow.plan.md
terminology-sas-overhaul.plan.md
hook-prompt-pipeline.plan.md
native-mode-alignment.plan.md
senior-engineer-ux.plan.md
agent-orchestration-frameworks.plan.md
pipeline-wiring-mvp.plan.md
quality-performance.plan.md
subagent-plan-execution.plan.md
mvp-gaps.plan.md
test-coverage.plan.md
code-optimization.plan.md
fix_extension_activation_a1a62737.plan.md
new_plans_integration_535bf867.plan.md
cursor_drive_planning_overhaul_032e7619.plan.md
terminology_and_s-as_overhaul_8de6f12f.plan.md
```

### 2. Update cursor-drive.plan.md

- Set `childPlanIds: []` (all children archived; no active child plans)
- Update workstream TODOs: mark workstream-arch through workstream-terminology-sas as `completed`; mark workstream-quality and subagent-plan-execution ref as `completed`

### 3. Update plan-graph.yaml

- **cursor-drive**: Set `child_plan_ids: []`
- **All 18 plans**: Update `file` to `.cursor/plans/archive/<filename>`; add `_archived: true`; set `state: completed` for completed plans, `state: cancelled` for superseded
- **Plans not yet in graph** (new_plans_integration, cursor_drive_planning_overhaul, terminology_and_s-as_overhaul): Add minimal entries with `file: .cursor/plans/archive/<name>.plan.md`, `_archived: true`, `state: completed`

### 4. Run sync

```bash
python .cursor/hooks/plan-runner.py sync-registry
```

### 5. Update plan-master.diagram.md

The diagram is manually maintained (plan-runner has no `generate-diagram`). Update to reflect:
- cursor-drive has no active child plans
- All Phase 1-4 nodes shown as completed (green) or removed from active subgraphs
- Archived/Superseded table updated with the 18 new entries

---

## Result

- **Active plans dir**: Only `cursor-drive.plan.md`
- **Archive**: 24 plans total (6 existing + 18 moved)
- **plan-graph.yaml**: All archived plans have correct `file` paths; cursor-drive has empty `child_plan_ids`
- **registry.yaml**: Updated by sync-registry
