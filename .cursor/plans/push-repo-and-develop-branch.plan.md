---
planId: push-repo-and-develop-branch
planType: task
parentPlanId: cursor-drive-v1
childPlanIds: []
dependsOn: []
name: Push repo and develop branch
overview: Commit current work on main, add a remote if missing, push main, then update and push the develop branch so you can continue working remotely.
todos:
  - id: commit-main
    content: Add and commit on main (stage .cursor, docs, scripts, etc.)
    status: completed
  - id: add-remote
    content: Add remote origin if missing
    status: completed
  - id: push-main
    content: Push main and set upstream
    status: completed
  - id: update-develop
    content: Update develop from main, push develop, set upstream
    status: completed
---

# Push to repo and push develop branch

## Current state

- **Branch:** `main` (checked out)
- **Remote:** None configured — you must add `origin` before any push
- **Untracked:** `.cursor/`, `.cursorignore`, `.gitignore`, `docs/`, `scripts/`
- **Local branches:** `main`, `develop`, `feature/initial` (develop already exists)

## Steps

### 1. Add and commit on main

- Stage all untracked files:
  `git add .cursor/ .cursorignore .gitignore docs/ scripts/`
  (or `git add .` if you want everything under the repo root)
- Commit with a clear message, e.g.:
  `git commit -m "Add ADRs, PRD, guides, plans, and scripts"`

### 2. Add remote (required)

- Add your remote (replace `<repo-url>` with your GitHub/GitLab URL):
  `git remote add origin <repo-url>`
- If the repo already exists on the host with a default branch, you can set upstream when pushing (step 3).

### 3. Push main

- First push and set upstream:
  `git push -u origin main`

### 4. Update develop and push it

- Ensure `develop` is in sync with current work:
  `git checkout develop`
  `git merge main`
  (Resolve any merge conflicts if they appear.)
- Push develop and set upstream:
  `git push -u origin develop`
- Switch back to main if you prefer:
  `git checkout main`

## Result

- `main` and `develop` both exist on the remote.
- You can clone/pull and checkout `develop` elsewhere to continue working remotely.

## Note

If you prefer `develop` to be the primary branch for ongoing work, you can do future work on `develop` and merge into `main` when releasing. The plan above only creates/updates and pushes both branches; it does not change your workflow.

## Reconciliation

**Verified:**
- Committed on `develop` (152 files, message: "Add plans, guides, docs, and scripts"); `origin` already existed.
- Merged `develop` into `main` (fast-forward to 9f95dce).
- Pushed `main` to `origin`; pushed `develop` to `origin`; both branches track upstream.

**Residual risks:**
- `registry.yaml` was modified by a background process during execution; changes were discarded to allow branch switch. Stashes (`plan-exec: push-repo-and-develop-branch`, `plan-exec: leftover before main merge`, `plan-exec: final stash for main`) may contain additional uncommitted work.
- Push to `hhalperin` remote was rejected (remote ahead); only `origin` was updated.

**Evidence:**
- `git push -u origin main`: `ef77ff3..9f95dce main -> main`
- `git push -u origin develop`: `Everything up-to-date`, branch set to track `origin/develop`
