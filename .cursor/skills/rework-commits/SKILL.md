---
name: rework-commits
description: Enforces clean git history before pushing. Use when squashing, amending, or reworking commits.
triggers:
  - "rework commits"
  - "squash commits"
  - "clean git history"
  - "amend commit"
  - "interactive rebase"
  - "before push"
---
# Skill: Rework Commits

Enforces clean git history before pushing. Ensures commits are logical, atomic, and follow Conventional Commits.

## When to use

- User asks to rework, squash, or amend commits before pushing
- User mentions cleaning git history or interactive rebase
- Agent detects multiple small commits that should be consolidated

## Workflow: rework before push

1. **Inspect** — Use `git log --oneline -n 20` to see recent commits
2. **Plan** — Group commits by logical unit; identify squash/amend targets
3. **Rebase** — Use `git rebase -i` for squashing; `git commit --amend` for last-commit fixes
4. **Verify** — Run `npm test` and `npm run compile` after rework
5. **Push** — Only push after history is clean and tests pass

## Rules

- Never force-push to shared branches without explicit user approval
- Preserve meaningful commit messages; avoid generic "fix" or "update"
- One logical change per commit; group related edits
- Run tests after any rebase to ensure nothing broke

## Reference

- `.cursor/rules/git-workflow.mdc` — branch and commit conventions
- `.cursor/rules/tdd-enforcement.mdc` — test-before-refactor discipline
