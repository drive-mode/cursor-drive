---
name: execute-plans
description: Execute all active plans via subagents — orchestrator spawns plan agents per phase; plan agents spawn TODO subagents. All agents use todo tasks.
disable-model-invocation: true
---

# Execute Plans (Subagent Orchestration)

Run the 10 active Cursor Drive plans using subagents. Orchestrator spawns plan-level agents in phase order; each plan agent may spawn TODO-level subagents. All agents must maintain todo tasks.

## Plan Discovery (run first)

Before executing, always scan for new plan files not yet registered:

```bash
python .cursor/hooks/plan-runner.py scan-new
```

This auto-detects any `.plan.md` files in `.cursor/plans/` that aren't in `plan-graph.yaml`, registers them, and reports their IDs. Run this before reading the phase order below.

## Phase Order (dynamic — read from plan-graph.yaml)

The phase order is **not hardcoded**. At execution time:

1. Run `scan-new` (above) to register any new plans
2. Read `.cursor/plans/plan-graph.yaml` — find all plans with `state: pending` or `state: in_progress`
3. Order them by `depends_on`: plans with no unresolved deps run first (parallel), then their dependents
4. Execute in waves: all plans whose deps are satisfied run in parallel; gate on completion before next wave

**Dependency resolution rules**:
- A plan is ready when all its `depends_on` entries have `state: completed`
- Plans with empty `depends_on` are always ready (run in the first wave)
- Plans with circular deps are skipped and reported as errors

**Historical phase reference** (from the last major execution run — may be stale):

| Phase | Plans | Deps |
|-------|-------|------|
| 1 | architecture-vision-foundation, cursor-docs-cleanup, browser-dev-workflow, terminology-sas-overhaul | cursor-docs-cleanup depends on architecture-vision-foundation |
| 2 | hook-prompt-pipeline, native-mode-alignment, senior-engineer-ux, agent-orchestration-frameworks | All depend on architecture-vision-foundation |
| 3 | pipeline-wiring-mvp | hook-prompt-pipeline, native-mode-alignment |
| 4 | quality-performance | pipeline-wiring-mvp |
| active | wire_and_fix_drive_886a9ffa, openclaw_capability_scrape_8fa228d1 | no deps |

New plans added since last run will appear automatically after `scan-new`.

---

## Orchestrator Todo Checklist

Maintain this checklist as you execute. Mark each `in_progress` when starting, `completed` when done.

1. **discover** — Run `python .cursor/hooks/plan-runner.py scan-new`. Report any new plans found and registered.
2. **read-graph** — Read `.cursor/plans/plan-graph.yaml`. Collect all plans with `state: pending` or `state: in_progress`. These are the execution targets.
3. **wave-1** — Spawn all plans with no unresolved `depends_on` in parallel. Wait for all to complete.
4. **sync-1** — Run `python .cursor/hooks/plan-runner.py sync-registry`. Check for newly unblocked plans.
5. **wave-N** — Repeat: spawn all newly unblocked plans in parallel, run sync, until no pending plans remain.
6. **gate** — After last plan completes: run `npm test`, `npm run compile`. Archive completed plans.

---

## Plan Agent Prompt Template

When spawning a plan agent via `mcp_task` (subagent_type: generalPurpose), use this prompt structure:

```
You are executing plan {{planId}} for Cursor Drive. Your job: complete all pending TODOs in the plan file, then add a ## Reconciliation section.

**Plan file**: {{planPath}}
**Plan ID**: {{planId}}
**Phase**: {{phase}}

**Todo discipline**: Maintain a todo checklist. For each TODO in the plan:
1. Mark it in_progress in the plan frontmatter before starting
2. Either execute it yourself OR spawn a TODO subagent (see below)
3. Mark it completed in the plan frontmatter when done
4. Run /plan-sync after significant progress

**Spawning TODO subagents**: For complex or multi-file TODOs, use mcp_task with subagent_type generalPurpose. Pass this prompt:

---
TODO Subagent Prompt:
Plan: {{planId}}
Plan file: {{planPath}}
TODO id: {{todoId}}
TODO content: {{content}}

Execute this TODO. Update the plan file frontmatter to set this TODO's status to completed when done. Return: list of files changed, any test commands run.
---

**Completion**: When all TODOs are completed or cancelled, add a ## Reconciliation section to the plan body with: what was verified, residual risks, evidence. Then return a summary to the orchestrator.
```

**Attachments**: Pass `{{planPath}}` and any plan-relevant files (e.g. docs/architecture/adr/ for architecture-vision-foundation).

---

## TODO Subagent Prompt Template

When a plan agent spawns a subagent for a single TODO:

```
You are implementing a single TODO for Cursor Drive plan {{planId}}.

**Plan file**: {{planPath}}
**TODO id**: {{todoId}}
**TODO content**: {{content}}

**Steps**:
1. Read the plan file and any referenced source files
2. Implement the TODO per its acceptance criteria
3. Update the plan file: set this TODO's status to completed in the frontmatter
4. Return: files changed, commands run (e.g. npm run compile, npm test)

**Todo discipline**: Your only todo is this TODO. Mark it completed when done.
```

**Attachments**: Plan file path, and any files the TODO references (e.g. src/foo.ts, docs/...).

---

## Spawn Pattern (mcp_task)

```json
{
  "description": "Execute plan architecture-vision-foundation",
  "prompt": "<Plan Agent Prompt with planPath, planId, phase filled>",
  "subagent_type": "generalPurpose",
  "attachments": [".cursor/plans/architecture-vision-foundation.plan.md"]
}
```

For parallel spawns (Phase 1 remaining, Phase 2): issue multiple mcp_task calls in one message. Each returns when its plan is complete.

---

## Completion Gate

After each plan completes:
1. Plan agent adds `## Reconciliation` to plan body
2. Run `python3 .cursor/hooks/plan-runner.py sync-all`
3. Gate checks: Reconciliation present, `npm test`, `npm run compile`

If gate fails: record `completed_with_gaps` in plan; do not block dependent plans if policy allows.

---

## Orchestrator State (Optional)

Track progress in `.cursor/plans/.orchestrator-state.json`:

```json
{
  "currentPhase": 1,
  "plansInProgress": ["architecture-vision-foundation"],
  "plansCompleted": [],
  "lastSync": "2026-02-25T00:00:00Z"
}
```

Update after each spawn/complete. Not required for execution.

---

## References

- [plan-orchestration-spec.md](.cursor/plans/plan-orchestration-spec.md)
- [plan-master.diagram.md](.cursor/plans/plan-master.diagram.md)
- [plan-system-maintainer skill](.cursor/skills/plan-system-maintainer/SKILL.md)
