# Phase 2 — MCP setup E2E (unit + plugin-only)

Back: [overview.md](./overview.md)

## Goal

Prove deeplink/mcp.json registration builders and marketplace plugin-only SKU without requiring a live Cursor accept click.

## Changes

- Extract deeplink URI builder from `src/extension.ts` into a small pure helper (e.g. `src/mcpRegistration.ts`) used by `registerMcpViaDeepLink`.
- Jest: assert URI contains `name=drive` and base64 config with the given port.
- Jest or script assert: after `npm run build:plugin`, `.cursor-plugin/.mcp.json` is absent (encode ADR-0019).
- Document human residual steps (accept Register prompt, Reload MCP) in the smoke checklist from phase 1.

## Data structures

```ts
type McpDeepLinkInput = { name: string; url: string };
// buildMcpInstallDeepLink(input) -> vscode.Uri string
```

## Verification

```powershell
npm test -- --testPathPattern="mcpRegistration|build-plugin|pluginInstaller"
npm run build:plugin
# assert no .cursor-plugin/.mcp.json
```
