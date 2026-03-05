# Agent Skills Review — Summary

Completed per [Agent Skills Review Plan](agent_skills_review_490bff47.plan.md). All 24 skills in `.cursor/skills/` are aligned to Cursor’s official skill format.

## Frontmatter removed (project-wide)

Removed from **create-plan** only (no other skills had non-Cursor frontmatter):

- `alwaysApply`
- `priority`
- `skill-type`
- `visibility`
- `tags`
- `skill-settings`
- `dependencies`
- `agent`
- `model`

Kept in create-plan: `name`, `description`, `disable-model-invocation`.

Guidance from `skill-settings` and `dependencies` (“use with plan-system-maintainer”) was moved into the body.

## Skills with body changes

| Skill | Changes |
|-------|--------|
| **create-plan** | Stripped non-Cursor frontmatter; added “Use with: skill plan-system-maintainer” in body. |
| **doc-review** | Added `# Doc Review`, “When to use”, and relationship note to doc-reviewer. |
| **doc-reviewer** | Renamed title to “# Doc Reviewer”; merged Trigger into When to use; added relationship note to doc-review. |
| **doc-sync** | Title normalized to “# Doc Sync”. |
| **doc-writer** | Title normalized to “# Doc Writer”. |
| **drive-concise** | Added `# Drive Concise`, “When to use”. |
| **drive-modes** | Added `# Drive Modes`, “When to use”. |
| **merge** | Added `# Merge`, “When to use”. |
| **plan-audit-deps** | Added “Use with plan-system-maintainer” line. |
| **plan-complete** | Added “Use with plan-system-maintainer” line. |
| **plan-next** | Added “Use with plan-system-maintainer” and when-to-use line. |
| **plan-split** | Added “Use with plan-system-maintainer” line. |
| **plan-start** | Added “Use with plan-system-maintainer” line. |
| **plan-sync** | Added “Use with plan-system-maintainer” line. |
| **plan-system-maintainer** | Title normalized to “# Plan System Maintainer”. |
| **reconciliation-generator** | Title normalized to “# Reconciliation Generator”. |
| **switch** | Added `# Switch`, “When to use”. |
| **tangent** | Added `# Tangent`, “When to use”. |
| **update-docs** | Added `# Update Docs`, “When to use”. |
| **compound-workflow** | Title normalized to “# Compound Workflow”. |

Skills with no edits (already compliant): **cursor-drive-handoff**, **execute-plans**.

## doc-review vs doc-reviewer — recommendation

**Keep both; document the split (done).**

- **doc-review**: Slash-command only (`disable-model-invocation: true`). Explicit `/doc-review` runs a focused checklist (stale refs, broken links, AI slop). Lightweight.
- **doc-reviewer**: Auto-applied when the agent decides to review docs. Full protocol: file inventory, severity classification (CRITICAL/STALE/MISSING/SLOP/MINOR), anti-patterns table, fix protocol. Use when the user asks to “review” or “audit” docs without a slash command.

Each skill now has a short “Relationship” / “When to use” note pointing to the other so the split is clear.
