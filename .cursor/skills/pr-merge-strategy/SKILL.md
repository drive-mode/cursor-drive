---
name: pr-merge-strategy
description: Strategic merge of open PRs into develop. Load when merging PRs, resolving merge conflicts, or ordering PRs for sequential merge.
triggers:
  - "merge PRs"
  - "PRs into develop"
  - "strategic merge"
  - "merge conflicts"
---

# Skill: PR Merge Strategy

Strategic merge of open PRs targeting `develop`. One PR at a time; file-level conflict prediction and resolution planning.

## When to use

- User asks to merge PRs into develop
- User mentions "strategic merge", "PR order", or "merge conflicts"
- Command `/merge-prs-to-develop` is invoked

## Core workflow

1. **List open PRs** — GitHub MCP `list_pull_requests` (owner, repo, state: open, base: develop)
2. **Per PR** — `get_pull_request_files` for changed paths; fetch develop diff since PR branch point
3. **File-overlap matrix** — Which PRs touch which files; overlap with develop changes
4. **Order PRs** — Fewest conflicts first, or by dependency
5. **Merge plan** — Per-file conflict notes; resolution strategies per `reference/conflict-patterns.md`

## Merge plan output

Stored in `docs/plans/merge-plan-YYYY-MM-DD.md`. Schema: `reference/merge-plan-format.md`.

## Delegation

- **PR Discovery Agent** — List PRs, metadata, files, status checks
- **Conflict Analyst Agent** — File overlap, conflict hotspots
- **Merge Planner Agent** — Order PRs, produce plan doc
- **Merge Executor Agent** — Execute merges (mode=execute only)

## References

- `reference/merge-plan-format.md` — Merge plan schema
- `reference/conflict-patterns.md` — Common conflict patterns and resolution strategies
- Rule: `.cursor/rules/pr-merge-workflow.mdc`
