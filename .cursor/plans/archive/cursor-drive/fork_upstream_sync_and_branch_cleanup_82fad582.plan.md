---
planId: fork_upstream_sync_and_branch_cleanup_82fad582
planType: task
parentPlanId: cursor-drive
childPlanIds: []
dependsOn: []
name: Fork upstream sync and branch cleanup
overview: Detailed execution plan to sync local and fork with the full codebase, purge old branches on the fork, optionally push to upstream or open a PR, and clean local branch refs. Every terminal command is listed in order.
todos:
  - id: local-wip
    content: Stash or commit local WIP (registry, skills, create-plan, etc.)
    status: in_progress
  - id: fetch-remotes
    content: Run git fetch hhalperin and git fetch origin
    status: pending
  - id: sync-local-main
    content: Checkout main and git pull hhalperin main
    status: pending
  - id: push-fork-main
    content: "Push main to hhalperin: git push hhalperin main"
    status: pending
  - id: sync-develop
    content: Update develop from main, push develop to hhalperin
    status: pending
  - id: purge-fork-branches
    content: Delete all branches except main and develop on GitHub (UI)
    status: pending
  - id: prune-local-refs
    content: Run git fetch hhalperin --prune
    status: pending
  - id: optional-delete-local-branches
    content: Optionally delete local master and sync-with-drive-mode
    status: pending
  - id: upstream-path-a
    content: "If push access: git push origin main"
    status: pending
  - id: upstream-path-b
    content: "If no push access: open PR from hhalperin:main to drive-mode:main"
    status: pending
  - id: verify-state
    content: Verify main/hhalperin/main/origin/main and commit counts
    status: pending
  - id: optional-regenerate-comparison
    content: Optionally regenerate fork-vs-upstream diff and update doc
    status: pending
isProject: false
---

# Fork, upstream sync, and branch cleanup (detailed)

Plan to get the most up-to-date version in both repos (fork and drive-mode) and leave branches clean. All commands assume workspace root: `c:\Users\harri\Documents\Coding Projects\fun\cursor-drive`. Use PowerShell; for `git` note that `&&` is not valid in PowerShell—run commands separately or use `;`.

---

## Precondition: decide upstream path

- **Path A:** You have push access to `drive-mode/cursor-drive`. Outcome: push local main to `origin main`.
- **Path B:** You do not. Outcome: open a PR from `hhalperin/cursor-drive:main` into `drive-mode/cursor-drive:main` and do not push to origin.

Commands below are identical until the "Upstream" section, which branches on A vs B.

---

## Phase 1: Local WIP and remotes

**Todo: local-wip**

- Save or commit uncommitted work so the tree is clean (or stashed) before syncing.
- **Option 1 — Stash (recommended if WIP is experimental):**

```powershell
  cd "c:\Users\harri\Documents\Coding Projects\fun\cursor-drive"
  git stash push -u -m "WIP before fork-upstream sync"


```

- **Option 2 — Commit on main:**

```powershell
  cd "c:\Users\harri\Documents\Coding Projects\fun\cursor-drive"
  git add -A
  git status
  git commit -m "chore: WIP before fork-upstream sync"


```

**Todo: fetch-remotes**

- Fetch both remotes so refs are current:

```powershell
  git fetch hhalperin
  git fetch origin


```

---

## Phase 2: Local main = fork main (source of truth)

**Todo: sync-local-main**

- Ensure you are on main and it matches the fork (pull if the fork has newer commits):

```powershell
  git checkout main
  git pull hhalperin main


```

- If you already had pushed everything, this may report "Already up to date." That is fine.

---

## Phase 3: Fork — push and develop

**Todo: push-fork-main**

- Push local main to the fork so the fork’s main is up to date:

```powershell
  git push hhalperin main


```

**Todo: sync-develop**

- Update develop from main and push develop to the fork:

```powershell
  git checkout develop
  git merge main
  git push hhalperin develop
  git checkout main


```

- If develop already matched main, merge may be "Already up to date" and push "Everything up-to-date."

---

## Phase 4: Purge old branches on the fork (GitHub UI)

**Todo: purge-fork-branches**

- No terminal commands; use the GitHub web UI.
- Open: **[https://github.com/hhalperin/cursor-drive/branches](https://github.com/hhalperin/cursor-drive/branches)**
- For each branch below, open it and delete it (trash icon). **Keep only `main` and `develop`.**
- Branches to delete:
  - `cursor/autonomous-project-governance-c6fc`
  - `cursor/cursor-agentic-framework-review-288f`
  - `cursor/development-environment-setup-55ba`
  - `cursor/development-environment-setup-8cce`
  - `cursor/extension-codebase-health-bfce`
  - `cursor/mob-programming-cockpit-mvp-c801`
  - `cursor/new-cloud-agent-5837`
  - `cursor/project-src-directory-8de5`
  - `drive-mode`
  - `drive-mvp`
  - `feat/drive-mode`
  - `master`
  - `sync-with-drive-mode`

---

## Phase 5: Prune local refs and optional local branch cleanup

**Todo: prune-local-refs**

- After deleting branches on GitHub, prune stale remote-tracking refs:

```powershell
  git fetch hhalperin --prune


```

**Todo: optional-delete-local-branches**

- Optional: delete local branches that only mirrored the purged remotes (only if you do not need them):

```powershell
  git branch -d master
  git branch -d sync-with-drive-mode


```

- If a branch is not fully merged, `-d` will refuse; use `-D` only if you are sure you want to drop that branch. Do not delete `main` or `develop`.

---

## Phase 6: Upstream (Path A or B)

**Todo: upstream-path-a** (only if you have push access to drive-mode/cursor-drive)

- Push local main to upstream so origin has the same code as the fork:

```powershell
  git checkout main
  git push origin main


```

- After this, `origin/main` and `hhalperin/main` will match (both "most up to date").

**Todo: upstream-path-b** (if you do not have push access)

- Do not run `git push origin main`.
- Open a Pull Request on GitHub:
  - Base repo: `drive-mode/cursor-drive`, base branch: `main`
  - Head repo: `hhalperin/cursor-drive`, compare branch: `main`
  - URL (after creating): [https://github.com/drive-mode/cursor-drive/compare/main...hhalperin:cursor-drive:main](https://github.com/drive-mode/cursor-drive/compare/main...hhalperin:cursor-drive:main)
- In the PR description, include or link the summary from [docs/guides/fork-vs-upstream-diff.md](docs/guides/fork-vs-upstream-diff.md) (commits ahead, files changed, key additions).

---

## Phase 7: Verify and (optional) re-run comparison

**Todo: verify-state**

- Confirm local and fork main match and see how far ahead of origin you are:

```powershell
  git log --oneline -1 main
  git log --oneline -1 hhalperin/main
  git log --oneline -1 origin/main
  git rev-list --count origin/main..hhalperin/main


```

- After Path A: `origin/main` and `hhalperin/main` should be the same commit. After Path B: fork remains ahead until the PR is merged.

**Todo: optional-regenerate-comparison**

- To regenerate the fork-vs-upstream comparison (e.g. after upstream changes):

```powershell
  git fetch origin
  git fetch hhalperin
  git log origin/main..hhalperin/main --oneline
  git log hhalperin/main..origin/main --oneline
  git diff origin/main..hhalperin/main --stat


```

- Update [docs/guides/fork-vs-upstream-diff.md](docs/guides/fork-vs-upstream-diff.md) with new commit counts and file stats if needed.

---

## Command sequence summary (copy-paste block)

Order of execution (skip Path B commands if doing Path A; skip Path A if doing Path B):

```powershell
cd "c:\Users\harri\Documents\Coding Projects\fun\cursor-drive"
git stash push -u -m "WIP before fork-upstream sync"
git fetch hhalperin
git fetch origin
git checkout main
git pull hhalperin main
git push hhalperin main
git checkout develop
git merge main
git push hhalperin develop
git checkout main
# Purge branches on GitHub (see Phase 4) — no commands
git fetch hhalperin --prune
git branch -d master
git branch -d sync-with-drive-mode
# Path A only:
git push origin main
# Path B only: open PR on GitHub (no push)
git log --oneline -1 main
git log --oneline -1 hhalperin/main
git log --oneline -1 origin/main
```

---

## Reference

- Full narrative: [docs/guides/fork-and-upstream-sync.md](docs/guides/fork-and-upstream-sync.md)
- Comparison and purge list: [docs/guides/fork-vs-upstream-diff.md](docs/guides/fork-vs-upstream-diff.md)
