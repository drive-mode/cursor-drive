# MCP Apps — Sources

## Primary Sources

| # | Source | Date | Why it matters |
|---|--------|------|---------------|
| 1 | [MCP Apps Specification](https://spec.modelcontextprotocol.io/extensions/apps/) | 2026-01-26 | The canonical spec defining `ui://` resources, `_meta.ui.resourceUri`, iframe sandboxing, and the App lifecycle. The authoritative reference for all implementation decisions. |
| 2 | [`@modelcontextprotocol/ext-apps` npm package](https://www.npmjs.com/package/@modelcontextprotocol/ext-apps) | 2026-01-28 (v1.0.1) | The official SDK for building MCP Apps. Provides `McpAppGuest`, `McpAppHost`, and resource registration helpers. Direct dependency for Drive integration. |
| 3 | [MCP Apps Announcement Blog Post](https://modelcontextprotocol.io/blog/mcp-apps) | 2026-01-15 | Introduces the motivation, design goals, and ecosystem vision for MCP Apps. Explains the "tools return UI" paradigm and lists initial host support. |
| 4 | [`@modelcontextprotocol/sdk` npm package](https://www.npmjs.com/package/@modelcontextprotocol/sdk) | 2025-11 (1.0), ongoing | Drive's existing MCP SDK dependency (^1.26.0). MCP Apps builds on top of this. Understanding the base SDK's `server.resource()` API is prerequisite for UI resource registration. |
| 5 | [MCP Specification (Core)](https://spec.modelcontextprotocol.io/) | 2025-11 | The core MCP spec defining tools, resources, prompts, and transports. MCP Apps extends the resource system with `ui://` scheme and `_meta.ui` in tool results. |

## Host Implementation References

| # | Source | Date | Why it matters |
|---|--------|------|---------------|
| 6 | [Claude Desktop MCP Apps Support](https://docs.anthropic.com/claude/docs/mcp-apps) | 2026-02 | Documents Claude's iframe rendering behavior, CSP enforcement, theme support, and known limitations. Critical for cross-host testing. |
| 7 | [ChatGPT MCP Integration](https://platform.openai.com/docs/guides/mcp) | 2026-02 | Documents ChatGPT's MCP client and Apps rendering. Notes stricter sandbox policy than Claude. |
| 8 | [VS Code MCP Support](https://code.visualstudio.com/docs/copilot/mcp) | 2026-01 | Documents VS Code's MCP client integration and webview-based rendering for MCP Apps. Relevant because Cursor inherits this. |
| 9 | [Goose MCP Apps Support](https://block.github.io/goose/docs/mcp-apps/) | 2026-02 | Documents Goose's basic MCP Apps rendering. Notes limited `postMessage` support — useful for understanding the lowest common denominator. |

## Cursor Drive Internal References

| # | Source | Path | Why it matters |
|---|--------|------|---------------|
| 10 | ADR-0003: MCP Bridge Pattern | `docs/architecture/adr/ADR-0003-mcp-bridge-pattern.md` | Establishes that Drive's MCP server is the bridge between AI and VS Code APIs. MCP Apps extends this bridge to include UI resources alongside tools. |
| 11 | Agent Screen source | `src/agentScreen.ts` | The current webview implementation. Any MCP Apps integration must be compatible with (and not regress) this code. |
| 12 | MCP Server source | `src/mcpServer.ts` | The server where UI resources would be registered. Contains all 30+ tools including `agent_screen_*` tools that would gain `_meta.ui` augmentation. |
| 13 | A2A Protocol Research | `docs/research/a2a-protocol-research.md` | Related research on agent-to-agent communication. MCP Apps could visualize A2A task status in remote hosts. |
| 14 | MCP Tools Reference | `docs/reference/mcp-tools.md` | Documents all Drive MCP tools. MCP Apps would add `_meta.ui` to `agent_screen_*` tool responses documented here. |

## Standards and Specifications

| # | Source | Date | Why it matters |
|---|--------|------|---------------|
| 15 | [HTML Living Standard — iframe sandboxing](https://html.spec.whatwg.org/multipage/iframe-embed-object.html#attr-iframe-sandbox) | Ongoing | Defines the `sandbox` attribute behavior that MCP Apps hosts use. Understanding sandbox flags is critical for knowing what Drive's App UI can and cannot do. |
| 16 | [Content Security Policy Level 3](https://www.w3.org/TR/CSP3/) | 2023-12 | The CSP standard that hosts enforce on MCP App iframes. Drive's App HTML must comply with nonce-based CSP. |
| 17 | [JSON-RPC 2.0 Specification](https://www.jsonrpc.org/specification) | 2013-01 | The messaging protocol used for host↔guest communication in MCP Apps (over `postMessage`). Same protocol used by MCP itself. |
