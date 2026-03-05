# Cursor Integration Plan

## Focus
Cursor plugin/VSCode extension + hooks + Drive mode wrapper integration aligned with Drive vision invariants.

## Input
Read:
- `docs/research/drive-tech/plugins-and-mcp-server/02_implementation.md`
- `docs/research/drive-tech/vscode-extensions/02_implementation.md`
- `docs/architecture/adr/ADR-0019-plugin-extension-strategy.md`
- `.cursor/rules/vision-invariants.mdc`
- `src/extension.ts`, `src/mcpServer.ts`, `src/pluginInstaller.ts`
- Existing `.cursor/plans/*.plan.md`

## Output
Create `.cursor/plans/drive_extension_platform_<hash>.plan.md` with TODOs covering:
1. LM Tools API registration for Drive pipeline tools
2. Agent Screen webview accessibility improvements (ARIA, keyboard nav, color contrast)
3. Plugin installer version checking and selective updates
4. Dynamic MCP registration preparation (when Cursor supports registerMcpServerDefinitionProvider)
5. Extension test coverage gaps (operatorRegistry, commsAgent, cursorCliRunner, persistentMemory)

## Requirements
- Each TODO has acceptance criteria
- Vision invariant compliance verified: Drive wraps native modes, beforeSubmitPrompt is primary entry
- Dedupe against existing plans
- No timelines
