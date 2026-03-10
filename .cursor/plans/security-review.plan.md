---
name: ""
overview: Orchestrates security review across token fix, ignore files, file audit, docs cleanup, and vulnerability backlog. Integrates with cursor-drive-v1.
todos:
  - id: sync-token-fix
    content: Complete security-review-token-fix
    status: pending
  - id: sync-ignore-files
    content: Complete security-review-ignore-files
    status: pending
  - id: sync-file-audit
    content: Complete security-review-file-audit (after ignore-files)
    status: pending
  - id: sync-docs-cleanup
    content: Complete security-review-docs-cleanup
    status: pending
  - id: sync-backlog
    content: Complete security-review-backlog (after file-audit)
    status: pending
isProject: false
---

# Security Review — Project Plan

## Scope

Five child plans orchestrate the security review:

1. **token-fix** — Fix HIGH-severity token logging in `scripts/create-cloudflare-token.mjs`
2. **ignore-files** — Add `.cursorignore` with sensitive path exclusions
3. **file-audit** — File-by-file review of `src/`, `scripts/`, `.cursor/hooks/` for secret/PII logging
4. **docs-cleanup** — Replace user-specific paths in docs; add deployment disclaimers
5. **backlog** — Create `docs/SECURITY-BACKLOG.md` from audit findings

## Execution Order (by dependency)


| Wave | Plans                                                                                 |
| ---- | ------------------------------------------------------------------------------------- |
| 1    | security-review-token-fix, security-review-ignore-files, security-review-docs-cleanup |
| 2    | security-review-file-audit (after ignore-files)                                       |
| 3    | security-review-backlog (after file-audit)                                            |


## Completion Criteria

- All child plans completed
- No secrets logged in scripts or extension code
- `.cursorignore` excludes sensitive paths
- Docs use generic paths (`%USERPROFILE%`, `$HOME`)
- `docs/SECURITY-BACKLOG.md` populated from findings
