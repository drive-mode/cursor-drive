# drive-mode Portfolio Strategy

**Updated:** 2026-03-18

## What drive-mode Is

drive-mode is a two-product AI development toolkit:
- **cursor-drive** — VS Code/Cursor extension; multi-operator pair programming; MCP server on :7891
- **claude-drive** — Claude Code CLI counterpart; same operator model, Node.js-native

~60% of logic is shared. Both expose the same MCP tool surface and operator lifecycle model.

## Why drive-mode Ships First

drive-mode is the development tool for building roler.ai. Specifically:
- Multi-operator drive sessions accelerate every roler.ai pipeline stage
- claude-drive's claude-agent-sdk integration is a direct pattern source for roler.ai's ACP harness
- OTel observability in drive-mode feeds patterns into roler.ai Phase 3 (reliability/observability)

Shipping drive-mode first creates a compounding asset: better tooling → faster roler.ai build.

## Sequencing

```
cursor-drive v1 release (9 blockers)
  → claude-drive: sync v1 fixes
  → claude-drive: stable on GitHub (hhalperin contributor established)
    → roler.ai: ACP harness (using claude-agent-sdk patterns)
      → roler.ai: tailoring hardening
        → roler.ai: apply + outreach
```

## Sync Protocol

When cursor-drive changes key business logic, sync to claude-drive manually:
- `src/syncTypes.ts`, `src/operatorRegistry.ts`, `src/router.ts` — copy with import fixes
- `src/tts.ts`, `src/edgeTts.ts`, `src/piper.ts` — keep in sync

## Maintainers

- [@hhalperin](https://github.com/hhalperin) — lead
- [@ai-secretagent](https://github.com/ai-secretagent) — co-maintainer
