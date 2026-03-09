---
name: Agent Skills Review
overview: One-off review of all 24 Cursor Drive agent skills in `.cursor/skills/`, aligning each SKILL.md to Cursor's official format and resolving doc-review vs doc-reviewer overlap.
todos: []
isProject: false
---

# Agent Skills Review Plan

## Goal

Align every `SKILL.md` in `.cursor/skills/` to [Cursor's official skill format](https://cursor.com/docs/context/skills). Use one subagent per skill; each edits exactly one skill and reports back.

## Cursor Format (Authoritative)

| Frontmatter | Status |
|------------|--------|
| `name`, `description` | Required |
| `disable-model-invocation`, `compatibility`, `metadata` | Optional |
| `license` | Skip for now |
| `alwaysApply`, `priority`, `skill-type`, `visibility`, `tags`, `skill-settings`, `dependencies`, `agent`, `model` | **Remove** — move any real guidance into body |

**Body:** Clear title, "When to use" (or equivalent), step-by-step instructions. Preserve all behavioral content.

## Phase 1: Strip Non-Cursor Frontmatter

- Remove: `alwaysApply`, `priority`, `skill-type`, `visibility`, `tags`, `skill-settings`, `dependencies`, `agent`, `model`
- If any encode real guidance (e.g. "use with plan-system-maintainer"), move into body under "When to use" or "Dependencies"
- Keep `disable-model-invocation: true` where it exists (e.g. doc-review, create-plan) — valid Cursor field for slash-command behavior

## Phase 2: One Subagent Per Skill

Spawn 24 subagents, each with:

- **Input:** Path to one skill (e.g. `.cursor/skills/create-plan/SKILL.md`)
- **Instructions:** Same as in [agent-skills-review-prompt.md](.cursor/plans/agent-skills-review-prompt.md) lines 54–64
- **Output:** Report: frontmatter removed/kept, body changes, any ambiguity (e.g. overlap with another skill)

**Skill list (24):** compound-workflow, create-plan, cursor-drive-handoff, doc-review, doc-reviewer, doc-sync, doc-writer, drive-concise, drive-modes, drive-persona, execute-plans, merge, plan-audit-deps, plan-complete, plan-next, plan-split, plan-start, plan-sync, plan-system-maintainer, reconciliation-generator, switch, tangent, update-docs

## Phase 3: Consolidation

1. **Planning skills:** Ensure "use with plan-system-maintainer" (or equivalent) lives in body where relevant — create-plan, plan-sync, plan-start, plan-next, plan-complete, plan-split, plan-audit-deps, execute-plans
2. **doc-review vs doc-reviewer:** Subagents for these two note overlap. After all reports, decide:
   - **Merge:** Single skill with `disable-model-invocation: true` and both protocols in body
   - **Split:** Document clearly — doc-review = slash-command checklist; doc-reviewer = full protocol when agent decides to use it
3. Fix any merge conflicts or duplicate edits from parallel subagents

## Phase 4: Summary

- What was removed from frontmatter project-wide
- Which skills had body changes
- Recommendation for doc-review vs doc-reviewer

## Current State (Sample)

- **[create-plan](.cursor/skills/create-plan/SKILL.md):** Has `alwaysApply`, `priority`, `skill-type`, `visibility`, `tags`, `skill-settings`, `dependencies`, `agent`, `model` — all must move/remove
- **[doc-reviewer](.cursor/skills/doc-reviewer/SKILL.md):** Already Cursor-aligned (name, description only)
- **[doc-review](.cursor/skills/doc-review/SKILL.md):** Has `disable-model-invocation: true` — valid; otherwise aligned

## Execution Notes

- Run subagents in batches if UI limits concurrency (e.g. 4–6 at a time)
- Each subagent gets only its skill path + format spec — no full context dump
