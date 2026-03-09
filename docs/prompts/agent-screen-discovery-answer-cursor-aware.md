# Cursor Drive — Agent Screen UI Discovery Answer (Cursor-Aware Edition)

Filled from codebase query plus subagent review. Use when the codebase is not accessible or to align with the Cursor-Aware discovery protocol.

---

## Key identifiers (reference when you can't query the repo)

| Kind | Value |
|------|--------|
| **Files** | `src/agentScreen.ts` (AgentScreenPanel, buildHtml, postEvent, onDidReceiveMessage, setDriveActive, ActivityEvent); `src/agentScreenApp.ts` (buildAgentScreenAppHtml, AGENT_SCREEN_APP_RESOURCE_URI); `src/extension.ts` (createOrShow, setDriveActive, commands); `src/mcpServer.ts` (agent_screen_* tools, postEvent callers) |
| **Commands** | `cursorDrive.showAgentScreen`, `cursorDrive.clearAgentScreen`, `cursorDrive.openWebviewDevTools` |
| **Webview viewType** | `cursorDrive.agentScreen` (AgentScreenPanel.viewType) |
| **Config** | `cursorDrive.agentScreen.displayMode` (tab \| panel \| bottomLog), `cursorDrive.agentScreen.clickBehavior`, `cursorDrive.agentScreen.showPlanProgress`, `cursorDrive.agentScreen.enabled`, `cursorDrive.agentScreen.autoOpen`, `cursorDrive.mcp.enableApps` |

---

## AGENT 0 — Meta-Context & Goals

**0.1** Primary mission (from codebase): **Iterating on an existing implementation.** The Agent Screen is a full WebviewPanel implementation (tabs: Live, Activity, Files, Decisions, Sync, Artifacts; plan progress; files strip; message handling). No separate `media/agentScreen.html`; HTML is inline in `buildHtml()` in `src/agentScreen.ts`. MCP App variant exists in `agentScreenApp.ts` for inline chat when `cursorDrive.mcp.enableApps` is true.

**0.2** "Continue planning" — Not specified in code; left for you to choose (layout, end-to-end, state flow, fixes, redesign, or test harness).

**0.3** Single most blocking thing: **Sync/queue/proposal data not wired to the panel** — `postSyncStatus`, `postProposalUpdate`, `postQueueStatus` exist but no callers in `src/`. Alternatively: **hidden-panel event queue** not implemented (events sent while the webview is hidden are dropped; see Agent 6).

**0.4** Ideal next working state (one sentence): Sync tab shows live data (user branch, operators, proposals, queue) by wiring StateSyncCoordinator/IntegrationQueue to `AgentScreenPanel.getInstance()?.postSyncStatus(...)` etc., and/or add an event queue when the panel is hidden plus a mock event injector command for testing without the full pipeline.

---

## AGENT 1 — Cursor Version & Runtime Environment

**1.1** Cursor version: **Unknown from codebase** — user to fill (Menu → About Cursor). Codebase has `engines.vscode: "^1.85.0"` and CI uses Node 20.

> **⚠️ CURSOR BUG:** If you're on VSCode base 1.99.x, webview panels may have a slow-load regression. Check "VSCode Version" in About and compare with Cursor forum reports.

**1.2** Default layout: **Unknown from codebase** — user to confirm (Settings → General → Preferences → Default Layout).

> **⚠️ CURSOR BUG:** "Agent" default layout in Cursor 2.x can cause WebviewPanels opened with `ViewColumn.Beside` to not appear, appear in the wrong place, or sit behind the chat pane. The extension uses `ViewColumn` from `activeTextEditor.viewColumn! + 1` or `ViewColumn.Two` for the Agent Screen tab.

**1.3** Switching to "Editor" layout: **User to test** — community workaround for blank/webview issues.

**1.4** Extension load: **F5** (Extension Development Host) is the normal path; `.vsix` sideload is supported. Running in the same workspace as the extension is possible but not recommended.

---

## AGENT 2 — Webview Surface: The Bottom Panel Problem

**2.1** Where the Agent Screen appears: **Configurable.** `cursorDrive.agentScreen.displayMode`: **`tab`** = WebviewPanel beside editor (`ViewColumn` as above); **`panel`** = same code path as tab in this codebase (no separate bottom-panel WebviewView); **`bottomLog`** = OutputChannel only (no webview). So in practice: tab beside editor, or output channel; there is no dedicated bottom-panel webview view.

> **⚠️ CURSOR BUG — CRITICAL:** Cursor has a confirmed bug where webview-based views in the **bottom panel** can stay blank (service worker controller errors). This codebase does not put the Agent Screen in the bottom panel as a webview; it uses either a tab or OutputChannel. If you add a bottom-panel webview view, expect this Cursor bug.

**2.2** Blank webview: **User to describe** if it happens (e.g. only in Agent layout or bottom panel).

**2.3** Webview Developer Tools: Extension registers `cursorDrive.openWebviewDevTools` → `workbench.action.webview.openDeveloperTools`. Whether that command exists in your Cursor build is **user to confirm**.

> **⚠️ CURSOR BUG:** In some Cursor versions the command was removed or inaccessible. If missing, use a debug bridge (e.g. webview `window.onerror` → `postMessage({ type: '__debug', ... })` and log in extension).

**2.4** `retainContextWhenHidden`: **Yes** — set in `createWebviewPanel(..., { enableScripts: true, retainContextWhenHidden: true, localResourceRoots: [extensionUri] })`. Required so the webview state survives tab switches. Note: **postMessage to a hidden webview is still dropped** by the host; see Agent 6 for the event-queue mitigation (not currently implemented).

---

## AGENT 3 — File System Snapshot

**3.1** Directory tree (abbreviated):

```
src/
  agentScreen.ts       — ~660 lines; buildHtml(), postEvent(), onDidReceiveMessage, createOrShow
  agentScreenApp.ts    — ~166 lines; buildAgentScreenAppHtml(), AGENT_SCREEN_APP_RESOURCE_URI
  extension.ts         — createOrShow(), setDriveActive(); registers showAgentScreen, clearAgentScreen, etc.
  driveSidebar.ts      — Drive sidebar (WebviewViewProvider); not "sidebar.ts"
  statusBar.ts         — status bar
.cursor-plugin/
  agents/              — drive-operator.md, drive-reviewer.md, verifier.md, plan-orchestrator.md, plan-governor.md
  skills/              — drive-persona, drive-modes, plan-*, doc-*, agent-browser, etc.
  rules/               — tiered-model-routing, vision-invariants, policy-pack, plan-governance, etc. (.mdc)
media/                 — no agentScreen.html; HTML is inline in agentScreen.ts
tests/
  agentScreen.test.ts  — Jest; activity/file/cliStream/clear, planProgress, syncStatus, switchAgent, openFile, etc.
  agentScreenApp.test.ts
package.json           — "main": "./out/extension.js", "engines": { "vscode": "^1.85.0" }
tsconfig.json          — target ES2022, outDir "out", strict true
```

**`.cursor/mcp.json`** — Not in repo (workspace-specific). Purpose: register the Drive MCP server URL (e.g. `http://127.0.0.1:7891/mcp`) so Cursor can call `agent_screen_*` tools. MCP Apps (inline agent-screen when `cursorDrive.mcp.enableApps` is true) depend on Cursor resolving `ui://cursor-drive/agent-screen`; server registration is via this config or the extension’s programmatic registration when available.

**3.2** `package.json` contributes: commands (e.g. `cursorDrive.toggle`, `cursorDrive.showAgentScreen`, `cursorDrive.clearAgentScreen`, `cursorDrive.openWebviewDevTools`); viewsContainers (activitybar: `cursorDrive`); views (`cursorDrive.panel` = Drive sidebar). **Config:** `cursorDrive.agentScreen.displayMode`, `cursorDrive.agentScreen.clickBehavior`, `cursorDrive.agentScreen.showPlanProgress`, `cursorDrive.agentScreen.enabled`, `cursorDrive.agentScreen.autoOpen`, etc. — all under `configuration.properties`.

**3.3** `activationEvents`: **`["onStartupFinished"]`** — no `"*"`. Extension activates after startup; no Cursor-specific activation quirk documented in code.

> **⚠️ CURSOR NOTE:** In Cursor (VSCode 1.99+), `"*"` is deprecated; this codebase already uses `onStartupFinished`.

---

## AGENT 4 — Current HTML State

**4.1** `buildHtml()` is a single inline template string in `src/agentScreen.ts` (roughly lines 275–648). Full body not pasted here; it includes: CSP meta with nonce, header (title, operator badge), optional plan-progress section, tabs (Live, Activity, Files, Decisions, Sync, Artifacts), panels with empty states and live stream, and a single `<script nonce="${nonce}">` with `acquireVsCodeApi()`, tab logic, file/activity/decision handlers, message listener (driveState, agentSwitch, activity, file, decision, planProgress, cliStream, chime, syncStatus, proposalUpdate, queueStatus, cloudAgentStatus, cloudAgentArtifact, clear), and helpers (formatTime, escapeHtml, addActivity, addFile, addDecision, renderSyncSnapshot, playChimes).

**4.2** HTML is **inline** as a TypeScript template string in `buildHtml()`; no separate delivered file. No `media/agentScreen.html`; not loaded from disk.

**4.3** Nonce/CSP: **Yes.** `const nonce = getNonce();` and `const csp = panel.webview.cspSource;` at start of `buildHtml()`. CSP meta uses `style-src ${csp} 'nonce-${nonce}'; script-src ${csp} 'nonce-${nonce}';`; the single `<style nonce="${nonce}">` and `<script nonce="${nonce}">` use the same nonce. One nonce per `buildHtml()` call.

> **⚠️ CURSOR CSP PITFALL:** The nonce is generated once per `buildHtml()` invocation. If you call `buildHtml()` again (e.g. on config change) and the panel reuses old HTML or mixes nonces, CSP can break silently. Ensure the same nonce is used in the CSP meta and in every style/script tag for that load.

**4.4** HTML is **inline** — not from disk. No `fs.readFileSync` or `vscode.Uri.joinPath(extensionUri, 'media', ...)` for the main Agent Screen.

**4.5** CSP meta (as in code):

```html
<meta http-equiv="Content-Security-Policy"
  content="default-src 'none';
           style-src ${csp} 'nonce-${nonce}';
           script-src ${csp} 'nonce-${nonce}';
           img-src ${csp} https://api.cursor.com https://*.githubusercontent.com https://*.amazonaws.com;
           media-src ${csp} https://api.cursor.com ...">
```

---

## AGENT 5 — Build & Bundling

**5.1** **tsc only** — no esbuild/webpack/vite. `"compile": "tsc -p ./"`.

**5.2** Scripts: `compile`, `watch`, `test` (Jest), `vscode:prepublish`: `bundle:mcp-app && compile`. `bundle:mcp-app` copies `node_modules/@modelcontextprotocol/ext-apps/.../app-with-deps.js` → `out/mcp-app-bundle.js`.

**5.3** Build does **not** copy `media/`; there is no `media/agentScreen.html`. The main Agent Screen HTML is built in memory in `buildHtml()`. MCP App bundle is in `out/`.

**5.4** `tsc --noEmit`: Run locally to confirm; not run in this audit.

**5.5** `engines.vscode`: **`"^1.85.0"`**. Compatible with Cursor’s typical VSCode base (e.g. 1.99.x–1.105.x). If Cursor ships a lower major/minor, activation could be restricted.

---

## AGENT 6 — Data Flow & the Hidden-Panel Event Queue Problem

**6.1** Event pipeline:

- **MCP tool** (e.g. `agent_screen_activity`) → **DriveMcpServer** (in-process) handler in `src/mcpServer.ts` → `AgentScreenPanel.getInstance()` → `panel.logActivity()` / `logFile()` / `logDecision()` / `updatePlanProgress()` etc. → **`postEvent(event)`** → `this.panel.webview.postMessage({ ...event, timestamp })` (when panel exists and not in bottomLog mode).
- **Webview** → `window.addEventListener('message', ...)` in the inline script; switch on `msg.type` and update DOM.

So: MCP tool → in-process MCP server → `AgentScreenPanel.getInstance().postEvent(...)` → `webview.postMessage` → webview message listener.

**6.2** `postEvent()` is called from: MCP handlers (`agent_screen_activity`, `agent_screen_file`, `agent_screen_decision`, `agent_screen_plan_update`, `cursor_cli_run` streaming, cloud agent tools), extension commands (spawn/switch operator, clear), and `setDriveActive`. Event types: activity, file, decision, agentSwitch, clear, planProgress, cliStream, cloudAgentStatus, cloudAgentArtifact, syncStatus, proposalUpdate, queueStatus, driveState, chime.

**6.3** No test harness that sends fake events into the webview without running the full extension. Unit tests mock the extension side (e.g. OutputChannel or postMessage). **A `cursorDrive.debug.sendTestEvent` (or similar) command does not exist** — high leverage to add.

**6.4** **Event queue when panel is hidden: NOT implemented.** The code does not buffer events when `!panel.visible`. It always calls `this.panel.webview.postMessage(...)` when in tab/panel mode. So **messages sent while the webview is hidden are dropped** by the host (Cursor/VS Code). No `_pendingEvents`, no `onDidChangeViewState` flush in `src/agentScreen.ts`.

> **⚠️ CURSOR CRITICAL PATTERN:** Implement a queue when `!this.panel.visible` and flush on `onDidChangeViewState` when the panel becomes visible (see protocol’s Agent 6 code snippet).

**6.5** **Yes.** `onDidReceiveMessage` handles `openFile`, `askAboutItem`, `openPlanTodo` and calls `this.openFile(msg.path)` / `handleAskAboutItem` / `openFile(msg.planPath)`. `openFile` uses workspace path or absolute path and `vscode.window.showTextDocument` with `clickBehavior` (openInEditor vs openInNewWindow). Verified by tests and code path.

**6.6** `cliStream` events come from **real Cursor CLI streaming** — `cursor_cli_run` streaming path uses `runCursorCliStreaming()` and forwards `runner.on("data", event)` to `agentScreen.postEvent({ type: "cliStream", ... })`. Not synthesized by the extension from chat.

---

## AGENT 7 — MCP Server Architecture

**7.1** **In-process** — `DriveMcpServer` is created in `extension.ts` and runs in the same Node process as the extension host. It has direct access to `AgentScreenPanel.getInstance()`.

**7.2** Tools present:

- `agent_screen_activity` — yes
- `agent_screen_file` — yes
- `agent_screen_decision` — yes
- `agent_screen_plan_update` — yes
- `agent_screen_post_activity` / `agent_screen_post_file` / `agent_screen_post_decision` — **no** (names in code are `agent_screen_activity`, etc.)
- `agent_screen_cli_stream` — no separate tool; cliStream is emitted by the extension when handling `cursor_cli_run` streaming
- `agent_screen_clear` — **no**; clear is only via command `cursorDrive.clearAgentScreen`
- `agent_screen_chime` — no MCP tool; chime is extension-only (e.g. on Drive toggle)

**7.3** **Yes.** MCP server is in-process and calls `AgentScreenPanel.getInstance()` then `panel.logActivity()`, `panel.logFile()`, etc., which call `postEvent()`. No IPC needed.

**7.4** **Yes.** Zod schemas, e.g. `z.string().describe("...")` for operator_name, text, file_path; for plan_update: plan_id, plan_name, completed_count, total_count, current_todo optional.

**7.5** `.cursor-plugin/`: agents (drive-operator, drive-reviewer, verifier, plan-orchestrator, plan-governor); skills (drive-persona, drive-modes, plan-*, doc-*, etc.); rules (tiered-model-routing, vision-invariants, policy-pack, plan-governance, etc.). Agent instructions and rules reference sharing work and using tools; explicit “call agent_screen_*” wording is in operator system hints (e.g. “Report files touched via agent_screen_file”) in `operatorRegistry.ts`, not in the plugin markdown. Plugin agents/skills don’t duplicate the tool list; the MCP server defines the tools.

---

## AGENT 8 — Cursor Layout Interaction & the "Agent Mode" Problem

**8.1** When `createOrShow()` runs: panel is created with `createWebviewPanel(..., column, ...)` where column is `activeTextEditor.viewColumn! + 1` or `ViewColumn.Two`. So it appears **as an editor tab** to the right of the active editor (or in column two). In Cursor’s “Agent” layout, that column may compete with the chat pane — **user to observe** where it actually opens.

**8.2** Survival across layout switch: **Not tested in codebase.** User to confirm (e.g. Agent → Editor restores webview per community workaround).

**8.3** View container: **Yes.** `viewsContainers.activitybar`: `cursorDrive` (Drive icon). `views.cursorDrive`: `cursorDrive.panel` (Drive sidebar). The **Agent Screen** is not a view in that container; it’s a separate **WebviewPanel** created by the command. So the activity bar shows the Drive sidebar, not the Agent Screen tab.

> **⚠️ CURSOR ACTIVITYBAR NOTE:** Cursor’s activity bar can be horizontal; extensions may need to be pinned. The Agent Screen itself is a tab in the editor area, not in the activity bar.

**8.4** Editor layout restoring webview: **User to confirm** — documented as community workaround for the bottom-panel/service-worker blank-panel bug.

---

## AGENT 9 — Previous UI Attempts & Known Failures

**9.1** Before “delivered HTML”: This codebase **is** the current implementation. No separate “previous” version in repo; `buildHtml()` has always been this inline template (or evolved in place). No minimal placeholder phase visible in history here.

**9.2** Not applicable as a list of past failures; if something fails now it’s runtime (Cursor layout, CSP, or hidden-panel drops). Possible failure modes to watch: CSP/nonce mismatch, postMessage not received (e.g. when hidden), tab/layout issues in Agent layout, blank bottom panel if a bottom-panel webview were added.

**9.3** MCP App variant: **Wired.** `agentScreenApp.ts` builds HTML that uses `App` from `@modelcontextprotocol/ext-apps`; when `enableApps` is true, `agent_screen_activity` / `_file` / `_decision` return `_meta.ui.resourceUri: "ui://cursor-drive/agent-screen"`. The MCP server must serve that URI with the built HTML (and optional bundle). The MCP App runs in a **sandboxed iframe** and **cannot open files in the editor**; file links are display-only unless the host exposes something (e.g. `app.invokeTool`). Do not assume MCP App behavior matches the full webview.

**9.4** No screenshots or recordings in repo.

---

## AGENT 10 — Test Infrastructure

**10.1** **Jest** — `"test": "jest"`, `tests/**/*.test.ts`, ts-jest, vscode mocked.

**10.2** Run `npm test` to confirm; not run in this audit.

**10.3** **Unit tests with mocks** — no `@vscode/test-electron` in the described setup. Tests mock `vscode` and assert on OutputChannel/postMessage/panel title.

**10.4** **Yes.** `data-testid` attributes present (e.g. agent-screen-title, operator-badge, tab-live, panel-live, activity-item, file-item, decision-item, plan-progress, artifact-item).

**10.5** **No.** There is no command to send fake events into the webview. Adding a mock event injector (e.g. `cursorDrive.debug.sendTestEvent`) is high leverage for UI iteration without the full operator/MCP pipeline.

---

## AGENT 11 — UX & Design Decisions (Unresolved)

Not in code; for product/design to decide (e.g. “mission control” vs “terminal log”, full path vs filename, operator colors, lanes vs merged timeline, etc.). Current UI: VS Code theme variables, single operator badge, merged Live stream, file chips with basename and operator, no per-operator color or lane view.

---

## AGENT 12 — The Undesigned Gap List

**12.1** Not yet designed or implemented (from codebase + review):

- **Sync tab real data** — `postSyncStatus` / `postProposalUpdate` / `postQueueStatus` have no callers; Sync tab DOM exists but stays empty.
- **Event queue for hidden panel** — not implemented; events sent while hidden are dropped.
- **Mock event injector** — no command to push test events into the webview.
- **MCP App file open** — MCP App iframe cannot open files in the editor; document as display-only or host-dependent.
- **Config live-reload** — no `onDidChangeConfiguration` that refreshes or rebuilds the Agent Screen HTML when `cursorDrive.agentScreen.*` changes.
- **Multi-operator color / lane view** — not in UI.
- **Plan progress collapse** — HTML/script has toggle; behavior present.
- **Artifacts tab** — implemented (cloudAgentArtifact); Cloud Agent tools post events.
- **bottomLog** — implemented (OutputChannel formatting).
- **High-contrast / a11y / scroll virtualization** — not explicitly implemented.
- **State persistence** (e.g. getState/setState) — not implemented; state is in-DOM only, retained only via `retainContextWhenHidden`.

**12.2** P0 vs P1: From codebase, **P0** would be: (1) hidden-panel event queue so events aren’t lost, (2) wiring Sync/queue/proposal to the panel so the Sync tab is useful, (3) mock event injector for testing. **P1**: config reload, multi-operator visuals, high-contrast, virtualization, MCP App file-open if host supports it.

---

## Synthesis — Cursor-Specific Callouts & Gaps

**What the codebase already does:** In-process MCP server with `agent_screen_*` tools; WebviewPanel with inline HTML, nonce/CSP, `retainContextWhenHidden: true`; postMessage pipeline for all event types; OutputChannel for bottomLog; openFile/askAboutItem/openPlanTodo; MCP App HTML and `_meta.ui.resourceUri` when enableApps; Drive sidebar separate from Agent Screen; Jest unit tests and data-testid.

**Cursor-specific callouts (for user/maintainer):**

| Item | Status / action |
|------|------------------|
| Cursor version / VSCode base | **User to fill** (About Cursor). 1.99.x webview slow-load regression possible. |
| Agent vs Editor layout | **User to test.** Agent layout can hide or misplace WebviewPanel (ViewColumn.Beside / column). |
| Bottom panel webview bug | **In codebase:** Agent Screen is not in bottom panel; displayMode `panel` is same code path as tab. If you add a bottom-panel view, expect Cursor bug. |
| retainContextWhenHidden | **In codebase:** Set to true. Cursor may behave differently; user to confirm. |
| Hidden-panel event queue | **Not in codebase.** postMessage while hidden is dropped; add queue + onDidChangeViewState flush. |
| ViewColumn.Beside | **In codebase** (for openFile when clickBehavior is openInNewWindow). In Cursor, “beside” may target Composer/Agent area. |
| activationEvents | **In codebase:** onStartupFinished; no "*". |
| Nonce/CSP | **In codebase:** single nonce per buildHtml(). Avoid calling buildHtml twice for same panel without refreshing HTML; same nonce in CSP and style/script. |
| Webview DevTools | **User to confirm** command exists in Cursor build; if not, use debug bridge. |
| .cursor/mcp.json | **User/workspace:** Register Drive MCP URL; required for Cursor to call tools and for MCP App resolution. |
| Mock event injector | **Not in codebase.** Add a command (e.g. cursorDrive.debug.sendTestEvent) for E2E/UI iteration. |

**Deliverables from protocol:** Gap analysis (above); implementation plan (queue + Sync wiring + mock injector before heavy UI work); surgical patches (event queue, onDidChangeViewState, optional debug bridge); standalone test harness HTML (not in repo — to be added); proactive answers (why blank when tab switch → retainContext + queue; why nothing in Agent layout → layout; why bottom panel blank → Cursor bug; why no events → hidden panel drops; why no DevTools → debug bridge).

---

## If you can't query the repo

- **src/agentScreen.ts** — `buildHtml()` (webview HTML, CSP, nonce), `postEvent()` (panel vs outputChannel by displayMode), `onDidReceiveMessage` (openFile, askAboutItem, openPlanTodo). `createOrShow()` reads `cursorDrive.agentScreen.displayMode` and creates WebviewPanel or OutputChannel. No event queue when panel is hidden.
- **src/agentScreenApp.ts** — `buildAgentScreenAppHtml()`, `AGENT_SCREEN_APP_RESOURCE_URI` (`ui://cursor-drive/agent-screen`). MCP App only; no acquireVsCodeApi; cannot open files in editor.
- **src/mcpServer.ts** — Tools: `agent_screen_activity`, `agent_screen_file`, `agent_screen_decision`, `agent_screen_plan_update`; each calls `AgentScreenPanel.getInstance()?.logActivity/logFile/logDecision` or `updatePlanProgress`; when enableApps, return `_meta.ui.resourceUri` for MCP App. cliStream comes from cursor_cli_run streaming path, not a separate tool.
- **src/extension.ts** — `cursorDrive.showAgentScreen` → `createOrShow()` + `setDriveActive()`; `cursorDrive.clearAgentScreen`; on Drive toggle with autoOpen, `createOrShow()` and chime. setDriveActiveContext() and driveMgr.onDidChange(setDriveActiveContext) keep driveState in sync.
