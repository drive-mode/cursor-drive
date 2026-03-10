---
name: Consolidation completion and branch cleanup
overview: Complete the consolidation merge into develop, delete consolidated and stale branches to reduce GitHub footprint, then create a fresh feature branch from develop for continued work.
todos: []
isProject: false
---

# Consolidation completion and branch cleanup

Reduce branch footprint and establish a clean workflow for continued work.

---

## Current branch state


| Branch                                              | Status             | Action                    |
| --------------------------------------------------- | ------------------ | ------------------------- |
| **feat/consolidate-roler-and-agent-sdk**            | Pushed, PR needed  | Merge into develop        |
| feat/roler-rename                                   | Consolidated       | Delete after merge        |
| cursor/plan-and-workflow-issues-be16                | Consolidated       | Delete after merge        |
| cursor/claude-agent-sdk-production-c21a             | Consolidated       | Delete after merge        |
| feat/project-management                             | Already in develop | Delete                    |
| cursor/investor-business-plan-54dd                  | Unmerged           | Evaluate: merge or delete |
| feature/storage-architecture-and-docs-consolidation | Unmerged           | Evaluate: merge or delete |
| develop                                             | Integration target | Keep                      |
| main                                                | Production         | Keep                      |


---

## Phase 1 — Merge consolidation PR

1. **Create PR** (if not already created): Open [https://github.com/rolefinder/roler/pull/new/feat/consolidate-roler-and-agent-sdk](https://github.com/rolefinder/roler/pull/new/feat/consolidate-roler-and-agent-sdk)
  - Base: `develop`
  - Title: `Consolidate roler rename, agent SDK, and plan/workflow fixes`
  - Body: Include `Closes #62` and `Closes #63`
2. **Run checks** before merge:

```powershell
   pip install -e ".[dev,agent]"
   ruff check src/ tests/
   pytest tests/ -x --tb=short


```

1. **Merge** the PR into develop (squash or merge commit per project preference).
2. **Close PRs #62 and #63** with comment: `Superseded by #[new-pr-number]`.

---

## Phase 2 — Delete consolidated branches

After the consolidation PR is merged:

**Remote (GitHub):**

```bash
git push origin --delete feat/roler-rename
git push origin --delete cursor/plan-and-workflow-issues-be16
git push origin --delete cursor/claude-agent-sdk-production-c21a
git push origin --delete feat/project-management
git push origin --delete feat/consolidate-roler-and-agent-sdk
```

**Local:**

```bash
git checkout develop
git pull origin develop
git branch -d feat/roler-rename feat/project-management feat/consolidate-roler-and-agent-sdk
git branch -D cursor/plan-and-workflow-issues-be16 cursor/claude-agent-sdk-production-c21a  # if not local
git fetch --prune  # remove stale remote-tracking refs
```

---

## Phase 3 — Handle other unmerged branches

**cursor/investor-business-plan-54dd** and **feature/storage-architecture-and-docs-consolidation**:

- If still needed: create PRs to develop, merge, then delete.
- If obsolete: delete locally and remotely after confirming.

---

## Phase 4 — New feature branch for continued work

1. **Update develop:**

```bash
   git checkout develop
   git pull origin develop


```

1. **Create feature branch** (per [AGENTS.md](AGENTS.md) and [git-workflow.mdc](.cursor/rules/git-workflow.mdc)):

```bash
   git checkout -b feat/<issue>-short-desc


```

   Example: `feat/64-post-consolidation-work` or `feat/next-milestone`.

1. **Push and set upstream:**

```bash
   git push -u origin feat/<issue>-short-desc


```

---

## Phase 5 — Ongoing workflow

**Starting new work:**

1. `git checkout develop && git pull origin develop`
2. `git checkout -b feat/<issue>-desc` (or fix/, docs/, etc.)
3. Work, commit, push
4. Open PR to develop

**Keep branches minimal:**

- One active feature branch per workstream
- Delete branches after merge
- Avoid long-lived unmerged branches

---

## Verification

- Consolidation PR merged into develop
- PRs #62 and #63 closed
- Consolidated branches deleted (remote + local)
- New feature branch created from develop
- `git branch -a` shows reduced branch count
