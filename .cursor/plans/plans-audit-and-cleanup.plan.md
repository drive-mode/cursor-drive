---
planId: plans-audit-and-cleanup
planType: task
parentPlanId: plan-governance
childPlanIds: []
dependsOn: []
name: Plans audit and cleanup
overview: Hook to skip completed plans on copy; audit .cursor/plans/ (classify, archive, dedupe); directory cleanup and sync.
todos:
  - id: pac-01
    content: Add _is_completed() to plan-save-to-workspace; skip copy when source or dest is completed
    status: pending
  - id: pac-02
    content: Add plan-audit script (completed + duplicate detection); optional --apply to move/delete
    status: pending
  - id: pac-03
    content: Run audit with --dry-run, review, then --apply; run sync-registry after moves/deletes
    status: pending
  - id: pac-04
    content: "Identify plans in .cursor/plans/ that are completed (all todos done), superseded, or one-time meta; run plan-audit.py --dry-run to get current state."
    status: completed
  - id: pac-05
    content: "Move identified plans to .cursor/plans/archive/ (or archive/consolidated/ if merged; archive/irrelevant/ if from other projects)."
    status: pending
  - id: pac-06
    content: "Update plan-graph.yaml: set archived plans file to .cursor/plans/archive/<name>; add _archived: true; set cursor-drive child_plan_ids to empty or current active."
    status: pending
  - id: pac-07
    content: "Update cursor-drive.plan.md (if exists) childPlanIds to reflect current active plans only."
    status: pending
  - id: pac-08
    content: "Run python .cursor/hooks/plan-runner.py sync-registry; verify registry.yaml and plan-master.diagram.md."
    status: pending
---

# Plans audit and cleanup

## Part 1: Skip completed in plan-save-to-workspace

When copying from CURSOR_PLANS_SOURCE into the workspace, do not copy a plan if it is already completed (all todos completed/cancelled). Add `_is_completed(frontmatter)`; skip when source is completed or destination exists and is completed. See todos pac-01..pac-03.

## Part 2: Audit script and directory cleanup

Audit `.cursor/plans/`: classify as completed | active | superseded | duplicate; archive completed/superseded, delete duplicates (keep canonical), move to `.cursor/plans/archive/`. Update plan-graph.yaml and cursor-drive.plan.md; run sync-registry. See todos pac-04..pac-08.
