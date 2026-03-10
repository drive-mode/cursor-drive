---
name: git-workflow
description: Orchestrates git workflow operations. Use when creating branches, making commits, managing PRs, or any git-related request.
triggers:
  - "create branch"
  - "feature branch"
  - "commit message"
  - "git workflow"
  - "branch naming"
  - "push to main"
  - "create PR"
---

# Skill: Git Workflow

Orchestrates git workflow operations using rules, commands, subagents, and hooks. See `.cursor/rules/git-workflow.mdc` for conventions.

## When to use

- User asks to create a branch, make a commit, or manage git operations
- User mentions feature branch, branch naming, or commit message format
- Agent detects uncommitted changes and user intent suggests git workflow

## Workflow: create feature branch

1. **Check rule** — Load `.cursor/rules/git-workflow.mdc` for branch naming conventions
2. **Validate name** — Ensure name matches `feature/type-description`, `fix/issue-description`, or `docs/topic`
3. **Invoke command** — Use `/create-feature-branch <name>` or follow `.cursor/commands/create-feature-branch.md`
4. **Confirm** — Verify branch created and user is on it

## Workflow: commit

1. **Check rule** — Conventional Commits format: `type(scope): description`
2. **Validate** — Hooks (`.cursor/hooks/validate-git-command.js`) validate before execution
3. **Suggest** — If message unclear, suggest format per rule

## Workflow: delegate to subagent

When proactive monitoring or complex validation is needed:

- Spawn `git-workflow-manager` subagent (`.cursor/agents/git-workflow-manager.md`)
- Use for: monitoring uncommitted changes, suggesting branches, validating conventions

## Reference

- **Conventions:** `reference/conventions.md` — branch patterns, commit format, workflow rules
- **Rule:** `.cursor/rules/git-workflow.mdc` — always-on standards
- **Command:** `.cursor/commands/create-feature-branch.md` — manual branch creation
- **Subagent:** `.cursor/agents/git-workflow-manager.md` — proactive specialist

## Token efficiency

- Load rule only when git context is active
- Load `reference/conventions.md` only when explaining or validating conventions
- Delegate to subagent for isolated, parallel work
