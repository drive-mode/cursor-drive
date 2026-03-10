# Prompt: Implement Optimal Plan Execution Order

Use this prompt to orchestrate Cursor Drive plan execution using the optimal order defined in `.cursor/plans/OPTIMAL_EXECUTION_ORDER.md`. The orchestrating agent spawns subagents — **foreground** (user waits) and **background** (`mcp_task` with `run_in_background: true`).

---

## Copy-paste prompt (paste into chat to start)

```
Implement the optimal plan execution order. Read docs/prompts/optimal-execution-order-implementation.md and .cursor/plans/OPTIMAL_EXECUTION_ORDER.md. Run scan-new, then execute Phase 0 (5 foreground + 14 background subagents), then Phase 1–4 in order. Use mcp_task: foreground = no run_in_background; background = run_in_background: true. Follow the Plan Agent Prompt Template for each spawn.
```

---

## Your task

You are the plan orchestrator. Execute all plans in the optimal order from `.cursor/plans/OPTIMAL_EXECUTION_ORDER.md` Section 10. Use foreground subagents for critical-path plans (user waits); use background subagents for independent plans (run in parallel, no user wait).

**Before starting:**
1. Read `.cursor/plans/OPTIMAL_EXECUTION_ORDER.md` in full (especially Section 10: Implementation Todos)
2. Run `python .cursor/hooks/plan-runner.py scan-new` to register any new plans
3. Create a todo checklist (TodoWrite) mirroring the phase structure below

---

## Phase 0 — Foundation (parallel)

Spawn all Phase 0 plans. **Foreground** = `mcp_task` without `run_in_background`; **background** = `mcp_task` with `run_in_background: true`.

### Foreground (5 plans — wait for completion before Phase 1)

For each, spawn via `mcp_task` with `subagent_type: "generalPurpose"`, **no** `run_in_background`. Use the Plan Agent Prompt Template below. Attach the plan file.

| planId | planPath |
|--------|----------|
| terminology-sas-overhaul | `.cursor/plans/terminology-sas-overhaul.plan.md` |
| mcp-apps-implementation | `.cursor/plans/mcp-apps-implementation.plan.md` |
| drive-mode-full-build | `.cursor/plans/drive-mode-full-build.plan.md` |
| cursor-drive-implementation | `.cursor/plans/cursor-drive-implementation.plan.md` |
| push-repo-and-develop-branch | `.cursor/plans/push-repo-and-develop-branch.plan.md` |

### Background (14 plans — run in parallel, no wait)

For each, spawn via `mcp_task` with `subagent_type: "generalPurpose"` and **`run_in_background: true`**. Use the Plan Agent Prompt Template. Attach the plan file.

| planId | planPath |
|--------|----------|
| repo-health-and-cleanup | `.cursor/plans/repo-health-and-cleanup.plan.md` |
| plan-governance | `.cursor/plans/plan-governance.plan.md` |
| voice-wake-word | `.cursor/plans/voice-wake-word.plan.md` |
| orchestration | `.cursor/plans/orchestration.plan.md` |
| adr-prd-audit-and-graph | `.cursor/plans/adr-prd-audit-and-graph.plan.md` |
| readme-redesign | `.cursor/plans/readme-redesign.plan.md` |
| cloudflare-setup-phases | `.cursor/plans/cloudflare-setup-phases.plan.md` |
| remove-github-push-code | `.cursor/plans/remove-github-push-code.plan.md` |
| security-review-structure | `.cursor/plans/security-review-structure.plan.md` |
| automation-plugin-strategy | `.cursor/plans/automation-plugin-strategy.plan.md` |
| agent-skills-review | `.cursor/plans/agent-skills-review.plan.md` |
| extension-reinstall-automation | `.cursor/plans/extension-reinstall-automation.plan.md` |
| cursor-primitives-complete-bootstrap | `.cursor/plans/cursor-primitives-complete-bootstrap.plan.md` |
| chat-memory-proceed | `.cursor/plans/chat-memory-proceed.plan.md` |

**Gate:** All Phase 0 foreground plans must complete before Phase 1. Background plans may still be running.

---

## Phase 1 — After terminology + mcp-apps

**Prerequisite:** terminology-sas-overhaul and mcp-apps-implementation must be completed.

Run **sequentially** (Strategy A — avoids agentScreen.ts conflict):

1. **agent-screen-implementation** — `.cursor/plans/agent-screen-implementation.plan.md`
2. **s-as-execution-command-discovery** — `.cursor/plans/s-as-execution-command-discovery.plan.md`

Spawn each via `mcp_task` (foreground, no `run_in_background`). Wait for (1) to complete before spawning (2).

---

## Phase 2 — After drive-mode-full-build

**Prerequisite:** drive-mode-full-build must be completed.

- **tangent-agent-ux-features** — `.cursor/plans/tangent-agent-ux-features.plan.md`

Spawn via `mcp_task` (foreground).

---

## Phase 3 — After cursor-drive-implementation

**Prerequisite:** cursor-drive-implementation must be completed.

Run **in parallel** (both can proceed once cursor-drive-implementation is done):

- **cursor-drive-automation-optimizer** — `.cursor/plans/cursor-drive-automation-optimizer.plan.md`
- **using-cursor-drive** — `.cursor/plans/using-cursor-drive.plan.md`

Spawn both via `mcp_task` (foreground) in one message.

---

## Phase 4 — After push-repo-and-develop-branch

**Prerequisite:** push-repo-and-develop-branch must be completed (develop branch exists).

- **pr-merge-workflow-primitives** — `.cursor/plans/pr-merge-workflow-primitives.plan.md`

Spawn via `mcp_task` (foreground).

---

## Plan Agent Prompt Template

When spawning a plan agent via `mcp_task`, use this prompt (replace `{{planId}}`, `{{planPath}}`, `{{phase}}`):

```
You are executing plan {{planId}} for Cursor Drive. Your job: complete all pending TODOs in the plan file, then add a ## Reconciliation section.

**Plan file**: {{planPath}}
**Plan ID**: {{planId}}
**Phase**: {{phase}}

**Todo discipline**: Maintain a todo checklist. For each TODO in the plan:
1. Mark it in_progress in the plan frontmatter before starting
2. Either execute it yourself OR spawn a TODO subagent (mcp_task, subagent_type: generalPurpose)
3. Mark it completed in the plan frontmatter when done
4. Run /plan-sync after significant progress

**Spawning TODO subagents**: For complex or multi-file TODOs, use mcp_task with subagent_type generalPurpose. Pass: Plan {{planId}}, Plan file {{planPath}}, TODO id and content. Execute the TODO, update plan frontmatter to completed, return files changed and commands run.

**Completion**: When all TODOs are completed or cancelled, add a ## Reconciliation section to the plan body with: what was verified, residual risks, evidence. Then return a summary to the orchestrator.
```

**Attachments:** `[{{planPath}}]`

---

## mcp_task invocation

**Foreground (user waits):**
```json
{
  "description": "Execute plan {{planId}}",
  "prompt": "<Plan Agent Prompt with planPath, planId, phase filled>",
  "subagent_type": "generalPurpose",
  "attachments": [".cursor/plans/{{planId}}.plan.md"]
}
```

**Background (parallel, no wait):**
```json
{
  "description": "Execute plan {{planId}} (background)",
  "prompt": "<Plan Agent Prompt with planPath, planId, phase filled>",
  "subagent_type": "generalPurpose",
  "run_in_background": true,
  "attachments": [".cursor/plans/{{planId}}.plan.md"]
}
```

---

## Completion gate

After each plan completes:
1. Plan agent adds `## Reconciliation` to plan body
2. Run `python .cursor/hooks/plan-runner.py sync-registry`
3. Gate checks: Reconciliation present, `npm test`, `npm run compile`

If gate fails: record `completed_with_gaps`; do not block dependent plans if policy allows.

---

## References

- `.cursor/plans/OPTIMAL_EXECUTION_ORDER.md` — source of truth for order and subagent strategy
- `.cursor/skills/execute-plans/SKILL.md` — plan agent and TODO subagent prompt templates
- `.cursor/agents/plan-orchestrator.md` — orchestrator behavior
