# Plan Lifecycle Automation — Synthesis and Recommendation

## Requirements
- Plan IDs include a number
- Registry to track plans and work
- Trigger: after each agent submission, or when plan TODOs are empty
- Orient on TODO list (standard in plan files)
- Hook or rule to trigger the check
- Use Cursor primitives: hooks, agents, commands, rules, skills

## Comparison Matrix

| Criterion | A: Hook-based | B: Rule-only | C: Registry+Runner | D: Sub-agent | E: Skill+Session |
|-----------|---------------|--------------|--------------------|--------------|------------------|
| **Automatic** | Yes (stop/subagentStop) | No | Yes (hooks) | Delayed (trigger file) | Session start only |
| **Runs after each submission** | Yes | If agent obeys | Yes | Next turn | No |
| **No agent discipline** | Yes | No | Yes | Partial | No |
| **Registry with numeric IDs** | Yes | Yes | Yes | Yes | Yes |
| **TODO-oriented** | Yes | Yes | Yes | Yes | Yes |
| **Reuses existing plan-runner** | Yes | N/A | Yes | No | No |
| **Manual override (skill)** | Add separately | Is the mechanism | Built-in | Sub-agent | Is the mechanism |
| **Complexity** | Low | Low | Medium | High | Low |
| **Deterministic** | Yes | N/A | Yes | No (LLM) | Yes |

## Recommendation: **Alternative C (Registry + Extended Plan-Runner)**

### Rationale
1. **Automatic and reliable**: Hooks fire on `stop` and `subagentStop` — exactly "after each agent submission." No reliance on agent discipline.
2. **Registry as single source**: Numeric IDs (`cd-001`, `cd-002`) live in registry. plan-graph keeps dependency semantics; registry tracks identity and status.
3. **TODO-oriented**: plan-runner already reads frontmatter and counts TODOs. Extend it to update registry.
4. **Hybrid**: Hook for automation + skill for on-demand sync.
5. **Low risk**: Extends existing plan-runner; doesn't replace it. plan-graph unchanged.

### What C Does Not Do
- **Archive automation**: Registry update only. Archive remains a separate skill/rule (human or agent invokes when ready).
- **Sub-agent**: Not used — script is faster and deterministic.

### Implementation Outline
1. Create `.cursor/plans/registry.yaml` with schema.
2. Migrate existing plans to registry (assign cd-001 through cd-NNN).
3. Extend plan-runner: add `--mode sync-registry` that scans plans, updates registry.
4. Wire hooks: append sync-registry to existing stop/subagentStop commands (or chain).
5. Add skill `/sync-plan-registry` that runs the same logic.
6. Add rule: "Plan IDs use numeric format (cd-NNN). See registry for mapping."
7. Update plan-placement rule to reference registry.
