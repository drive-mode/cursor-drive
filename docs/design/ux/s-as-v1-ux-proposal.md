# S-AS (Agent Screen) v1 UX Proposal

Planning Cursor Drive's Agent Screen for first release, aligned with user vision: terminal as activity feed, editor shows edits, chat shows reasoning or actual messages.

---

## 1. Current S-AS Map

**File:** `src/agentScreen.ts`

| Component | Implementation | Notes |
|-----------|----------------|-------|
| **Panel type** | `WebviewPanel` \| `OutputChannel` | Singleton `AgentScreenPanel`; one or the other |
| **displayMode** | `"tab"` \| `"panel"` \| `"bottomLog"` | Config: `cursorDrive.agentScreen.displayMode` |
| **tab** (default) | `createWebviewPanel(..., column, {...})` | Webview beside editor; `column` = `activeTextEditor.viewColumn + 1` or `ViewColumn.Two` |
| **panel** | Same as tab | **Bug:** Enum says "Panel in bottom area" but code path is identical to tab. No `ViewColumn` or panel placement difference. |
| **bottomLog** | `createOutputChannel("Drive Agent Screen")` | No WebviewPanel; `postEvent` writes to `outputChannel.appendLine()` only |

### What bottomLog does

- **Location:** Output panel → "Drive Agent Screen" channel (same as other output channels)
- **Behavior:** Text-only, append-only log. No webview, no tabs, no chimes, no clickable file links
- **Events rendered:** `activity`, `file`, `clear`, `cliStream`, `syncStatus`, `proposalUpdate`, `queueStatus`, `cloudAgentStatus`, `cloudAgentArtifact`
- **Format:** `[operatorName] text` or `[operatorName] Touched: path` or `[CLI] label: text`
- **Use case:** Minimal, low-overhead view for users who prefer Output over a webview

**Relevant code:** `src/agentScreen.ts` lines 79–96 (createOrShow), 108–147 (postEvent output-channel branch)

---

## 2. Can the Terminal BE the Agent Screen?

| Option | Feasibility | Notes |
|--------|-------------|-------|
| **Output channel** | ✅ Already exists | `bottomLog` mode. Activity feed as text. No terminal semantics. |
| **Terminal tab** | ⚠️ Possible | `vscode.window.createTerminal({ name: "Drive Agent Screen", pty })` with custom `Pseudoterminal`. We write to `pty.onDidWrite` via `write()`. User sees a terminal-like scrollback. |
| **Integrated terminal with Drive output** | ⚠️ Possible | Same as above. Terminal appears in bottom panel. We control content via pty. |

**Implementation notes for terminal-as-S-AS:**

- Use `vscode.window.createTerminal({ name: "Drive", pty: new DriveAgentPty() })`
- `DriveAgentPty` implements `Pseudoterminal`: `open()`, `close()`, `handleInput()` (optional), `onDidWrite`
- On `postEvent`, format as line(s) and call `pty.write(text + "\r\n")`
- **Limitation:** No rich UI (chips, links, tabs). Plain text only. ANSI colors possible via escape codes.
- **Benefit:** Lives in terminal panel; familiar for CLI-heavy users; no webview overhead

**Recommendation for v1:** Keep `bottomLog` (Output channel) as the "terminal-like" option. Add a `terminal` displayMode later if demand exists — it's a small extension of the pty approach.

---

## 3. Editor Focus: One File at a Time

### When operator edits file X, does Cursor focus it?

- **Drive does not edit files.** Cursor agent (in-IDE) or Cursor CLI does. Drive receives `agent_screen_file` MCP calls when operators touch files.
- **Cursor in-IDE agent:** Cursor owns editor focus. When the agent applies edits, Cursor typically opens the file in the editor/diff view. **We cannot control this** — no extension API to intercept or override.
- **Cursor CLI:** Runs in subprocess; edits go to worktree files. No direct editor focus. User must open files manually or via Agent Screen click.

### Current Drive behavior

- **File click in Agent Screen:** `openFile()` → `showTextDocument(doc, { preserveFocus: false, viewColumn })` — **we do focus** the editor when user clicks.
- **Auto-focus on edit:** We do not auto-open files when `logFile` is called. That would be a new feature.

### "One file at a time" for parallel operators

| Approach | Implementation | Trade-off |
|----------|----------------|-----------|
| **Focused operator** | Config or UI: "Follow operator X". When X touches file F, `showTextDocument(F)`. Others' file touches are logged but don't auto-focus. | Clear mental model; requires operator selection |
| **Most recent wins** | On any `logFile`, focus that file. Last operator to touch a file gets focus. | Simple; can feel jumpy with many operators |
| **No auto-focus** | Only focus on user click (current). | Predictable; user stays in control |

**Recommendation for v1:** No auto-focus. Keep current click-to-open. Add optional "Follow operator" in a later release.

**Relevant code:** `src/agentScreen.ts` lines 235–256 (`openFile`, `showTextDocument`)

---

## 4. Chat Split: "Line of Thinking" vs "Chat Payload"

### Does Cursor expose this?

- **Composer / chat panel:** No public API for reasoning vs. final message. Extensions cannot read or split the chat stream.
- **beforeSubmitPrompt hook:** Receives the prompt *before* submit. We can modify it. We do **not** receive model output, reasoning, or chat history.
- **Agent vs Composer mode:** Both use the same chat surface. No separate "reasoning" channel exposed.

### What we do have

| Source | Content | Available to Drive |
|--------|---------|--------------------|
| **CLI stream-json** | `text_delta` (assistant output), `tool_call`, `user`, `error` | ✅ Yes — `cursor_cli_run_streaming` → `postEvent({ type: "cliStream", ... })` |
| **MCP tools** | `agent_screen_activity`, `agent_screen_decision` | ✅ Yes — operator can push reasoning/decisions |
| **Composer content** | User prompt, model response | ❌ No — not exposed |

**Conclusion:** Cursor does **not** expose "line of thinking" vs "chat payload" for in-IDE Composer. For CLI runs, `text_delta` is the assistant stream (which may include reasoning, depending on model). We can surface that in the Agent Screen. For in-IDE agent, we rely on operators calling `agent_screen_activity` / `agent_screen_decision` to surface reasoning — not automatic.

---

## 5. Minimal S-AS v1 Proposal

### Design principles

- Terminal-like activity feed as primary
- Editor shows edits (via Cursor; we surface file list + click-to-open)
- Chat: reasoning or actual messages where we have data (CLI stream, MCP tools)

### v1 Feature Set

| Area | v1 Scope |
|------|----------|
| **Activity feed** | `bottomLog` (Output channel) as default or config option; OR keep webview with Live tab as primary |
| **Display modes** | `tab` (webview), `bottomLog` (output). Fix or remove `panel` (currently same as tab) |
| **Files** | Live files strip + Files tab. Click to open in editor. No auto-focus |
| **Reasoning / thinking** | CLI: `text_delta` streamed to Live tab. MCP: `agent_screen_activity` / `agent_screen_decision` |
| **Chat payload** | Not available from Cursor. Only what we inject (beforeSubmitPrompt) or what operators log |

### Recommended v1 Layout

**Option A — Webview primary (current direction)**

- **Live tab:** Files strip + streaming activity (activity, cliStream, decisions)
- **Tabs:** Live | Activity | Files | Decisions | Sync (collapse Sync if not used)
- **bottomLog:** Keep as minimal fallback for users who prefer Output panel

**Option B — Terminal-first (user vision)**

- **Default displayMode:** `bottomLog` — Agent Screen IS the Output channel
- **Optional:** `tab` for users who want rich UI (chips, links, plan progress)
- **Editor:** Files opened by Cursor when it edits; we list touched files, user clicks to open

### Implementation Notes

1. **Fix displayMode "panel":** Either implement (e.g. `createWebviewPanel` with `ViewColumn.Active` in bottom group) or remove from enum and docs.
2. **bottomLog parity:** Ensure all event types that matter for "activity feed" are rendered in output-channel branch (some already are; verify `planProgress`, `agentSwitch` if desired).
3. **CLI stream = reasoning proxy:** Document that `text_delta` in Live tab is the operator's stream; for models that emit reasoning, it may appear there.
4. **No new surfaces for v1:** No terminal pty, no chat split. Minimal diff.

### Files to Touch

| File | Change |
|------|--------|
| `src/agentScreen.ts` | Fix `panel` displayMode or remove; optionally make `bottomLog` default |
| `package.json` | Update `displayMode` enum/descriptions if we remove `panel` |
| `docs/reference/config-schema.md` | Align with displayMode |
| `docs/design/ux/drive-ui-surfaces-and-devtools.md` | Update S-AS row if panel removed |

---

## Summary

| Question | Answer |
|----------|--------|
| **bottomLog** | Output channel; text-only activity log; no webview |
| **Terminal as S-AS** | Output channel ≈ terminal-like. True terminal via custom pty possible but not v1 |
| **Editor focus** | We focus on click. Cursor focuses on its edits; we can't control. No auto-focus for v1 |
| **Reasoning vs chat** | Cursor doesn't expose. CLI `text_delta` is our proxy; MCP tools for explicit logging |
| **v1 minimal** | Webview (Live tab) or bottomLog; files strip + click-to-open; stream reasoning where we have it |
