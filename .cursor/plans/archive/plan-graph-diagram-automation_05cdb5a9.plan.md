---
planId: plan-graph-diagram-automation
planType: task
parentPlanId: null
childPlanIds: []
dependsOn: []
name: plan-graph-diagram-automation
overview: "Automate plan lifecycle bookkeeping: keep `.cursor/plans/plan-graph.yaml` + `.cursor/plans/registry.yaml` accurate and generate a dark-mode Mermaid master diagram (`.cursor/plans/plan-master.diagram.md`) whenever `.plan.md` files change or complete."
todos:
  - id: runner-sync-all
    content: "Extend `.cursor/hooks/plan-runner.py` with a deterministic `sync-all` path: scan `.cursor/plans/*.plan.md` + archive/, parse frontmatter (including new `dependsOn`), compute states, update `plan-graph.yaml`, then write `registry.yaml`."
    status: completed
  - id: completion-gate-on-transition
    content: Change completion gating to run only when a plan transitions to TODO-empty (avoid re-running `npm test`/`npm run compile` on every stop). Record gate results in `registry.yaml` so re-sync is fast and idempotent.
    status: completed
  - id: generate-plan-master-diagram
    content: "Add Mermaid generation to `plan-runner.py` producing `.cursor/plans/plan-master.diagram.md` with: overview + detailed subgraphs, wrapped labels, state styling, and a single-word theme switch (`dark`→`default`)."
    status: completed
  - id: commands-and-skills
    content: Add `.cursor/commands/plan-sync.md` and `.cursor/commands/plan-audit-deps.md`, plus a new skill `.cursor/skills/plan-system-maintainer/SKILL.md` (and optional `plan-dependency-auditor`) covering sync workflow + diagram styling invariants + cheap-model subagent prompts.
    status: completed
  - id: hook-wiring
    content: Update `.cursor/hooks.json` to run the new sync on `beforeSubmitPrompt` (hash-based no-op when unchanged) and full sync on `stop`/`subagentStop`, keeping emitted JSON minimal and path-free.
    status: completed
  - id: rule-fixes-and-doc-touchups
    content: Update existing plan rules that reference missing `docs/planning-system/README.md` / missing `plan-system-maintainer` so the planning workflow points at the new skill and the generated master diagram.
    status: completed
isProject: false
---

# Automated plan sync + master diagram

## Goal

- Keep **plan status + hierarchy + dependencies** up to date across:
  - `.cursor/plans/plan-graph.yaml`
  - `.cursor/plans/registry.yaml`
  - `.cursor/plans/plan-master.diagram.md` (dark-mode Mermaid, 1 variant)
- Make theme switching a **single-word change** (`dark` → `default`).
- Allow dependency-edge updates to be **auto-maintained** via a cheap-model subagent, but only when needed.

## Baseline (what exists)

- Hook runner: `.cursor/hooks/plan-runner.py`
  - Validates `plan-graph.yaml` and syncs `registry.yaml` on `stop`/`subagentStop`.
  - Currently does **not** update plan-graph states/hierarchy, and does **not** generate a Mermaid diagram.
- Hooks wired in `.cursor/hooks.json` (`beforeSubmitPrompt`, `sessionStart`, `stop`, `subagentStop`).

## Target contract (source of truth)

- **Plan docs** (`.cursor/plans/*.plan.md`) are the source of truth for:
  - `planId`, `planType`, `parentPlanId`, `childPlanIds`
  - **NEW**: optional `dependsOn: []` in frontmatter (authoritative for `depends_on` edges)
- `plan-graph.yaml` becomes **auto-synced** from plan doc frontmatter for:
  - `file`, `title`, `plan_type`, `parent_plan_id`, `child_plan_ids`, `depends_on`, `state`
  - (Keep global `settings`, `workflows`, `completion_criteria`, `required_checks`, `evidence` as-is unless explicitly moved.)
- `registry.yaml` is a derived index with stable numeric IDs + computed status.
- `plan-master.diagram.md` is **generated** from the synced graph + computed status.

## Automation flow

- On `beforeSubmitPrompt`: do a **fast no-op if unchanged** sync (hash-based) so manual plan edits get picked up as soon as you submit a prompt.
- On `stop`/`subagentStop`: do a **full sync** (graph + registry + diagram) and run completion gates **only for plans that just became TODO-empty**.

## Diagram output (dark-mode only)

- File: `.cursor/plans/plan-master.diagram.md`
- Contains:
  - An **Overview** Mermaid diagram (projects + top-level plans)
  - A **Details** diagram (plans grouped by project via nested `subgraph`s)
  - A small legend (state styling)
- Mermaid init directive starts with:
  - `%%{init: {"theme":"dark"}}%%`
  - Switching to light is a single-word edit: `dark` → `default`
- State styling should be **theme-safe** (avoid hard-coded fill/text colors; use borders/dash patterns + concise state tags in labels).
- Labels should be wrapped (insert `<br/>`) to prevent ultra-wide nodes.

## Cheap-model dependency maintenance (only when needed)

- Add/standardize plan frontmatter field: `dependsOn: [plan-id, ...]`.
- Add a command + skill that:
  - Diffs recently-changed `.plan.md` files and (optionally) relevant `src/` modules
  - Uses a cheaper subagent to propose **only** `dependsOn` edge changes
  - Applies those changes, then runs the sync script
- Trigger heuristics (no auto-run on every turn):
  - New plan created
  - `planId/planType/parentPlanId/childPlanIds/dependsOn` changed
  - A plan references a new child plan ID

## Verification

- Run the sync script directly and confirm it updates/creates:
  - `.cursor/plans/registry.yaml`
  - `.cursor/plans/plan-master.diagram.md`
  - and reconciles `plan-graph.yaml` state/hierarchy with plan docs
- Open `plan-master.diagram.md` in Markdown preview and confirm Mermaid renders legibly in dark mode.
- Confirm hook output remains **path-safe** (no raw file paths emitted).
