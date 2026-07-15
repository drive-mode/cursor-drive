# Phase 6 — Extension Host E2E in CI

Back: [overview.md](./overview.md)

## Goal

One activation smoke under Extension Host on Ubuntu CI, or an explicit documented deferral if deps/time block it after P0–P5.

## Changes

If feasible in this pass:

- Add `@vscode/test-cli` + `@vscode/test-electron` devDependencies.
- Add `.vscode-test.mjs` and one compiled test under `src/test/` (or `out/test/`) that activates the extension and asserts `cursorDrive.toggle` / `cursorDrive.showAgentScreen` are registered.
- Add `npm run test:integration`.
- Wire `xvfb-run -a npm run test:integration` into `.github/workflows/ci.yml` after unit tests.

If blocked (install friction, Cursor-only APIs, Windows-only local): document the deferral in `docs/guides/f5-vsix-mcp-app-smoke.md` and correct stale `CLAUDE.md` claims about `test:integration` already existing. Do not invent a green CI step that never runs.

## Data structures

None beyond vscode-test config object.

## Verification

```powershell
npm run compile
npm run test:integration
# CI Linux: xvfb-run -a npm run test:integration
```
