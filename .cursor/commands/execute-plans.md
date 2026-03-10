# Execute Plans

## Purpose

Execute multiple plans with orchestration. Loads the `execute-plans` skill and drives the phase-based workflow.

## Instructions

1. **Load the skill**: Read `.cursor/skills/execute-plans/SKILL.md` in full.
2. **Discover**: Run `python .cursor/hooks/plan-runner.py scan-new`.
3. **Read graph**: Collect plans with `state: pending` or `state: in_progress` from `.cursor/plans/plan-graph.yaml`.
4. **Execute in waves**: Spawn ready plans in parallel; gate on completion; run sync between waves.
5. **Completion gate**: Reconciliation + `npm test` + `npm run compile`.

## References

- `.cursor/skills/execute-plans/SKILL.md` — Plan Agent and TODO subagent templates, spawn patterns
- `.cursor/plans/plan-orchestration-spec.md` — Meta-plan + single-active-plan governance
