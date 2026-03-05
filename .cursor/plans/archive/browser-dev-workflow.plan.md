---
name: Browser Dev Workflow
overview: "Set up cursor serve-web for iterative UI development and browser-based testing: launch config, one-command dev scripts, Playwright automation, visual regression tests for ShareScreen webview, and complete live-testing documentation."
todos:
  - id: bdw-01-serve-web-research
    content: "Research whether --extensionDevelopmentPath works with cursor serve-web. Run: 'cursor serve-web --help' to check available flags. Then test: 'cursor serve-web --extensionDevelopmentPath /path/to/repo --without-connection-token'. Document result in docs/research/cursor-cli/README.md under a new 'serve-web + extension dev path' section. If the flag works, this avoids the compile→package→install cycle. If not, document the .vsix workflow as the only path. Acceptance: docs/research/cursor-cli/README.md has new section with tested result; flag support confirmed or denied with evidence."
    status: completed
  - id: bdw-02-launch-config
    content: "Add 'Dev: Drive in browser' compound launch configuration to .vscode/launch.json. The config should: (1) run 'npm run compile' as preLaunchTask; (2) run 'npx vsce package --no-dependencies' to create the .vsix; (3) run 'cursor --install-extension' to install it; (4) start 'cursor serve-web --without-connection-token --accept-server-license-terms --port 8000'; (5) auto-open http://localhost:8000 in the default browser. Also add a VS Code tasks.json entry for each step. Acceptance: launch config exists in .vscode/launch.json; tasks.json has package-extension and install-extension tasks; serve-web starts when config is run."
    status: completed
  - id: bdw-03-dev-script
    content: "Create scripts/serve-web-dev.ps1: a single PowerShell script that runs the full browser dev workflow in one command. Steps: (1) npm run compile; (2) npx vsce package --no-dependencies --out out/cursor-drive.vsix; (3) cursor --install-extension out/cursor-drive.vsix; (4) Start-Process cursor -ArgumentList 'serve-web --without-connection-token --accept-server-license-terms --port 8000'; (5) Start-Sleep 3; (6) Start-Process 'http://localhost:8000'. Handle errors at each step (exit on first failure). Acceptance: scripts/serve-web-dev.ps1 exists and runs end-to-end; opens browser at localhost:8000; script exits with error code on failure."
    status: completed
  - id: bdw-04-live-testing-docs
    content: "Add browser-based testing section to docs/guides/live-testing.md. Cover: (1) When to use browser dev vs F5 Electron dev-host (browser = faster iteration for webview UI, status bar; Electron = full extension host, MCP server, TTS); (2) Step-by-step: compile, package, install, serve-web; (3) Known limitations: serve-web may not support all VS Code APIs, MCP server must be started separately, TTS unavailable in browser context; (4) Reload workflow: re-run package→install after code changes; (5) Connection token: use --without-connection-token for local dev; (6) Troubleshooting 'server is downloading...' (requires cursor tunnel user login first). Acceptance: docs/guides/live-testing.md has Browser Dev section; covers all 6 points; no broken links."
    status: completed
  - id: bdw-05-playwright-setup
    content: "Set up Playwright for browser-based extension testing. Install @playwright/test as a dev dependency. Create playwright.config.ts at project root: base URL http://localhost:8000, browser: chromium, timeout 30s. Create tests/browser/smoke.spec.ts with initial tests: (1) navigate to localhost:8000; (2) wait for Cursor IDE UI to load; (3) verify 'Drive (off)' appears in status bar (use page.locator for status bar item); (4) run 'Developer: Reload Window' equivalent if needed; (5) verify no console errors on load. Add 'test:browser' script to package.json. Acceptance: @playwright/test installed; playwright.config.ts exists; tests/browser/smoke.spec.ts has ≥3 test cases; 'npm run test:browser' command exists in package.json."
    status: completed
  - id: bdw-06-visual-regression
    content: "Add visual regression tests for ShareScreen WebviewPanel. Extend tests/browser/smoke.spec.ts or create tests/browser/sharescreen.spec.ts: (1) open ShareScreen via cursorDrive.showShareScreen command (use Playwright keyboard shortcut or command palette); (2) take screenshot of the panel; (3) compare against baseline using Playwright's expect(page).toHaveScreenshot(). Create baseline screenshots directory at tests/browser/screenshots/baseline/. Test both dark and light theme variants if Cursor supports theme switching in serve-web. Acceptance: tests/browser/sharescreen.spec.ts exists with screenshot comparison test; baseline screenshots committed; test passes on clean run."
    status: completed
  - id: bdw-07-mcp-coordination
    content: "Document MCP server coordination with cursor serve-web. The MCP server at :7891 must be running before the browser UI is fully functional (drive_speak, share_screen_* tools require it). Update scripts/serve-web-dev.ps1 to optionally start the MCP server: if 'node out/index.js' or equivalent MCP-only startup is possible, add it; otherwise document that F5 in a separate window is needed. Add a health check step to tests/browser/smoke.spec.ts: HTTP GET to http://127.0.0.1:7891/health, verify 200 response. Acceptance: scripts/serve-web-dev.ps1 documents MCP server coordination; smoke.spec.ts includes MCP health check; docs/guides/live-testing.md mentions MCP separate startup requirement."
    status: completed
  - id: bdw-08-browser-test-script
    content: "Create scripts/test-browser.ps1: PowerShell script to run Playwright browser tests against a running serve-web instance. Steps: (1) check if localhost:8000 is responding (if not, exit with error message 'Run scripts/serve-web-dev.ps1 first'); (2) run 'npx playwright test' (which runs tests/browser/**/*.spec.ts); (3) output test results; (4) open Playwright HTML report if tests fail. Acceptance: scripts/test-browser.ps1 exists; exits with clear message if serve-web not running; runs Playwright tests; opens report on failure."
    status: completed
isProject: false
---

# Browser Dev Workflow

## Purpose

The primary dev loop (F5 → Electron Extension Development Host) is reliable but slow for iterating on UI surfaces (ShareScreen webview, status bar). `cursor serve-web` exposes the full Cursor IDE in a browser, enabling faster visual iteration and browser automation via Playwright.

No "screencast mode" was found in the codebase — the user likely means this browser-based view itself. The concept is: compile, install into Cursor profile, serve in browser, inspect and iterate without relaunching a dev-host window.

## How cursor serve-web works

From `docs/research/cursor-cli/README.md`:

- Runs a local web server serving the full Cursor editor UI
- Default port `:8000`
- `--without-connection-token` for local use (no auth)
- Extensions installed in the active Cursor profile are available
- MCP server at `:7891` must be started separately

```
compile → package .vsix → cursor --install-extension → cursor serve-web → browser
```

## Key open question (bdw-01)

Does `--extensionDevelopmentPath` work with serve-web? If yes, the package/install cycle is skipped — just recompile and reload the browser. This is the most important thing to validate first.

## Dependency note

This plan has **no dependencies** — it can start immediately in parallel with Phase 1 foundation work. It does not depend on the pipeline or mode alignment work.

## Test architecture

```
scripts/serve-web-dev.ps1
  → npm run compile
  → npx vsce package
  → cursor --install-extension
  → cursor serve-web :8000
  → opens browser

scripts/test-browser.ps1
  → check :8000 alive
  → npx playwright test (tests/browser/**/*.spec.ts)
  → open HTML report on failure

tests/browser/
  ├── smoke.spec.ts         (basic UI load, status bar, MCP health)
  └── sharescreen.spec.ts   (visual regression, screenshot comparison)
```

## Execution strategy

**Executor role:** Implementer.

**Subagent fan-out:**

- Batch A: bdw-01 (research --extensionDevelopmentPath) — must come first; result affects bdw-02 and bdw-03
- Batch B (parallel): bdw-02 (launch config) + bdw-03 (dev script) + bdw-04 (docs) — independent
- Batch C: bdw-05 (Playwright setup) — baseline for visual regression
- Batch D (parallel): bdw-06 (visual regression) + bdw-07 (MCP coordination) — after bdw-05
- Batch E: bdw-08 (browser test script) — after bdw-05, bdw-06, bdw-07

**Phase gate:** bdw-01 must complete before bdw-02/bdw-03 (launch config and script depend on whether extensionDevelopmentPath works).

**Delegation trigger:** Spawn a subagent for bdw-05 (Playwright) if test setup requires more than 3 files changed.

---

## Reconciliation

All 8 TODOs completed:


| TODO   | Outcome                                                                                                               |
| ------ | --------------------------------------------------------------------------------------------------------------------- |
| bdw-01 | `--extensionDevelopmentPath` not supported; documented in `docs/research/cursor-cli/README.md`                        |
| bdw-02 | Launch config "Dev: Drive in browser" + tasks (package-extension, install-extension, browser-dev-prep) in `.vscode/`  |
| bdw-03 | `scripts/serve-web-dev.ps1` — compile, package, install, serve-web, open browser                                      |
| bdw-04 | Browser Dev section in `docs/guides/live-testing.md` (6 points covered)                                               |
| bdw-05 | Playwright setup: `playwright.config.ts`, `tests/browser/smoke.spec.ts` (4 tests), `npm run test:browser`             |
| bdw-06 | `tests/browser/sharescreen.spec.ts` with screenshot comparison; baseline dir at `tests/browser/screenshots/baseline/` |
| bdw-07 | MCP coordination documented in serve-web-dev.ps1, live-testing.md; MCP health check in smoke.spec.ts                  |
| bdw-08 | `scripts/test-browser.ps1` — checks :8000, runs Playwright, opens report on failure                                   |


**Artifacts:** `scripts/launch-serve-web.mjs`, `scripts/serve-web-dev.ps1`, `scripts/test-browser.ps1`; Playwright tests in `tests/browser/`.