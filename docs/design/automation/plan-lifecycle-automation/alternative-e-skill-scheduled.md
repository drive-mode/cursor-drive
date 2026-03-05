# Alternative E: Skill + Scheduled / Manual Check

## Summary
Skill `/check-plan-lifecycle` scans plans, updates registry, reports completed. Rule triggers at session start; user can run manually.

## Architecture

```
Rule: "At session start, run /check-plan-lifecycle to sync the plan registry."

Skill /check-plan-lifecycle:
  1. Scan .cursor/plans/*.plan.md and archive/
  2. Parse frontmatter, count TODOs
  3. Update registry.yaml (assign IDs, todo_count, status)
  4. Report: "X plans active, Y completed (TODO-empty)"
  5. Optionally: "Move completed plans to archive? (yes/no)"
```

## Components

| Component | Role |
|-----------|------|
| Skill | Does all registry logic |
| Rule | "At session start, run /check-plan-lifecycle" |
| Registry | Same as others |

## Plan ID Scheme
Same: numeric IDs in registry.

## Pros
- No hooks — pure Cursor primitives (rule + skill)
- Skill is reusable, testable
- Session-start trigger gives a clean "sync at beginning of work"
- User can run `/check-plan-lifecycle` anytime

## Cons
- **Session start only** — if agent edits plans mid-session, registry isn't updated until next session
- No "after each submission" — only session boundary
- Relies on agent following the rule at session start

## Trade-offs
- **Session start vs. stop**: sessionStart fires when the user opens a new agent chat. stop fires when the agent finishes a turn. For "check after plans were edited," stop is better. For "sync at beginning of day," sessionStart is fine.
- **Hybrid**: Use sessionStart for initial sync + rule "after editing a plan file, run /check-plan-lifecycle" — but again, agent discipline.
