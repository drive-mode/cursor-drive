# MCP Apps — Decision Record

## Scorecard

| Criterion | Score (0–5) | Rationale |
|-----------|:-----------:|-----------|
| **User value** | 4 | High: portability across Claude, ChatGPT, Goose, VS Code. Drive's Agent Screen becomes accessible to non-Cursor users. Not 5 because most Drive users are already in Cursor. |
| **Integration complexity** | 2 | Low: ~200 lines for prototype (Option A). MCP server already exists; adding UI resources is additive. Shared HTML builder is the main new abstraction. |
| **Maintenance burden** | 2 | Low-Medium: dual rendering path (webview + MCP App) adds surface area, but both use the same event model. Option B refactor reduces duplication if adopted. |
| **Security / privacy risk** | 1 | Minimal: iframe is sandboxed by host. No new data exposure — UI resources serve the same events already visible in the webview. CSP enforcement is host-managed. |
| **Lock-in / portability risk** | 1 | Very low: MCP Apps *increase* portability. `ext-apps` is a thin layer over standard `postMessage`. Fallback to webview-only is trivial (remove `_meta.ui` from responses). |
| **Ecosystem maturity** | 3 | Early-stable: spec frozen (2026-01-26), SDK at v1.0.1, adopted by major hosts. But host implementations vary in completeness. Not battle-tested at scale yet. |
| **Time to first value** | 4 | Fast: Option A prototype is ~1 day of work. Activity feed App in Claude Desktop is a compelling demo. Full integration (Option B) is ~1 week. |

**Weighted total**: 17/35 (above threshold for prototype)

## Recommendation

**PROTOTYPE**

Build a feature-flagged prototype (Option A from `02_implementation.md`) that serves Drive's activity feed as an MCP App UI resource. Validate rendering in at least 2 hosts before committing to full integration.

## Confidence

**Medium**

The technology is sound and the integration is low-risk. Confidence is medium (not high) because:
- Host rendering consistency is unproven at the complexity level of Drive's Agent Screen
- VS Code's MCP Apps support is partial — Cursor may need custom handling
- Ecosystem is only ~1 month old; edge cases will emerge during prototyping

## Prototype Success Criteria

| Criterion | Pass condition |
|-----------|---------------|
| **Rendering** | Drive activity feed renders in ≥2 hosts (Claude Desktop + VS Code) with usable layout |
| **Live updates** | New `agent_screen_activity` events appear in the MCP App UI within 1 second |
| **Bidirectional messaging** | Guest can request current state from host; host responds correctly |
| **No regression** | Existing webview Agent Screen works identically when `enableApps` is `false` |
| **Graceful degradation** | Hosts that don't support MCP Apps ignore `_meta.ui` and show text response as before |

## Exit Criteria

| Outcome | Condition | Next step |
|---------|-----------|-----------|
| **Adopt** | Rendering is consistent in ≥2 hosts; no blocking iframe limitations for core activity feed | Proceed to Option B refactor; expand to plan progress and operator list UIs |
| **Defer** | Host inconsistencies block core UX (layout breaks, messaging fails) | Revisit in 3 months; track host MCP Apps improvements |
| **Reject** | Fundamental limitation discovered (e.g., `postMessage` latency >500ms, hosts deprecate Apps) | Stay webview-only; document findings |

## Alternatives Considered

### 1. Stay Webview-Only

- **Pros**: Zero new code; no dual rendering path; full VS Code API access.
- **Cons**: Agent Screen locked to VS Code/Cursor. Users of Claude, ChatGPT, Goose get no visibility into operator activity.
- **Verdict**: Safe default, but limits Drive's ecosystem reach.

### 2. Build Per-Host UIs

- **Pros**: Optimal UX per host (native ChatGPT plugin UI, Claude artifact, VS Code webview).
- **Cons**: 3–4x maintenance burden. Each host has different APIs, rendering constraints, and update cycles.
- **Verdict**: Unscalable. MCP Apps solve this by providing a single standard.

### 3. Wait for MCP Apps Maturity

- **Pros**: Avoids investing in early ecosystem; lets hosts iron out rendering bugs.
- **Cons**: Loses first-mover advantage. Other MCP servers will ship Apps UIs first, setting user expectations. Drive misses the opportunity to demonstrate cross-client pair-programming.
- **Verdict**: Prototyping now is low-risk and positions Drive well. Full commitment can wait.

## Decision Timeline

| Date | Action |
|------|--------|
| Week 1 | Implement Option A prototype behind `cursorDrive.mcp.enableApps` flag |
| Week 2 | Test in Claude Desktop and VS Code; document host-specific issues |
| Week 3 | Demo to team; evaluate against success criteria |
| Week 4 | Adopt/Defer/Reject decision |
