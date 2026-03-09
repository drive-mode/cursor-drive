# Drive Tab Vision, Information Architecture & Voice Flow

Detailed plan for Drive mode UI, multi-page layout, layout alternatives, and voice interaction flow.

---

## 1. Information Users Want While Viewing Drive

### 1.1 Status & Control (always visible)

| Info | Why | Current location |
|------|-----|------------------|
| Drive on/off | Primary state | Status card |
| Sub-mode (Plan/Agent/Ask/Debug) | What the agent will do | Mode badge |
| Mic state (listening / wake-word standby / off) | Voice readiness | Not shown |
| Quick actions (toggle, voice, mode) | One-tap control | Buttons |

### 1.2 Voice & Keywords

| Info | Why | Current location |
|------|-----|------------------|
| Wake word(s) | User needs to know what to say | Config only |
| Submit word(s) | How to send without clicking | Config only |
| Tangent keyword | How to spawn operators by voice | Config only |
| Listening indicator | Feedback that mic is active | Status bar toast (optional) |
| Wake-word confirmation | Verbal "Drive listening" | Not implemented |

### 1.3 Operators & Agents

| Info | Why | Current location |
|------|-----|------------------|
| Active operator(s) | Who is working | Operators list |
| Operator names | Identity | namePool config |
| Operator task | What they're doing | Operators list |
| Foreground vs background | Who is "speaking" | Status bar suffix |

### 1.4 Activity & Context

| Info | Why | Current location |
|------|-----|------------------|
| Recent activity | What happened | Agent Screen |
| Files touched | What changed | Agent Screen |
| Plan progress | Plan/Ask mode context | Agent Screen |
| Sync status | Mob-programming state | Agent Screen |

### 1.5 Settings & Preferences

| Info | Why | Current location |
|------|-----|------------------|
| Wake words, submit words | Voice UX | Config |
| Agent names | Operator identity | Config |
| TTS on/off, voice, speed | Audio feedback | Config |
| Prompt optimizer, auto-approve | Flow control | Config |
| MCP port, Agent Screen display | Dev/debug | Config |

---

## 2. Three-Page Layout (Tabbed Drive Panel)

Proposed top-level tabs in the Drive sidebar:

### Page 1: **Control** (default)

- Drive toggle
- Mode selector
- Voice button + mic state (icon: mic on, no waves until wake word)
- Operators list (compact)
- "Show Agent Screen" button

**Purpose:** Primary control surface. Minimal, always useful.

### Page 2: **Activity**

- Activity feed (recent events)
- Files touched (links)
- Plan progress (if in Plan mode)
- Sync status (if enabled)

**Purpose:** Context and history. What’s happening and what changed.

### Page 3: **Settings**

- **Voice:** Wake word(s), submit word(s), tangent keyword (comma-separated)
- **Operators:** Name pool (comma-separated)
- **Feedback:** TTS on/off, auto-activate mic, show listening feedback
- **Advanced:** MCP port, Agent Screen display mode, etc.

**Purpose:** In-panel configuration without leaving Drive.

---

## 3. Layout Flavors: Drive + File Explorer vs Chat

### 3.1 Current Constraint

**Cursor/VS Code does not let extensions replace the Chat panel.** The Chat/Composer is internal UI. Extensions cannot:

- Swap Chat and Explorer in the sidebar
- Put Drive where Chat lives
- Control the primary/secondary sidebar layout

### 3.2 What We Can Do Today

| Option | How | Limitation |
|--------|-----|------------|
| **Drive in Activity Bar** | `viewsContainers` + Drive icon | Drive and Explorer are separate views; user switches between them |
| **Drive as panel** | `WebviewPanel` in bottom/side | Can sit beside editor, but not in the same slot as Chat |
| **Agent Screen as tab** | `displayMode: "tab"` | Opens beside editor; user can arrange tabs |
| **Custom layout** | `vscode.window.createWebviewPanel` with specific `ViewColumn` | We control our panels; we don’t control Chat’s position |

### 3.3 Desired Layout (Future / Cursor API)

**Goal:** Drive UI and File Explorer visible together, with Chat available but not required in the same pane.

Possible future shapes:

1. **Split sidebar:** Left sidebar split: Explorer (top) + Drive (bottom), or tabs.
2. **Drive replaces Chat in a slot:** User preference: "Use Drive panel instead of Chat in sidebar" — would need Cursor to support this.
3. **Unified panel:** One panel with sub-tabs: Explorer | Drive | Chat — again, Cursor would need to support it.

### 3.4 Workaround Today

- **Recommended:** Keep Drive in Activity Bar. User can:
  - Use **Ctrl+1** (Explorer) and **Drive icon** to switch.
  - Or use **Ctrl+Shift+E** (Explorer) and click Drive for quick toggling.
- **Agent Screen:** Use `displayMode: "tab"` so it opens as an editor tab; user can place it next to Explorer in a split.

---

## 4. Voice Flow: Mic, Wake Word, Submit, Confirmation

### 4.1 Conceptual model (mic vs wake-word gate)

- **Mic on** = Audio capture active; Drive turns it on by default. User can mute/unmute.
- **Wake word** = Gate that routes the mic's input into the chatbox via the composer action. Until the user says the wake phrase, nothing flows to the chat input — enabling granular, hands-free control.

See [voice-mic-vs-wake-word-model.md](voice-mic-vs-wake-word-model.md) for the full distinction and current Cursor constraints.

### 4.2 Target Flow

1. **Drive ON** → Mic turns on automatically (no user click).
2. **Mic icon** → Shows "mic on" (e.g. filled mic). No waveform until wake word.
3. **User says wake word** → Agent says verbal confirmation (e.g. "Drive listening").
4. **Waveform** → Appears only after wake word (or when Cursor’s mic is actively receiving).
5. **User speaks request** → Agent processes.
6. **Submit** → User says submit word(s) OR natural end (pause, context clues). Submit word is preferred; context can be fallback.

### 4.3 Config Changes

| Config | Current | Proposed | Notes |
|--------|---------|----------|-------|
| `wakeWord` | `"hey drive"` (single) | `"hey drive, wake, drive"` (comma-separated) | Multiple wake phrases |
| `submitWord` | `"send it"` (single) | `"send it, go, submit"` (comma-separated) | Multiple submit phrases |
| `operators.namePool` | Array | Same, editable in Settings page | Comma-separated in UI |
| `voice.autoActivateMicOnToggle` | `false` | `true` (default when Drive on) | Mic auto-on with Drive |

### 4.4 Implementation Notes

- **Wake-word confirmation:** TTS speak when wake word detected (e.g. "Drive listening"). Requires pipeline to emit an event when wake word is matched.
- **Waveform:** Cursor owns the mic UI. We can’t control when the waveform appears. We can only:
  - Ensure mic is started when Drive turns on.
  - Use `showListeningFeedback` for a "Listening…" toast.
- **Context-based submit:** If no submit word is detected, use heuristics (long pause, question mark, etc.). Lower priority than explicit submit word.

---

## 5. Settings Cog & Settings Panel

### 5.1 Placement

- Small settings icon (gear/cog) in the **top-right** of the Drive panel.
- Click → Open Settings page (if tabbed) or a settings overlay/modal.

### 5.2 Settings Page Content (top to bottom)

1. **Voice**
   - Wake word(s): comma-separated text input
   - Submit word(s): comma-separated text input
   - Tangent keyword: single text input
   - Auto-activate mic when Drive on: checkbox
   - Show "Listening…" feedback: checkbox

2. **Operators**
   - Agent names: comma-separated text input (maps to `namePool`)

3. **Feedback**
   - TTS enabled: checkbox
   - TTS voice: text input (optional)
   - TTS speed: number input

4. **Link**
   - "Open full Drive settings" → `workbench.action.openSettings` filtered to `@ext:drive-mode.cursor-drive`

---

## 6. Implementation Phases

### Phase 1 (immediate)

- [ ] Settings cog in top-right of Drive panel
- [ ] Settings panel/page with: wake word(s), submit word(s), agent names
- [ ] Wire inputs to `workspace.getConfiguration().update()`
- [ ] Support comma-separated wake/submit in pipeline (parse, match any)

### Phase 2

- [ ] Tabbed layout: Control | Activity | Settings
- [ ] Move operators + activity into Activity tab
- [ ] Mic icon state in Control tab (mic on, no waves until wake word — visual only; waveform still Cursor-owned)

### Phase 3

- [ ] Wake-word verbal confirmation (TTS when detected)
- [ ] Default `autoActivateMicOnToggle: true` when Drive on
- [ ] Context-based submit fallback (optional)

### Phase 4 (Cursor-dependent)

- [ ] Document feature request for Drive + Explorer in same pane
- [ ] Document feature request for composer mic/waveform control

---

## 7. References

- [composer-mode-dropdown-integration.md](./composer-mode-dropdown-integration.md) — Composer/Chat constraints
- [drive-ui-surfaces-and-devtools.md](./drive-ui-surfaces-and-devtools.md) — Surfaces we own
- [voice-user-journey-storyboard.md](./voice-user-journey-storyboard.md) — Voice flow
- [config-schema.md](../../reference/config-schema.md) — Config keys
