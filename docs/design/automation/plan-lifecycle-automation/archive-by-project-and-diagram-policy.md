# Archive by Project and Diagram Policy

## Summary

- **Archive structure**: `.cursor/plans/archive/{project-name}/` — plans grouped by project for easier navigation.
- **Diagram policy**: `plan-master.diagram.md` shows only active plans in the main DAG. Archived plans are removed from the diagram; listed in a separate table grouped by project.

## Archive structure

### Current (flat)

```
.cursor/plans/archive/
  architecture-vision-foundation.plan.md
  cursor-docs-cleanup.plan.md
  ...
```

### Target (by project)

```
.cursor/plans/archive/
  cursor-drive/
    architecture-vision-foundation.plan.md
    cursor-docs-cleanup.plan.md
    terminology-sas-overhaul.plan.md
    ...
  meta/
    subagent-plan-execution.plan.md
    cursor_drive_planning_overhaul_032e7619.plan.md
    ...
  legacy/
    docs-overhaul.plan.md
    hh-migration-followup.plan.md
    ...
```

### Project assignment

| Source | Project folder |
|--------|----------------|
| `parentPlanId: cursor-drive` | `cursor-drive/` |
| Root plan (no parent) | Use plan ID or `meta/` |
| Superseded / one-off | `legacy/` |

## Diagram policy

- **Main DAG**: Only plans with `state: pending` or `state: in_progress` and file in `.cursor/plans/*.plan.md` (not archive).
- **Archived plans table**: Separate section, grouped by project. No Mermaid nodes for archived plans.
- **Regeneration**: After archiving, run sync-registry and manually update the diagram to remove archived nodes.

## Migration

To migrate flat archive to project structure:

1. Read each plan's `parentPlanId` (or infer from plan-graph).
2. Create `archive/{project}/` if needed.
3. Move `archive/foo.plan.md` → `archive/{project}/foo.plan.md`.
4. Update `plan-graph.yaml` file paths.
5. Run sync-registry.
6. Update plan-master.diagram.md to remove archived plans from main DAG.

## Frontmatter change check

See plan-governance rule: `python .cursor/hooks/plan-frontmatter-changed.py` — lightweight, token-free. Run when editing plans; if "changed", run sync and update diagram.
