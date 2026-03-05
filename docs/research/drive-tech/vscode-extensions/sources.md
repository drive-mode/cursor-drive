# VS Code Extensions — Sources

**Topic:** References and bibliography for VS Code extension API research.

**Date:** February 2026

---

## VS Code Extension API

### Core Documentation
- [VS Code Extension API](https://code.visualstudio.com/api) — Official extension development documentation
- [Extension Anatomy](https://code.visualstudio.com/api/get-started/extension-anatomy) — Extension structure, activation, and lifecycle
- [Contribution Points](https://code.visualstudio.com/api/references/contribution-points) — All `contributes` fields in `package.json`
- [Activation Events](https://code.visualstudio.com/api/references/activation-events) — When extensions are loaded

### Webview
- [Webview API](https://code.visualstudio.com/api/extension-guides/webview) — Creating and managing webview panels
- [Webview Security Best Practices](https://code.visualstudio.com/api/extension-guides/webview#security) — CSP, nonces, local resource roots
- [Webview Accessibility](https://code.visualstudio.com/api/extension-guides/webview#accessibility) — ARIA patterns for webview content

### Testing
- [Testing Extensions](https://code.visualstudio.com/api/working-with-extensions/testing-extension) — Official guide for extension testing
- [@vscode/test-electron](https://github.com/nicolo-ribaudo/vscode-test) — Extension integration test runner
- [@vscode/test-web](https://github.com/nicolo-ribaudo/vscode-test-web) — Web extension testing

---

## AI Extensibility APIs

### Language Model API
- [Language Model API](https://code.visualstudio.com/api/extension-guides/language-model) — Official guide for `vscode.lm` usage
- [LanguageModelChat reference](https://code.visualstudio.com/api/references/vscode-api#LanguageModelChat) — API reference for chat model interface
- [VS Code 1.90 Release Notes — Language Model API](https://code.visualstudio.com/updates/v1_90#_language-model-api) — API stabilization announcement (June 2024)

### Chat Participant API
- [Chat Extensions](https://code.visualstudio.com/api/extension-guides/chat) — Official guide for chat participants
- [ChatParticipant reference](https://code.visualstudio.com/api/references/vscode-api#ChatParticipant) — API reference
- [VS Code 1.93 Release Notes — Chat Participant API](https://code.visualstudio.com/updates/v1_93#_chat-participant-api) — API stabilization announcement (September 2024)

### Language Model Tools API
- [Language Model Tools](https://code.visualstudio.com/api/extension-guides/language-model#tool-calling) — Official guide for LM tool registration
- [LanguageModelTool reference](https://code.visualstudio.com/api/references/vscode-api#LanguageModelTool) — API reference for tool interface
- [VS Code 1.99 Release Notes — LM Tools API](https://code.visualstudio.com/updates/v1_99) — API finalization (March 2025)

### Proposed APIs
- [Using Proposed APIs](https://code.visualstudio.com/api/advanced-topics/using-proposed-api) — How to access proposed APIs in VS Code Insiders
- [vscode.proposed.*.d.ts](https://github.com/nicolo-ribaudo/vscode/tree/main/src/vscode-dts) — Proposed API type definitions
- [registerMcpServerDefinitionProvider](https://github.com/nicolo-ribaudo/vscode/blob/main/src/vscode-dts/vscode.proposed.mcpServerDefinitionProvider.d.ts) — MCP server auto-registration proposal

---

## MCP in VS Code

- [MCP in VS Code](https://code.visualstudio.com/docs/copilot/chat/mcp-servers) — Built-in MCP client support
- [VS Code MCP configuration](https://code.visualstudio.com/docs/copilot/chat/mcp-servers#_configuration) — `mcp.json` format and server registration
- [Model Context Protocol specification](https://modelcontextprotocol.io/specification/) — MCP wire protocol

---

## Accessibility

- [VS Code Accessibility](https://code.visualstudio.com/docs/editor/accessibility) — Editor accessibility features
- [WAI-ARIA Authoring Practices — Tabs](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/) — ARIA tab pattern specification
- [WAI-ARIA `aria-live`](https://www.w3.org/WAI/ARIA/apg/practices/names-and-descriptions/#aria-live) — Live region specification for dynamic content

---

## Cursor-Specific

- [Cursor Documentation](https://docs.cursor.com/) — Official Cursor documentation
- [Cursor Extensions](https://docs.cursor.com/extensions) — Extension compatibility notes
- [Cursor MCP](https://docs.cursor.com/context/model-context-protocol) — MCP server configuration in Cursor

---

## Cursor Drive Internal References

| Document | Relevance |
|---|---|
| [ADR-0003: MCP Bridge Pattern](../../architecture/adr/ADR-0003-mcp-bridge-pattern.md) | Foundation — MCP bridge is primary integration; LM Tools is additive |
| [ADR-0008: Drive Mode Wrapper Architecture](../../architecture/adr/ADR-0008-drive-mode-wrapper-architecture.md) | Context — mode-switching logic that LM Tools `drive_set_mode` would wrap |
| [ADR-0010: Tiered Model Routing](../../architecture/adr/ADR-0010-tiered-model-routing.md) | Enhancement — `modelUtils.ts` improvements strengthen tier selection |
| `src/extension.ts` | Source — Extension activation, command registration, service wiring |
| `src/agentScreen.ts` | Source — Webview panel, CSP, HTML generation, accessibility targets |
| `src/modelUtils.ts` | Source — `vscode.lm.selectChatModels` usage, tier preferences |
| `src/modelSelector.ts` | Source — Tier metadata, model selection entry points |
| `src/apiDiscovery.ts` | Source — Runtime API probes for host environment detection |
| `src/statusBar.ts` | Source — Status bar item with mode and operator state |
| `src/mcpServer.ts` | Source — MCP server, tool registration, A2A endpoints |
| `tests/__mocks__/vscode.ts` | Testing — VS Code API mock for Jest |
| `tests/browser/sharescreen.spec.ts` | Testing — Playwright webview tests |
