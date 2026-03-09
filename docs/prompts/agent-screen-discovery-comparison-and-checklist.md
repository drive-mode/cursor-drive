# Agent Screen UI Discovery — Comparison & Update Checklist

Comparison of the **prior discovery answer** (repo-audit.md) to the **Cursor-Aware Edition** of the Agent Screen UI Discovery Protocol (sections Agent 0–12 + Synthesis). Use the Update Checklist to revise the prior answer.

---

## Section-by-Section Comparison

### Agent 0 — Environment / Cursor & runtime

| (a) Prior answer covers well | (b) Not or only partially answered | (c) Cursor-specific callouts not addressed |
|------------------------------|-------------------------------------|--------------------------------------------|
| package.json `engines.vscode: ^1.85.0`; Node 20 in CI. | Cursor **version** and **runtime** (e.g. Cursor 1.99.x vs VS Code 1.85) are not stated. | **CURSOR:** Add “Cursor version/runtime: unknown from codebase; user to fill.” Call out that Cursor can lag VS Code API and may have different webview behavior. |

### Agent 1 — File tree / repo structure

| (a) Prior answer covers well | (b) Not or only partially answered | (c) Cursor-specific callouts not addressed |
|------------------------------|-------------------------------------|--------------------------------------------|
| Full directory tree (sections 1–2), src/, docs/, .cursor/, .cursor-plugin/, tests/. | — | **CURSOR:** Mention `.cursor/mcp.json` explicitly (Drive MCP URL, role for Agent Screen / MCP Apps). Prior answer lists it in tree but doesn’t describe role. |

### Agent 2 — Build & compile

| (a) Prior answer covers well | (b) Not or only partially answered | (c) Cursor-specific callouts not addressed |
|------------------------------|-------------------------------------|--------------------------------------------|
| tsconfig, `npm run compile`, `npm run watch`, `vscode:prepublish` → bundle:mcp-app + compile. | — | None. |

### Agent 3 — CSP / nonce / security

| (a) Prior answer covers well | (b) Not or only partially answered | (c) Cursor-specific callouts not addressed |
|------------------------------|-------------------------------------|--------------------------------------------|
| agentScreen.ts: `getNonce()`, CSP meta with `cspSource` and `nonce-${nonce}`, style-src/script-src; Section 20 notes img-src/media-src for artifact URLs. | Pitfalls: nonce reuse on rebuild, inline script without nonce, strict CSP breaking extensions. | **CURSOR:** Add **nonce/CSP pitfalls** — e.g. nonce must change per `buildHtml()` call; Cursor may apply extra CSP; avoid inline handlers. |

### Agent 4 — Data flow (postMessage, events)

| (a) Prior answer covers well | (b) Not or only partially answered | (c) Cursor-specific callouts not addressed |
|------------------------------|-------------------------------------|--------------------------------------------|
| ActivityEvent types; extension → webview postMessage table (driveState, activity, file, decision, etc.); webview → extension (openFile, askAboutItem, openPlanTodo). Pipeline → AgentScreenPanel.postEvent. | When panel is **hidden**, whether messages are queued or dropped. | **CURSOR:** Add **hidden-panel event queue** — with `retainContextWhenHidden: true`, document whether postMessage is buffered by host when tab is not visible; note risk of backlog when panel revealed. |

### Agent 5 — MCP tools & config

| (a) Prior answer covers well | (b) Not or only partially answered | (c) Cursor-specific callouts not addressed |
|------------------------------|-------------------------------------|--------------------------------------------|
| MCP server :7891; agent_screen_* tools; Drive MCP in .cursor/mcp.json (pluginInstaller, tests). | — | **CURSOR:** Explicitly document **.cursor/mcp.json** for Cursor: Drive URL, that MCP Apps (e.g. agent-screen) depend on this and enableApps. |

### Agent 6 — Config schema & loading

| (a) Prior answer covers well | (b) Not or only partially answered | (c) Cursor-specific callouts not addressed |
|------------------------------|-------------------------------------|--------------------------------------------|
| package.json configuration; agentScreen keys (displayMode, clickBehavior, showPlanProgress); config keys in code but not in schema (Section 17). | — | None. |

### Agent 7 — Agent Screen implementation (webview, panel, layout)

| (a) Prior answer covers well | (b) Not or only partially answered | (c) Cursor-specific callouts not addressed |
|------------------------------|-------------------------------------|--------------------------------------------|
| createWebviewPanel, viewType, displayMode (tab vs bottomLog); `retainContextWhenHidden: true`; buildHtml; column from activeTextEditor.viewColumn+1 or ViewColumn.Two; openFile uses ViewColumn.Beside when clickBehavior openInNewWindow. | **panel** displayMode: prior answer says “same as tab, bug” but doesn’t describe the bug. | **CURSOR BUG:** **Webview slow-load regression** (e.g. Cursor 1.99.x) — document if known; add “unknown, user to confirm” if not in codebase. **CURSOR BUG:** **Agent layout vs Editor layout** — Agent Screen tab vs editor group layout (e.g. single vs multi column); note Cursor’s Agent/Composer layout can differ from standard editor layout. **CURSOR BUG:** **Bottom panel bug** — displayMode `panel` behavior and why it’s “same as tab, bug”; document bottom panel vs OutputChannel (bottomLog). **retainContextWhenHidden** — prior answer mentions it; add Cursor callout: behavior may differ or have regressions in Cursor. **ViewColumn.Beside** — used in openFile; add note that in Cursor, “beside” may open in Composer/Agent area vs editor group. |

### Agent 8 — Activation & hooks

| (a) Prior answer covers well | (b) Not or only partially answered | (c) Cursor-specific callouts not addressed |
|------------------------------|-------------------------------------|--------------------------------------------|
| activationEvents: onStartupFinished; extension.ts activate → Drive mode manager, status bar; hooks.json beforeSubmitPrompt, sessionStart, stop, subagentStop. | — | **CURSOR:** **activationEvents** — note that Cursor may support different or extra activation events; document that Drive uses onStartupFinished and any known Cursor quirks. |

### Agent 9 — Tests

| (a) Prior answer covers well | (b) Not or only partially answered | (c) Cursor-specific callouts not addressed |
|------------------------------|-------------------------------------|--------------------------------------------|
| agentScreen.test.ts (createOrShow, displayMode, postEvent, chime); agentScreenApp.test.ts; __mocks__/vscode (webview.postMessage mock). | No dedicated **webview event injector** that simulates postMessage from extension to webview for E2E. | **CURSOR:** **Mock event injector** — add that tests mock AgentScreenPanel/postMessage at extension side; for full E2E (e.g. Playwright), a way to inject postMessage into webview (or use CDP) is not documented; note if Cursor IDE needs special handling for webview testing. |

### Agent 10 — Gaps / missing

| (a) Prior answer covers well | (b) Not or only partially answered | (c) Cursor-specific callouts not addressed |
|------------------------------|-------------------------------------|--------------------------------------------|
| Gap Analysis and Priority Build List; STT, audit logging, data-egress, config validation, missing schema keys. | — | **CURSOR:** In Synthesis, list Cursor-specific gaps: webview regression, Agent vs Editor layout, bottom panel bug, .cursor/mcp.json docs. |

### Agent 11 — Other surfaces (sidebar, etc.)

| (a) Prior answer covers well | (b) Not or only partially answered | (c) Cursor-specific callouts not addressed |
|------------------------------|-------------------------------------|--------------------------------------------|
| Drive sidebar (package.json viewsContainers, cursorDrive.panel); separate from Agent Screen. | — | None. |

### Agent 12 — CI/CD & packaging

| (a) Prior answer covers well | (b) Not or only partially answered | (c) Cursor-specific callouts not addressed |
|------------------------------|-------------------------------------|--------------------------------------------|
| CI workflow (compile, test, VSIX); other workflows (pr-checks, develop-to-main, reinstall, cloudflare). | — | None. |

### Synthesis — Cross-cutting & Cursor-specific

| (a) Prior answer covers well | (b) Not or only partially answered | (c) Cursor-specific callouts not addressed |
|------------------------------|-------------------------------------|--------------------------------------------|
| Gap Analysis; Priority Build List; high-level “what’s built” vs “what’s missing”. | Single place that ties **all Cursor-specific bugs and callouts** together. | **CURSOR:** Add a **Synthesis** subsection: “Cursor-specific callouts and bugs” — webview slow-load (1.99.x), Agent vs Editor layout, bottom panel bug, retainContextWhenHidden, hidden-panel event queue, ViewColumn.Beside semantics, activationEvents, nonce/CSP pitfalls, mock event injector for webview E2E, .cursor/mcp.json role. State which are “in codebase”, “user to fill”, or “known Cursor regression”. |

---

## Update Checklist (for main agent)

Use this to revise the prior answer (repo-audit.md or the merged discovery doc). Do **not** write the full revised answer here; merge these into the prior answer.

### Agent 0 — Environment
- [ ] **Add:** Cursor version/runtime — not in codebase; note “unknown, user to fill” and that Cursor can lag VS Code API / webview behavior.
- [ ] **Add:** CURSOR BUG callouts for webview 1.99.x and layout if you have a Cursor version to reference.

### Agent 1 — File tree
- [ ] **Add:** Explicit mention of `.cursor/mcp.json` — purpose (Drive MCP URL, MCP Apps / agent-screen), not just presence in tree.

### Agent 3 — CSP / nonce
- [ ] **Add:** Nonce/CSP pitfalls — nonce must change per buildHtml(); no inline scripts without nonce; Cursor may apply extra CSP.

### Agent 4 — Data flow
- [ ] **Add:** Hidden-panel event queue — behavior of postMessage when panel is hidden (retainContextWhenHidden); document buffering/backlog risk when panel is revealed.

### Agent 5 — MCP
- [ ] **Add:** .cursor/mcp.json — Cursor-specific role: Drive URL, enableApps, and how agent-screen MCP App depends on it.

### Agent 7 — Agent Screen implementation
- [ ] **Add:** CURSOR BUG — Webview slow-load regression (e.g. Cursor 1.99.x); if not in codebase, “unknown, user to confirm”.
- [ ] **Add:** CURSOR BUG — Agent layout vs Editor layout (tab placement, Composer/Agent area vs editor groups).
- [ ] **Add:** CURSOR BUG — Bottom panel bug: document displayMode `panel` (“same as tab, bug”) and difference from bottomLog (OutputChannel).
- [ ] **Add:** retainContextWhenHidden — Cursor callout: may differ or regress in Cursor.
- [ ] **Add:** ViewColumn.Beside — in Cursor, “beside” may open in Composer/Agent area; document semantics.

### Agent 8 — Activation
- [ ] **Add:** activationEvents — Cursor may support different or extra activation events; document onStartupFinished and any known Cursor quirks.

### Agent 9 — Tests
- [ ] **Add:** Mock event injector — current tests mock at extension side; document lack of (or need for) webview postMessage injector for E2E; note Cursor IDE if relevant for Playwright/webview tests.

### Agent 10 / Synthesis
- [ ] **Add:** In Gap Analysis or Synthesis: Cursor-specific gaps — webview regression, Agent vs Editor layout, bottom panel bug, .cursor/mcp.json docs.
- [ ] **Add:** Synthesis subsection “Cursor-specific callouts and bugs” — list all CURSOR items above; mark each as “in codebase”, “user to fill”, or “known Cursor regression”.

---

*End of comparison and checklist.*
