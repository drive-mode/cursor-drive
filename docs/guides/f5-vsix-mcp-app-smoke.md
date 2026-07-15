# F5 / VSIX MCP App smoke

Ordered smoke path for live Cursor with Drive. Automate what CI can prove. Leave F5, TTS, and inline MCP App chat as human sign-off.

Full loop: [live-testing.md](./live-testing.md). MCP App walkthrough: [demo-mcp-apps.md](./demo-mcp-apps.md).

## Automated (run first)

| Step | Who | Command / check |
|------|-----|-----------------|
| 1 | Script | `node scripts/check-mcp-health.mjs` (optional `--url http://127.0.0.1:7891/health`) |
| 2 | Script | Expect exit `0` when Drive MCP is up; exit `1` when down |
| 3 | Build | `npm run compile` then package/install per live-testing |

Health is a hard fail. Soft Playwright smoke is separate.

## Human sign-off (F5 or VSIX)

Do these in the Extension Development Host (F5) or after VSIX install.

1. Start Drive (`Toggle Drive Mode` or status bar).
2. Accept the **Register** MCP deep-link prompt if shown. Else register via deep link or `.cursor/mcp.json` (see demo-mcp-apps).
3. **Reload MCP** or **Developer: Reload Window** so Cursor picks up the server.
4. Confirm `node scripts/check-mcp-health.mjs` exits 0.
5. Open Agent Screen. Confirm TTS if you care about voice this pass.
6. In chat, exercise an MCP App tool (`agent_screen_*` with apps enabled). Confirm inline UI renders.
7. Sign off only when steps 1–6 pass on this machine.

## Residual (not automatable here)

- Clicking Accept on the Cursor MCP install UI
- Visual confirmation of inline MCP App chrome
- Wake-word / mic path

## Extension Host CI (phase 6)

Local: `.vscode-test.mjs` + `src/test/extension.test.ts` via `npm run test:integration` (downloads stable VS Code into gitignored `.vscode-test/`).

CI (Ubuntu): after unit tests, `.github/workflows/ci.yml` runs `xvfb-run -a npm run test:integration`. Smoke asserts activate + `cursorDrive.toggle` / `cursorDrive.showAgentScreen` registration.

## Related

- Submit-path contract: [pipeline-submit-contract.md](../reference/pipeline-submit-contract.md)
- Hooks vs TypeScript pipeline: [hooks.md](../reference/hooks.md)
