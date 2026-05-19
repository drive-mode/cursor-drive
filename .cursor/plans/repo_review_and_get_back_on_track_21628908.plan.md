---
name: Repo review and get back on track
overview: Summarize cursor-drives (old repo) vs cursor-drive (new) and your local branch, explain the develop divergence, and give concrete steps to reconcile and choose what to work on next.
todos: []
isProject: false
---

# Repo review and get back on track

## Repos and most recent changes

**Repo split:** You renamed the old repo to **cursor-drives** so the new **cursor-drive** would have only desired contributors. **cursor-drives** = full history and all recent work. **cursor-drive** = new repo with only an "Initial commit" (Mar 16). **Most recent changes** are on [cursor-drives](https://github.com/hhalperin/cursor-drives).

### Recent commits (summary)

| When | What |
|------|------|
| **Mar 13, 2026** | **chore: repo cleanup for review** (you). CONTRIBUTING (pre-push secret checklist), .gitignore (secrets block), README/getting-started/config-schema/package.json updates. **Code:** `src/config.ts` with `readConfig()` and `DriveConfig`, agentScreen + glossaryExpander fixes; `tests/config.test.ts`, modeSwitcher tests. **Docs:** `docs/plans/testing-and-scope-pivot.plan.md` added. **.gitignore:** `.cursor/plans/*` excluded so 100+ local plans stay out of the repo for “Cursor AI review”. |
| **Mar 10** | **chore: archive non-active plans, keep 3 active** (Cursor Agent). Pruned tracked plans; kept: **pr-merge-workflow-primitives**, **extension-reinstall-automation**, **cloudflare-setup-phases**. |
| **Mar 10** | **chore: untrack .cursor/plans/archive**, add archive-completed-plans script. |
| **Mar 10** | Refactor agent screen, add debugging commands. |
| **Mar 10** | Add plans, guides, docs, and scripts. |

So on **cursor-drives**: cleanup for review is done, MVP-style config/tests are in, plans are trimmed to three active ones, and a testing/scope pivot doc was added.

---

## Your local state vs origin

- **Branch:** `develop` (status: `develop...origin/develop [ahead 12, behind 12]`).
- **Divergence:** Local `develop` has **12 commits** that aren’t on `origin/develop`, and `origin/develop` has **12 commits** you don’t have. So the histories have diverged (no fast-forward).
- **Uncommitted:** Modified [`.cursor/rules/plan-governance.mdc`](.cursor/rules/plan-governance.mdc), [`.gitignore`](.gitignore); many untracked files under `.cursor/plans/`, `docs/guides/migrate-to-fresh-repo.md`, `scripts/git-rewrite/`, etc.

So “getting back on track” means: (1) decide how to reconcile `develop` with `origin/develop`, and (2) decide what work you want to do next.

---

## What work you might want to do

From the repo and your local master plan:

1. **MVP ship (already mostly done on cursor-drives)**
   [cursor-drive-master.plan.md](.cursor/plans/cursor-drive-master.plan.md) lists MVP blockers as cleared (tests, config schema, config.ts, README, getting-started). Remaining: smoke test (F5 → toggle → submit), CI green, then VSIX. The Mar 13 commit on cursor-drives already moved the code/docs in that direction.

2. **Three “active” plans (as of cursor-drives Mar 10)**
   - [pr-merge-workflow-primitives.plan.md](.cursor/plans/pr-merge-workflow-primitives.plan.md)
   - [extension-reinstall-automation.plan.md](.cursor/plans/extension-reinstall-automation.plan.md)
   - [cloudflare-setup-phases.plan.md](.cursor/plans/cloudflare-setup-phases.plan.md)
   These are the ones that were explicitly kept when archiving the rest on cursor-drives.

3. **Testing and scope pivot**
   [docs/plans/testing-and-scope-pivot.plan.md](docs/plans/testing-and-scope-pivot.plan.md) (added in the Mar 13 commit) outlines integration tests (@vscode/test-cli), E2E approach, and scope recommendations. Good next-read if you want to align with what’s on cursor-drives.

4. **Local plan sprawl**
   You have 130+ `.cursor/plans/*.plan.md` files (many untracked). They’re already excluded from the repo via `.gitignore` on cursor-drives. You can either leave them as local-only or run an audit/archive (e.g. keep the 3 active + master, archive or delete the rest) so your “what to do next” is clearer.

---

## Recommended next steps

1. **Inspect the divergence**
   - `git log --oneline develop ^origin/develop` (your 12 commits)
   - `git log --oneline origin/develop ^develop` (their 12 commits)
   Decide whether your 12 are the source of truth, or origin’s 12 (e.g. the Mar 13 cleanup), or a mix.

2. **Reconcile `develop` with `origin/develop`**
   - If you want **cursor-drives’ state** (review cleanup, 3 active plans, testing doc):
     - Back up your branch: `git branch develop-backup`
     - Reset to origin: `git fetch origin && git reset --hard origin/develop`
     - Re-apply any local changes you still want (e.g. from `develop-backup` or from your uncommitted edits).
   - If you want **to keep your 12 commits** and bring in cursor-drives’:
     - Merge: `git fetch origin && git merge origin/develop` (resolve conflicts if any).
     - Or rebase: `git rebase origin/develop` (rewrites your 12 on top of origin).
   - If `develop` isn’t the main branch on cursor-drives (e.g. only `main` is), repeat the same logic with `origin/main` and your target branch.

3. **Choose a focus**
   - **Option A – MVP ship:** Confirm tests/compile, do the smoke test, then CI and VSIX.
   - **Option B – One of the 3 plans:** Open the chosen plan file and work through its TODOs.
   - **Option C – Testing pivot:** Read `docs/plans/testing-and-scope-pivot.plan.md` and add integration tests / adjust scope as described.

4. **Optional: tidy local plans**
   So “what to do” isn’t buried in 130 files: keep [cursor-drive-master.plan.md](.cursor/plans/cursor-drive-master.plan.md) and the 3 active plans in a known location; move or archive the rest (e.g. into `.cursor/plans/archive/` or a date-named folder) and rely on the plan-governance rule for what’ “active.”

---

## Summary

- **cursor-drives (old repo):** Latest is Mar 13 “repo cleanup for review” (config, tests, CONTRIBUTING, .gitignore, testing-and-scope-pivot doc); Mar 10 trimmed plans to 3 active. **cursor-drive (new repo):** Only "Initial commit" (Mar 16); intended as canonical with clean contributors.
- **Local:** `develop` is ahead 12 / behind 12 vs `origin/develop`; you have uncommitted changes and many untracked plans.
- **Get back on track:** (1) Compare the 12 vs 12 commits and reconcile `develop` with `origin/develop` (or `main` if that’s your target). (2) Pick one of: MVP ship, one of the 3 active plans, or testing/scope pivot. (3) Optionally reduce local plan clutter so the chosen work is easy to find.
