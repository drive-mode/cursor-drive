# Agent Share Screen (S-AS) — Requirements & Design Spec

Implementation-ready specification for Cursor Drive's Agent Share Screen. Use this document to implement or refactor the S-AS UI.

---

## 1. Requirements

### 1.1 Purpose

Operators share activity in real time. The user sees:

- **Who's working** — Foreground operator badge; operator name per item
- **What they're doing** — Activity text, tool calls, streaming text
- **Files touched** — Paths with click-to-open
- **Decisions** — Key reasoning steps and choices
- **Plan progress** — Active plan name, TODO counts, current in-progress item
- **Sync state** — Mob-programming sync status, proposals, queue (when enabled)

### 1.2 Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| R1 | Display real-time activity feed (activity, file, decision, cliStream events) | P0 |
| R2 | Show files strip with click-to-open in editor | P0 |
| R3 | Show operator badge (foreground operator name) | P0 |
| R4 | Support tab switching: Live, Activity, Files, Decisions, Sync, Artifacts | P0 |
| R5 | Plan progress bar (collapsible) when `showPlanProgress` is true | P1 |
| R6 | Sync tab: user branch, operators, proposals, queue | P1 |
| R7 | Artifacts tab: Cloud Agent videos, screenshots, logs | P1 |
| R8 | Clear all content on `clear` event | P0 |
| R9 | Support `displayMode`: tab (webview), bottomLog (OutputChannel) | P0 |
| R10 | MCP Apps: `ui://cursor-drive/agent-screen` renders inline in chat when `enableApps` | P1 |

### 1.3 Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| NFR1 | Use VS Code theme variables only; no hardcoded colors |
| NFR2 | ARIA attributes for tabs, panels, progress bar, file links |
| NFR3 | Keyboard: tab navigation, Enter to activate |
| NFR4 | `data-testid` on key elements for automation |
| NFR5 | CSP-compliant; no inline scripts without nonce |

---

## 2. Design Spec

### 2.1 Layout — Section Priority for v1

**Order (top to bottom):**

1. **Header** — Title ("Agent Screen" / "Drive" when active), operator badge
2. **Plan progress** (optional) — Collapsible bar: plan name, progress fill, counts, current TODO
3. **Tabs** — Live | Activity | Files | Decisions | Sync | Artifacts
4. **Panel content** — Tab-specific content

**Per-tab layout:**

| Tab | Content | Priority |
|-----|---------|----------|
| **Live** | Files strip (horizontal) + streaming activity (activity, cliStream, decisions) | P0 |
| **Activity** | Full chronological log | P0 |
| **Files** | Dedicated file list (same data as strip) | P0 |
| **Decisions** | Recorded decisions with left border | P0 |
| **Sync** | User branch, operators, proposals, queue | P1 |
| **Artifacts** | Cloud Agent artifacts (video, screenshot, log) | P1 |

**v1 minimum:** Live, Activity, Files, Decisions. Sync and Artifacts can be collapsed/hidden when empty.

### 2.2 Interactions

| Element | Action | Result |
|---------|--------|--------|
| **File chip** (strip) | Click | `postMessage({ type: "openFile", path })` → extension opens file in editor |
| **File item** (Files tab) | Click | Same as above |
| **File path link** (activity text) | Click | Same as above |
| **File path link** | Ctrl/Cmd + Click | Show "Ask about this" overlay; input → `postMessage({ type: "askAboutItem", text })` |
| **Activity item** | Ctrl/Cmd + Click | Show "Ask about this" overlay |
| **Decision item** | Ctrl/Cmd + Click | Show "Ask about this" overlay |
| **Plan current TODO** | Click | `postMessage({ type: "openPlanTodo", planPath })` → open plan file |
| **Plan progress toggle** | Click | Expand/collapse plan progress section |
| **Tab** | Click | Switch active panel; update `aria-selected` |
| **Operator badge** | — | Display only; no click (switch operator via Drive sidebar or commands) |

**Switch operator:** Not via S-AS. User switches via `cursorDrive.operators` QuickPick or Drive sidebar. S-AS updates when `agentSwitch` event received.

**Confirm tangent:** Not in S-AS. Spawn/confirm flows are in QuickPicks or chat.

### 2.3 Data Flow — postMessage from Extension to Webview

**Direction:** Extension host → Webview via `postMessage`. Webview → Extension via `postMessage` for user actions.

| Event type | Payload | Description |
|------------|---------|-------------|
| `driveState` | `{ type, active: boolean }` | Drive on/off; updates title, border |
| `activity` | `{ type, operatorName?, text?, timestamp? }` | Append to Activity + Live |
| `file` | `{ type, operatorName?, filePath?, timestamp? }` | Add to Files + strip; append "Touched: path" to Activity |
| `decision` | `{ type, operatorName?, text?, timestamp? }` | Append to Decisions + Live |
| `agentSwitch` | `{ type, operatorName?, timestamp? }` | Update badge; append "Switched to X" |
| `planProgress` | `{ type, planId?, planName?, completedCount?, totalCount?, currentTodo?, timestamp? }` | Update plan bar |
| `cliStream` | `{ type, cliStreamType?, cliToolName?, text?, operatorName?, timestamp? }` | See below |
| `syncStatus` | `{ type, syncSnapshot?, timestamp? }` | Render sync tab |
| `proposalUpdate` | `{ type, text?, timestamp? }` | Append to sync log |
| `queueStatus` | `{ type, text?, timestamp? }` | Append to sync log |
| `cloudAgentStatus` | `{ type, cloudAgentId?, cloudStatus?, prUrl?, timestamp? }` | Add to Artifacts/status |
| `cloudAgentArtifact` | `{ type, artifactType?, artifactUrl?, artifactLabel?, timestamp? }` | Add to Artifacts |
| `clear` | `{ type }` | Clear all panels |
| `chime` | `{ type, count: 1 \| 2 }` | Play audio (Drive on/off) |

**cliStream subtypes:**

| `cliStreamType` | Display |
|-----------------|---------|
| `text_delta` | Append to streaming block; monospace, code-block style |
| `tool_call` | Inline "🔧 toolName: args" |
| `user` | Italic, "CLI/user" label |
| `error` | Warning color |
| `assistant` | Same as text_delta |

**Webview → Extension messages:**

| type | payload | Extension action |
|------|---------|------------------|
| `openFile` | `{ path: string }` | `openTextDocument` + `showTextDocument` |
| `askAboutItem` | `{ text: string }` | `workbench.action.chat.open` or clipboard |
| `openPlanTodo` | `{ planPath: string }` | Same as openFile |

### 2.4 Display Modes

| Mode | Surface | Content | Notes |
|------|---------|---------|------|
| **tab** | `WebviewPanel` beside editor | Full UI: tabs, chips, links, plan bar | Default |
| **panel** | Same as tab (current bug) | — | Fix: use `ViewColumn` for bottom panel, or remove |
| **bottomLog** | `OutputChannel` "Drive Agent Screen" | Text-only append | No webview; no chimes; no links |

**bottomLog format per event:**

- `activity`: `[operatorName] text`
- `file`: `[operatorName] Touched: path`
- `cliStream`: `[operatorName] [CLI] label: text`
- `syncStatus`: `[Sync] branch@commit | op1:state, op2:state`
- `proposalUpdate`: `[Sync/Proposal] text`
- `queueStatus`: `[Sync/Queue] text`
- `cloudAgentStatus`: `[CloudAgent id] status [prUrl]`
- `cloudAgentArtifact`: `[CloudAgent Artifact] type: label url`
- `clear`: `outputChannel.clear()`

**Terminal mode (future):** Custom `Pseudoterminal`; same events as text lines. Not v1.

### 2.5 Styling

**Theme variables (required):**

```css
/* Base */
--vscode-font-family
--vscode-editor-foreground
--vscode-editor-background
--vscode-sideBar-background
--vscode-panel-border
--vscode-widget-border

/* Header */
--vscode-titleBar-activeForeground

/* Tabs */
--vscode-tab-inactiveForeground
--vscode-tab-activeForeground

/* Badges, chips */
--vscode-badge-background
--vscode-badge-foreground

/* Lists */
--vscode-list-hoverBackground
--vscode-descriptionForeground

/* Links */
--vscode-textLink-foreground
--vscode-textLink-activeForeground

/* Code blocks */
--vscode-textCodeBlock-background
--vscode-editor-font-family
--vscode-editorWarning-foreground

/* Progress */
--vscode-progressBar-background
--vscode-activityBarBadge-background

/* Accent (Drive active) */
--vscode-testing-iconPassed  /* fallback: #4ec9b0 */

/* Scrollbar */
--vscode-scrollbarSlider-background
--vscode-scrollbarSlider-hoverBackground
```

**Dark/light:** All variables adapt automatically. No `prefers-color-scheme` overrides.

**Accessibility:**

- `role="tablist"`, `role="tab"`, `role="tabpanel"` with `aria-label`, `aria-selected`, `aria-controls`
- `role="progressbar"` with `aria-valuemin`, `aria-valuemax`; compute `aria-valuenow` from completed/total
- `role="button"` or `role="link"` on file items; `aria-label="Open path"`
- `aria-live="polite"` on operator badge
- Focus: visible focus ring on interactive elements

### 2.6 MCP Apps — Inline ui:// Resource

**When:** `cursorDrive.mcp.enableApps` is true and tool returns `_meta.ui.resourceUri: "ui://cursor-drive/agent-screen"`.

**Host:** Renders HTML in sandboxed iframe. No `acquireVsCodeApi()`; uses `@modelcontextprotocol/ext-apps` App for host communication.

**Minimal UI for MCP App:**

- **Same conceptual components:** Activity feed, Files list, Decisions list
- **Reduced layout:** No Live tab; single scrollable feed. Activity | Files | Decisions tabs only
- **No Sync, Artifacts** in minimal MCP App (or collapse)
- **No plan progress** in minimal (or add if `agent_screen_plan_update` returns ui)
- **No operator switch** — MCP App receives tool results; no extension host
- **File click:** MCP App cannot open editor. Show path as text; optionally `app.invokeTool` if host supports
- **Styling:** Hardcoded dark theme fallback (`#1e1e1e`, `#d4d4d4`) — MCP App iframe may not inherit VS Code CSS variables. Document that webview is authoritative for theme.

**Data source:** MCP App receives tool results via `app.ontoolresult`. Parse `content[].text` as JSON: `{ kind: "activity"|"file"|"decision", op?, text?, file_path? }`. Append to feed.

**Shared components:** Extract shared rendering logic (escapeHtml, item structure) if building both webview and MCP App from same codebase. MCP App is a subset.

---

## 3. Implementation Checklist

- [ ] Header: title, operator badge
- [ ] Tabs: Live, Activity, Files, Decisions, Sync, Artifacts
- [ ] Live panel: files strip + live stream
- [ ] Activity panel: chronological log
- [ ] Files panel: file list
- [ ] Decisions panel: decision list
- [ ] Sync panel: user, operators, proposals, queue
- [ ] Artifacts panel: Cloud Agent items
- [ ] Plan progress: collapsible bar
- [ ] Message handler: all event types
- [ ] File click → openFile
- [ ] Ctrl+click → ask overlay
- [ ] bottomLog branch in postEvent
- [ ] VS Code theme variables throughout
- [ ] ARIA + data-testid
- [ ] MCP App: minimal 3-tab HTML for ui://

---

## References

- [agent-screen-share-vision.md](agent-screen-share-vision.md) — Vision
- [s-as-v1-ux-proposal.md](s-as-v1-ux-proposal.md) — v1 scope
- [drive-ui-surfaces-and-devtools.md](drive-ui-surfaces-and-devtools.md) — DevTools
- `src/agentScreen.ts` — Current implementation
- `src/agentScreenApp.ts` — MCP App HTML
