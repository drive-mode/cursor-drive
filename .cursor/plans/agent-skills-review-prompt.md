# Prompt: Agent skills review (Cursor-aligned, subagent per skill)

Paste this into Agent chat to plan and run a full review of `.cursor/skills/`, aligning every SKILL.md to Cursor’s official format and using one subagent per skill.

---

## Your task

1. **Plan** a one-off review of all Cursor Drive agent skills in `.cursor/skills/`.
2. **Align** every `SKILL.md` to the official Cursor skill format (see [Cursor docs – Skills](https://cursor.com/docs/context/skills)).
3. **Execute** the review by spawning **one subagent per skill**; each subagent reviews and edits exactly one skill’s `SKILL.md`, then reports back.

## Cursor skill format (authoritative)

- **Frontmatter (required):** `name`, `description`.
- **Frontmatter (optional):** `license`, `compatibility`, `metadata`, `disable-model-invocation`.
- **No other frontmatter.** Remove: `alwaysApply`, `priority`, `skill-type`, `visibility`, `tags`, `skill-settings`, `dependencies`, `agent`, `model`. If any of these encode real guidance (e.g. “use with plan-system-maintainer”), move that into the **body** (e.g. under “When to use” or “Dependencies”).
- **Body:** Markdown with a clear title, “When to use”, and step-by-step or protocol instructions. Optionally reference `scripts/`, `references/`, `assets/` under the skill folder.

We do **not** need `license` unless we decide to add it later.

## Skill list (one subagent per skill)

Each line below is one skill directory under `.cursor/skills/`. Spawn one subagent per line; give each subagent only that skill path and this format spec.

- compound-workflow
- create-plan
- cursor-drive-handoff
- doc-review
- doc-reviewer
- doc-sync
- doc-writer
- drive-concise
- drive-modes
- drive-persona
- execute-plans
- merge
- plan-audit-deps
- plan-complete
- plan-next
- plan-split
- plan-start
- plan-sync
- plan-system-maintainer
- reconciliation-generator
- switch
- tangent
- update-docs

## Subagent instructions (give each subagent)

Hand this to each subagent (after substituting `SKILL_DIR` with the skill folder name, e.g. `create-plan`):

```
Review and edit `.cursor/skills/SKILL_DIR/SKILL.md` so it conforms to Cursor’s official skill format.

Rules:
- Keep only frontmatter: name, description. Optionally: disable-model-invocation, compatibility, metadata. No license unless we add it.
- Remove: alwaysApply, priority, skill-type, visibility, tags, skill-settings, dependencies, agent, model. If any of these carry important guidance, move it into the Markdown body (e.g. “Use with plan-system-maintainer” → body section).
- Ensure the body has a clear title, “When to use” (or equivalent), and instructions. Preserve all existing behavioral content; only change structure and frontmatter.
- Keep the skill folder name and frontmatter `name` in sync (lowercase, hyphens).
- After editing, report: what you changed (frontmatter removed/kept, body changes) and any ambiguity (e.g. overlap with another skill).
```

## Consolidation and overlap

- **doc-review** vs **doc-reviewer**: one is slash-command style (disable-model-invocation), one is “when to use” + protocol. Have the subagents for these two note overlap; after all subagents report, decide whether to merge or document the split.
- **Planning skills** (create-plan, plan-sync, plan-start, plan-next, plan-complete, plan-split, plan-audit-deps, plan-system-maintainer, execute-plans): ensure “use with plan-system-maintainer” (or equivalent) lives in the body where relevant, not in removed frontmatter.

## Execution order

1. You (parent agent): create a short plan (bullets) for the review: strip non-Cursor frontmatter, one subagent per skill, then consolidation pass.
2. Spawn 24 subagents (or run in batches if the UI limits concurrency), each with the subagent instructions above and the correct `SKILL_DIR`.
3. Collect reports; fix any merge conflicts or duplicate edits.
4. Summarise: what was removed from frontmatter project-wide, which skills had body changes, and the recommendation for doc-review vs doc-reviewer.
