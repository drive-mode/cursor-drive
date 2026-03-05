---
planId: governance_entropy_control_1d0c8c2e
planType: task
parentPlanId: cursor-drive
childPlanIds: []
dependsOn: []
todos:
  - id: gov-01
    content: Add deterministic governance scan (project graph + entropy + task ledger) writing to .drive/governance
    status: completed
  - id: gov-02
    content: Enforce Focus Guard (WIP limits) on operator spawning (MCP + command path)
    status: completed
  - id: gov-03
    content: Expose governance scan via MCP tools and VS Code commands; update reference docs
    status: completed
  - id: gov-04
    content: Add optional Tier-1 AI summary for governance scan (cheap model, JSON-only, confidence gated)
    status: completed
---

# Governance & Entropy Control (v1)

Implements a deterministic, low-noise governance pipeline for a fast-moving, AI-assisted codebase:

- Project graph snapshot (imports + test mapping)
- Entropy score + findings
- Task ledger + workboard
- Focus Guard to suppress distraction when WIP is too high
- Optional Tier-1 AI summary (Cursor cheap model) for compressing results (never required)

## Reconciliation

### What was completed

| TODO | Outcome | Evidence |
|------|---------|----------|
| gov-01 | Governance scan pipeline implemented; writes artifacts to `.drive/governance/` | `src/governance/*`, `npm run governance -- scan` |
| gov-02 | Focus Guard blocks operator spawning when WIP thresholds exceeded | `src/governance/focusGuard.ts`, `src/mcpServer.ts`, `src/extension.ts`, tests |
| gov-03 | MCP tools + VS Code commands added; docs updated | `docs/reference/mcp-tools.md`, `docs/reference/commands-and-shortcuts.md`, `docs/reference/config-schema.md`, `docs/guides/governance.md` |
| gov-04 | Optional AI summary added using cheap model selection | `src/governance/aiSummary.ts`, `tests/governance/aiSummary.test.ts` |

### What was verified

- `npm run compile`: pass
- `npm test`: pass
- `npm run governance -- scan`: produces `project-graph.latest.json`, `entropy.latest.md/json`, `workboard.latest.md`, `task-ledger.latest.json`, and `entropy.ndjson`

### Residual risks

- Import/export extraction is regex-based (best-effort). Typechecker-backed symbol usage is deferred.
- Churn volatility metric is stubbed (reported as warning).

### Notes

- `.drive/` is gitignored to avoid committing runtime artifacts.

