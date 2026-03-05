# docs/plans/ — Planning References

Non-executable planning artifacts. Executable plans (`*.plan.md`) live in [`.cursor/plans/`](../../.cursor/plans/).

**Note:** Mob Programming Cockpit MVP (implemented) was moved to `.cursor/plans/archive/cursor-drive/mob-programming-cockpit-mvp.plan.md`.

## Contents

| Document | Purpose |
|----------|---------|
| [traceability-matrix.md](traceability-matrix.md) | Maps PRD requirements to plan TODOs and acceptance scenarios. Tracks implementation status (Implemented/Partial/Pending). |
| [adr-validation-map.md](adr-validation-map.md) | Maps ADR-0001 through ADR-0006 to required tests/checks and closure criteria. Use for verifying architectural decisions. |

## When to use

- **"What are the requirements traceability?"** → [traceability-matrix.md](traceability-matrix.md)
- **"ADR validation?"** or **"How do we verify ADRs?"** → [adr-validation-map.md](adr-validation-map.md)

## Related

- Executable plans: `.cursor/plans/*.plan.md`
- Plan governance: [plan-placement-and-lifecycle.mdc](../../.cursor/rules/plan-placement-and-lifecycle.mdc)
- ADRs: [docs/architecture/adr/](../architecture/adr/README.md)
