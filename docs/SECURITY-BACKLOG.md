# Security Backlog

Prioritized list of security findings and remediation tasks. Populated from security-review plans.

## HIGH

- [x] **Token logging** — `scripts/create-cloudflare-token.mjs` previously logged secret to stdout. Fixed: clipboard/--output-file flow only.
- [ ] **.cursorignore** — Add `*.auth-state.json` and `.cursor/plans/.orchestrator-state.json` if not present.

## MEDIUM

- [ ] **File audit** — Complete file-by-file review of `src/`, `scripts/`, `.cursor/hooks/` for secret/PII logging.
- [ ] **approvalGates** — Verify denied actions don't log sensitive context.
- [ ] **mcpServer** — Verify MCP tool responses don't expose secrets in logs.

## LOW

- [x] **Docs disclaimer** — Added deployment disclaimer to `docs/guides/cloudflare-workers-mcp-cicd.md`.
- [ ] **CONTRIBUTING** — Add security section referencing this backlog.

## References

- Policy pack: `.cursor/rules/policy-pack.mdc` — Privacy defaults, approval gates.
- Plan: `.cursor/plans/security-review.plan.md` — Orchestrates token-fix, ignore-files, file-audit, docs-cleanup, backlog.
