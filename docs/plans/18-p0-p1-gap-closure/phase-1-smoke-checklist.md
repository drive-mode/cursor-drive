# Phase 1 — F5/VSIX MCP App smoke checklist

Back: [overview.md](./overview.md)

## Goal

A single ordered smoke path for live Cursor: automate health/package checks; leave F5, TTS, and inline MCP App chat steps as human sign-off.

## Changes

- Add `docs/guides/f5-vsix-mcp-app-smoke.md` with ordered checklist linking `live-testing.md` and `demo-mcp-apps.md`.
- Add `scripts/check-mcp-health.mjs` that GETs `/health` and exits non-zero on failure (hard fail, unlike soft Playwright smoke).
- Link the checklist from `docs/guides/live-testing.md` (one short pointer).

## Data structures

None. CLI args: optional `--url` defaulting to `http://127.0.0.1:7891/health`.

## Verification

```powershell
node scripts/check-mcp-health.mjs --url http://127.0.0.1:7891/health
# expect non-zero when MCP down; 0 when extension is listening
```

Static: doc renders as markdown; script runs under Node 20.
