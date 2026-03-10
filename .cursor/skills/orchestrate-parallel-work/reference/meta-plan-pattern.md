# Meta-Plan Pattern

A meta-plan coordinates parallel work across multiple target plans without changing single-active-plan governance.

## Structure

- **Meta-plan**: One active plan (e.g. `orchestration-and-hooks`) that orchestrates.
- **Target plans**: Plans listed in `targetPlanIds` or `targetPlanFiles`.
- **Invariants**: Short list of constraints pasted into every subagent prompt.

## Governance

- Plan-runner still enforces single active plan.
- Meta-plan is the active plan; orchestration is opt-in.
- Subagents run in parallel but within plan governance.

## File ownership

- Assign non-overlapping file sets to execution subagents.
- Avoid edit conflicts by staging integration/verification.

## Example

```yaml
metaPlanId: orchestration-and-hooks
targetPlanIds: [oh-01, oh-02, oh-03]
invariants:
  - "Follow tiered model routing (ADR-0010)"
  - "No time frames in implementation plans"
```
