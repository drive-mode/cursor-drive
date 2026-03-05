# Plan Lifecycle Automation — Design Exploration

## Summary
Explored 5 alternatives for automating plan registry updates and TODO-empty detection. **Alternative C (Registry + Extended Plan-Runner)** was chosen and implemented.

## Alternatives
- [Alternative A](alternative-a-hook-based.md): Hook-based post-submission plan check
- [Alternative B](alternative-b-rule-triggered.md): Rule-triggered agent discipline
- [Alternative C](alternative-c-registry-plan-runner.md): Registry + extended plan-runner (chosen)
- [Alternative D](alternative-d-plan-governor-subagent.md): Dedicated plan-governor sub-agent
- [Alternative E](alternative-e-skill-scheduled.md): Skill + scheduled check

## Related
- [Archive by project and diagram policy](archive-by-project-and-diagram-policy.md) — archive structure, diagram policy, frontmatter check

## Synthesis
See [SYNTHESIS.md](SYNTHESIS.md) for comparison matrix and recommendation rationale.

## Implementation (Alternative C)
- **Registry**: `.cursor/plans/registry.yaml` — numeric IDs (cd-001, cd-002, ...), todo_count, todo_empty
- **plan-runner**: Extended with `sync-registry` mode; runs automatically on `stop` and `subagentStop`
- **Skill**: `/sync-plan-registry` for on-demand refresh
- **Rule**: plan-placement-and-lifecycle references registry and numeric IDs
