# Phase 5 — Jest registerAppResource (no silent skip)

Back: [overview.md](./overview.md)

## Goal

When `enableApps` is true, tests fail if the Agent Screen MCP App resource never registered.

## Changes

- Add Jest coverage that starts MCP with `getEnableApps: () => true` and asserts the app resource is listed/readable (or that `registerAppResource` was invoked via a mock of `@modelcontextprotocol/ext-apps/server`).
- Prefer mocking the ext-apps module if ESM dynamic import is flaky under Jest CJS, but still assert a public resource surface or call count.
- In test / `JEST_WORKER_ID` environments, rethrow registration errors instead of warn-and-continue (fail loud). Keep warn-and-continue only for production Extension Host where optional Apps must not kill MCP.

## Data structures

`AGENT_SCREEN_APP_RESOURCE_URI` (`ui://cursor-drive/agent-screen`) already exported from `agentScreenApp.ts`.

## Verification

```powershell
npx jest tests/mcpServer.test.ts -t "App resource|registerApp"
npm test
```
