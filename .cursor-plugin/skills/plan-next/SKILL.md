---
name: plan-next
description: Select next executable plan from dependency graph
disable-model-invocation: true
---

# Plan Next

Steps:
1. Read `.cursor/plans/plan-graph.yaml`.
2. Filter plans where:
   - state is `pending`
   - dependencies are all `completed`
   - if candidate is `task`, its parent plan is not blocked
3. Rank by:
   - priority
   - dependency depth
   - parent-plan readiness
4. Return:
   - recommended next plan ID
   - rationale
   - top 3 candidates
