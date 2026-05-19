---
name: Parallel Plan Orchestration
overview: Add an opt-in orchestration workflow (command + skill) that lets a single active meta-plan coordinate parallel subagents across multiple target plans, using standardized prompt/return contracts and TodoWrite-driven task trees, without changing the existing plan-graph single-active-plan governance model.
todos:
  - id: design-skill-workflow
    content: "Draft the new `orchestrate-parallel-work` skill: phases, batching, recursion guardrails, and concrete prompt/return templates (derived from `docs/plans/pipeline-parallel-review-plan.md`)."
    status: pending
  - id: add-orchestrate-command
    content: Add `.cursor/commands/orchestrate.md` that loads the new skill and drives the opt-in workflow; update `.cursor/commands/README.md` to advertise it.
    status: pending
  - id: align-agents-and-docs
    content: Optionally update `.cursor/agents/coordinator.md` and `.cursor/plans/plan-orchestration-spec.md` to explicitly support the meta-plan + parallel subagent orchestration pattern without changing single-active-plan governance.
    status: pending
  - id: verification-smoke
    content: "Run a smoke verification: ensure new command/skill are discoverable and run `python .cursor/hooks/plan-runner.py sessionStart` to confirm no governance regressions."
    status: pending
isProject: false
---

# Parallel plan orchestration (meta-plan + opt-in)

## Decisions (locked)

- **Multi-plan model**: keep the current single active plan governance; use a **meta-plan** to coordinate parallel work across multiple target plans.
- **Enforcement**: **opt-in**, via a new Cursor command + skill (avoid new always-on hooks/rules).

## Why this fits the current system

- The existing plan governance hook runner is **fail-soft** and **non-mutating**, so we can add orchestration on top without changing plan lifecycle semantics.

```7:12:c:\Users\harri\Documents\Coding Projects\business\roller_ai\roller.cursor\hooks\plan-runner.py
The runner is intentionally fail-soft:
- validates project/subplan hierarchy and metadata contracts
- evaluates TODO semantic completion for project child checks
- emits machine-readable JSON
- does not mutate files or plan states
```

- You already have a concrete parallel-subagent template in `docs/plans/pipeline-parallel-review-plan.md`; we’ll generalize its best ideas into a reusable skill (file ownership, batch-gating, integration phase, explicit contracts).

## Target outcomes

- **A reusable orchestration skill** that standardizes:
  - phased execution (Init → Discover → Synthesize → Execute → Verify)
  - batching (≤4 subagents per batch)
  - prompt contract + return contract
  - recursive delegation guardrails (depth ≤2; parent synthesizes)
  - “meta-plan” pattern for multi-plan work
- **A user-invokable command** that starts an orchestration run and forces the workflow to be followed.
- **Minimal repo churn**: no plan-graph lifecycle changes; no new alwaysApply rules.

## Deliverables (files)

- **Add**: `.cursor/skills/orchestrate-parallel-work/SKILL.md`
- **Add**: `.cursor/skills/orchestrate-parallel-work/reference/prompt-template.md`
- **Add**: `.cursor/skills/orchestrate-parallel-work/reference/return-contract.md`
- **Add**: `.cursor/skills/orchestrate-parallel-work/reference/meta-plan-pattern.md`
- **Add**: `.cursor/commands/orchestrate.md`
- **Update**: `.cursor/commands/README.md` (list the new command)
- **Optional update (recommended)**: `.cursor/agents/coordinator.md` (make it “orchestration-capable”: prompt/return contracts, batching discipline, recursion guardrails)
- **Optional update (recommended)**: `.cursor/plans/plan-orchestration-spec.md` (document meta-plan parallelism as a supported execution pattern; keep “single active plan” as default governance)

## Orchestration workflow to encode (in the new skill)

### Phase 0: Initialize

- Create a TodoWrite task tree with:
  - orchestration phases
  - one todo per planned subagent (discovery/synthesis/execution/verification)
  - explicit batch gates (what must be true before next batch)
- Capture **invariants** for this run (constraints/vision) as a short list the orchestrator must paste into every subagent prompt.

### Phase 1: Discover (parallel)

- Create focused discovery subagent prompts that each:
  - read only specified inputs
  - return findings in a strict format
  - explicitly label: **implemented** vs **documented only** vs **missing**

### Phase 2: Synthesize (delegated)

- Delegate synthesis to one or more subagents (competing proposals allowed).
- If synthesis conflicts, run a reconciliation subagent.
- Orchestrator arbitrates **only after** reviewing delegated outputs.

### Phase 3: Execute (parallel where safe)

- Use the meta-plan to fan out work to subagents **by file ownership** to avoid overlapping edits (generalize the pattern in `docs/plans/pipeline-parallel-review-plan.md`).
- Require each execution subagent to:
  - start with TodoWrite (if multi-step)
  - return a handoff summary: done/deviations/risks/next_actions

### Phase 4: Verify (mandatory)

- Always run a verifier subagent after an execution batch.
- Verification checks must be explicit and observable (tests/lints/file existence/plan consistency).

## Command behavior to encode (`/orchestrate`)

- Ask for:
  - meta-plan ID (or create one)
  - list of target plan IDs/files to coordinate
  - invariants/constraints for this run
- Then instruct the agent to:
  - load `orchestrate-parallel-work`
  - create the TodoWrite tree
  - run Phase 1→4 with batching
  - finish with a concise execution report (what was delegated, what changed, verification status, open blockers)

## Acceptance checks (how we’ll know it’s correct)

- `/orchestrate` is listed in `.cursor/commands/README.md` and is invokable.
- The orchestration skill contains:
  - a concrete prompt template and return contract
  - a meta-plan pattern for multi-plan work under single-active-plan governance
  - explicit phase gates and batching discipline
- The workflow can be applied to an existing parallelized effort (e.g., the pipeline parallel review plan) without contradicting it.
- Existing plan governance hooks still run cleanly (no plan-graph/frontmatter regressions); run `python .cursor/hooks/plan-runner.py sessionStart` as a smoke check.

## Risks / guardrails

- **Over-process risk**: keep orchestration opt-in and lightweight; avoid always-on rules.
- **Edit-conflict risk**: enforce file ownership boundaries and staged integration/verification.
- **Scope creep risk**: the orchestrate skill is a framework; it must not become a new “mega prompt” like `build-mvp`.
