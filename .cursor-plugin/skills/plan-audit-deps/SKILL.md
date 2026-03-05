---
name: plan-audit-deps
description: Audit and update dependency edges in plan frontmatter using dep-auditor
disable-model-invocation: true
---

# Plan Audit Dependencies

Audit `dependsOn` edges across all `.plan.md` files.

## When to run

- A new plan was created that may depend on or block existing plans
- A plan's scope changed significantly
- You want to verify the dependency graph before starting a plan

## Steps

1. Identify changed plans: `git diff --name-only HEAD -- '.cursor/plans/*.plan.md'`
2. Run dep-auditor for triage: `python .cursor/hooks/dep-auditor.py` (or let it run via plan-runner hooks)
3. Apply the proposed `dependsOn` changes to the relevant `.plan.md` frontmatter
4. Run `/plan-sync` to propagate to `plan-graph.yaml` and regenerate the diagram

## Frontmatter format

```yaml
---
planId: test-coverage
dependsOn: [mvp-gaps]   # blocking dependency
---
```

Constraints: `dependsOn` is for ordering/blocking, not hierarchy. Hierarchy uses `parentPlanId` / `childPlanIds`. Circular dependencies are invalid.
