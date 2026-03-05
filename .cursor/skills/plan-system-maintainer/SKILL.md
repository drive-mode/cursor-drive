---
name: plan-system-maintainer
description: Maintain the Cursor Drive plan governance system. See plan-governance.mdc for placement, TODO lifecycle, and completion gate.
---

# Skill: Plan System Maintainer

Maintain the Cursor Drive plan governance system. See `.cursor/rules/plan-governance.mdc` for placement, TODO lifecycle, and completion gate.

## System reference

- Source of truth: `.cursor/plans/*.plan.md` → `plan-graph.yaml`, `registry.yaml`, `plan-master.diagram.md`
- Sync engine: `.cursor/hooks/plan-runner.py`
- Frontmatter: `planId`, `planType`, `parentPlanId`, `childPlanIds`, `dependsOn`, `todos`

## Workflow: create plan

1. Create `.cursor/plans/<name>.plan.md` with frontmatter (planId, parentPlanId, childPlanIds, dependsOn, todos)
2. Update parent's `childPlanIds`
3. Run `/plan-sync`

## Workflow: complete plan

1. Mark all todos `completed` or `cancelled`
2. Add `## Reconciliation` section
3. Run `/plan-sync` (triggers gate: npm test, npm run compile)
4. Archive: move to `.cursor/plans/archive/`, run `/plan-sync`

## Workflow: audit dependencies

Run `/plan-audit-deps` when plans change. Use `dep-auditor.py` for triage. Apply `dependsOn` to frontmatter, then `/plan-sync`.

## Diagram quality

- Theme: `MERMAID_THEME` in plan-runner.py (`dark` | `default`)
- State styling: stroke only (stCompleted, stInProgress, stPending, stCancelled, stBlocked)
- Labels: 20-char wrap, format `planId<br/>title<br/>state · X/Y done`

## Sync events

| Event | Behavior |
|---|---|
| beforeSubmitPrompt | Hash check → full sync if changed |
| sessionStart | Full sync + validation |
| stop / subagentStop | Full sync + completion gate (transition-only) |
| sync-all | Explicit full sync |

## Tiered routing (ADR-0010)

- Tier 0: Python (no model)
- Tier 1: dep-auditor.py for dep triage
- Tier 2: User model for plan content
- Tier 3: Opus only for complex dep analysis via `/plan-audit-deps`

Context minimisation: never load plan-master.diagram.md, registry.yaml, plan-graph.yaml into prompts.

## Troubleshooting

- Plan missing? Check planId, run `/plan-sync`
- Stale graph? Remove `_missing_file: true` entries manually, run `/plan-sync`
- Gate errors? Add `## Reconciliation` section
- Diagram not rendering? Install "Markdown Preview Mermaid Support"
- PyYAML: `pip install pyyaml`
