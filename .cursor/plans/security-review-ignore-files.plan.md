---
planId: security-review-ignore-files
planType: task
parentPlanId: security-review
dependsOn: []
overview: "Add .cursorignore and optionally .cursorindexingignore with .env, *.auth-state.json, .cursor/debug-*.log, .cursor/plans/.orchestrator-state.json."
todos:
  - id: create-cursorignore
    content: Create/update .cursorignore with sensitive path exclusions
    status: completed
  - id: cursorindexingignore
    content: Add .cursorindexingignore if indexing-specific exclusions needed
    status: cancelled
  - id: verify-gitignore
    content: Verify .gitignore coverage for sensitive paths
    status: completed
---

# Security Review — Ignore Files

## Scope

Ensure Cursor does not index or expose sensitive files:

- `.env`, `.env.*`
- `*.auth-state.json`
- `.cursor/debug-*.log`
- `.cursor/plans/.orchestrator-state.json`

## Implementation

`.cursorignore` at repo root with the above patterns. `.cursorindexingignore` only if Cursor supports separate indexing exclusions (optional).
