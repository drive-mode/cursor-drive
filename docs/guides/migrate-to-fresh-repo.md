# Migrate hhalperin/cursor-drive to a fresh repo (clean Contributors)

Use this if the GitHub Contributors list still shows unwanted accounts after history rewrite and you want a clean repo with only the desired contributors.

## Prerequisites

- Local repo is up to date with desired history (only Cursor Agent + hhalperin).
- You have admin on the GitHub repo.

## Steps

### 1. Capture branch protection rules (main / develop)

- **GitHub → Repo → Settings → Branches → Branch protection rules**
- For **main** and **develop** (if protected), note or screenshot:
  - Require PR before merging
  - Require status checks (e.g. `build-and-test`)
  - Require branches to be up to date
  - Allow force pushes? (usually No)
  - Restrict who can push
- Or use GitHub API to dump rules (optional):
  ```bash
  gh api repos/hhalperin/cursor-drive/branches/main/protection 2>nul
  gh api repos/hhalperin/cursor-drive/branches/develop/protection 2>nul
  ```

### 2. Create a new empty repo on GitHub

- **GitHub → New repository**
- Name (e.g. `cursor-drive-new` or keep `cursor-drive` for a rename later).
- **Do not** add README, .gitignore, or license (empty repo).
- Create.

### 3. Add new remote and push

From your local repo (already at correct history):

```bash
git remote add fresh https://github.com/hhalperin/<NEW-REPO-NAME>.git
git push fresh main
git push fresh develop
```

Set default branch on the new repo to **main** (Settings → General → Default branch).

### 4. Re-apply branch protection

- On the **new** repo: **Settings → Branches → Add rule**
- Recreate rules for **main** (and **develop** if desired) from step 1.

### 5. Optional: Swap names (keep “cursor-drive” as the main repo)

If you want the “clean” repo to keep the name `cursor-drive`:

- Rename the **current** repo to e.g. `cursor-drive-old`: **Settings → General → Repository name**.
- Rename the **new** repo to `cursor-drive`.
- Update local remote URL if needed:
  ```bash
  git remote set-url hhalperin https://github.com/hhalperin/cursor-drive.git
  git remote remove fresh
  ```

### 6. Delete the old repo (or archive it)

- On the **old** repo (e.g. `cursor-drive-old`): **Settings → Danger zone → Delete this repository**.
- Or **Archive** it instead of deleting if you want to keep it read-only.

### 7. Local cleanup

```bash
git fetch hhalperin   # or fetch from new default remote
git branch --set-upstream-to=hhalperin/main main
git branch --set-upstream-to=hhalperin/develop develop
```

## Result

- New repo has only the commits you pushed (Cursor Agent + hhalperin).
- Contributors list is computed from scratch; no cached entries from the old repo.
- Branch protection and default branch match your preferences.

## Note

The email **harrison@quant--h2.com** was not found in the current repo history. If harrison-quant-h2 still appears, it is due to GitHub’s cached contributor list or that account sharing an email with hhalperin; the fresh repo avoids both.
