# 18 — P0/P1 gap closure

## Context

Prior research left concrete gaps in live MCP App smoke, MCP registration E2E, submit-path pipeline honesty, MCP App Sync/Artifacts parity, silent `registerAppResource` failure, and missing Extension Host CI. This plan closes P0 and P1 with small verifiable phases. P2 stays deferred.

## Scope

**In**

- F5/VSIX MCP App smoke checklist with automated health lever and explicit human sign-off
- MCP setup coverage: deeplink URI unit test, plugin-only no `.mcp.json` assert, registerServer path documented against existing code
- Submit-path pipeline contract: honest docs + hook hint/HTTP soft bridge + Jest contract on `drive_run_pipeline` / `POST /pipeline`
- MCP App Sync + Artifacts tabs parity with webview + Playwright
- Jest assertion that MCP App resource registers (no silent skip success)
- Extension Host smoke in CI when feasible (`@vscode/test-cli` + one activation test)

**Out**

- P2: side chats coexistence, cloud conversation hooks, plugin canvases eval, automations path, ADR 0017/0019 index drift
- Runtime coupling to claude-drive
- Full Cursor chat/composer Electron UI automation
- Re-researching changelogs

## Constraints

- Agnostic of claude-drive (optional read-only inspiration only)
- Prefer existing `cursor-cli` / `cursor-sdk` / Playwright hostless patterns
- Prove It Works: `npm run compile` + `npm test` + `npm run test:browser -- tests/browser/mcp-app.spec.ts`
- Plan lives under `docs/plans/` only
- Minimal diffs; no unrelated plan edits under `~/.cursor/plans`

## Alternatives

1. **Big wire first.** Make `beforeSubmitPrompt` call `runPipeline` and rewrite the prompt on every submit. Rejected for this pass: Cursor hook prompt-rewrite behavior is still host-dependent; risk of double-processing if agents also call `drive_run_pipeline`.
2. **Docs-only close.** Write checklists and leave Sync/Artifacts / Jest skip / CI untouched. Rejected: does not meet Prove It Works for P1.
3. **Chosen.** Automate what CI can prove (health, unit, hostless Playwright, resource registration, plugin SKU). Document human F5/VSIX/MCP App inline steps. Soft-bridge the hook to `/pipeline` for context. Enforce the TypeScript entry via contract tests. Add one Extension Host activation smoke in CI.

## Applicable skills

- poteto-mode Principles (this plan)
- `control-ui` for Playwright MCP App surface checks
- `unslop` for guide/contract prose
- `deslop` before commit

## Phases

1. [phase-1-smoke-checklist.md](./phase-1-smoke-checklist.md)
2. [phase-2-mcp-setup-e2e.md](./phase-2-mcp-setup-e2e.md)
3. [phase-3-pipeline-contract.md](./phase-3-pipeline-contract.md)
4. [phase-4-mcp-app-sync-artifacts.md](./phase-4-mcp-app-sync-artifacts.md)
5. [phase-5-register-app-resource.md](./phase-5-register-app-resource.md)
6. [phase-6-extension-host-ci.md](./phase-6-extension-host-ci.md)

See [testing.md](./testing.md) for project-level verification.

## Verification

```powershell
npm run compile
npm test
npm run test:browser -- tests/browser/mcp-app.spec.ts
npm run build:plugin
# if wired:
npm run test:integration
```

Human sign-off: checklist in `docs/guides/f5-vsix-mcp-app-smoke.md`.

## Implementation guidance

- Run the **how** skill mentally over `mcpServer.ts`, `agentScreenApp.ts`, and `extension.ts` before edits.
- Prefer **Laziness Protocol**: smallest lever (script/test) over new frameworks.
- **Encode Lessons in Structure**: contract tests and build asserts, not more prose alone.
- **Sequence Verifiable Units**: finish and verify each phase before the next.
- `/deslop` before commit. **unslop** on all new docs.
- **show-me-your-work** only if the branch needs an auditable decision trail beyond this plan.
- After PR open, use Cursor **babysit**.
