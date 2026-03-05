# Prototype Brief: MCP Apps for Agent Screen

## Hypothesis

Drive's Agent Screen activity feed can be rendered as an MCP App UI resource, producing a consistent experience across at least 2 MCP-capable hosts (Claude Desktop, VS Code) without degrading the existing webview.

## Success Criteria (measurable)

1. Activity events (`agent_screen_activity` tool results) render as an interactive HTML feed in the MCP App iframe.
2. The MCP App UI updates in real time as new events arrive via `ui/notifications/tool-result`.
3. Rendering fidelity is ≥90% consistent between Claude Desktop and VS Code (visual comparison).
4. Agent Screen webview continues to function when MCP Apps feature flag is off.
5. Latency overhead of serving UI resources is <50ms per request.

## Minimal Implementation Steps

1. Add a `ui://drive/activity-feed` resource to `src/mcpServer.ts` that serves bundled HTML/JS.
2. Add `_meta.ui.resourceUri: "ui://drive/activity-feed"` to `agent_screen_activity` tool definition.
3. Build a minimal HTML/JS activity feed renderer (~100 lines) that listens for `ui/notifications/tool-result` and appends events.
4. Gate behind `cursorDrive.mcp.enableApps` configuration flag (default: `false`).
5. Test in Claude Desktop and VS Code with Drive MCP server running.

## Instrumentation / Evals

- Log UI resource fetch count, latency, and errors.
- Compare rendered output (screenshot diff) between hosts.
- Measure memory footprint of iframe vs native webview.

## Exit Criteria

| Outcome | Criteria | Next step |
|---------|----------|-----------|
| **Adopt** | All 5 success criteria met | Expand to full Agent Screen, plan progress, file diffs |
| **Reject** | Host rendering inconsistency >30% or latency >200ms | Stay webview-only, re-evaluate in 6 months |
| **Iterate** | Partial success (3-4 criteria met) | Address specific failures, re-prototype |

## References

- `docs/research/drive-tech/mcp-apps/02_implementation.md` — Option A details
- `docs/architecture/adr/ADR-0017-mcp-apps-adoption-strategy.md`
- MCP Apps spec: https://modelcontextprotocol.io/docs/extensions/apps
