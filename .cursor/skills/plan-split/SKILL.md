---
name: plan-split
description: Split a plan into child plans with dependency updates
disable-model-invocation: true
---

# Plan Split

Split source plan: `<plan-id>`

Steps:
1. Identify bounded subdomains in source plan tasks.
2. Create child `.plan.md` files in `.cursor/plans/`.
3. Move tasks from source to children with:
   - objective
   - start
   - end
   - checks
4. Add child frontmatter metadata:
   - `planType: task`
   - `planId`
   - `parentPlanId: <plan-id>`
5. Update `.cursor/plans/plan-graph.yaml` dependencies and hierarchy fields.
6. Return:
   - created child plan files
   - updated dependency edges
   - migration notes
