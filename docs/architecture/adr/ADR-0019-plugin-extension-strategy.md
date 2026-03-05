# ADR-0019: Plugin and Extension Strategy

## Status
Proposed

## Metadata
- Date: 2026-02-24
- Deciders: Cursor Drive maintainers
- Related: ADR-0002 (Hybrid Extension+Plugin), ADR-0003 (MCP Bridge Pattern), ADR-0007 (Installable Distribution), ADR-0009 (Hook-Based Prompt Interception)

## Context

Drive uses a hybrid architecture: a VSIX extension provides the runtime (MCP server, webview, TTS, status bar) while `.cursor/` plugin files (hooks, rules, skills, commands) provide the prompt-layer integration. This split was established in ADR-0002 and has proven effective — the extension handles capabilities Cursor cannot express as plugin files, and the plugin layer handles prompt interception without requiring extension updates.

VS Code is introducing new AI-oriented APIs that Cursor may eventually adopt:

- **LM Tools API** (`vscode.lm.registerTool`) — allows extensions to register tools that VS Code's native agent mode can discover and invoke, similar to MCP tools but using VS Code's built-in tool protocol.
- **Chat Participant API** (`vscode.chat.createChatParticipant`) — allows extensions to register `@`-mentionable chat participants.
- **MCP Server Definition Provider** (`vscode.lm.registerMcpServerDefinitionProvider`) — allows extensions to dynamically register MCP servers without static `mcp.json` entries.

Cursor does not currently expose any of these APIs, but tracking them is necessary for forward compatibility.

## Decision

**ADOPT** the current hybrid architecture and enhance incrementally:

### 1. LM Tools Registration (Prepare)

Register Drive's pipeline tools via the VS Code LM Tools API when available. This allows Cursor's native agent mode to discover Drive tools without MCP configuration. Implementation: add conditional registration in `extension.ts` — check for `vscode.lm.registerTool` existence at activation, register if available, fall back to MCP-only if not.

### 2. Agent Screen Accessibility (Implement)

Improve the S-AS webview accessibility:
- Add ARIA landmarks and roles to the activity feed
- Implement keyboard navigation (Tab/Shift-Tab through feed items, Enter to expand)
- Ensure screen reader compatibility for operator status updates

This is independent of API evolution and improves the product regardless.

### 3. Dynamic MCP Registration (Prepare)

When Cursor supports `registerMcpServerDefinitionProvider`, use it to register Drive's MCP server dynamically instead of relying on static `.cursor/mcp.json`. This simplifies installation (no manual config file needed) and enables per-workspace server configuration. Implementation: conditional registration, same pattern as LM Tools.

### 4. MCP Bridge Remains Primary

The MCP bridge (ADR-0003) remains the primary integration path. LM Tools and dynamic MCP registration are supplemental discovery mechanisms, not replacements.

## Alternatives Considered

1. **Chat Participant API as primary UX** — Not available in Cursor. Even if added, ADR-0008 established that Drive is a wrapper around native modes, not an `@drive` chat participant. Rejected.
2. **Full migration to LM Tools** — Premature. Cursor does not expose the API. Migrating away from MCP would break the existing working integration. Rejected.
3. **Standalone MCP package (no VSIX)** — Would lose access to VS Code APIs (webview, status bar, TTS via OS). The VSIX provides capabilities that MCP alone cannot. Rejected.

## Consequences

**Positive:**
- Incremental improvements with no disruption to existing users
- Prepared for VS Code AI API evolution with conditional registration patterns
- Accessibility improvements benefit all users immediately

**Negative:**
- Conditional API checks add minor complexity to `extension.ts`
- LM Tools and dynamic MCP preparation code may go unused if Cursor never adopts these APIs

## Migration Strategy

No migration needed. All enhancements are additive:

- LM Tools registration is a conditional code path — no-op when API is absent
- Accessibility improvements are webview-internal changes
- Dynamic MCP registration is a conditional code path — falls back to `mcp.json`

Each enhancement can land independently and be feature-flagged if needed.

## Open Questions

- **Cursor's timeline for VS Code AI API adoption:** No public commitment. LM Tools and Chat Participant may never be exposed.
- **LM Tools vs MCP tool overlap:** If both are registered, how does Cursor's agent mode deduplicate? Need to test when the API becomes available.
- **Dynamic MCP registration scope:** Per-workspace or global? Affects multi-root workspace support.
