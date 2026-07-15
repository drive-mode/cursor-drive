# Phase 4 — MCP App Sync + Artifacts parity

Back: [overview.md](./overview.md)

## Goal

MCP App UI matches webview Sync and Artifacts tabs enough for hostless Playwright to prove parity.

## Changes

- Port Sync + Artifacts tab buttons, panels, and minimal render helpers from `agentScreenTemplate.ts` into `agentScreenApp.ts`.
- Extend `applyEvent` / clear for `syncStatus`, `proposalUpdate`, `queueStatus`, `cloudAgentArtifact` (and kind aliases).
- Update `tests/agentScreenApp.test.ts` to expect Sync/Artifacts testids.
- Extend `tests/browser/mcp-app.spec.ts` to click Sync/Artifacts and assert injected event content.

## Data structures

Event shapes already on `AgentScreenEvent` in `agentScreen.ts`: `syncStatus` + `syncSnapshot`, `cloudAgentArtifact` fields, `proposalUpdate` / `queueStatus` text.

## Verification

```powershell
npx jest tests/agentScreenApp.test.ts
npm run test:browser -- tests/browser/mcp-app.spec.ts
```
