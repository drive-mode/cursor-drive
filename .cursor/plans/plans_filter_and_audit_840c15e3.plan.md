---
name: Plans Filter and Audit
overview: "(1) Update plan-save-to-workspace hook to skip copying plans that are already completed (all todos completed/cancelled). (2) Define and run a parallel subagent audit of .cursor/plans/: classify each plan as completed | active | superseded | duplicate, then archive completed and superseded, delete duplicates (keep canonical), and keep only active plans in the root."
todos: []
isProject: false
---

# Plans Filter and Audit

## Part 1: Hook — Skip Completed Plans

**Goal:** When copying from `CURSOR_PLANS_SOURCE` (~/.cursor/plans) into the workspace, do **not** copy a plan if it has already been completed (so the workspace is not refilled with finished work).

**Completion rule (align with plan-runner):** A plan is *completed* when every item in frontmatter `todos` has `status` in `completed` or `cancelled`. Plans with no `todos` or empty `todos: []` are treated as *not completed* (copy them).

**File:** [.cursor/hooks/plan-save-to-workspace.py](.cursor/hooks/plan-save-to-workspace.py)

- Add a helper `_is_completed(frontmatter: dict) -> bool`: same logic as `_remaining_todos` in plan-runner — iterate `todos`; if any item has `status` not in `{"completed", "cancelled"}`, return `False`; if no todos or all done, return `True` for "all done" (only when `todos` is non-empty and every status is completed/cancelled).
- In the copy loop, **before** deciding to copy:
  - If the **source** plan’s frontmatter is completed (`_is_completed(fm_source)`), **skip** (do not copy; increment skipped). So we never bring in a plan that’s already done.
  - If the **destination** already exists, read its frontmatter; if the destination is completed (`_is_completed(fm_dest)`), **skip** (do not overwrite a completed workspace plan with a newer copy from source). Optionally: if source is newer but source is not completed, still copy to update an active plan.
- No change to sync-registry behavior (still run after any copy).

**Result:** Only active (incomplete) plans are copied from global into the workspace; completed ones are left out.

---

## Part 2: Parallel Subagent Audit of .cursor/plans/

**Goal:** Audit every `.plan.md` in `.cursor/plans/` (excluding `archive/` and any subdirs under archive). Classify each as **completed** | **active** | **superseded** | **duplicate**, then: archive completed and superseded, delete duplicates (keep one canonical per group), leave active plans in place.

**Scope:** Only files under `.cursor/plans/*.plan.md` (top-level). Do not move or delete anything under `.cursor/plans/archive/`.

### 2.1 Classification

- **completed:** Frontmatter `todos` exists, non-empty, and every item has `status` in `completed` or `cancelled`. Same as `_is_completed` above.
- **active:** Not completed; plan is still relevant (not superseded, not a duplicate). Keep in `.cursor/plans/`.
- **superseded:** Plan is obsolete because a newer or canonical plan covers the same scope (e.g. same `planId` or very similar name/overview and another plan is clearly the one to use). Heuristic: same `planId` with a different filename (e.g. `agent_screen_implementation.plan.md` vs `agent_screen_implementation_948b0a8a.plan.md`) → treat hash-suffix one as superseded by the clean `planId.plan.md`; or if two plans have same/similar name and one has a Reconciliation section and is completed, the other can be superseded. Subagents can use name/planId/overview similarity and completion status to suggest superseded.
- **duplicate:** Same plan in two files (e.g. same content hash, or same planId and nearly identical body). One is canonical (e.g. `planId.plan.md`), the other is duplicate and should be **deleted** (not archived).

### 2.2 Parallel audit workflow

1. **List:** Collect all `.cursor/plans/*.plan.md` (top-level only), sort by path. Do not include `.cursor/plans/archive/` or below.
2. **Chunk:** Split the list into N chunks (e.g. N = 4–8). Each chunk is a list of relative paths (e.g. `agent_screen_implementation.plan.md`, `cursor-drive.plan.md`, …).
3. **Subagent task (per chunk):** For each path in the chunk:
  - Read the file; parse frontmatter (and optionally first 500 chars of body).
  - Compute: completed (via todos), planId, name, overview.
  - For **duplicate detection:** same planId as another file in the same chunk or in a shared “canonical” list: if two files share planId, the one with filename exactly `{planId}.plan.md` is canonical; the other (e.g. `{planId}_{hash}.plan.md`) is duplicate. If no planId, use content hash or name; if two files have same normalised name (e.g. strip hash suffix), treat as duplicate and keep the one with cleaner name.
  - For **superseded:** If plan is completed and another plan with same/similar scope (same planId or very similar name) exists and is the canonical one, mark this file as superseded. Or if this file has a hash suffix and a clean `planId.plan.md` exists, mark this as superseded by that.
  - Emit one record per file: `{ path, classification: "completed"|"active"|"superseded"|"duplicate", reason?: string, canonicalPath?: string }`. For duplicate, `canonicalPath` is the path to keep.
4. **Run N subagents in parallel:** Each subagent receives one chunk and the instruction above; returns a list of records. Use `mcp_task` with subagent_type `generalPurpose` or `explore`, one task per chunk, each task returns the list of classifications for its paths.
5. **Merge and deduplicate:** Combine all records. For duplicates, build groups by canonicalPath; within each group, the canonical path is kept, all others are marked for deletion.
6. **Apply actions (single agent or script):**
  - **Archive completed:** Move every file with `classification === "completed"` to `.cursor/plans/archive/` (use existing archive layout; if a file with same name exists in archive, use a subdir or suffix to avoid overwrite, or overwrite by design).
  - **Archive superseded:** Move every file with `classification === "superseded"` to `.cursor/plans/archive/` (e.g. `archive/superseded/` or same name under archive).
  - **Delete duplicates:** For each file with `classification === "duplicate"`, delete the file (the canonical one stays).
  - **Keep active:** No move/delete.
7. **Sync:** Run `python .cursor/hooks/plan-runner.py sync-registry` so plan-graph and registry reflect moves and deletions.

### 2.3 Implementation options

- **Option A — Agent-driven:** Parent agent splits paths into chunks, launches N `mcp_task` subagents with the chunk and classification rules; each subagent reads the files in its chunk and returns classifications. Parent merges, then performs moves/deletes and runs sync-registry.
- **Option B — Script + agent:** A Python script under `.cursor/hooks/` or `.cursor/scripts/` (e.g. `plan-audit.py`) does: list top-level `.plan.md`, compute completed/planId/name, detect duplicates by planId and filename pattern, and writes a JSON report (path → classification). Then a single agent or human reviews the report and runs archive/delete; or the script can do archive/delete with a `--dry-run` and `--apply` flag. No parallel subagents; faster to implement, less “intelligent” for superseded.
- **Option C — Hybrid:** Script does completed + duplicate detection (deterministic). Superseded is left to a single follow-up agent pass that only looks at pairs/groups (same planId or similar name) and marks superseded; then script or agent applies archive/delete.

**Recommendation:** Start with **Option B** (script) for completed and duplicate so that the hook and a one-off cleanup are reliable and repeatable; add a **single** agent pass for superseded (or a small number of subagents that each handle a subset of “candidate pairs” by planId/name). That keeps the pipeline simple and avoids flaky LLM classification for completed/duplicate.

---

## Part 3: Duplicate and Superseded Rules (Summary)

- **Duplicate:** Same planId in two files → keep `{planId}.plan.md`, delete the other (e.g. `{planId}_{hash}.plan.md`). If no planId, same normalised name (strip `_[0-9a-f]+\.plan\.md`) → keep one, delete the other.
- **Completed:** All todos completed/cancelled → move to `.cursor/plans/archive/`.
- **Superseded:** Completed plan that is obsoleted by another (e.g. hash-suffix file when clean planId file exists, or clearly older variant) → move to `.cursor/plans/archive/` (e.g. `archive/superseded/`).
- **Active:** Else → leave in `.cursor/plans/`.

---

## File and dependency summary


| Item                                                                               | Action                                                                                                                                             |
| ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| [.cursor/hooks/plan-save-to-workspace.py](.cursor/hooks/plan-save-to-workspace.py) | Add `_is_completed()`; skip copy when source is completed or dest exists and is completed.                                                         |
| New script (e.g. `.cursor/scripts/plan-audit.py` or `.cursor/hooks/plan-audit.py`) | List plans, classify completed/duplicate (and optionally superseded), output report; optional `--apply` to move/delete and then run sync-registry. |
| Subagent orchestration                                                             | If using Option A or C: parent splits paths, invokes subagents with chunk + rules, merges results, then runs archive/delete + sync-registry.       |


---

## Execution order

1. Implement Part 1 (hook filter) so new sessionStart runs no longer pull in completed plans.
2. Implement Part 2 (audit): add script for completed + duplicate (and optionally superseded); run once with `--dry-run`, review, then `--apply`; or run parallel subagents per chunk and then apply.
3. Run sync-registry after any move/delete.
4. Optionally: add a rule or skill that says “when running plan-save-to-workspace, only copy plans that are not completed” (already enforced in code) and “run plan-audit periodically or on demand to archive completed and remove duplicates.”
