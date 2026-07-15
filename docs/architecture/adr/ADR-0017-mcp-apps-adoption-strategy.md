# ADR-0017: MCP Apps Adoption Strategy

## Status
Accepted (MCP App UI shipped in 0.4.0; webview remains primary when VSIX is installed)

## Metadata
- Date: 2026-02-24
- Updated: 2026-07-11
- Deciders: Cursor Drive maintainers
- Related: ADR-0003 (MCP Bridge Pattern), ADR-0019 (Plugin / Extension SKU split)

## Context

MCP Apps (announced January 2026) enable interactive UI rendering via MCP tools. An MCP App declares UI resources (HTML/CSS/JS) alongside its tool definitions; compatible hosts render these resources in sandboxed iframes, giving tool authors a visual surface without host-specific code.

Drive's Agent Screen (S-AS) is currently a VS Code webview tightly coupled to the extension host via `webview.postMessage()`. This works well inside Cursor/VS Code but is not portable. If a user runs an MCP-capable client other than Cursor (e.g., Claude Desktop, Windsurf, or a future IDE), Drive's visual layer is unavailable.

MCP Apps could make S-AS portable across any MCP host that supports the Apps spec, reducing the per-host UI maintenance burden.

## Decision

**PROTOTYPE.** Build a proof-of-concept MCP App that renders Drive's activity feed in at least two MCP hosts (Claude Desktop and VS Code/Cursor).

Key constraints:

1. **Feature-flagged** behind `cursorDrive.mcp.enableApps` (default `false`). The prototype is opt-in only.
2. **Webview remains primary.** The existing S-AS webview is not replaced. The MCP App is a supplemental rendering target.
3. **Shared data model.** The MCP App consumes the same activity-feed events that the webview receives via `postMessage`. A thin adapter in `mcpServer.ts` exposes these events as MCP App resources.
4. **Minimal UI scope.** The prototype renders the activity feed (read-only). Interactive controls (mode switch, agent actions) remain webview-only until host rendering consistency is validated.

## Alternatives Considered

1. **Stay webview-only** — Limits portability to Cursor/VS Code. Users in other MCP hosts get no visual surface. Rejected because it forecloses a growing ecosystem opportunity.
2. **Build per-host UIs** — Separate Claude Desktop plugin, separate Windsurf integration, etc. Maintenance cost scales linearly with host count. Rejected.
3. **Wait for ecosystem maturity** — MCP Apps SDK is early but usable. Waiting loses first-mover learning and delays feedback on host rendering differences. Rejected.

## Consequences

**Positive:**
- Validates portability of S-AS across MCP hosts with minimal investment
- Aligns Drive with the MCP ecosystem direction
- Feature flag ensures zero risk to existing users

**Negative:**
- Additional rendering target to test and maintain (even as prototype)
- SDK dependency (`@modelcontextprotocol/sdk` Apps extensions) adds surface area
- Host rendering inconsistencies may require per-host CSS workarounds

## Migration Strategy

Additive. MCP App UI resources are added to the existing MCP server definition. No existing tools or resources are modified. The feature flag controls whether the App resources are registered at server startup. Rollback is flag-off.

Rollout plan:
1. Implement MCP App resource registration behind feature flag
2. Validate in Claude Desktop and VS Code MCP host
3. Gather feedback on rendering fidelity
4. Decide promote/iterate/abandon based on findings

## Open Questions

- **Host rendering consistency:** Do iframe sandboxes behave identically across Claude Desktop, VS Code webview-based MCP host, and others?
- **Iframe sandbox limitations:** Some hosts may restrict `postMessage`, `localStorage`, or network access inside the MCP App iframe.
- **SDK stability:** The MCP Apps portion of the SDK is pre-1.0. Breaking changes may require adapter rewrites.
- **Interaction model:** If the prototype succeeds, how do we extend it to interactive controls without duplicating the webview's event handling?
