---
name: Merge Test Roler to Business Repo
overview: Selectively merge beneficial code from the test roler repo into the business roler_ai repo, producing a diff inventory and an actionable merge list while preserving GitHub-related code in the target.
todos: []
isProject: false
---

# Merge Test Roler to Business Repo

## Context

- **SOURCE (test):** `C:\Users\harri\Documents\Coding Projects\test\roler`
- **TARGET (business):** `C:\Users\harri\Documents\Coding Projects\business\roler_ai\roler`
- **Goal:** Migrate beneficial changes to TARGET, then retire SOURCE without losing good ideas
- **Constraint:** Do NOT remove or overwrite GitHub-related code in TARGET (e.g. `plan-push-github`, `plan_push_github.sh`)

Both repos share remote `origin` (rolefinder/roler) and branch `Harrison/PM`. TARGET has files SOURCE does not; SOURCE has uncommitted changes and new files from recent work (resume formatting, format spec, etc.).

---

## Phase 1: Compile Full Diff Inventory

### 1.1 Files Only in SOURCE (Add to TARGET)


| Path                                                                | Category    | Notes                                                                  |
| ------------------------------------------------------------------- | ----------- | ---------------------------------------------------------------------- |
| `src/roler/cli/commands/resume.py`                                  | Resume CLI  | `roler resume export` command                                          |
| `src/roler/tailoring/resume_css.py`                                 | Resume PDF  | Shared CSS for WeasyPrint/xhtml2pdf                                    |
| `docs/guides/reference/resume-formatting.md`                        | Docs        | Markdown/PDF constraints                                               |
| `docs/guides/reference/resume-format-spec.md`                       | Docs        | Automation spec (design philosophy, bullet structure, metrics framing) |
| `docs/guides/reference/resume-formatting-logic.md`                  | Docs        | If exists; verify                                                      |
| `.cursor/rules/resume-formatting.mdc`                               | Cursor rule | Regenerate PDF after edits                                             |
| `data/resumes/master/November 2025 HarrisonHalperin_Resume.docx.md` | Data        | Master resume (reference)                                              |
| `data/roles/JD Solutions Architect.md`                              | Data        | Role/job description                                                   |
| `scripts/resume_to_pdf.py`                                          | Script      | Standalone PDF script (if used)                                        |


### 1.2 Files Only in TARGET (Preserve — Do Not Overwrite)


| Path                                                            | Reason                                 |
| --------------------------------------------------------------- | -------------------------------------- |
| `.cursor/commands/plan-push-github.md`                          | GitHub automation — user wants to keep |
| `scripts/plan_push_github.sh`                                   | GitHub automation — user wants to keep |
| `data/resumes/January 2026 HarrisonHalperin_Resume.one-page.md` | Alternate resume format in TARGET      |


### 1.3 Files That Differ (Content Comparison Needed)

**src/** — Tailoring, CLI, profile, storage:


| File                                           | Likely Change                        | Risk   |
| ---------------------------------------------- | ------------------------------------ | ------ |
| `src/roler/cli/main.py`                        | May register `resume` command        | Low    |
| `src/roler/cli/commands/__init__.py`           | Adds `resume` import                 | Low    |
| `src/roler/tailoring/resume_css.py`            | N/A (SOURCE only)                    | —      |
| `src/roler/tailoring/pdf_template.py`          | Uses resume_css, inject_list_bullets | Medium |
| `src/roler/tailoring/section_prompts.py`       | May include format-spec rules        | Medium |
| `src/roler/tailoring/knowledge_base.py`        | Profile/resume loading               | Medium |
| `src/roler/tailoring/persistence.py`           | Resume persistence                   | Medium |
| `src/roler/tailoring/resume_parser.py`         | Resume parsing                       | Medium |
| `src/roler/tailoring/agent_client.py`          | Agent integration                    | Medium |
| `src/roler/data_contracts/entities/profile.py` | Profile schema                       | Medium |
| `src/roler/shared/models/profile.py`           | Profile model                        | Medium |
| `src/roler/shared/storage/local.py`            | Storage layer                        | Medium |
| `src/roler/hooks/validator.py`                 | Hooks validation                     | Low    |


**Config:**


| File             | Change                                          |
| ---------------- | ----------------------------------------------- |
| `pyproject.toml` | SOURCE adds `xhtml2pdf>=0.2.0` in `[pdf]` extra |


**.cursor/** — Plans, rules, MCP:


| File                                                           | Notes                                                               |
| -------------------------------------------------------------- | ------------------------------------------------------------------- |
| `.cursor/plans/github_planning_orchestration_c1e92ec8.plan.md` | May differ; avoid overwriting if TARGET has GitHub-specific content |
| `.cursor/plans/implement.plan.md`                              | General plans — compare                                             |
| `.cursor/plans/plan-graph.yaml`                                | Plan graph — compare                                                |
| `.cursor/rules/resume-formatting.mdc`                          | SOURCE only (add)                                                   |
| `.cursor/rules/skill-usage.mdc`                                | Compare                                                             |
| `.cursor/mcp.json`                                             | MCP config — compare; preserve GitHub MCP if present in TARGET      |


---

## Phase 2: Diffs to Push (Beneficial Merge List)

### 2.1 High-Value Additions (Copy New Files)

1. **Resume pipeline**
  - `src/roler/cli/commands/resume.py`
  - `src/roler/tailoring/resume_css.py`
  - Register `resume` in `cli/commands/__init__.py` and `cli/main.py`
2. **Documentation**
  - `docs/guides/reference/resume-formatting.md`
  - `docs/guides/reference/resume-format-spec.md`
  - Add entry in [docs/guides/INDEX.md](docs/guides/INDEX.md)
3. **Cursor rule**
  - `.cursor/rules/resume-formatting.mdc`
4. **Data (optional)**
  - `data/resumes/master/January 2026 HarrisonHalperin_Resume.docx.md` (if TARGET should use this master)
  - `data/roles/JD Solutions Architect.md` (role reference)
5. **Dependency**
  - Add `xhtml2pdf>=0.2.0` to `pyproject.toml` `[project.optional-dependencies]` pdf extra

### 2.2 Content Merges (Selective Diff Apply)

For each differing file, run `diff SOURCE/file TARGET/file` and manually or programmatically apply only the beneficial hunks. Priority:

1. **pdf_template.py** — Ensure it uses `resume_css.RESUME_CSS` and `inject_list_bullets`
2. **section_prompts.py** — Add format-spec rules (achieved X by Y resulting in Z, metrics framing, one-page)
3. **tailoring/** — Knowledge base, persistence, resume_parser: apply changes that support resume export
4. **cli/main.py** — Add `resume` typer if missing

### 2.3 Explicit Exclusions (Do Not Push)

- Deletion of `plan-push-github.md` or `plan_push_github.sh` (they exist only in TARGET; never add a "delete" for them)
- Any diff that removes PR-merge, PR-discovery, or GitHub MCP configuration from TARGET
- `.cursor/plans/` changes that remove or weaken GitHub planning workflows
- Uncommitted or experimental changes in SOURCE that are not clearly beneficial

---

## Phase 3: Execution Approach

### Option A: Manual Copy + Merge (Recommended)

1. Copy new files from SOURCE to TARGET (resume.py, resume_css.py, docs, .cursor/rules).
2. Edit TARGET's `__init__.py`, `main.py`, `pyproject.toml` to add resume CLI and xhtml2pdf.
3. For differing files, open side-by-side diff and apply beneficial hunks only.
4. Run `roler resume export --no-validate` in TARGET to verify.
5. Commit in TARGET; optionally delete SOURCE when satisfied.

### Option B: Scripted Diff + Patch

1. Generate patch files for each "push" diff: `diff -u TARGET/file SOURCE/file > file.patch`
2. Filter patches to exclude GitHub-related removals.
3. Apply patches to TARGET: `patch -p1 < file.patch` (with backup).
4. Resolve conflicts manually.

### Option C: Subagent-Assisted Merge

1. Use `mcp_task` with `shell` or `generalPurpose` subagent to run `diff` and produce a structured diff report.
2. Use a second subagent to apply approved diffs via `patch` or direct file edits.
3. Human reviews and commits.

---

## Deliverables

1. **Diff inventory** — Markdown or CSV listing all SOURCE vs TARGET differences (from Phase 1).
2. **Merge checklist** — Ordered list of files/actions to perform (from Phase 2).
3. **Exclusion list** — Files and change types to never push (from Phase 2.3).

---

## Verification

After merge:

- `roler resume export -i data/resumes/master/January\ 2026\ HarrisonHalperin_Resume.docx.md` runs in TARGET
- PDF generates without error
- `plan-push-github.md` and `plan_push_github.sh` still exist in TARGET
- `pytest tests/` passes in TARGET
