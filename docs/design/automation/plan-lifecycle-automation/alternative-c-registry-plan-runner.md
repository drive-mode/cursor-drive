# Alternative C: Registry + Extended Plan-Runner (Hybrid)

## Summary
Registry as source of truth for plan IDs and status. Extend plan-runner to maintain it. Hooks for automation; skill for on-demand checks.

## Architecture

```
Registry: .cursor/plans/registry.yaml
  plans:
    - id: cd-001
      planId: cursor-drive
      file: .cursor/plans/cursor-drive.plan.md
      todo_count: 4
      status: in_progress
      last_checked: "2026-02-13T..."

plan-graph.yaml: references registry IDs where needed; file paths stay in graph.

Hooks (stop, subagentStop):
  → plan-runner.py --mode sync-registry
  → Scan all *.plan.md in .cursor/plans/ and archive/
  → Update registry (assign IDs to new plans, update todo_count)
  → If TODO-empty + not project: append to archive_candidates in registry

Skill /sync-plan-registry:
  → Same logic, run on demand
```

## Components

| Component | Role |
|-----------|------|
| `registry.yaml` | Authoritative list of plans with numeric IDs |
| `plan-runner.py` | New mode `sync-registry`; no validation logic change |
| Hooks | Fire sync-registry on stop/subagentStop |
| Skill | Manual sync when agent wants to check |
| plan-graph.yaml | Can reference `registry_id` or keep file paths; registry is additive |

## Plan ID Scheme
- **Numeric ID** (`cd-001`): Assigned by registry on first discovery. Stored in registry.
- **planId**: From frontmatter. Registry maps numeric ID → planId → file.
- **New plans**: When a new `*.plan.md` appears, registry assigns next ID.

## Pros
- Registry is single source of truth
- Hook automation + skill for manual override
- plan-graph stays focused on dependencies; registry on identity/status
- Clear separation: registry = "what exists", graph = "how they relate"

## Cons
- Two files to keep in sync (registry + plan-graph)
- Need migration to populate registry for existing plans
- Slight redundancy: plan-graph has `file`; registry has `file`

## Trade-offs
- **Registry vs plan-graph**: Option C1 = registry is primary, plan-graph references registry IDs. C2 = plan-graph stays primary, registry is a derived view. C2 is simpler (no plan-graph changes).
- **Archive automation**: Same as A — emit vs execute.
