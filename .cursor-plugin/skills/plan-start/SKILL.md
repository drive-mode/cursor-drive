---
name: plan-start
description: Start a plan after dependency validation
disable-model-invocation: true
---

# Plan Start

Start plan: `<plan-id>`

Steps:
1. Read `.cursor/plans/plan-graph.yaml`.
2. Validate all dependencies for `<plan-id>` are `completed`.
3. Set target plan state to `in_progress`.
4. Ensure no other plan remains `in_progress` in solo mode.
5. Confirm metadata alignment with plan file:
   - `plan_type` in graph matches frontmatter `planType`
   - `parent_plan_id` in graph matches frontmatter `parentPlanId`
6. Return:
   - active plan
   - blockers (if any)
   - immediate implementation checklist
