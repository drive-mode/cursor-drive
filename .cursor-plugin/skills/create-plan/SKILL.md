---
name: create-plan
description: Guides creation of executable plans in .cursor/plans. Enforces frontmatter (planId, planType, parentPlanId, childPlanIds, dependsOn, todos), TODO-driven completion, and tiered model use for plan work. Use when creating or authoring a new plan, splitting plans, or when the user asks how to build or structure plans.
disable-model-invocation: true
---

# Create Plan

Guides how to build executable plans for Cursor Drive. Plans live in `.cursor/plans/*.plan.md` only (never `docs/plans/`).

**Use with:** skill `plan-system-maintainer` for sync and completion workflows.

## When to use this skill

- User asks how to build, structure, or write a plan
- Creating a new `.plan.md` file
- Splitting or refactoring plans
- Deciding what belongs in frontmatter vs body

## Required frontmatter

Every executable plan **must** include:

| Field | Type | Purpose |
|-------|------|---------|
| `planId` | string | Unique id (kebab-case); used in graph and refs |
| `planType` | string | `task` \| `workstream` \| `project` |
| `parentPlanId` | string | Parent plan id (e.g. `cursor-drive`) or empty for root |
| `childPlanIds` | string[] | Child plan ids; keep in sync when adding children |
| `dependsOn` | string[] | Plan ids that must complete before this one (ordering) |
| `todos` | array | **Required.** List of `{ id, content, status }`; see below |

Optional but useful: `name`, `overview`, `isProject: true` (root plan).

## Todos are mandatory

Plans are **TODO-driven**. Completion gate (plan-runner) treats a plan as complete only when all todos are `completed` or `cancelled`.

- **Enforce**: Every new or edited plan must have a `todos` array in frontmatter.
- Each todo: `id` (unique in plan), `content` (short description), `status`: `pending` | `in_progress` | `completed` | `cancelled`.
- Before implementation: mark the relevant todo `in_progress`. After finishing: mark `completed` (or `cancelled` with reason).
- Empty `todos: []` is allowed only for placeholder or meta plans; add at least one todo before execution.

Example:

```yaml
todos:
  - id: step-one
    content: "Implement X and add tests"
    status: pending
  - id: step-two
    content: "Update docs"
    status: pending
```

## Model and tier discipline

Use the **cheapest capable tier** for plan-related work (see `.cursor/rules/tiered-model-routing.mdc` and ADR-0010):

| Work | Tier | Model / action |
|------|------|----------------|
| Parse YAML, compute graph, validate refs | 0 | No LLM (code/script only) |
| Classify scope, triage dependencies | 1 | Cheapest (e.g. Haiku/flash) |
| Write plan content, draft TODOs, multi-file edits | 2 | User's default model |
| Deep semantic analysis, complex dep reasoning | 3 | Only on explicit user request |

- Prefer **Tier 0** for: planId consistency, parent/child/dependsOn checks, sync.
- When creating or editing plan **content** (narrative, TODOs, acceptance criteria), use **Tier 2** unless the user asks for a cheaper run; then use Tier 1 for short, structured output (e.g. "list 5 TODOs for this scope").
- **Never** auto-escalate to Tier 3 for plan authoring. Use Tier 3 only when the user explicitly asks for deep analysis or reasoning.

If the agent or tool supports a `model` parameter (e.g. in MCP or subagent calls), pass a cheaper model for Tier 1 tasks so plan authoring can stay affordable.

## Workflow: create a new plan

1. **Placement**: Create only `.cursor/plans/<name>.plan.md` (never under `docs/`).
2. **Frontmatter**: Set `planId`, `planType`, `parentPlanId`, `childPlanIds`, `dependsOn`, and **todos** (at least one with `status: pending`).
3. **Parent**: Update the parent plan's `childPlanIds` to include this plan's `planId`.
4. **Body**: Add purpose, scope, acceptance criteria, and a `## Reconciliation` placeholder (filled when closing the plan).
5. **Sync**: Run `/plan-sync` to update `plan-graph.yaml`, `registry.yaml`, and `plan-master.diagram.md`.

## Workflow: complete a plan

1. Mark all todos `completed` or `cancelled`.
2. Add a `## Reconciliation` section summarizing what was done.
3. Run `/plan-sync` (triggers completion gate: `npm test`, `npm run compile`).
4. To archive: move the plan to `.cursor/plans/archive/`, run `/plan-sync`.

## Other features to use

- **Reconciliation**: Required for completion gate. Short summary of outcomes and any follow-ups.
- **Blocker protocol**: If blocked, document severity, two alternatives, and what can continue unblocked (see `.cursor/rules/subagent-planning-discipline.mdc`).
- **Dep audit**: When adding or changing plans, run `/plan-audit-deps` and apply `dependsOn` in frontmatter; then `/plan-sync`.

## Anti-patterns

- Do **not** put executable plans in `docs/plans/` (reference/spec only).
- Do **not** create a plan without a `todos` array (or with only empty `todos: []` when the plan is meant to be executed).
- Do **not** load `plan-master.diagram.md`, `registry.yaml`, or `plan-graph.yaml` into prompts routinely; they are for humans and scripts.
- Do **not** use Tier 3 for routine plan authoring; reserve for explicit user request.

## Reference

- Plan lifecycle and sync: skill `plan-system-maintainer`, `.cursor/rules/plan-placement-and-lifecycle.mdc`
- TODO completion: `.cursor/rules/todo-driven-plan-completion.mdc`
- Tiered routing: `.cursor/rules/tiered-model-routing.mdc`, `docs/architecture/adr/ADR-0010-tiered-model-routing.md`
