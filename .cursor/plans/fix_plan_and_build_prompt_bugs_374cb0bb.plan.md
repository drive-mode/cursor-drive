---
name: Fix Plan and Build Prompt Bugs
overview: "Fix four verified bugs: (1) realign MVP plan TODOs with phases table and build prompt, (2) set roler-rename state to cancelled in plan-graph, (3) add implement and child plans to plan-graph.yaml, (4) correct architecture-overview path in build-mvp.md."
todos: []
isProject: false
---

# Fix Plan and Build Prompt Bugs

## Verification Summary

All four bugs are confirmed:

- **Bug 1**: TODOs in `roller-mvp-full-build.plan.md` are shifted — Phase 2 (Agent Framework) is missing; phase-2 through phase-8 map to wrong content.
- **Bug 2**: `roler-rename` has `state: in_progress` in plan-graph but plan file says CANCELLED.
- **Bug 3**: `implement`, `github-planning-orchestration`, `project-plan-orchestration` exist as `.plan.md` files but have no entries in `plan-graph.yaml`; `/orchestrate` resolution fails.
- **Bug 4**: Build prompt references `docs/guides/architecture-overview.md`; actual path is `docs/guides/architecture/architecture-overview.md`.

---

## Bug 1: Realign MVP Plan TODOs

**File:** `[.cursor/plans/roller-mvp-full-build.plan.md](.cursor/plans/roller-mvp-full-build.plan.md)`

**Current vs correct mapping:**


| Phase | Build prompt / table              | Current TODO (wrong)             | Correct TODO            |
| ----- | --------------------------------- | -------------------------------- | ----------------------- |
| 0     | Storage + Dev Environment         | phase-0-foundation               | phase-0-foundation      |
| 1     | Pipeline Components               | phase-1-local-pipeline           | phase-1-local-pipeline  |
| 2     | Agent Framework + Prompt Registry | — (missing)                      | phase-2-agent-framework |
| 3     | Quality Gates                     | phase-2-quality-gates            | phase-3-quality-gates   |
| 4     | LangGraph Orchestration + E2E     | phase-3-orchestration            | phase-4-orchestration   |
| 5     | Web API                           | phase-4-web-api                  | phase-5-web-api         |
| 6     | Web Frontend                      | phase-5-web-frontend             | phase-6-web-frontend    |
| 7     | Outreach + Cover Letters          | phase-7-testing (wrong content)  | phase-7-outreach        |
| 8     | Cloud Infra + Integration Tests   | phase-8-outreach (wrong content) | phase-8-infra-tests     |


**Edits:**

1. Insert `phase-2-agent-framework` after `phase-1-local-pipeline`.
2. Rename and recontent: phase-2-quality-gates → phase-3-quality-gates, phase-3-orchestration → phase-4-orchestration, phase-4-web-api → phase-5-web-api, phase-5-web-frontend → phase-6-web-frontend.
3. Replace phase-7-testing with phase-7-outreach (Outreach content).
4. Replace phase-8-outreach with phase-8-infra-tests (Cloud Infra + Integration Tests content).

**Build prompt updates:** Add explicit TODO update instructions for each phase commit in `[.cursor/commands/build-mvp.md](.cursor/commands/build-mvp.md)` so the agent updates the correct IDs (Phase 1 commit: set phase-1 completed, phase-2 in_progress; Phase 2: phase-2 completed, phase-3 in_progress; etc.).

---

## Bug 2: roler-rename State

**File:** `[.cursor/plans/plan-graph.yaml](.cursor/plans/plan-graph.yaml)`

**Edit:** Change `roler-rename` entry (lines 233–253) from `state: in_progress` to `state: cancelled`.

---

## Bug 3: Add Missing Plan Graph Entries

**File:** `[.cursor/plans/plan-graph.yaml](.cursor/plans/plan-graph.yaml)`

**Add three entries** (after `roller-mvp-full-build`, before `workflows:`):

1. **implement** — project plan, default `/orchestrate` entry point:
  - `id: implement`
  - `file: .cursor/plans/implement.plan.md`
  - `parent_plan_id: null`
  - `child_plan_ids: [github-planning-orchestration, project-plan-orchestration]`
  - `state: in_progress` (per implement.plan.md active coordination)
  - `plan_type: project`
  - Completion criteria and evidence from implement.plan.md
2. **github-planning-orchestration** — child of implement:
  - `id: github-planning-orchestration`
  - `file: .cursor/plans/github_planning_orchestration_c1e92ec8.plan.md`
  - `parent_plan_id: implement`
  - `child_plan_ids: []`
  - `state: completed` (all todos completed in plan file)
  - `plan_type: workstream`
3. **project-plan-orchestration** — child of implement:
  - `id: project-plan-orchestration`
  - `file: .cursor/plans/project_plan_orchestration_7aec91f2.plan.md`
  - `parent_plan_id: implement`
  - `child_plan_ids: []`
  - `state: in_progress` (todos still pending)
  - `plan_type: workstream`

---

## Bug 4: Architecture Path in Build Prompt

**File:** `[.cursor/commands/build-mvp.md](.cursor/commands/build-mvp.md)`

**Edit:** Line 81 — change `docs/guides/architecture-overview.md` to `docs/guides/architecture/architecture-overview.md`.

---

## Verification

- Run `python .cursor/hooks/plan-runner.py sessionStart` (or equivalent) to validate plan-graph.
- Confirm `/orchestrate` resolves to `implement` when no plan-id given.
- Confirm build prompt pre-flight step 2 can resolve the architecture file path.
