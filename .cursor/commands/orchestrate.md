# Orchestrate Parallel Work

## Purpose

Start an opt-in orchestration run that coordinates parallel subagents across multiple target plans. Uses the `orchestrate-parallel-work` skill.

## Instructions

1. **Load the skill**: Read `.cursor/skills/orchestrate-parallel-work/SKILL.md` and reference templates.
2. **Gather inputs**:
   - Meta-plan ID (or create one)
   - List of target plan IDs/files to coordinate
   - Invariants/constraints for this run
3. **Create TodoWrite tree** with orchestration phases and batch gates.
4. **Run Phase 1→4** with batching (≤4 subagents per batch):
   - Phase 1: Discover (parallel)
   - Phase 2: Synthesize (delegated)
   - Phase 3: Execute (parallel by file ownership)
   - Phase 4: Verify (mandatory)
5. **Finish** with a concise execution report: what was delegated, what changed, verification status, open blockers.

## Invariants

- Batching: ≤4 subagents per batch
- Recursion depth: ≤2
- File ownership: non-overlapping per execution subagent
