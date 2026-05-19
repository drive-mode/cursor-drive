---
name: Naming Convention Refactor
overview: Rename all plan files in .cursor/plans/ to the convention `hh-project_{name}.plan.md` (projects) and `hh-plan_{name}.plan.md` (plans), then update all references across the codebase.
todos: []
isProject: false
---

# Naming Convention Refactor Plan

## Target Convention


| Type    | Pattern                              | Example                                |
| ------- | ------------------------------------ | -------------------------------------- |
| Project | `{projectid}-project_{name}.plan.md` | `hh-project_root.plan.md`              |
| Plan    | `{projectid}-plan_{name}.plan.md`    | `hh-plan_discord-interactions.plan.md` |


Project ID: `hh`

## Rename Mapping


| Current File                                     | Target File                                     |
| ------------------------------------------------ | ----------------------------------------------- |
| `hh.project.plan.md`                             | `hh-project_root.plan.md`                       |
| `hh_discovery_build_plan_e13337d3.plan.md`       | `hh-plan_discovery.plan.md`                     |
| `hh_next_work_backlog_75819dbc.plan.md`          | `hh-plan_next-work-backlog.plan.md`             |
| `hh_atlassian_integration_plan_81c686e6.plan.md` | `hh-plan_atlassian-integration.plan.md`         |
| `parallel-track-implementation.plan.md`          | `hh-plan_parallel-track-implementation.plan.md` |
| `discord-interactions.plan.md`                   | `hh-plan_discord-interactions.plan.md`          |
| `discord-voice-gateway.plan.md`                  | `hh-plan_discord-voice-gateway.plan.md`         |
| `discord-operations.plan.md`                     | `hh-plan_discord-operations.plan.md`            |
| `multi-user-orchestration.plan.md`               | `hh-plan_multi-user-orchestration.plan.md`      |
| `hh-plan_consolidation-review.plan.md`           | *(no change)*                                   |


## Implementation Steps

### Step 1: Rename plan files

Rename each file in [.cursor/plans/](.cursor/plans/) per the mapping above. Use git mv to preserve history.

### Step 2: Update plan-graph.yaml

Update all `file` and `evidence` paths in [.cursor/plans/plan-graph.yaml](.cursor/plans/plan-graph.yaml) (10 plan entries, ~20 path references).

### Step 3: Update cross-references in plan files

- [hh.project.plan.md](.cursor/plans/hh.project.plan.md) (becomes hh-project_root.plan.md): "Workstream Plans" section lists 3 child plan paths — update to new names.
- [hh_discovery_build_plan_e13337d3.plan.md](.cursor/plans/hh_discovery_build_plan_e13337d3.plan.md) (becomes hh-plan_discovery.plan.md): "Child Plan Files" section lists 6 paths — update to new names.
- [parallel-track-implementation.plan.md](.cursor/plans/parallel-track-implementation.plan.md): "References" section — update discovery plan path.
- [hh_next_work_backlog_75819dbc.plan.md](.cursor/plans/hh_next_work_backlog_75819dbc.plan.md): Plan links in body — update to new paths.

### Step 4: Update docs and governance files


| File                                                                                                         | Change                                     |
| ------------------------------------------------------------------------------------------------------------ | ------------------------------------------ |
| [docs/architecture/README.md](docs/architecture/README.md)                                                   | Update specific plan paths (lines 54-56)   |
| [docs/planning-system/project-plan-layer-migration.md](docs/planning-system/project-plan-layer-migration.md) | Update example paths (lines 27-45)         |
| [.cursor/plans/plan-governance-quickstart.md](.cursor/plans/plan-governance-quickstart.md)                   | Update hh.project.plan.md reference        |
| [docs/plans/discord-build-from-docs-decision.md](docs/plans/discord-build-from-docs-decision.md)             | Update glob to `hh-plan_discord-*.plan.md` |


### Step 5: Update consolidation review plan inventory

[.cursor/plans/hh-plan_consolidation-review.plan.md](.cursor/plans/hh-plan_consolidation-review.plan.md): Update "Current Plans Inventory" table to reflect new filenames (post-migration state).

### Step 6: Verify

- Run `ls .cursor/plans/*.plan.md` — confirm 10 files with new names.
- Grep for old filenames (e.g. `hh_discovery_build_plan`, `hh.project.plan`) — no stale references.
- Confirm plan-graph.yaml `file` paths resolve to existing files.

## Files Touched (Summary)

- 9 plan files renamed
- 1 plan file (consolidation-review) content updated
- plan-graph.yaml
- 4 docs/governance files

## Risk

- Hooks or automation that hardcode plan paths may break. [.cursor/hooks/plan-runner.py](.cursor/hooks/plan-runner.py) and plan-graph.yaml are the primary consumers; plan-graph.yaml will be updated. Verify hooks read paths from the graph rather than hardcoding.
