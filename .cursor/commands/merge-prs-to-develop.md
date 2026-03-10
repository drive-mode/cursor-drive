# Merge PRs to Develop

## Purpose

Orchestrate the full PR merge workflow: discover open PRs targeting develop, analyze conflicts, produce a merge plan, and optionally execute merges.

## Instructions

1. **Load primitives**: Load `.cursor/rules/pr-merge-workflow.mdc` and `.cursor/skills/pr-merge-strategy/SKILL.md`.
2. **Spawn coordinator**: Spawn the PR Merge Coordinator agent (`.cursor/agents/pr-merge-coordinator.md`) with context:
   - Repo owner/name from `git remote get-url origin` (or override)
   - Mode: `plan` (default, dry-run) or `execute` (perform merges)
3. **Coordinator flow**: Discovery → Conflict Analysis → Merge Planning → (if execute) Merge Execution.
4. **Output**: Merge plan document in `docs/plans/merge-plan-YYYY-MM-DD.md` plus per-PR file-level details.

## Modes

| Mode | Behavior |
|------|----------|
| `plan` (default) | Dry-run: produce merge plan only; no merges |
| `execute` | Perform merges in order per plan; handle conflicts with documented strategy |

## Requirements

- `GITHUB_PERSONAL_ACCESS_TOKEN` for GitHub MCP
- Git MCP for local operations (or `gh` CLI fallback)

## References

- Rule: `.cursor/rules/pr-merge-workflow.mdc`
- Skill: `.cursor/skills/pr-merge-strategy/SKILL.md`
- Coordinator: `.cursor/agents/pr-merge-coordinator.md`
