# Alternative B: Rule-Triggered Agent Discipline

## Summary
Rule instructs agent to run plan-check skill after each submission. Agent must remember to invoke.

## Architecture

```
Rule (alwaysApply: true):
  "After each agent submission that may have impacted plans,
   run /check-plan-lifecycle to update the registry and
   identify completed plans."

Agent finishes work
    → Agent reads rule
    → Agent invokes /check-plan-lifecycle skill
    → Skill scans plans, updates registry
    → Skill reports: "Plan cd-007 is TODO-empty; consider archiving"
```

## Components

| Component | Role |
|-----------|------|
| Rule | Reminder to run plan check after submissions |
| Skill `/check-plan-lifecycle` | Scans plans, updates registry, reports completion candidates |
| Registry | Same as A — `registry.yaml` |

## Plan ID Scheme
Same as A: numeric IDs in registry.

## Pros
- No hook configuration
- Agent has full context when running the check
- Simpler to add/remove
- No process spawn overhead

## Cons
- **Relies on agent discipline** — agent may forget or skip
- No guarantee the check runs
- Rule bloat: "after each submission" is vague; agent may not know when it "impacted" plans

## Trade-offs
- **Rule strength**: Stronger rule ("Always run /check-plan-lifecycle before ending your response") may help but can feel repetitive. Weaker rule may be ignored.
- **Skill design**: Skill could be `disable-model-invocation: true` so it only runs when explicitly invoked — but then agent must remember to invoke it.
