---
name: TLDR Planning Scaffold
overview: "Add the directory structure and initial stub files for the TLDR Research Ops planning orchestrator: top-level PRD, ADR set and templates, root plan, plan graph/registry, and the orchestrator prompt as a runnable reference."
todos: []
isProject: false
---

# TLDR Research Ops — Planning Scaffold Plan

## Current state

- Repo has only [.gitignore](.gitignore), [.cursorignore](.cursorignore), and `.env`. No `docs/`, `.cursor/`, or source yet.
- All content below is additive; no conflicts.

## Target layout

```
tldr/
├── docs/
│   ├── prd/
│   │   ├── tldr-research-ops.prd.md    # Top-level PRD (your draft)
│   │   └── feature-prd-template.md     # Feature PRD template
│   ├── adr/
│   │   ├── template.md                  # ADR template (drop-in)
│   │   ├── ADR-0001-execution-scheduling.md
│   │   ├── ADR-0002-artifact-pipeline-schemas.md
│   │   ├── ADR-0003-auth-secrets-least-privilege.md
│   │   ├── ADR-0004-newsletter-ingestion.md
│   │   ├── ADR-0005-artifact-storage.md
│   │   ├── ADR-0006-safety-gates-codegen.md
│   │   ├── ADR-0007-repo-registry.md
│   │   └── ADR-0008-evaluation-feedback.md
│   └── guides/
│       └── orchestrator-prompt.md      # Full orchestrator prompt (copy-paste for runs)
├── .cursor/
│   └── plans/
│       ├── tldr-research-ops.plan.md   # Root plan (your template)
│       ├── plan-graph.yaml             # Plan graph stub
│       └── registry.yaml               # Plan registry stub
```

## File-by-file actions

### 1. PRD and templates

- **docs/prd/tldr-research-ops.prd.md** — Create with the full “INITIAL TOP-LEVEL PRD DRAFT” you provided (sections 1–10, no changes).
- **docs/prd/feature-prd-template.md** — Create with the “FEATURE PRD TEMPLATE” you provided.

### 2. ADR template and stubs

- **docs/adr/template.md** — Create with the “ADR TEMPLATE” you provided (Status/Date/Context/Decision/Alternatives/Consequences/Notes).
- **docs/adr/ADR-0001-execution-scheduling.md** through **ADR-0008-evaluation-feedback.md** — Create one file per ADR in the “STARTER ADR SET”:
  - YAML frontmatter or first line: title matching the set (e.g. “ADR-0001: Execution & Scheduling Strategy”).
  - Status: `Proposed`; Date: 2026-02-24.
  - Context: 1–2 sentences on scope (e.g. “Local MVP + GitHub Actions production” for ADR-0001).
  - Decision: “TBD” or one sentence placeholder.
  - Alternatives considered: “To be filled when decision is made.”
  - Consequences: “To be filled when decision is made.”
  - Notes: Optional one-line reminder (e.g. “Implements FR9 / NFR4”).

### 3. Root plan and plan metadata

- **.cursor/plans/tldr-research-ops.plan.md** — Create with the “ROOT PLAN TEMPLATE” you provided. Leave `childPlanIds: []` and workstream index empty; orchestrator will fill these when child plans exist.
- **.cursor/plans/plan-graph.yaml** — Create minimal stub so the orchestrator has something to update:
  - Single node for `tldr-research-ops` (path, title, parentPlanId: null, childPlanIds: []).
  - Optional: short comment describing that nodes/edges are added as child plans are created.
- **.cursor/plans/registry.yaml** — Create minimal stub:
  - Registry format (e.g. `plans: []` or one entry for the root plan with planId, file path, scope).
  - Optional: comment that the orchestrator maintains this.

### 4. Orchestrator prompt

- **docs/guides/orchestrator-prompt.md** — Create with the full “PROMPT — TLDR Research Ops Planning Orchestrator” text (Role through Final output). This gives a single copy-paste source for running the orchestrator in Cursor without editing code.

## Out of scope for this scaffold

- No implementation code, no pipeline stages, no schemas/templates for artifacts (e.g. EvidencePack, LearningPlan). Those belong in later workstreams per the PRD.
- No Cursor rules or commands that invoke the orchestrator; the prompt is the contract.
- No changes to `.gitignore` / `.cursorignore` (`.env` already ignored).

## Verification (read-only)

- All paths under `docs/` and `.cursor/plans/` exist and are non-empty.
- PRD contains the 10 sections; ADR template has all required sections; root plan has YAML frontmatter and execution strategy section placeholder.
- `plan-graph.yaml` and `registry.yaml` are valid YAML and reference the root planId.

## Execution order

1. Create directories: `docs/prd`, `docs/adr`, `docs/guides`, `.cursor/plans`.
2. Create PRD + feature PRD template.
3. Create ADR template + 8 ADR stubs.
4. Create root plan, plan-graph stub, registry stub.
5. Create orchestrator prompt in `docs/guides/orchestrator-prompt.md`.
6. Spot-check: list created files and confirm no broken references in root plan (e.g. PRD path `docs/prd/tldr-research-ops.prd.md`).

## Risks and notes

- **Naming**: ADR filenames use kebab-case and numbers (e.g. `ADR-0001-execution-scheduling.md`). If you prefer a different convention (e.g. `ADR-0001-Execution-Scheduling.md`), adjust the list above.
- **Plan graph/registry schema**: Orchestrator prompt does not define an exact YAML schema. Stubs should be minimal and consistent with “plan catalog” and “registry” described in the prompt (planId, file path, parent/child, scope); exact keys can be refined when the orchestrator is first run.
- **Single root plan**: No child plans or workstream plans are created in this scaffold; the orchestrator will create them in Phase 3.
