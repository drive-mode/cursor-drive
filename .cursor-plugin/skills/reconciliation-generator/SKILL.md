---
name: reconciliation-generator
description: Generate a ## Reconciliation section for a completed plan. Use when all plan TODOs are completed or cancelled but the Reconciliation section is missing. Automates the plan completion gate requirement.
---

# Skill: Reconciliation Generator

Generate a `## Reconciliation` section for a plan that has all TODOs completed or cancelled. This section is required by the plan completion gate before archiving.

## When to use

- All TODOs in a plan are `completed` or `cancelled`
- The plan is missing a `## Reconciliation` section
- The plan-runner gate fires with "Reconciliation required" error
- User runs `/plan-sync` and sees a gate error for a specific plan

## Trigger

Read this skill when:
- User asks to "reconcile", "complete", or "finish" a plan
- User says "add reconciliation to plan X"
- `/plan-governor` reports a gate error about missing Reconciliation

---

## Protocol

### Step 1: Read the plan file

```bash
# Identify the plan file
ls .cursor/plans/*.plan.md
```

Read the full plan: frontmatter TODOs, plan body, and any implementation notes.

### Step 2: Gather evidence

For each completed TODO, verify the implementation exists:
- Check referenced files exist (`ls`, `rg`)
- Check referenced config keys exist in `src/config.ts`
- Check referenced MCP tools exist in `src/mcpServer.ts`
- Run `npm test` if the plan includes test TODOs — capture pass/fail counts
- Run `npm run compile` — capture pass/fail

### Step 3: Generate the Reconciliation section

Write a `## Reconciliation` section at the end of the plan body using this format:

```markdown
## Reconciliation

### What was completed

| TODO | Outcome | Evidence |
|------|---------|----------|
| todo-id | Brief description of what was done | File/test that confirms it |

### What was verified

- `npm run compile`: pass / N errors
- `npm test`: X/Y tests passing
- [specific acceptance criteria verified]: pass/fail

### Residual risks

- [Risk]: [Why it remains / mitigation]
- None (if none)

### Notes

[Any deviations from the original plan, out-of-scope items deferred, or follow-up work needed]
```

### Step 4: Write the section

Append `## Reconciliation` to the end of the plan file. Do NOT modify the frontmatter or any existing plan body sections.

### Step 5: Run sync

```bash
python3 .cursor/hooks/plan-runner.py sync-all
```

Verify the gate no longer fires for this plan (output `"decision": "allow"`).

---

## Quality rules

- Evidence must be concrete: file paths, test names, compile output — not assertions
- Residual risks must be honest: if something wasn't fully tested, say so
- If a TODO was `cancelled`, explain why in the Notes section
- Keep the table concise — one row per TODO, not one row per file changed
