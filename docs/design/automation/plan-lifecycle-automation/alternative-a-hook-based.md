# Alternative A: Hook-Based Post-Submission Plan Check

## Summary
Extend plan-runner hook to scan all `.plan.md` on `stop` and `subagentStop`, update registry, optionally trigger archive when TODOs empty.

## Architecture

```
Agent completes work
    → stop / subagentStop hook fires
    → plan-runner.py checkPlans
    → Scan .cursor/plans/*.plan.md
    → Read frontmatter, count remaining TODOs
    → Update .cursor/plans/registry.yaml
    → If TODO-empty: emit "archive_candidate" (or run archive)
```

## Components

| Component | Role |
|-----------|------|
| `plan-runner.py` | Add `checkPlans` mode: scan plans, update registry |
| `registry.yaml` | Central store: `{ numeric_id, planId, file, todo_count, status, last_checked }` |
| Hooks | `stop`, `subagentStop` → run plan-runner with `checkPlans` |

## Plan ID Scheme
- **Numeric ID**: `cd-001`, `cd-002`, ... (registry-assigned, monotonic)
- **planId**: Semantic ID (e.g. `cursor-drive`) — unchanged in frontmatter
- Registry maps numeric ID ↔ planId ↔ file path

## Pros
- Automatic: no agent discipline required
- Fires on every agent stop — catches plan edits immediately
- Reuses existing hook infrastructure
- Deterministic, scriptable

## Cons
- Runs on every stop (could be noisy if agent stops frequently)
- plan-runner must mutate registry (currently read-only)
- Need to assign numeric IDs to existing plans (one-time migration)

## Trade-offs
- **Trigger frequency**: `stop` fires once per agent turn; `subagentStop` fires per subagent. Could add `afterFileEdit` with matcher for `*.plan.md` to run only when plans change — but that adds complexity.
- **Archive automation**: Option A1 = hook only updates registry; A2 = hook also runs archive. A1 is safer (human reviews before archive); A2 is more automated.
