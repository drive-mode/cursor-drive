---
name: Consolidate cursor-drive directories
overview: Use the current `cursor-drive` folder as the single source of truth, identify why each of the four directories exists and what (if anything) is unique in the other three, then bring those unique artifacts into `cursor-drive` and optionally retire the other directories.
todos: []
isProject: false
---

# Consolidate four cursor-drive directories into one

## Why each directory exists

| Directory | Likely purpose | Git state | Unique / notable |
|-----------|----------------|-----------|------------------|
| **cursor-drive** (this repo) | **Active development** | `develop` (ahead 12, behind 12 vs origin); remotes: `hhalperin`, `origin` (drive-mode); latest `bd884af` | [docs/guides/migrate-to-fresh-repo.md](docs/guides/migrate-to-fresh-repo.md), [run-filter-branch.sh](run-filter-branch.sh) / [.git-rewrite-authors.sh](.git-rewrite-authors.sh) / [rewrite-authors.sh](rewrite-authors.sh), [mcp-servers/system-logs-mcp/](mcp-servers/system-logs-mcp/), **122** `.cursor/plans/*.plan.md` |
| **cursor-drive-rewrite** | Clone used for **author-rewrite** (e.g. git-filter-repo) | `main` at `3ded7b4`; origin → drive-mode/cursor-drive | Untracked **filter-callbacks.py** (git-filter-repo callbacks: hhalperin/halpie → ai-secretagent, email rewrites) |
| **cursor-drive-backup** | Snapshot + **commit-mapping** tooling | `main` at `3afb4d1` (different SHA, same “add out/ to gitignore” message); origin → drive-mode | Untracked: **build_commit_mapping.py**, **commit_callback.py**, **filter_callback.py**, **commit_mapping.json** — build mapping of commit SHA → new timestamp + coauthor for Feb 25–Mar 4 2026 and feed git-filter-repo |
| **cursor-drive-backup-20260304** | **Dated backup** (4 Mar 2026) | `main` at `3ded7b4`; origin = **local path** to `cursor-drive` | **54** plans including **.cursor/plans/archive/** with many older plans (e.g. pipeline-wiring-mvp, docs-overhaul, cursor-drive/*) |

No unique source code or config was found in the other three that isn’t already in `cursor-drive` or superseded by it. The only unique pieces are **git-rewrite helper scripts** and, optionally, **archived plan layout**.

---

## Unique artifacts to bring into `cursor-drive`

### 1. Git-rewrite scripts (recommended)

Gather into a single place so all rewrite tooling lives in the canonical repo.

- **From cursor-drive-rewrite:**
  - **filter-callbacks.py** — git-filter-repo callbacks (name/email/message) for hhalperin → ai-secretagent.

- **From cursor-drive-backup:**
  - **build_commit_mapping.py** — builds `commit_mapping.json` (SHA → author_date, committer_date, add_coauthor).
  - **commit_callback.py** — git-filter-repo callback that applies that mapping.
  - **filter_callback.py** — inline variant (loads `commit_mapping.json`); keep one of the two callbacks.
  - **commit_mapping.json** — generated data; optional to copy (can be regenerated with `build_commit_mapping.py`).

**Suggested location:** e.g. **`scripts/git-rewrite/`** (or `docs/guides/git-rewrite/`). Add a short README there describing:

- `filter-callbacks.py` — author/email normalization (e.g. for pushing to drive-mode as ai-secretagent).
- `build_commit_mapping.py` + `commit_callback.py` (or `filter_callback.py`) — timestamp/coauthor normalization for a date range; `commit_mapping.json` is generated.

Current [run-filter-branch.sh](run-filter-branch.sh) / [.git-rewrite-authors.sh](.git-rewrite-authors.sh) do the **reverse** mapping (ai-secretagent → “Cursor Agent”, halpie → hhalperin) for a different workflow; keep those in repo root or under the same `scripts/git-rewrite/` and document both directions in the README.

### 2. Archived plans (optional)

**cursor-drive-backup-20260304** has **.cursor/plans/archive/** with many older plans. Your current [cursor-drive](.) already has **122** plans and no `archive/` subfolder.

- **Option A:** Copy **.cursor/plans/archive/** from backup-20260304 into **cursor-drive** as **.cursor/plans/archive/** only if you want the historical structure and any plan names/content that might not exist in the current set.
- **Option B:** Do nothing; keep using the current plan set and treat backup-20260304 as a frozen snapshot you can open only when you need to look at an old plan.

Recommendation: **Option B** unless you have a specific need for the archive layout inside the active repo.

---

## Consolidation steps

1. **Create `scripts/git-rewrite/`** in **cursor-drive** (or chosen path).
2. **Copy into it:**
   - `filter-callbacks.py` from **cursor-drive-rewrite**.
   - `build_commit_mapping.py`, `commit_callback.py`, `filter_callback.py` from **cursor-drive-backup**.
   - Optionally `commit_mapping.json` from **cursor-drive-backup** (or regenerate later).
3. **Add `scripts/git-rewrite/README.md`** describing each script and when to use it (author rewrite vs timestamp/coauthor rewrite).
4. **Optional:** Copy **.cursor/plans/archive/** from **cursor-drive-backup-20260304** into **cursor-drive** if you want that history in-tree.
5. **Retire the other three directories:**
   - Either delete **cursor-drive-rewrite**, **cursor-drive-backup**, **cursor-drive-backup-20260304** after confirming nothing else is needed, or move them into a single folder (e.g. `cursor-drive-archived-copies`) and stop using them for daily work.

---

## Summary

- **cursor-drive** stays the single source of truth (develop, latest commit, migration docs, rewrite shell scripts, system-logs-mcp, full plan set).
- **cursor-drive-rewrite** and **cursor-drive-backup** only add **git-rewrite helper scripts**; bring those into **cursor-drive** under **scripts/git-rewrite/** and document them.
- **cursor-drive-backup-20260304** adds only the **.cursor/plans/archive/** layout; optionally copy that into **cursor-drive** for history, or leave it in the backup.
- After gathering what you want, remove or archive the three other directories so only **cursor-drive** is used going forward.
