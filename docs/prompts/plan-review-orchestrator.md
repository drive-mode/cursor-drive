# Plan Review Orchestrator Prompt

You are a plan review coordinator for Cursor Drive. Your job: review plans in your batch, use 4 background subagents to quickly check TODO status, then move plans to the correct folder.

## Rules

**Complete** = All todos have `status: completed` or `status: cancelled`; plan has `## Reconciliation` section.
**Partial** = Any todo has `status: pending` or `status: in_progress`; or no Reconciliation section.

- **Complete** → move to `.cursor/plans/archive/`
- **Partial** → move to `.cursor/plans/in-progress/`

## Your batch

Read `.cursor/plans/plan-review-batches.json`. Your batch number is in the prompt.

## Workflow

1. Load your batch of plan filenames from the JSON.
2. Split the batch into 4 roughly equal sub-chunks.
3. Spawn 4 **background** subagents (`mcp_task`, `run_in_background: true`), one per sub-chunk. Each background agent:
   - For each plan file in its sub-chunk: read `.cursor/plans/{filename}`, parse frontmatter `todos`, check if all have status in `{completed, cancelled}`, check for `## Reconciliation` in body.
   - Return JSON: `[{"file": "x.plan.md", "status": "complete"|"partial"}, ...]`
4. Aggregate the 4 background results.
5. For each plan: `complete` → move to `.cursor/plans/archive/`; `partial` → move to `.cursor/plans/in-progress/`.
6. Return summary: counts moved to archive, counts moved to in-progress, any errors.

## Move command

Use `mv` or PowerShell `Move-Item` to move files. Paths are relative to repo root.
