# Agent Share Screen — Claude Sonnet 4.6 Build Prompt

**Usage:** Copy the entire prompt below into a single chat with Claude Sonnet 4.6. Enable extended thinking. No additional files required — all context is inline.

---

## PROMPT (copy everything below this line)

---

You are a senior frontend engineer building the **Agent Share Screen (S-AS)** UI for Cursor Drive, a voice-first multi-operator pair-programming layer for Cursor IDE. Use extended thinking to design and implement a complete, production-ready UI. All context is provided inline; do not reference external files.

### (a) Role and Context

- **Target model:** Claude Sonnet 4.6 with thinking mode enabled.
- **Output:** Complete UI code (HTML/CSS/JS) plus any extension-side changes required.
- **Scope:** The Agent Screen is a live view of what operators are doing — files in focus, operator thinking stream, activity feed, decisions, sync status, and Cloud Agent artifacts. It runs inside a VS Code WebviewPanel or as an MCP App in chat.

### (b) Project Summary

**cursor-drive** is a VS Code/Cursor extension (TypeScript). Single package, no monorepo. No databases or external services. Architecture:

- **Extension** (`src/`) — UI: status bar, Agent Screen, sidebar, commands
- **Plugin** (`.cursor-plugin/`) — AI behavior: agents, skills, rules
- **MCP server** — Tools for operators: `agent_screen_*`, `operator_*`, `drive_*`, `cursor_cli_*`, `cloud_agent_*`

The Agent Screen (S-AS) is one of four UI surfaces Drive owns. It displays operator activity, files touched, decisions, plan progress, sync status, and Cloud Agent artifacts. Data flows via `postMessage` from the extension host; the webview renders events and sends back `openFile`, `askAboutItem`, `openPlanTodo` for extension handling.

**Tech stack:** TypeScript, VS Code extension API (vscode 1.85+), WebviewPanel, OutputChannel, @modelcontextprotocol/ext-apps (MCP Apps). Validation: zod.

### (c) Current Implementation

**Extension host:** `src/agentScreen.ts` — `AgentScreenPanel` singleton, `createOrShow()`, `postEvent()`, `buildHtml()`. Display modes: `tab` (WebviewPanel beside editor), `panel` (same as tab, bug), `bottomLog` (OutputChannel, text-only).

**Webview HTML:** Inline in `buildHtml()` — tabs (Live, Activity, Files, Decisions, Sync, Artifacts), operator badge, plan progress bar, live files strip, activity feed, cliStream handling. Uses `acquireVsCodeApi()`, `postMessage`/`addEventListener('message')`. CSP with nonce; VS Code CSS variables for theming.

**MCP App variant:** `src/agentScreenApp.ts` — `buildAgentScreenAppHtml()` for sandboxed iframe (MCP Apps). Uses `@modelcontextprotocol/ext-apps` `App` class; no `acquireVsCodeApi()`. Simpler tabs: Activity, Files, Decisions. Receives tool results via `ontoolresult`.

**ActivityEvent interface:**

```ts
interface ActivityEvent {
  type: "activity"|"file"|"decision"|"agentSwitch"|"clear"|"planProgress"|"cliStream"|"cloudAgentStatus"|"cloudAgentArtifact"|"syncStatus"|"proposalUpdate"|"queueStatus";
  operatorName?: string; text?: string; filePath?: string; timestamp?: number;
  planId?: string; planName?: string; completedCount?: number; totalCount?: number; currentTodo?: string;
  cliStreamType?: "assistant"|"tool_call"|"text_delta"|"user"|"error"; cliToolName?: string;
  cloudAgentId?: string; cloudStatus?: string; prUrl?: string;
  artifactType?: "video"|"screenshot"|"log"; artifactUrl?: string; artifactLabel?: string;
  syncSnapshot?: unknown; proposalData?: unknown; queueState?: unknown;
}
```

**postMessage from Extension → Webview:**

| Event type | Payload |
|------------|---------|
| `driveState` | `{ type, active: boolean }` |
| `activity` | `{ type, operatorName?, text?, timestamp? }` |
| `file` | `{ type, operatorName?, filePath?, timestamp? }` |
| `decision` | `{ type, operatorName?, text?, timestamp? }` |
| `agentSwitch` | `{ type, operatorName?, timestamp? }` |
| `planProgress` | `{ type, planId?, planName?, completedCount?, totalCount?, currentTodo?, timestamp? }` |
| `cliStream` | `{ type, cliStreamType?, cliToolName?, text?, operatorName?, timestamp? }` — subtypes: text_delta, tool_call, user, error, assistant |
| `syncStatus` | `{ type, syncSnapshot?, timestamp? }` |
| `proposalUpdate` | `{ type, text?, timestamp? }` |
| `queueStatus` | `{ type, text?, timestamp? }` |
| `cloudAgentStatus` | `{ type, cloudAgentId?, cloudStatus?, prUrl?, timestamp? }` |
| `cloudAgentArtifact` | `{ type, artifactType?, artifactUrl?, artifactLabel?, timestamp? }` |
| `clear` | `{ type }` |
| `chime` | `{ type, count: 1 \| 2 }` |

**Webview → Extension messages:** `{ type: "openFile", path }`, `{ type: "askAboutItem", text }`, `{ type: "openPlanTodo", planPath }`.

**Config:** `cursorDrive.agentScreen.displayMode`, `clickBehavior` (openInEditor | openInNewWindow), `showPlanProgress`.

**Constraints:** Composer UI is not extensible. Extensions cannot modify chat input, send button, or mic. UI options: Webview or Output channel. No DOM injection.

### (d) Requirements

**Purpose:** Operators share activity in real time. User sees: who's working, what they're doing, files touched, decisions, plan progress, sync state.

**Functional requirements (P0):**

- R1: Display real-time activity feed (activity, file, decision, cliStream events)
- R2: Show files strip with click-to-open in editor
- R3: Show operator badge (foreground operator name)
- R4: Support tab switching: Live, Activity, Files, Decisions, Sync, Artifacts
- R8: Clear all content on `clear` event
- R9: Support displayMode: tab (webview), bottomLog (OutputChannel)

**Functional requirements (P1):**

- R5: Plan progress bar (collapsible) when `showPlanProgress` is true
- R6: Sync tab: user branch, operators, proposals, queue
- R7: Artifacts tab: Cloud Agent videos, screenshots, logs
- R10: MCP Apps: `ui://cursor-drive/agent-screen` renders inline in chat when enableApps

**Non-functional:** Use VS Code theme variables only; ARIA attributes; keyboard navigation; `data-testid` on key elements; CSP-compliant (no inline scripts without nonce).

**Layout (top to bottom):** Header (title, operator badge) → Plan progress (collapsible) → Tabs (Live | Activity | Files | Decisions | Sync | Artifacts) → Panel content.

**Per-tab content:**

- **Live:** Files strip (horizontal) + streaming activity (activity, cliStream, decisions)
- **Activity:** Full chronological log
- **Files:** Dedicated file list (same data as strip)
- **Decisions:** Recorded decisions with left border
- **Sync:** User branch, operators, proposals, queue
- **Artifacts:** Cloud Agent artifacts (video, screenshot, log)

**Interactions:**

- File chip/item/link: Click → `postMessage({ type: "openFile", path })`
- File path: Ctrl/Cmd+Click → "Ask about this" overlay → `postMessage({ type: "askAboutItem", text })`
- Plan current TODO: Click → `postMessage({ type: "openPlanTodo", planPath })`
- Plan progress: Click to expand/collapse
- Tab: Click to switch; update `aria-selected`

**cliStream display:** `text_delta`/`assistant` → append to streaming block (monospace); `tool_call` → inline "🔧 toolName: args"; `user` → italic; `error` → warning color.

**MCP App minimal UI:** Activity | Files | Decisions tabs only. No Sync/Artifacts. Hardcoded dark fallback (#1e1e1e, #d4d4d4). Data from `app.ontoolresult` — parse JSON `{ kind, op?, text?, file_path? }`.

### (e) Technical Constraints

- **Webview:** `enableScripts: true`, CSP with `style-src` and `script-src` from `cspSource` and nonce.
- **Theming:** Use only `var(--vscode-editor-background)`, `var(--vscode-editor-foreground)`, `var(--vscode-panel-border)`, `var(--vscode-textLink-foreground)`, `var(--vscode-badge-background)`, `var(--vscode-list-hoverBackground)`, `var(--vscode-textCodeBlock-background)`, `var(--vscode-editorWarning-foreground)`, `var(--vscode-progressBar-background)`, etc. No hardcoded hex.
- **Accessibility:** `role="tablist"`, `role="tab"`, `role="tabpanel"`, `aria-label`, `aria-selected`, `aria-controls`, `role="progressbar"` with `aria-valuenow`, `aria-live="polite"` on operator badge.
- **MCP App:** No `acquireVsCodeApi()`. Uses `App` from `@modelcontextprotocol/ext-apps`. Sandboxed iframe.

### (f) Deliverables

1. **Complete webview HTML/CSS/JS** — Drop-in replacement for the inline HTML in `AgentScreenPanel.buildHtml()`. Include:
   - Live tab: sticky files strip, streaming operator thinking (cliStream text_delta), tool calls inline, user prompts (italic), errors highlighted
   - Activity, Files, Decisions, Sync, Artifacts tabs
   - Operator badge, plan progress bar (collapsible), empty states
   - File chips/items clickable → openFile; Ctrl/Cmd+click → askAboutItem
   - Chime playback via Web Audio API (count 1 or 2)
2. **MCP App HTML** — Updated `buildAgentScreenAppHtml()` output for iframe, aligned with webview where possible (Activity, Files, Decisions only)
3. **Extension-side changes** — Any modifications to `agentScreen.ts` required
4. **Tests** — `data-testid` attributes and any test updates for `tests/agentScreen.test.ts`, `tests/agentScreenApp.test.ts`

### (g) Format for Response

Structure your response as:

```
## Summary
Brief description of changes and design decisions.

## Webview HTML
[Full HTML string or template, ready to paste into buildHtml()]

## MCP App HTML
[Full HTML for buildAgentScreenAppHtml(), if different from webview]

## Extension Changes
[Diff or description of agentScreen.ts changes, if any]

## Test Updates
[Changes to tests, or confirmation that existing tests pass]
```

Do not reference external files. Include all code inline. Prefer minimal diff; preserve existing behavior unless requirements explicitly change it.

---
