---
planId: security-review-backlog
planType: task
parentPlanId: security-review
dependsOn:
  - security-review-file-audit
overview: "Create docs/SECURITY-BACKLOG.md; populate from audit findings; add CONTRIBUTING security section reference."
todos:
  - id: create-backlog
    content: Create docs/SECURITY-BACKLOG.md
    status: completed
  - id: populate-findings
    content: Populate from file-audit findings and pre-identified issues
    status: completed
  - id: contributing-ref
    content: Add CONTRIBUTING security section reference
    status: pending
---

# Security Review — Backlog

## Scope

Create `docs/SECURITY-BACKLOG.md` with prioritized vulnerability list. Populate from:

- security-review-file-audit findings
- Pre-identified: token fix, ignore files, docs cleanup

## Structure

- HIGH: Secret logging, PII exposure
- MEDIUM: Missing exclusions, path leaks
- LOW: Documentation gaps

Reference from CONTRIBUTING.md (or create security section).
