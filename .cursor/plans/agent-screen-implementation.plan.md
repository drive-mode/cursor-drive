---
planId: agent-screen-implementation
planType: task
parentPlanId: cursor-drive-v1
childPlanIds: []
dependsOn: []
name: Agent Screen Implementation
overview: "Implement P0/P1 Agent Screen gaps: hidden-panel event queue, debug bridge, mock event injector, Sync tab wiring, missing MCP tools (clear/chime), MCP App verification and file-open, config live-reload, operator colors, replay banner, high-contrast CSS. Aligns with Cursor 2.6 MCP Apps."
todos:
  - id: 1a-01-add-pending-events-field
    content: "In src/agentScreen.ts AgentScreenPanel class add private _pendingEvents: ActivityEvent[] = [] and private readonly MAX_QUEUE = 200."
    status: completed
  - id: 1a-02-postEvent-early-return-outputChannel
    content: In postEvent() keep existing block that returns early when this.outputChannel is set (bottomLog path); do not change that behavior.
    status: completed
  - id: 1a-03-postEvent-early-return-no-panel
    content: In postEvent() after outputChannel block add if (!this.panel) return; before posting to webview.
    status: completed
  - id: 1a-04-postEvent-queue-when-hidden
    content: In postEvent() when this.panel exists but !this.panel.visible push event to _pendingEvents; if _pendingEvents.length >= MAX_QUEUE shift oldest; then return (do not postMessage).
    status: completed
  - id: 1a-05-postEvent-post-when-visible
    content: In postEvent() when panel exists and is visible call this.panel.webview.postMessage(event) with timestamp fallback as today.
    status: completed
  - id: 1a-06-constructor-onDidChangeViewState
    content: In AgentScreenPanel constructor after creating panel subscribe to panel.onDidChangeViewState; when e.webviewPanel.visible && _pendingEvents.length > 0 send replayStart message with count then flush each _pendingEvents via postMessage then clear array then send replayEnd.
    status: completed
  - id: 1a-07-webview-handler-replayStart
    content: In buildHtml() inline script message handler add case for type replayStart; insert a banner element before live-stream with text like 'Replaying N events from while panel was hidden' and data-testid='replay-banner'.
    status: completed
  - id: 1a-08-webview-handler-replayEnd
    content: In buildHtml() inline script message handler add case for type replayEnd; remove element with id or data-testid replay-banner.
    status: completed
  - id: 1b-01-window-error-listener
    content: "In buildHtml() inline script add window.addEventListener('error', ...) that calls vscodeApi.postMessage({ type: '__debug', level: 'error', msg: e.message, src: e.filename, line: e.lineno, col: e.colno })."
    status: completed
  - id: 1b-02-window-unhandledrejection-listener
    content: "In buildHtml() inline script add window.addEventListener('unhandledrejection', ...) that calls vscodeApi.postMessage({ type: '__debug', level: 'unhandledRejection', msg: String(e.reason) })."
    status: completed
  - id: 1b-03-onDidReceiveMessage-debug-branch
    content: In panel.webview.onDidReceiveMessage add branch for msg.type === '__debug'; ensure an OutputChannel exists (create 'Drive Agent Screen' if in tab mode and none yet); appendLine with [AgentScreen WebView ${level}] msg (src:line).
    status: completed
  - id: 1c-01-extension-register-command
    content: In src/extension.ts register command cursorDrive.debug.sendTestEvent that gets or creates AgentScreenPanel instance then shows QuickPick of scenario names (Basic Activity, CLI Streaming, Plan Progress, Sync State, Cloud Agent + Artifact, Multi-Operator, Chime, Clear).
    status: completed
  - id: 1c-02-extension-scenario-arrays
    content: "Define scenario objects: each key is display name value is array of ActivityEvent-shaped objects; Sync State must use syncSnapshot with userBranch (not branch) and operators; match SyncStatusSnapshot shape from src/syncTypes.ts."
    status: completed
  - id: 1c-03-extension-postEvent-loop
    content: After user picks scenario call postEvent for each event in the scenario array with ~80ms delay between each for visual stagger.
    status: completed
  - id: 1c-04-package-json-command
    content: "In package.json contributes.commands add entry command cursorDrive.debug.sendTestEvent title 'Drive: Send Test Event to Agent Screen' category 'Cursor Drive (Debug)'."
    status: completed
  - id: 2a-operator_sync_status-postSyncStatus
    content: In src/mcpServer.ts in operator_sync_status handler after coordinator.computeSnapshot() call AgentScreenPanel.getInstance()?.postSyncStatus(snapshot).
    status: completed
  - id: 2b-operator_sync_approve-postSyncStatus
    content: In operator_sync_approve handler after coordinator.approveProposal call computeSnapshot and AgentScreenPanel.getInstance()?.postSyncStatus(snapshot).
    status: completed
  - id: 2c-operator_sync_reject-postSyncStatus
    content: In operator_sync_reject handler after coordinator.rejectProposal call computeSnapshot and postSyncStatus(snapshot).
    status: completed
  - id: 2d-operator_sync_apply-postSyncStatus
    content: In operator_sync_apply handler after queue.enqueue and result call coordinator.computeSnapshot() and postSyncStatus(snapshot).
    status: completed
  - id: 2e-operator_sync_apply-postQueueStatus
    content: In operator_sync_apply when queue is available after enqueue get queue.getQueueState() and call AgentScreenPanel.getInstance()?.postQueueStatus(processing, pending.length).
    status: completed
  - id: 2f-register-agent_screen_clear
    content: "In src/mcpServer.ts register MCP tool agent_screen_clear with no params; handler calls AgentScreenPanel.getInstance()?.postEvent({ type: 'clear' }); return success text content."
    status: completed
  - id: 2g-register-agent_screen_chime
    content: In src/mcpServer.ts register MCP tool agent_screen_chime with Zod param count z.union([z.literal(1), z.literal(2)]).default(1); handler calls getInstance()?.playChime(count); return success text.
    status: completed
  - id: 2h-webview-normalize-syncSnapshot
    content: "In buildHtml() syncStatus case before renderSyncSnapshot(snap) set snap = typeof snap === 'string' ? JSON.parse(snap) : snap."
    status: completed
  - id: 3a-verify-mcp-app
    content: "Manual/verification: Confirm cursorDrive.mcp.enableApps true and MCP URL in .cursor/mcp.json; in Agent mode call agent_screen_activity and confirm ui://cursor-drive/agent-screen renders inline. No code change if already working."
    status: completed
  - id: 3b-01-mcp-register-cursor_drive_open_file
    content: "In src/mcpServer.ts register tool cursor_drive_open_file with path string param; handler resolves path (workspace-relative or absolute), calls vscode.window.showTextDocument(uri, { preview: false }), returns success or error content."
    status: completed
  - id: 3b-02-agentScreenApp-callServerTool
    content: "In src/agentScreenApp.ts in file chip/item click handler call app.callServerTool({ name: 'cursor_drive_open_file', arguments: { path: filePath } }); handle rejection (e.g. console or vscode:// fallback)."
    status: completed
  - id: 3c-app-updateModelContext
    content: "In agentScreenApp file open click handler after successful callServerTool call app.updateModelContext with content text '[Agent Screen] User opened file: <path>'."
    status: completed
  - id: 4a-01-onDidChangeConfiguration
    content: "In AgentScreenPanel constructor when panel exists subscribe to vscode.workspace.onDidChangeConfiguration; if e.affectsConfiguration('cursorDrive.agentScreen.showPlanProgress') read config and panel.webview.postMessage({ type: 'config', showPlanProgress })."
    status: completed
  - id: 4a-02-webview-config-case
    content: In buildHtml() message handler add case 'config' that updates state.showPlanProgress and re-renders or toggles plan progress section visibility.
    status: completed
  - id: 4b-01-css-op-color-vars
    content: "In buildHtml() <style> add :root { --op-color-0: var(--vscode-charts-blue,...); --op-color-1 through --op-color-5 using vscode-charts-* with fallback hex."
    status: completed
  - id: 4b-02-js-op-color-map
    content: In buildHtml() script add Map from operator name to color index and getOpColor(name) returning var(--op-color-N); use when rendering operator badge and activity/file strips.
    status: completed
  - id: 4c-replay-banner-testid
    content: Ensure replay banner element has data-testid='replay-banner' (already in 1a-07); no separate task if done there.
    status: completed
  - id: 4d-high-contrast-css
    content: In buildHtml() <style> add body.vscode-high-contrast rules for .file-chip .cli-block .tab.active .decision-card .operator-badge with border/outline using ButtonText Highlight HighlightText.
    status: completed
  - id: test-01-queue-when-hidden
    content: In tests/agentScreen.test.ts add test that when panel.visible is false postEvent does not call webview.postMessage and events are queued in _pendingEvents.
    status: completed
  - id: test-02-flush-when-visible
    content: In tests/agentScreen.test.ts add test that when onDidChangeViewState fires with visible true queued events are sent via postMessage and replayStart/replayEnd sent; _pendingEvents empty after.
    status: completed
  - id: test-03-queue-cap
    content: In tests/agentScreen.test.ts add test that sending more than MAX_QUEUE events while hidden keeps _pendingEvents.length === MAX_QUEUE (oldest dropped).
    status: completed
  - id: test-04-syncStatus-renders-branch
    content: In tests/agentScreen.test.ts add test that syncStatus message with syncSnapshot.userBranch and syncSnapshot.operators results in sync-user and sync-operators DOM updates (or equivalent assertion).
    status: completed
  - id: test-05-queueStatus-renders
    content: In tests/agentScreen.test.ts add test that queueStatus message triggers addSyncLog or sync-queue update as per current webview behavior.
    status: completed
  - id: test-06-sendTestEvent-registered
    content: In tests/agentScreen.test.ts or extension test add assertion that command cursorDrive.debug.sendTestEvent is registered (e.g. getCommands() or contributes).
    status: completed
  - id: test-07-data-testid-replay-banner
    content: Ensure replay banner has data-testid='replay-banner'; add testids sync-branch or sync-user sync-operators sync-proposals sync-queue if missing in webview HTML.
    status: completed
  - id: opt-sync-poll
    content: "Optional: In extension.ts add interval (10-15s) when stateSyncCoordinator and integrationQueue exist that calls computeSnapshot postSyncStatus getQueueState postQueueStatus. Document as optional."
    status: cancelled
  - id: doc-panel-column
    content: "Document or add in createOrShow: if column >= ViewColumn.Three set column = ViewColumn.Two to avoid Agent layout chat column; document in README."
    status: cancelled
state: completed
isProject: false
---

# Agent Screen — Synthesized Implementation Plan

## Codebase alignment (validated)

- **[src/agentScreen.ts](src/agentScreen.ts)** uses `panel` and `outputChannel` (not `_panel`/`_outputChannel`). Use these names in new code.
- **StateSyncCoordinator** has no `onDidChangeState`; it exposes `computeSnapshot()`. Sync tab wiring will call `postSyncStatus(snapshot)` and `postQueueStatus(...)` from MCP sync tools after state-changing operations and when `operator_sync_status` is invoked.
- **SyncStatusSnapshot** ([src/syncTypes.ts](src/syncTypes.ts)) uses `userBranch`, `userHeadCommit`, `operators`, `proposals`, `timestamp`. Mock events and any payloads must match this shape (e.g. `userBranch` not `branch`).
- **MCP App resource** is already registered in [src/mcpServer.ts](src/mcpServer.ts) via `registerAppResource` (lines 1410–1422). Phase 3A is verification only.
- **renderSyncSnapshot** in the webview expects an object (no `JSON.parse`). Adding `typeof raw === 'string' ? JSON.parse(raw) : raw` is a defensive improvement.
- **Queue/proposal UI**: `queueStatus` and `proposalUpdate` both use `addSyncLog`, which appends to the `sync-proposals` container. Sync snapshot fills `sync-user`, `sync-operators`, `sync-proposals`; queue status is a separate log line.

---

## Phase 1: Infrastructure

### 1A — Hidden-panel event queue

**File:** [src/agentScreen.ts](src/agentScreen.ts)

- Add private `_pendingEvents: ActivityEvent[]` and `MAX_QUEUE = 200`.
- In `postEvent`: if `this.outputChannel` → keep existing bottomLog behavior and return. If no `this.panel` → return. If `!this.panel.visible` → push to queue (shift when `>= MAX_QUEUE`) and return. Otherwise `this.panel.webview.postMessage(event)`.
- In the constructor, after creating the panel, subscribe to `panel.onDidChangeViewState`. When `e.webviewPanel.visible && _pendingEvents.length > 0`: send `replayStart` (with count), flush each event via `postMessage`, clear queue, send `replayEnd`. Use existing `panel` reference; no disposables array needed (listener is tied to panel lifecycle).
- In the webview script (message handler): add cases for `replayStart` (insert a replay banner before the live stream, e.g. "Replaying N events from while panel was hidden") and `replayEnd` (remove banner). Use `data-testid="replay-banner"` for tests.

**Note:** `ActivityEvent` type does not need `replayStart`/`replayEnd`; they are internal boundary messages sent only from the flush block.

### 1B — Webview debug bridge

**File:** [src/agentScreen.ts](src/agentScreen.ts)

- In `buildHtml()`, inside the inline `<script nonce="...">`, add `window.addEventListener('error', ...)` and `window.addEventListener('unhandledrejection', ...)` that call `vscodeApi.postMessage({ type: '__debug', level, msg, src, line, col })` (or equivalent fields).
- In `panel.webview.onDidReceiveMessage`, add a branch for `msg.type === '__debug'`: append to `this.outputChannel` (create with a fixed name like "Drive Agent Screen" if in tab mode and channel doesn’t exist yet). Only create OutputChannel when needed for __debug; reuse existing `outputChannel` when in bottomLog mode.

### 1C — Mock event injector command

**File:** [src/extension.ts](src/extension.ts) — Register command `cursorDrive.debug.sendTestEvent`; QuickPick scenarios; stagger postEvent. **File:** [package.json](package.json) — Add contributes.commands entry.

---

## Phase 2: Data wiring (Sync tab)

Wire `postSyncStatus` / `postQueueStatus` from MCP sync tools ([src/mcpServer.ts](src/mcpServer.ts)) after `operator_sync_status`, `operator_sync_approve`, `operator_sync_reject`, `operator_sync_apply`; add MCP tools `agent_screen_clear`, `agent_screen_chime`; in webview normalize `syncSnapshot` (object or string).

---

## Phase 3: MCP Apps (Cursor 2.6)

Verify MCP App renders; register `cursor_drive_open_file`; in [src/agentScreenApp.ts](src/agentScreenApp.ts) wire file chips to `app.callServerTool` and `app.updateModelContext` after open.

---

## Phase 4: UI polish

Config live-reload (onDidChangeConfiguration + webview `config` case); operator color CSS vars and JS Map; replay banner (1A); high-contrast CSS.

---

## Tests

Queue/flush/cap tests; Sync tab rendering tests; `cursorDrive.debug.sendTestEvent` registration test; data-testids for replay-banner and sync areas.

---

## File change summary


| File                                                   | Changes                                                                                                                                              |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| [src/agentScreen.ts](src/agentScreen.ts)               | 1A queue + flush + replay handlers; 1B __debug bridge; 2E normalize snap; 4A config listener + config case; 4B operator colors; 4D high-contrast CSS |
| [src/extension.ts](src/extension.ts)                   | 1C sendTestEvent; optional sync poll                                                                                                                 |
| [src/mcpServer.ts](src/mcpServer.ts)                   | 2A–2D postSyncStatus/postQueueStatus; 2D clear/chime tools; 3B cursor_drive_open_file                                                                |
| [src/agentScreenApp.ts](src/agentScreenApp.ts)         | 3B callServerTool; 3C updateModelContext                                                                                                             |
| [package.json](package.json)                           | 1C command entry                                                                                                                                     |
| [tests/agentScreen.test.ts](tests/agentScreen.test.ts) | Queue, flush, cap, sync tab, command registration, data-testids                                                                                      |

---

## Reconciliation

**Verified:**
- `npm run compile` passes (TypeScript)
- `npx jest tests/agentScreen.test.ts` — 32 tests pass
- Hidden-panel queue: events queued when `panel.visible` is false; no `postMessage` until visible
- Replay flush: `onDidChangeViewState` fires with visible → `replayStart`, events, `replayEnd` sent; queue cleared
- Queue cap: `> MAX_QUEUE` (not `>=`) keeps length at 200 when 250+ events sent while hidden
- Sync tab: `postSyncStatus` / `postQueueStatus` wired in `operator_sync_status`, `operator_sync_approve`, `operator_sync_reject`, `operator_sync_apply`
- MCP tools: `agent_screen_clear`, `agent_screen_chime`, `cursor_drive_open_file` registered
- agentScreenApp: file chip click → `callServerTool` → `updateModelContext`
- Config live-reload: `onDidChangeConfiguration` for `showPlanProgress`; webview `config` case
- Operator colors: `--op-color-0`..`5`; `getOpColor()` used for badge, activity, file strips
- High-contrast CSS: `body.vscode-high-contrast` rules for `.file-chip`, `.cli-block`, `.tab.active`, `.decision-card`, `.operator-badge`
- Debug bridge: `window.error` and `unhandledrejection` → `__debug` → OutputChannel

**Residual risks:**
- 3A (MCP App verification): manual only; no automated test for inline `ui://` rendering
- agentScreenApp `callServerTool` / `updateModelContext` require Cursor 2.6+ MCP Apps host support

**Evidence:**
- All 32 agentScreen tests pass
- Compile succeeds with no type errors
