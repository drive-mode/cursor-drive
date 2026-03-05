# ADR-0006: Plan File Placement and Governance

## Status
Accepted

## Metadata
- Date: 2026-02-23
- Owner: Cursor Drive maintainers
- Related docs:
  - `.cursor/plans/plan-graph.yaml`
  - `.cursor/plans/plan-orchestration-spec.md`
  - `.cursor/rules/plan-placement-and-lifecycle.mdc`

## Context
Planning artifacts were split between `docs/plans/` and `.cursor/plans/`, causing ambiguity about which files drive execution state.

## Decision
- All executable plans (`*.plan.md`) live in `.cursor/plans/`.
- Non-executable planning references stay in `docs/plans/` as plain `.md`.
- Plan lifecycle automation targets `.cursor/plans/` exclusively.

## Consequences
- Positive:
  - Single source of truth for executable plans.
  - Cleaner hook and subagent automation.
  - Easier onboarding and fewer placement errors.
- Negative:
  - Requires link updates when migrating existing plan files.

## Alternatives Considered
- Keep mixed plan placement (`docs/plans/` + `.cursor/plans/`).
  - Rejected due to automation ambiguity.
