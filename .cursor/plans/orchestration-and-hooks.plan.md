---
planId: orchestration-and-hooks
planType: task
parentPlanId: orchestration
childPlanIds: []
dependsOn: []
name: Orchestration and hooks
overview: Parallel plan orchestration, subagent plan execution, and hook/subagent expansion in one plan.
todos:
  - id: oh-01
    content: "Draft the new `orchestrate-parallel-work` skill: phases, batching, recursion guardrails, and concrete prompt/return templates (derived from `docs/plans/pipeline-parallel-review-plan.md`)."
    status: pending
  - id: oh-02
    content: Add `.cursor/commands/orchestrate.md` that loads the new skill and drives the opt-in workflow; update `.cursor/commands/README.md` to advertise it.
    status: pending
  - id: oh-03
    content: Optionally update `.cursor/agents/coordinator.md` and `.cursor/plans/plan-orchestration-spec.md` to explicitly support the meta-plan + parallel subagent orchestration pattern without changing single-active-plan governance.
    status: pending
  - id: oh-04
    content: "Run a smoke verification: ensure new command/skill are discoverable and run `python .cursor/hooks/plan-runner.py sessionStart` to confirm no governance regressions."
    status: pending
  - id: oh-05
    content: Create orchestrator command/skill (.cursor/commands/execute-plans.md or extend execute-plan.md)
    status: pending
  - id: oh-06
    content: Define plan-agent prompt template (planId, planPath, todos, phase)
    status: pending
  - id: oh-07
    content: Define TODO subagent prompt template
    status: pending
  - id: oh-08
    content: Add optional .cursor/plans/.orchestrator-state.json
    status: pending
  - id: oh-09
    content: Wire completion gate (plan-runner sync-all, Reconciliation + npm test + compile)
    status: pending
  - id: oh-10
    content: Review current hook setup (.cursor/hooks.json, validate-git-command, log-shell-execution, final-validation)
    status: pending
  - id: oh-11
    content: Add prompt-optimization.json and optimize-prompt.js beforeSubmitPrompt hook
    status: pending
  - id: oh-12
    content: Add pre-tool-use.js and post-tool-use.js for beforeMCPExecution/afterMCPExecution and shell hooks
    status: pending
  - id: oh-13
    content: Enhance final-validation.js stop hook with summary output and warning list
    status: pending
  - id: oh-14
    content: Register new hooks in .cursor/hooks.json; preserve existing validations
    status: pending
  - id: oh-15
    content: Update AGENTS.md Hooks section with new events and scripts
    status: pending
  - id: oh-16
    content: Run local Node executions with sample payloads; confirm hooks load
    status: pending
---

# Orchestration and hooks

- **Parallel orchestration**: meta-plan + opt-in command/skill; phased execution, batching, completion gate.
- **Subagent execution**: orchestrator command, plan-agent and TODO subagent prompts, optional .orchestrator-state.json.
- **Hook expansion**: prompt optimization, pre/post tool hooks, enhanced stop hook; register and document.

See todos oh-01..oh-16.
