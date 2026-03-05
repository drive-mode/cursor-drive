---
name: plan-complete
description: Complete a plan by running criteria and required checks
disable-model-invocation: true
---

# Plan Complete

Complete plan: `<plan-id>`

Steps:
1. Read target `.plan.md` and `plan-graph.yaml`.
2. Confirm semantic completion condition: no remaining TODO items.
3. Verify completion criteria are satisfied.
4. Verify required checks passed.
5. Validate evidence paths exist.
6. If valid:
   - mark plan `completed`
   - unblock dependent plans
7. If TODOs are empty but checks fail:
   - keep completion note as `completed_with_gaps`
   - list exact follow-up tasks to restore green state
8. Return:
   - completion status
   - evidence summary
   - newly unblocked plan IDs
