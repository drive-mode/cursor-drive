---
name: orchestrate-parallel-work
description: Opt-in orchestration workflow for coordinating parallel subagents across multiple target plans. Phased execution, batching, recursion guardrails, prompt/return contracts.
---

# Skill: Orchestrate Parallel Work

Use when coordinating work across multiple plans or delegating parallel subagents. Opt-in via `/orchestrate` or `/execute-plans`. Does not change single-active-plan governance.

## Phases

| Phase | Purpose | Parallel? |
|-------|---------|-----------|
| 0 Init | TodoWrite tree, invariants, batch gates | — |
| 1 Discover | Focused discovery subagents; return findings | Yes (≤4/batch) |
| 2 Synthesize | Delegate synthesis; reconcile conflicts | Delegated |
| 3 Execute | Fan out by file ownership; handoff summaries | Yes (≤4/batch) |
| 4 Verify | Verifier subagent; explicit checks | Mandatory |

## Guardrails

- **Batching**: ≤4 subagents per batch.
- **Recursion depth**: ≤2; parent synthesizes, never delegates synthesis deeper.
- **File ownership**: Each execution subagent owns non-overlapping files.
- **Completion gate**: Always run verifier after execution batch.

## Contracts

- **Prompt template**: See `reference/prompt-template.md`
- **Return contract**: See `reference/return-contract.md`
- **Meta-plan pattern**: See `reference/meta-plan-pattern.md`

## Workflow

1. Load this skill when user invokes `/orchestrate` or `/execute-plans`.
2. Create TodoWrite tree with phases and batch gates.
3. Run Phase 1→4 with batching.
4. Finish with execution report: delegated, changed, verification status, blockers.

## Reference

- `.cursor/plans/parallel_plan_orchestration_e66f95cb.plan.md` — design source
- `.cursor/hooks/plan-runner.py` — plan governance (unchanged)
