# Drive Visibility and Voice Integration

How to make Drive mode obviously active and how voice is wired. Includes constraints (what we cannot do without Cursor API support) and what we implement.

---

## What We Cannot Do (Extension API Limits)

- **Border around Cursor’s chat input** — The Composer/chat panel is Cursor’s internal UI. Extensions have no API to inject CSS or decorations into that DOM. A contrasting border around the chat input would require Cursor to expose something like “composer decoration” or “context-driven composer style.”
- **Change “Agent” to “Drive” in Cursor’s UI** — Labels like “Plan”, “Agent”, “Ask”, “Debug” in the mode selector and elsewhere are owned by Cursor. We cannot rename them from an extension.

So: “contrasting border around the chat input” and “agent icons/text say Drive instead of Agent” **inside Cursor’s chrome** are not possible with the current extension API. We can only change **our own** UI and use **context keys** for keybindings.

---

## What We Can Do

### 1. Status bar: “Drive” instead of “Drive > Agent”

Our status bar is fully under our control. When Drive is active we can show:

- **Option A (current):** `Drive > Agent | Alpha` — mode name is visible.
- **Option B (configurable):** `Drive | Alpha` when in agent mode — no “Agent” word; “Drive” is the main label. Other modes can still show `Drive > Plan`, etc., or we can hide mode for agent only.

Implemented via config: `cursorDrive.statusBar.showModeLabel` (default `true`). When `false`, in agent mode we show `Drive` (or `Drive | Operator`) without “> Agent”. When `true`, we keep current “Drive > Agent” (and “Drive > Plan”, etc.).

### 2. Status bar: stronger “active” styling

We already set `statusBarItem.warningBackground` when Drive is active. We can:

- Add a config option for a custom color (e.g. `cursorDrive.statusBar.activeBackground`) so users can pick a more contrasting color.
- Or keep the theme color and document that users can override in their theme via `statusBarItem.warningBackground`.

Implemented: keep default theme color; add optional config for `activeBackground` so users can set a contrasting color when Drive is on.

### 3. Context key `cursorDrive.active`

We set a context key when Drive toggles so keybindings and other extensions can react:

- `setContext('cursorDrive.active', true | false)` on toggle and on activation.

Then keybindings can use `when: 'cursorDrive.active'` (e.g. different shortcuts when Drive is on). We cannot use this to style Cursor’s composer (themes don’t use context keys for dynamic CSS).

### 4. Agent Screen: “Drive” label and contrasting border

We own the Agent Screen webview. When Drive is active we can:

- **Header:** Show “Drive” instead of “Agent Screen” (so our own “agent” text becomes “Drive” as requested).
- **Border:** Add a visible contrasting border (e.g. left or top) when Drive is on so the panel is obviously in “Drive” mode.

Implemented: extension calls `AgentScreenPanel.getInstance()?.setDriveActive(active)` on `driveMgr.onDidChange` and after creating the panel. The webview receives a `driveState` message and:

- Toggles a class on `body` (e.g. `drive-active`).
- Sets header title to “Drive” when active, “Agent Screen” when inactive.
- CSS: `body.drive-active` gets a left (or top) border using a theme color (e.g. `activityBarBadge.background` or `focusBorder`).

### 5. Voice: make it obvious and reliable

Voice is already wired:

- **Start:** `cursorDrive.activateVoiceInput` → open chat + `workbench.action.chat.startVoiceChat` (configurable).
- **Stop/submit:** `cursorDrive.stopVoice` → `workbench.action.chat.stopListeningAndSubmit` (configurable).

To make it “work correctly” and obvious:

- **Feedback:** Optional brief toast “Listening…” when mic starts (configurable so we don’t spam).
- **Docs:** Document that Cursor’s mic button and our command both start the same native voice; recommend keybinding Ctrl+Shift+M for “Activate Voice Input” and, if desired, a second key for “Stop Voice” for clarity.
- **Troubleshooting:** In `cursorDrive.diagnose`, we can add a “Voice” section: list configured commands and whether they exist (`executeCommand` and catch).

Implemented: optional toast when mic starts (config `cursorDrive.voice.showListeningFeedback`); diagnose already surfaces commands; no change to core voice wiring.

---

## Summary: “Obviously activated” and “Drive” label

| Request | Feasible? | How |
|--------|-----------|-----|
| Contrasting border around **chat input** | No | No API for composer DOM. |
| “Agent” → “Drive” **in Cursor’s UI** | No | Labels are Cursor’s. |
| **Our** status bar shows “Drive” (no “Agent”) | Yes | Config `showModeLabel: false` → “Drive \| Alpha”. |
| **Our** status bar more contrasting when on | Yes | Config `activeBackground` or keep theme color. |
| **Our** Agent Screen says “Drive” and has border | Yes | Header title “Drive” when active; `body.drive-active` border. |
| Voice obvious and working | Yes | Optional “Listening…” toast; docs and diagnose. |

---

## Config added

| Setting | Type | Default | Purpose |
|---------|------|--------|--------|
| `cursorDrive.statusBar.showModeLabel` | boolean | `true` | When `false`, in agent mode show “Drive” (or “Drive \| Operator”) without “> Agent”. |
| `cursorDrive.statusBar.activeBackground` | string | (theme) | Optional. e.g. `"#0e639c"` for a contrasting bar when Drive is on; empty = use theme. |
| `cursorDrive.voice.showListeningFeedback` | boolean | `false` | When `true`, show a brief “Listening…” toast when mic starts. |

---

## References

- [drive-layout-integration.md](./drive-layout-integration.md) — Where our surfaces live.
- [drive-ui-surfaces-and-devtools.md](./drive-ui-surfaces-and-devtools.md) — All 12 interaction points and DevTools workflow.
