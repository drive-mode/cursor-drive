---
name: send-to-github
description: Push to both remotes with identity rewriting. Use when user says /send-to-github or "send to github".
triggers:
  - "/send-to-github"
  - "send to github"
  - "send-to-github"
---

# Skill: Send to GitHub

Push branch to both hhalperin and origin with identity rewriting. No identity leak.

## When to use

- User invokes `/send-to-github` or asks to send/push to github
- User wants to push to both remotes with correct identity per remote

## Workflow

1. **Check working tree** — `git status` must be clean (no unstaged changes). Stash or commit first.
2. **Parse args** — Optional `--branch BRANCH` (default: develop), `--force`. Ask user if unclear.
3. **Run script** — Execute from workspace root:

```sh
bash scripts/send-to-github [--branch BRANCH] [--force]
```

On Windows, use `bash` (Git Bash). The script uses `$$` for temp branch names.

4. **Verify** — Confirm both pushes succeeded.
