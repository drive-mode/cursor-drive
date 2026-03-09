# How to proceed: fork, upstream, and clean branches

This guide explains how to get the most up-to-date version in both repos (your fork and drive-mode upstream) and keep branches clean.

---

## Current state (as of this guide)

| Location | Branch | Tip | Meaning |
|----------|--------|-----|--------|
| **Local** | main | c17dcd8 | Same as fork main; has all merged work |
| **Local** | develop | c17dcd8 | Same as fork develop |
| **Fork (hhalperin)** | main | c17dcd8 | Up to date; all feature branches merged in |
| **Fork (hhalperin)** | develop | c17dcd8 | In sync with main |
| **Upstream (origin)** | main | 0208d35 | **Behind**; does not have the 110 merged commits |

So: **local and fork are in sync and “full.” Upstream (drive-mode) does not have your merged work yet.**

---

## Two repos, two goals

1. **Fork (hhalperin/cursor-drive)**
   You control it. Goal: one source of truth (main), develop in sync, old branches purged.

2. **Upstream (drive-mode/cursor-drive)**
   You may or may not have push access. Goal: get the fork’s code into upstream—either by **pushing** (if you have access) or by **opening a PR** (if you don’t).

Whether you “pull everything into local and then push to origin” is correct **only if you have push access to drive-mode/cursor-drive**. If you don’t, you open a PR from the fork to upstream instead of pushing.

---

## Step-by-step procedure

### 1. Clean your local repo

**1.1 Save or commit any work in progress**

- You have uncommitted changes (e.g. `registry.yaml`, skills, `fork-vs-upstream-diff.md`, create-plan, etc.). Either:
  - **Commit them** on main (or a branch), or
  - **Stash** them:
    `git stash push -u -m "WIP before sync"`

**1.2 Fetch latest from both remotes**

```bash
git fetch hhalperin
git fetch origin
```

**1.3 Make local main match the fork (source of truth)**

```bash
git checkout main
git pull hhalperin main
```

Your local `main` is now the same as the fork’s `main`. This is the “most up to date” version for you and the fork.

---

### 2. Fork (hhalperin): keep it up to date and clean

**2.1 Push main and develop (if needed)**

If you added commits locally (e.g. the guide doc):

```bash
git push hhalperin main
git checkout develop
git merge main
git push hhalperin develop
git checkout main
```

**2.2 Purge old branches on the fork**

All feature work is already in `main`, so you don’t need those branches anymore.

- Go to: **https://github.com/hhalperin/cursor-drive/branches**
- Delete every branch **except** `main` and `develop`, e.g.:
  - `cursor/autonomous-project-governance-c6fc`
  - `cursor/cursor-agentic-framework-review-288f`
  - `cursor/development-environment-setup-55ba`
  - `cursor/development-environment-setup-8cce`
  - `cursor/extension-codebase-health-bfce`
  - `cursor/mob-programming-cockpit-mvp-c801`
  - `cursor/new-cloud-agent-5837`
  - `cursor/project-src-directory-8de5`
  - `drive-mode`, `drive-mvp`, `feat/drive-mode`
  - `master`, `sync-with-drive-mode`

After this, the fork has only **main** and **develop**; both point to the same full codebase.

**2.3 Optional: delete local branches that mirrored the deleted remote branches**

After you’ve deleted those branches on GitHub, prune and remove local refs:

```bash
git fetch hhalperin --prune
git branch -d master sync-with-drive-mode   # if they still exist locally and you don’t need them
```

Only delete local branches you’re sure you don’t need (e.g. you can keep `develop` and `main`).

---

### 3. Upstream (drive-mode): get the fork’s code in

You have two paths.

**Path A: You have push access to drive-mode/cursor-drive**

Then you can make upstream’s `main` equal to the fork’s `main` by pushing:

```bash
git checkout main
git push origin main
```

That pushes your local main (which matches the fork) to `origin`. After that, **origin/main** will have the same 110 commits as the fork. Both repos are then “most up to date” and aligned.

**Path B: You do not have push access (typical for contributors)**

Then you **do not** push to origin. Instead:

1. Open a **Pull Request** on GitHub:
   - **Base repository:** `drive-mode/cursor-drive`
   - **Base branch:** `main`
   - **Head repository:** `hhalperin/cursor-drive`
   - **Compare branch:** `main`
2. In the PR description, paste or link the summary from `docs/guides/fork-vs-upstream-diff.md`.
3. Maintainers review and merge. After the merge, upstream will have the fork’s code.

So: **“Pull all the code into local and then push to origin”** is correct only on **Path A**. On **Path B**, you pull into local (and keep the fork updated), then use a **PR** to get code into upstream.

---

### 4. Summary: “most up to date” and “clean branches”

| Goal | What to do |
|------|------------|
| **Local = most up to date** | `git checkout main` then `git pull hhalperin main`. Main is your source of truth. |
| **Fork = most up to date** | Push main (and develop) from local: `git push hhalperin main` (and update develop as in 2.1). |
| **Fork branches clean** | Delete all remote branches except `main` and `develop` on GitHub (see 2.2). |
| **Local branches clean** | Keep `main` and `develop`; optionally delete or prune refs for old branches (see 2.3). |
| **Upstream = most up to date** | **Path A:** `git push origin main`. **Path B:** Open PR from hhalperin/cursor-drive:main → drive-mode/cursor-drive:main and get it merged. |

---

### 5. Quick reference: one-line mental model

- **Local and fork:** Your “full” copy is `main`; keep it in sync with `git pull hhalperin main` and `git push hhalperin main`. Clean the fork by deleting every branch except `main` and `develop`.
- **Upstream:** Either **push** to `origin main` (if you have access) or **open a PR** from the fork’s `main` to `drive-mode/cursor-drive`’s `main` and have it merged. Don’t push to origin if you don’t have write access.
