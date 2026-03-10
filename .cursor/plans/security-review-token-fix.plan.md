---
planId: security-review-token-fix
planType: task
parentPlanId: security-review
dependsOn: []
overview: "Fix HIGH-severity token logging in scripts/create-cloudflare-token.mjs lines 143-144: replace console.log(secret) with secure prompt/clipboard flow."
todos:
  - id: fix-token-logging
    content: Replace console.log(secret) with secure prompt/clipboard flow; never log the token
    status: completed
  - id: verify-scripts
    content: Verify no other secret logging in scripts/
    status: completed
---

# Security Review — Token Fix

## Fix

Replace `console.log(secret)` in `scripts/create-cloudflare-token.mjs` (lines 143-144) with a secure flow:

- **Option A**: Use `readline` to prompt user to copy from clipboard; instruct them to run `echo <token> | clip` (Windows) or `pbcopy` (macOS) first
- **Option B**: Write to a temp file only when `--output-file` is passed; instruct user to copy manually
- **Never**: Log the token to stdout/stderr

## Implementation

Use `readline` to prompt: "Token created. Copy it from clipboard (run: echo <token> | clip) or paste here to verify." — but do NOT output the token. Alternatively, use Node's `child_process` to copy to clipboard if available, then print "Token copied to clipboard."
