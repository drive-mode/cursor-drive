---
name: compound-workflow
description: Document solved problems so knowledge compounds. Use when user says "document this solution", "capture what we learned", or after fixing a non-trivial bug.
---

# Skill: Compound Workflow

Document solved problems so knowledge compounds. Write to `docs/solutions/` with a structured template.

## When to use

- User says "document this solution", "capture what we learned", "write this up"
- After fixing a non-trivial bug or implementing a non-obvious feature
- User asks to "compound" or "record" the solution for future reference

## Output location

`docs/solutions/<kebab-topic>-<short-hash>.md` — e.g. `docs/solutions/windows-path-tests-a1b2c3d.md`

## Template

```markdown
# <Problem title>

## Problem

What was broken or unclear. One paragraph.

## Context

- Relevant files, modules, or constraints
- Why the obvious fix didn't work (if applicable)

## Solution

What we did. Code snippets if helpful. Keep minimal.

## Verification

How to confirm it works (e.g. `npm test`, manual check).

## References

- ADR, doc, or external link if relevant
```

## Rules

- No API keys or external services required
- One solution per file
- Use kebab-case for filename
- Add a short hash (e.g. first 6 of git rev-parse) if topic name might collide
- Link from related ADRs or design docs when appropriate
