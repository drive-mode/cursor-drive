# Testing — 18 P0/P1 gap closure

Back: [overview.md](./overview.md)

## Static (every phase)

```powershell
npm run compile
npm test
```

## Runtime by surface

| Surface | Control | Command |
|---------|---------|---------|
| MCP HTTP health | CLI lever | `node scripts/check-mcp-health.mjs` |
| MCP App DOM | Playwright (`control-ui`) | `npm run test:browser -- tests/browser/mcp-app.spec.ts` |
| Pipeline / MCP tools | Jest | `npx jest tests/pipeline.test.ts tests/mcpServer.test.ts` |
| Plugin SKU | build + assert | `npm run build:plugin` then no `.cursor-plugin/.mcp.json` |
| Extension Host | vscode-test | `npm run test:integration` (when phase 6 lands) |
| Live F5 / inline MCP App / TTS | Human | `docs/guides/f5-vsix-mcp-app-smoke.md` |

## Definition of done

- P0 phases 1–3 merged with green compile + Jest
- P1 phases 4–5 green including Playwright mcp-app
- Phase 6 either green in CI or explicitly deferred with CLAUDE.md corrected
- No claude-drive runtime imports
