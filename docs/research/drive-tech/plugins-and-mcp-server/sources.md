# Building Plugins for Cursor Drive — Sources

**Topic:** References and bibliography for plugin architecture, MCP server patterns, and distribution research.

**Date:** February 2026

---

## MCP (Model Context Protocol)

### Specification and SDK
- [MCP Specification](https://modelcontextprotocol.io/specification/) — Full protocol specification (v1.0)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk) — `@modelcontextprotocol/sdk`, used by Drive at ^1.26.0
- [MCP Transport Future](https://blog.modelcontextprotocol.io/posts/2025-12-19-mcp-transport-future/) — StreamableHTTP direction; SSE deprecation roadmap
- [MCP Apps Extension](https://modelcontextprotocol.io/docs/extensions/apps) — UI resources from MCP tool calls (`@modelcontextprotocol/ext-apps`)

### MCP Configuration
- [Cursor MCP Documentation](https://docs.cursor.com/context/model-context-protocol) — `.cursor/mcp.json` project-scoped and `~/.cursor/mcp.json` global MCP server config
- [VS Code MCP Support](https://code.visualstudio.com/docs/copilot/chat/mcp-servers) — VS Code's `registerMcpServerDefinitionProvider()` and MCP client

---

## Cursor Platform

### Plugin Layer
- [Cursor Rules Documentation](https://docs.cursor.com/context/rules) — `.cursor/rules/` auto-discovered rule files
- [Cursor Hooks Documentation](https://docs.cursor.com/context/hooks) — `hooks.json`, `beforeSubmitPrompt`, hook lifecycle events
- [Cursor Skills](https://docs.cursor.com/context/skills) — `.cursor/skills/` markdown-based skill injection

### Extension APIs
- [Cursor API Surface](https://docs.cursor.com/extensions) — Cursor-specific extension APIs (`vscode.cursor.*`)
- [VS Code Extension API](https://code.visualstudio.com/api) — Full `vscode.*` namespace documentation
- [VS Code Webview API](https://code.visualstudio.com/api/extension-guides/webview) — WebviewPanel creation and messaging

---

## VS Code Extension Development

### Packaging and Distribution
- [vsce — VS Code Extension Manager](https://github.com/microsoft/vscode-vsce) — `@vscode/vsce` for VSIX packaging and marketplace publishing
- [VS Code Marketplace](https://marketplace.visualstudio.com/) — Extension distribution platform
- [Extension Manifest Reference](https://code.visualstudio.com/api/references/extension-manifest) — `package.json` `contributes` schema

### Extension Architecture
- [Extension Host](https://code.visualstudio.com/api/advanced-topics/extension-host) — Isolated process model for extensions
- [Activation Events](https://code.visualstudio.com/api/references/activation-events) — When extensions load
- [VS Code Chat Participant API](https://code.visualstudio.com/api/extension-guides/chat) — `createChatParticipant()` (available in VS Code, not exposed in Cursor)

---

## IDE Plugin Ecosystems (Comparison)

### JetBrains
- [JetBrains Plugin SDK](https://plugins.jetbrains.com/docs/intellij/welcome.html) — IntelliJ platform plugin development
- [JetBrains × Zed ACP announcement](https://blog.jetbrains.com/ai/2025/10/jetbrains-zed-open-interoperability-for-ai-coding-agents-in-your-ide) — Agent Client Protocol (October 2025)

### Zed
- [Zed Extensions](https://zed.dev/docs/extensions) — WASM-based extension model
- [Zed Slash Commands](https://zed.dev/docs/assistant/commands) — AI-facing command system

### Claude Code
- [Claude Code MCP Integration](https://code.claude.com/docs/en/mcp) — MCP server registration in Claude Code
- [Claude Code Configuration](https://code.claude.com/docs/en/configuration) — `/mcp` config and CLAUDE.md

---

## Security

- [AgentBound — MCP Access Control](https://arxiv.org/abs/2510.21236) — Declarative permission model for MCP servers (October 2025)
- [MiniScope — Least-privilege tools](https://arxiv.org/abs/2512.11147) — Auto-reconstruct permission hierarchies (December 2025)

---

## Cursor Drive Internal References

| Document | Relevance |
|---|---|
| [ADR-0002: Hybrid Extension + Plugin](../../architecture/adr/ADR-0002-hybrid-extension-plugin.md) | Foundation — the dual-layer architecture this research validates |
| [ADR-0003: MCP Bridge Pattern](../../architecture/adr/ADR-0003-mcp-bridge-pattern.md) | Foundation — local MCP server as AI-to-extension bridge |
| [ADR-0007: Drive Mode Installable Distribution](../../architecture/adr/ADR-0007-drive-mode-installable-distribution.md) | Distribution — VSIX packaging and plugin installer strategy |
| [ADR-0009: Hook-Based Prompt Interception](../../architecture/adr/ADR-0009-hook-based-prompt-interception.md) | Integration — `beforeSubmitPrompt` hook installed by plugin installer |
| [MCP Apps Research](../mcp-apps/) | Adjacent — MCP Apps extend the MCP server with UI capabilities |
| `src/mcpServer.ts` | Source — MCP server implementation, 30+ tools, A2A endpoints |
| `src/pluginInstaller.ts` | Source — Plugin installer, skill gating, MCP config merge |
| `.cursor/mcp.json` | Config — Project-scoped MCP server registration |
| `.cursor/hooks/drive-preprocessor.py` | Hook — `beforeSubmitPrompt` prompt interception |
| `package.json` | Manifest — Extension metadata, VSIX packaging config |
