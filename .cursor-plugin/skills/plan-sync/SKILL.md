---
name: plan-sync
description: Sync plan-graph.yaml, registry.yaml, and plan-master.diagram.md from all .plan.md files
disable-model-invocation: true
---

# Plan Sync

Run a full plan governance sync. Use this after:
- Creating or editing a `.plan.md` file
- Moving or archiving a plan
- Changing `parentPlanId`, `childPlanIds`, or `dependsOn` in any plan frontmatter
- Noticing the master diagram is stale

## Steps

1. Run the sync script:

```bash
python3 .cursor/hooks/plan-runner.py sync-all
```

2. Check the output JSON for `"decision": "allow"`. If `"warn"`, read `details.gateErrors` — they indicate:
   - A plan just became TODO-empty but is missing a `## Reconciliation` section
   - Or a required check (`npm test`, `npm run compile`) failed

3. If gate errors are expected (e.g. old completed plans pre-dating the gates), add a `## Reconciliation` section to the relevant plan file with a completion summary.

4. Open `.cursor/plans/plan-master.diagram.md` in Markdown Preview to verify the diagram renders correctly.

## What gets updated

| File | What changes |
|---|---|
| `.cursor/plans/plan-graph.yaml` | Plan states, hierarchy, and `depends_on` synced from frontmatter |
| `.cursor/plans/registry.yaml` | Todo counts, `todo_empty` flags, stable numeric IDs |
| `.cursor/plans/plan-master.diagram.md` | Full Mermaid diagram regenerated |
| `.cursor/plans/.plan-sync-hash` | Content hash for fast no-op detection |

## Diagram-only regeneration

To only regenerate the diagram without touching the graph or registry:

```bash
python3 .cursor/hooks/plan-runner.py generate-diagram
```

## Theme switch

To switch the diagram from dark to light mode, edit `MERMAID_THEME` in `.cursor/hooks/plan-runner.py`:

```python
MERMAID_THEME = "default"  # was "dark"
```

Then run `generate-diagram` or `sync-all`.
