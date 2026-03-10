# Plan Orchestration Spec

## Default governance

- **Single active plan**: Plan-runner enforces one active plan at a time.
- **Source of truth**: `.cursor/plans/*.plan.md` → `plan-graph.yaml`, `registry.yaml`.

## Supported execution patterns

### 1. Single-plan execution (default)

- One plan active; agent works through TODOs sequentially.
- Completion gate: Reconciliation + npm test + npm run compile.

### 2. Meta-plan + parallel subagent orchestration

- **Opt-in** via `/orchestrate` or `/execute-plans`.
- Meta-plan is the active plan; coordinates parallel work across target plans.
- Phases: Init → Discover → Synthesize → Execute → Verify.
- Batching: ≤4 subagents per batch.
- Recursion depth: ≤2.
- Does not change single-active-plan semantics; meta-plan remains active.

## Alignment with plan-governance

Orchestration (meta-plan + parallel subagents) is **opt-in** and does not change the single-active-plan model in `.cursor/rules/plan-governance.mdc`. The meta-plan remains the active plan; target plans are coordinated via subagents.

## References

- `.cursor/rules/plan-governance.mdc` — Placement, TODO lifecycle, completion gate
- `.cursor/skills/orchestrate-parallel-work/SKILL.md`
- `.cursor/plans/parallel_plan_orchestration_e66f95cb.plan.md`
