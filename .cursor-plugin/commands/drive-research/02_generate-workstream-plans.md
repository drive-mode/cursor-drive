# Generate Workstream Plans

## Input
Read these files:
- Plan catalog from `01_generate-plan-catalog.md` output (or the existing plan catalog if already generated)
- `docs/research/drive-tech/_synthesis/01_overlap-and-dedupe.md`
- `docs/research/drive-tech/_synthesis/02_recommended-architecture-changes.md`
- Relevant `docs/research/drive-tech/<topic>/02_implementation.md` files
- Relevant `docs/architecture/adr/ADR-0017-*.md` through `ADR-0021-*.md`
- All existing `.cursor/plans/*.plan.md` files

## Output
Create or update `.cursor/plans/*.plan.md` for each workstream plan.

## Plan format
Each plan file uses YAML frontmatter:
```yaml
---
planId: drive_<workstream>_<hash>
title: <Workstream Name>
status: proposed
parentPlanId: cursor-drive
dependsOn: [<plan_ids>]
---
```

## TODO format
Each TODO must have:
- Clear description (what, not how)
- Acceptance criteria (measurable)
- No timelines
- Dependencies (if any)
- References to implementation options from research docs

## Requirements
- Preserve completed TODOs from existing plans
- Ban timelines in TODOs
- Explicit dependencies between TODOs and between plans
- Reference unified workstreams from `_synthesis/01_overlap-and-dedupe.md`
- Each TODO must reference the relevant research topic or ADR

## Return format
For each plan: frontmatter + TODOs in markdown checkbox format
