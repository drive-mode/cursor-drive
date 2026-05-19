---
name: Push repo and develop branch
overview: Commit current work on main, add a remote if missing, push main, then update and push the develop branch so you can continue working remotely.
todos: []
isProject: false
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
