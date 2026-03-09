---
name: Gitignore and repo cleanup
overview: Add a complete .gitignore for open-source use, remove git commit–rewrite scripts and root clutter, and replace all hhalperin references with drive-mode/cursor-drive for a clean public repo.
todos: []
isProject: false
---

# .gitignore, root cleanup, and hhalperin removal

## 1. .gitignore — add missing entries

Current [.gitignore](.gitignore) already has: `out/`, `node_modules/`, `*.vsix`, `.vscode-test/`, `.env`, `playwright-report/`, `test-results/`, plan hashes, debug logs, `sandbox/.cursor/`, `__pycache__/`.

**Add** (open-source and safety):

- **OS cruft:** `.DS_Store`, `Thumbs.db`
- **IDE/editor:** `*.swp`, `*.swo`, `.idea/` (if present)
- **Build/artifacts:** `*.tsbuildinfo`, `coverage/` (if Jest coverage is added later)
- **Commit-rewrite leftover:** `datemap-rewrite.txt` (in case an old script copy is run)
- **Local env variants:** `.env.local`, `.env.*.local` (optional but common)

Keep existing comments and structure; append new blocks with a short comment (e.g. `# OS`, `# Commit-rewrite artifact`).

---

## 2. Root and scripts cleanup — remove git commit–adjustment code

**Delete these three items:**


| Item                                                                 | Reason                                                                                    |
| -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| [env-filter-rewrite.sh](env-filter-rewrite.sh) (repo root)           | Used only as `GIT_EXEC_PATH` filter by the rewrite script; part of commit-date rewriting. |
| [scripts/rewrite-commit-dates.ps1](scripts/rewrite-commit-dates.ps1) | Rewrites commit dates and force-pushes; not needed for open source.                       |
| [scripts/rewrite-commit-dates.sh](scripts/rewrite-commit-dates.sh)   | Bash backend for the above; uses `GPAT_REPO_MAKER` from `.env`.                           |


No other code in `src/` or docs references these scripts. CONTRIBUTING and README do not mention them.

**Root directory:** After removals, root stays as-is (no other junk at top level). Standard layout (package.json, README, LICENSE, CONTRIBUTING, .gitignore, tsconfig, src/, tests/, docs/, scripts/, .cursor/, .cursor-plugin/, etc.) is already appropriate for open source.

---

## 3. Replace hhalperin with drive-mode/cursor-drive

**Explicit hhalperin references (change these):**

- **[README.md](README.md)** — Line 147: change clone URL from `https://github.com/hhalperin/cursor-drive` to `https://github.com/drive-mode/cursor-drive`.
- **[package.json](package.json)** — `repository.url`: change from `https://github.com/hhalperin/cursor-drive` to `https://github.com/drive-mode/cursor-drive`.

**Optional for “clean” open source:**

- **package.json** — `publisher`: currently `"hh"`. For a drive-mode org repo you may want `"drive-mode"` (affects VS Code marketplace listing). Leave as `"hh"` if you intend to keep publishing under that publisher ID.
- **.cursor/rules/hh-policy-pack.mdc** — File name and title use “hh”. For a neutral name: rename to `policy-pack.mdc` (or `quality-policy.mdc`) and change the first heading from “# hh Policy Pack (F1)” to “# Policy Pack (F1)” or “# Quality & policy pack”. Any references to this rule (e.g. CONTRIBUTING’s “BugBot reviews … rules in `.cursor/BUGBOT.md`”) do not mention “hh-policy-pack” by name; Cursor loads by path, so renaming is safe.

**Do not change:** “drive-mode” in docs/plans (e.g. `drive-mode-user-journey.md`, plan IDs like `drive-mode-installable-ui`) — that is product/plan naming, not the GitHub org.

---

## 4. Summary of edits


| Action   | Files                                                                                           |
| -------- | ----------------------------------------------------------------------------------------------- |
| Edit     | `.gitignore` — add OS, IDE, datemap, optional .env variants.                                    |
| Delete   | `env-filter-rewrite.sh`, `scripts/rewrite-commit-dates.ps1`, `scripts/rewrite-commit-dates.sh`. |
| Edit     | `README.md` — clone URL → drive-mode/cursor-drive.                                              |
| Edit     | `package.json` — repository.url → drive-mode/cursor-drive; optionally publisher.                |
| Optional | Rename `.cursor/rules/hh-policy-pack.mdc` and update its title.                                 |


No changes to `.vscode/`, `.github/`, or test/config files are required for this cleanup.