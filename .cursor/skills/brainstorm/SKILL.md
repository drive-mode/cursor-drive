---
name: brainstorm
description: Explore WHAT to build before planning. Use before creative work; one-question-at-a-time, YAGNI, handoff to plan.
---

# Skill: Brainstorm

Clarify WHAT to build before HOW. One-question-at-a-time, YAGNI. Outputs to `docs/brainstorms/`; handoff to plan-system-maintainer or writing-plans.

## When to use

- User says "brainstorm", "explore this idea", "what should we build"
- Before creating features, components, or non-trivial changes
- When user intent is unclear; design before implementation

## Process

1. **Explore context** — project state, docs, recent commits
2. **Ask one question at a time** — purpose, constraints, success criteria
3. **Propose 2–3 approaches** — trade-offs, recommendation
4. **Present design** — scaled to complexity; get approval
5. **Write brainstorm** — `docs/brainstorms/YYYY-MM-DD-<topic>-brainstorm.md`
6. **Handoff** — invoke plan-system-maintainer or writing-plans for implementation plan

## Output location

`docs/brainstorms/YYYY-MM-DD-<topic>-brainstorm.md`

## Rules

- One question per message
- No implementation until design approved
- YAGNI; remove unnecessary scope
- No API keys or external services
- Terminal state: invoke writing-plans or plan-system-maintainer

## Relationship

- [compound-workflow](compound-workflow) — documents solutions after work
- [plan-system-maintainer](plan-system-maintainer) — plan governance after brainstorm
