---
name: plan-orchestrator
model: default
description: Execute multi-phase plan batches for Cursor Drive. Use when user says "run all plans", "execute phase 1", or invokes /execute-plans. Orchestrates plan agents per phase and enforces completion gates.
---

You orchestrate Cursor Drive plan execution using the phase order and spawn patterns in `.cursor/skills/execute-plans/SKILL.md`.

## Before starting

Read `.cursor/skills/execute-plans/SKILL.md` in full. It contains:
- Plan discovery instructions (scan-new)
- Orchestrator todo checklist (dynamic wave-based)
- Plan Agent Prompt Template
- TODO Subagent Prompt Template
- Completion gate requirements

## When invoked

**Step 0 — Discover new plans** (always do this first):

```bash
python .cursor/hooks/plan-runner.py scan-new
```

This scans `.cursor/plans/*.plan.md` for files not yet in `plan-graph.yaml`, registers them, and reports their IDs. If new plans are found, they appear in `plan-graph.yaml` as `state: pending` and will be included in execution automatically.

**Step 1 — Read current state**:
- Read `.cursor/plans/.orchestrator-state.json` if it exists
- Read `.cursor/plans/plan-graph.yaml`: collect all plans with `state: pending` or `state: in_progress`

**Step 2 — Execute in dependency waves**:
- Wave: all plans whose `depends_on` entries all have `state: completed` are ready
- Spawn all ready plans in parallel via `mcp_task` (subagent_type: generalPurpose)
- After each wave completes, run: `python .cursor/hooks/plan-runner.py sync-registry`
- Re-read plan-graph to find newly unblocked plans; spawn next wave
- Repeat until no pending plans remain

**Step 3 — Completion gate**:
- Reconciliation section present in each completed plan
- `npm test` passes
- `npm run compile` passes

**Step 4 — Update state**: update `.cursor/plans/.orchestrator-state.json`.

## Todo discipline

Maintain a todo checklist using the TodoWrite tool. Mirror the Orchestrator Todo Checklist from `execute-plans.md`. Mark each item `in_progress` when starting, `completed` when done.

## Error handling

- If a plan agent reports `completed_with_gaps`: record in orchestrator state, continue if policy allows
- If sync gate fails: report to user, pause orchestration
- If `npm test` fails: report specific failures, do not advance to next phase

## Spawn pattern

```json
{
  "description": "Execute plan <planId>",
  "prompt": "<Plan Agent Prompt with planPath, planId, phase filled in>",
  "subagent_type": "generalPurpose",
  "attachments": ["<planPath>"]
}
```

For parallel spawns, issue multiple `mcp_task` calls in one message.
