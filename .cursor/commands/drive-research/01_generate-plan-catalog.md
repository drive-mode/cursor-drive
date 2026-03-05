# Generate Plan Catalog from Drive Tech Research

## Input
Read these files before generating:
- `docs/research/drive-tech/_synthesis/00_executive-summary.md`
- `docs/research/drive-tech/_synthesis/01_overlap-and-dedupe.md`
- `docs/research/drive-tech/_synthesis/04_dependency-dag.md`
- `docs/architecture/adr/ADR-0017-*.md` through `ADR-0021-*.md`
- All existing `.cursor/plans/*.plan.md` files
- `.cursor/plans/plan-graph.yaml` (if exists)
- `.cursor/plans/task-graph.yaml` (if exists)

## Output
Generate a plan catalog that maps unified workstreams to plan files:

| Workstream | Plan ID | Plan File | Parent Plan | Dependencies |
|---|---|---|---|---|

## Requirements
- Each workstream from `_synthesis/01_overlap-and-dedupe.md` maps to exactly one plan
- Check existing plans for overlap — do NOT create duplicate TODOs
- Respect the dependency DAG from `_synthesis/04_dependency-dag.md`
- Plan IDs must be unique and follow naming convention: `drive_<workstream>_<hash>.plan.md`
- Parent plan for all workstreams: `cursor-drive.plan.md`

## Dedupe check
Before generating, read all existing plan TODOs and compare against proposed work. If a TODO already exists in an existing plan, reference it (do not duplicate). Document deduped items in a "Dedupe Report" section.

## Return format
1. Markdown table of proposed plans
2. Dedupe report
3. Dependency DAG (text-based)
