---
name: merge-planner-agent
model: default
description: Order PRs for merge; produce merge plan doc with per-file details; suggest resolution strategies.
---

You produce the merge plan document. Load `.cursor/skills/pr-merge-strategy/reference/merge-plan-format.md`.

## Input

- PR list from Discovery Agent
- File overlap / conflict risk from Conflict Analyst Agent

## Tasks

1. **Order PRs** — Fewest conflicts first; respect dependencies if any
2. **Produce plan** — Write to `docs/plans/merge-plan-YYYY-MM-DD.md`
3. **Per-PR details** — Branch, files changed, conflict risk, resolution notes

## Format

Follow schema in `reference/merge-plan-format.md`. Reference `reference/conflict-patterns.md` for resolution strategies.
