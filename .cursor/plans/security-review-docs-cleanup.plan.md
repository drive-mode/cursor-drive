---
planId: security-review-docs-cleanup
planType: task
parentPlanId: security-review
dependsOn: []
overview: "Replace user-specific paths in docs/ with %USERPROFILE% or $HOME; add deployment disclaimer to cloudflare-workers-mcp-cicd.md."
todos:
  - id: fix-mcp-paths
    content: Fix mcp-user-setup paths (use %USERPROFILE% or $HOME)
    status: completed
  - id: infra-disclaimer
    content: Add deployment disclaimer to cloudflare-workers-mcp-cicd.md
    status: completed
  - id: review-comments
    content: Review code comments for deployment-specific content
    status: completed
---

# Security Review — Docs Cleanup

## Scope

- `docs/reference/mcp-user-setup.md` — Use `%USERPROFILE%` (Windows) or `$HOME` (Unix); avoid `C:\Users\<you>\`
- `docs/guides/cloudflare-workers-mcp-cicd.md` — Add deployment disclaimer (e.g. "Deploy at your own risk; verify tokens and secrets")
- Code comments — Remove or generalize any deployment-specific paths
