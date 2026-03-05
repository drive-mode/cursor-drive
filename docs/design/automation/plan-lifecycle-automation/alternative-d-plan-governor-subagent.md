# Alternative D: Dedicated Plan-Governor Sub-Agent

## Summary
Custom sub-agent (`.cursor/agents/plan-governor.md`) for plan lifecycle. Hook would spawn it on `stop`/`subagentStop` to check plans and update registry.

## Architecture

```
stop / subagentStop
    → Hook runs: spawn plan-governor sub-agent
    → Sub-agent receives: "Scan .cursor/plans/*.plan.md, update registry, report completed plans"
    → Sub-agent uses tools: read_file, grep, write
    → Sub-agent returns summary to parent
```

## Components

| Component | Role |
|-----------|------|
| `plan-governor.md` | Sub-agent with plan-scanning and registry-update instructions |
| Hook | Spawn sub-agent via Task tool? — **Problem**: Hooks run shell commands, not agent invocations. |
| Fallback | Hook runs a script that writes a "pending check" file; rule tells agent to run plan-governor when it sees that file. |

## Critical Constraint
**Cursor hooks cannot spawn sub-agents.** Hooks run shell commands. The Task tool (sub-agent) is invoked by the main agent, not by a hook script.

Implication:
- **D-revised**: Hook writes a trigger file (e.g. `.cursor/plans/.check-pending`). Rule says: "When starting a new turn, if `.check-pending` exists, invoke /plan-governor first." Agent runs plan-governor, which clears the file. So we get delayed automation — next agent turn picks it up.

## Pros (D-revised)
- Plan-governor has full agent capabilities (reasoning, multi-step)
- Can handle edge cases (e.g. "should this plan be archived?")
- Sub-agent isolates plan logic from main agent context

## Cons
- Trigger file adds indirection
- Runs on *next* agent turn, not immediately after stop
- Sub-agent has token cost
- More complex than a Python script

## Trade-offs
- **When to run**: Delayed (next turn) vs. immediate (would need a different mechanism). Delayed is acceptable if the goal is "before next real work."
- **Sub-agent vs script**: Sub-agent is flexible but slower and costlier. Script is fast and deterministic.
