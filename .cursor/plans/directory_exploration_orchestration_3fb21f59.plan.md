---
name: Directory Exploration Orchestration
overview: Orchestrate foreground subagents per directory and parallel background subagents per file to explore roler and roler_ui directories, then iteratively update the plan with granular todos derived from the exploration.
todos: []
isProject: false
---

# Directory Exploration Orchestration Plan

## Objective

Explore specified directories in **roler** and **roler_ui** using:

- **Foreground subagents** (one per directory) — explore structure, coordinate, update plan
- **Background subagents** (one per file, parallel) — read full file content at each layer
- **Recursive application** — nested folders get the same pattern at each layer
- **Output** — iteratively update this plan with detail to create granular todos

---

## Directory Inventory (from pre-scan)


| Workspace | Directory                    | Files | Nested dirs                                                                                           |
| --------- | ---------------------------- | ----- | ----------------------------------------------------------------------------------------------------- |
| roler     | `docs/prd`                   | 11    | 0                                                                                                     |
| roler     | `docs/adr`                   | 24    | 0                                                                                                     |
| roler     | `src/roler/data_contracts`   | 23    | 4 (entities, stages, export, derived)                                                                 |
| roler     | `docs/diagrams/data`         | 5     | 0                                                                                                     |
| roler     | `docs/diagrams/architecture` | 12    | 0                                                                                                     |
| roler     | `docs/diagrams/flows`        | 12    | 0                                                                                                     |
| roler     | `docs/diagrams/product`      | 2     | 0                                                                                                     |
| roler_ui  | `src`                        | 38    | 6 (pages, components, components/ui, components/profile, components/layout, lib, hooks, stores, docs) |


**Total:** ~125 files across 8 top-level + nested directories.

---

## Orchestration Strategy

### Alternative A: Per-file background (strict)

- **Pros:** Maximum parallelism, each file read independently
- **Cons:** 125+ subagent spawns; potential rate limits; high cost
- **Verdict:** Reject for scale

### Alternative B: Per-directory background (batched)

- **Pros:** Fewer subagents (~20–25); each reads all files in one dir
- **Cons:** Slightly less parallelism; large dirs (e.g. adr with 24 files) in one agent
- **Verdict:** Prefer for balance

### Alternative C: Hybrid — foreground per dir, background per leaf-dir batch

- **Pros:** Foreground explores and reports; background reads only leaf-dir contents; clear layering
- **Cons:** Two-phase; foreground must complete before spawning background
- **Verdict:** Adopt — matches "foreground per directory, background per file" by treating "batch of files in directory" as the unit

### Chosen approach

1. **Layer 0 (top-level):** One foreground `explore` per specified directory.
2. **Foreground task:** List all files and nested dirs; return structure.
3. **Layer 1+ (nested):** For each nested dir, spawn another foreground `explore` (recursive).
4. **Background (per directory with files):** For each dir that has files, spawn one `generalPurpose` background subagent to read all files in that dir and return summaries.
5. **Plan update:** After each foreground completes, append discovered structure to plan; after each background completes, append insights. Final pass: derive granular todos from combined output.

---

## Execution Phases

### Phase 1: Foreground exploration (layer 0)

Spawn 8 foreground `explore` subagents (one per top-level dir). Each returns:

- Full file list with paths
- Nested directory list
- Brief description of directory purpose


| Todo ID         | Directory                        | Subagent type | Run mode   |
| --------------- | -------------------------------- | ------------- | ---------- |
| fg-prd          | roler/docs/prd                   | explore       | foreground |
| fg-adr          | roler/docs/adr                   | explore       | foreground |
| fg-dc           | roler/src/roler/data_contracts   | explore       | foreground |
| fg-diag-data    | roler/docs/diagrams/data         | explore       | foreground |
| fg-diag-arch    | roler/docs/diagrams/architecture | explore       | foreground |
| fg-diag-flows   | roler/docs/diagrams/flows        | explore       | foreground |
| fg-diag-product | roler/docs/diagrams/product      | explore       | foreground |
| fg-ui-src       | roler_ui/src                     | explore       | foreground |


**Prompt template (inject per dir):**

```
Explore directory {path} in workspace {roler|roler_ui}. Return: (1) full list of files with relative paths, (2) list of nested subdirectories, (3) one-sentence purpose of this directory. Path: {absolute_path}.
```

### Phase 2: Foreground exploration (nested layers)

From Phase 1 output, spawn foreground `explore` for each nested dir:

- `roler/src/roler/data_contracts/entities`
- `roler/src/roler/data_contracts/stages`
- `roler/src/roler/data_contracts/export`
- `roler/src/roler/data_contracts/derived`
- `roler_ui/src/pages`
- `roler_ui/src/components`
- `roler_ui/src/components/ui`
- `roler_ui/src/components/profile`
- `roler_ui/src/components/layout`
- `roler_ui/src/lib`
- `roler_ui/src/hooks`
- `roler_ui/src/stores`
- `roler_ui/src/docs`

### Phase 3: Background file readers (parallel)

For each directory that contains files (from Phase 1–2), spawn one background `generalPurpose` subagent to read all files in that dir and return:

- File path → 2–3 sentence summary (purpose, key types/APIs, dependencies)
- Cross-references (e.g. PRD → ADR, entity → stage)

**Batching:** One background subagent per directory (not per file) to cap total spawns.


| Batch                    | Directories                     | Est. files |
| ------------------------ | ------------------------------- | ---------- |
| bg-prd                   | docs/prd                        | 11         |
| bg-adr                   | docs/adr                        | 24         |
| bg-dc-root               | data_contracts (root files)     | 4          |
| bg-dc-entities           | data_contracts/entities         | 6          |
| bg-dc-stages             | data_contracts/stages           | 7          |
| bg-dc-export             | data_contracts/export           | 3          |
| bg-dc-derived            | data_contracts/derived          | 3          |
| bg-diag-data             | docs/diagrams/data              | 5          |
| bg-diag-arch             | docs/diagrams/architecture      | 12         |
| bg-diag-flows            | docs/diagrams/flows             | 12         |
| bg-diag-product          | docs/diagrams/product           | 2          |
| bg-ui-pages              | roler_ui/src/pages              | 4          |
| bg-ui-components         | roler_ui/src/components (root)  | 0          |
| bg-ui-components-ui      | roler_ui/src/components/ui      | 16         |
| bg-ui-components-profile | roler_ui/src/components/profile | 6          |
| bg-ui-components-layout  | roler_ui/src/components/layout  | 1          |
| bg-ui-lib                | roler_ui/src/lib                | 1          |
| bg-ui-hooks              | roler_ui/src/hooks              | 1          |
| bg-ui-stores             | roler_ui/src/stores             | 1          |
| bg-ui-docs               | roler_ui/src/docs               | 1          |
| bg-ui-root               | roler_ui/src (root files)       | 6          |


### Phase 4: Synthesis and plan update

1. **Collate** all foreground + background outputs.
2. **Update plan** with:
  - Per-directory structure and purpose
  - Per-file summaries and cross-refs
  - Discovered relationships (PRD ↔ ADR, entity ↔ stage, UI ↔ API)
3. **Derive granular todos** — e.g. "Align ApplicationStatus in data_contracts/entities/application.py with frontend AppStatus", "Wire ApplicationsPanel to useApplication hook", etc.

---

## Subagent Prompt Templates

### Foreground explore

```
Explore directory {ABSOLUTE_PATH} in the roler/roler_ui workspace. Return markdown with: (1) Full list of files (relative path from this dir), (2) List of nested subdirectories, (3) One-sentence purpose of this directory. Workspace root: {WORKSPACE_ROOT}.
```

### Background file reader

```
Read all files in directory {ABSOLUTE_PATH}. For each file, provide: (1) Path, (2) 2-3 sentence summary (purpose, key types/APIs/exports, dependencies), (3) Cross-references to other files (PRDs, ADRs, entities, UI components). Output as structured markdown. Workspace root: {WORKSPACE_ROOT}.
```

---

## Plan Update Sections (to append)

After each phase, append to this plan:

### Section: Discovered Structure

```
## Discovered Structure (Phase 1–2)
[Per-directory tree and purpose]
```

### Section: File Summaries

```
## File Summaries (Phase 3)
[Per-file summaries and cross-refs]
```

### Section: Granular Todos

```
## Granular Todos (Phase 4)
[Ordered, actionable tasks derived from exploration]
```

---

## Constraints

- **Foreground first:** Phase 1–2 must complete before Phase 3 (background needs dir lists).
- **No code edits:** Exploration only; plan updates are append-only.
- **Workspace paths:** Use absolute paths; roler and roler_ui are separate roots.
- **mcp_task:** Inject context via prompt; no attachments parameter.

---

## References

- [spawn-instructions](.cursor/skills/orchestrate-parallel-work/reference/spawn-instructions.md)
- [Backend-Frontend Connection Requirements](.cursor/plans/backend-frontend_connection_requirements_e2851a25.plan.md) — target plan to enrich with granular todos
