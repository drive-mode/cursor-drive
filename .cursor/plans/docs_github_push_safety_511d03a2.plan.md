---
name: Docs GitHub Push Safety
overview: "Five subagents reviewed docs/ by subdirectory. Overall verdict: safe to push after fixing 2 issues — personal paths in reference docs and one broken link."
todos: []
isProject: false
---

# Docs GitHub Push Safety Review

## Verdict: **Safe to push after minor fixes**

Five subagents reviewed `docs/` by subdirectory. No secrets, credentials, or confidential content found. Two fixes recommended before pushing.

---

## Subdirectory results


| Subdirectory                                  | Verdict         | Notes                       |
| --------------------------------------------- | --------------- | --------------------------- |
| `docs/architecture`                           | SAFE            | No issues                   |
| `docs/design`                                 | NEEDS_ATTENTION | 1 broken link               |
| `docs/guides`                                 | SAFE            | No issues                   |
| `docs/research`                               | SAFE            | No issues                   |
| `docs/prd`, `reference`, `plans`, `solutions` | NEEDS_ATTENTION | Personal paths in reference |


---

## Fixes required

### 1. Personal paths (blocking for privacy)

**Files:** [docs/reference/mcp-user-setup.md](docs/reference/mcp-user-setup.md), [docs/reference/README.md](docs/reference/README.md)

**Issue:** Exposes username `harri` and local path layout:

- `C:\Users\harri\.env\`
- `C:\Users\harri\.cursor\mcp.json`

**Fix:** Replace with generic paths:

- `C:\Users\harri\.env\` → `%USERPROFILE%\.env\` (with note: e.g. `C:\Users\<you>\.env\` on Windows)
- `C:\Users\harri\.cursor\mcp.json` → `%USERPROFILE%\.cursor\mcp.json`

**Locations in mcp-user-setup.md:** Lines 3, 9, 38, 42–45, 49
**Location in reference/README.md:** Line 12 (table cell)

---

### 2. Broken link (non-blocking, but fix for correctness)

**File:** [docs/design/architecture/cursor-drive-walkthrough.md](docs/design/architecture/cursor-drive-walkthrough.md) line 151

**Current:** `../../../.cursor/plans/mvp-gaps.plan.md`
**Actual location:** `.cursor/plans/archive/mvp-gaps.plan.md`

**Fix:** Update link to `../../../.cursor/plans/archive/mvp-gaps.plan.md`

---

## What was checked (all clear)

- **Secrets/credentials:** No `sk-`, `ghp`_, `AKIA`, or real tokens. Only config names, placeholders, and example formats in security docs.
- **Personal data:** None except the paths above.
- **Internal URLs:** Only `127.0.0.1`, `localhost` — standard dev examples.
- **Confidential info:** None.
- `**.env` references:** Design/risk discussion only; no actual values.

---

## Summary


| Action                                                   | Priority                 |
| -------------------------------------------------------- | ------------------------ |
| Replace `C:\Users\harri\` paths in reference docs        | **Required** before push |
| Fix mvp-gaps.plan.md link in cursor-drive-walkthrough.md | Recommended              |
