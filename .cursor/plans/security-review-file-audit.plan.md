---
planId: security-review-file-audit
planType: task
parentPlanId: security-review
dependsOn:
  - security-review-ignore-files
overview: "File-by-file review of src/, scripts/, .cursor/hooks/ for secret/PII logging. Verify approvalGates and mcpServer logging are safe."
todos:
  - id: audit-src
    content: Audit src/ for logs that could expose secrets or PII
    status: pending
  - id: audit-scripts
    content: Audit scripts/ for secret logging
    status: pending
  - id: audit-hooks
    content: Audit .cursor/hooks/ for secret logging
    status: pending
  - id: document-findings
    content: Document findings for SECURITY-BACKLOG
    status: pending
---

# Security Review — File Audit

## Scope

- `src/` — Extension code; check console.log, logging of config, tokens, PII
- `scripts/` — Node scripts; verify no secret logging (token fix applied)
- `.cursor/hooks/` — Python hooks; check for secret/PII in stdout

## Checks

- approvalGates: ensure denied actions don't log sensitive context
- mcpServer: ensure MCP tool responses don't log secrets
- Config logging: redact or omit sensitive values per policy-pack

## Output

Findings feed into `docs/SECURITY-BACKLOG.md` (security-review-backlog plan).
