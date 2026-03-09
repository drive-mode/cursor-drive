# Voice Input Modes Feature Plan

## Overview

Extend Cursor Drive with configurable input modes (wake word, push-to-talk, hold-to-mute), configurable hotkeys, and a Settings UI for voice configuration. Cursor limitations are targets to work around, not blockers — the extension exists to build this functionality.

---

## 1. Current State (Baseline)

### 1.1 Architecture

| Component | File | Responsibility |
|----------|------|----------------|
| Voice activation | `src/extension.ts` | `activateVoiceInput()`, `stopVoiceInput()`; calls `voiceCommands` |
| Command execution | `src/voiceCommands.ts` | `executeChatOpen`, `executeMicStart`, `executeMicStopSubmit`, `executeMicStopCancel` with fallback chains |
| Pipeline | `src/pipeline.ts` | Wake word (post-submit), submit word, filler, sanitize, route |
| Sidebar | `src/driveSidebar.ts`, `webview/drive-sidebar.html` | Quick Settings: wake word, submit word, tangent, auto-mic |

### 1.2 Config Keys (Existing)

| Key | Default | Description |
|-----|---------|-------------|
| `cursorDrive.wakeWord` | `"hey drive"` | Comma-separated wake phrases |
| `cursorDrive.submitWord` | `"send it"` | Comma-separated submit phrases |
| `cursorDrive.voice.autoActivateMicOnToggle` | `true` | Auto-start mic when Drive toggles on |
| `cursorDrive.voice.micCommand` | `composer.toggleVoiceDictation` | Command to start mic |
| `cursorDrive.voice.chatOpenCommand` | `workbench.action.chat.open` | Command to open chat |
| `cursorDrive.voice.stopCommand` | `workbench.action.chat.stopListeningAndSubmit` | Command to stop + submit |
| `cursorDrive.voice.showListeningFeedback` | `false` | Show "Listening…" toast |
| `cursorDrive.voice.activateMicDelayMs` | `400` | Delay before firing mic command |

### 1.3 Keybindings (Existing)

| Command | Key (Win) | Key (Mac) |
|---------|-----------|-----------|
| `cursorDrive.toggle` | ctrl+shift+d | cmd+shift+d |
| `cursorDrive.activateVoiceInput` | ctrl+shift+m | cmd+shift+m |
| `cursorDrive.showAgentScreen` | ctrl+shift+s | cmd+shift+s |
| `cursorDrive.stopVoice` | *(none)* | *(none)* |

### 1.4 Design Constraints (from docs)

- **voice-mic-vs-wake-word-model.md**: Mic on = continuous listening; wake word gates input to chat. Cursor does not separate "listening" from "dictating to chat" — mic on = transcription to chat.
- **ADR-0012**: Mic is mute/unmute; wake word is optional; primary activation is Drive toggle.
- **composer-mode-dropdown-integration.md**: Composer UI is not extensible; extensions cannot modify chat input, send button, or mic DOM.
- **drive-tab-vision-and-voice-flow.md**: Target flow: Drive ON → mic on → wake word → "Drive listening" → user speaks → submit word. Settings page: wake words, submit words, mode selection, hotkeys.

---

## 2. Input Mode Options

Users can choose one or combine modes:

| Mode | Description | User action | Implementation |
|------|-------------|------------|----------------|
| **Wake word** | Hands-free; say phrase to activate | Say wake word | Post-submit detection in pipeline (existing); future: WebView SpeechRecognition for real-time |
| **Push-to-talk (PTT)** | Press key to talk, release to submit | Hold hotkey | Keybinding: keydown → mic start; keyup → mic stop+submit. VS Code has no keyup — use toggle (press to start, press again to stop) |
| **Hold-to-mute** | Mic on by default; hold key to mute | Hold hotkey to mute | Same keyup limitation; use toggle (press to mute, press again to unmute) |
| **Continuous** | Mic always on when Drive on | None | Auto-activate mic on toggle (existing) |

### 2.1 Mode Selection Config

```json
"cursorDrive.voice.inputMode": {
  "type": "string",
  "enum": ["continuous", "wakeWord", "pushToTalk", "holdToMute"],
  "default": "continuous",
  "description": "Primary voice input mode."
}
```

---

## 3. Configurable Hotkeys

### 3.1 New Commands

| Command | Purpose |
|---------|---------|
| `cursorDrive.activateVoiceInput` | Start mic (existing) |
| `cursorDrive.stopVoice` | Stop mic + submit (existing) |
| `cursorDrive.stopVoiceCancel` | Stop mic, cancel (new) |
| `cursorDrive.pttToggle` | PTT: press to start, press again to stop+submit (new) |
| `cursorDrive.muteToggle` | Hold-to-mute: press to mute, press again to unmute (new) |

### 3.2 Keybinding Config (package.json contributes)

| Command | Default (Win) | Default (Mac) |
|---------|---------------|--------------|
| `cursorDrive.toggle` | ctrl+shift+d | cmd+shift+d |
| `cursorDrive.activateVoiceInput` | ctrl+shift+m | cmd+shift+m |
| `cursorDrive.stopVoice` | ctrl+shift+n | cmd+shift+n |
| `cursorDrive.pttToggle` | ctrl+shift+v | cmd+shift+v |
| `cursorDrive.muteToggle` | ctrl+shift+u | cmd+shift+u |

### 3.3 Key-Up Limitation

VS Code keybindings fire on keydown only; there is no keyup event. For true "hold to talk" (keydown = start, keyup = stop), we would need:
- WebView with `keydown`/`keyup` when focused, or
- Electron-level global shortcut (not available in extensions).

**Practical approach**: PTT and hold-to-mute use **toggle** semantics: first press = start, second press = stop. Document as "Press to talk, press again to submit" until Cursor/VS Code exposes key-up.

---

## 4. Settings UI

### 4.1 Drive Sidebar Settings Panel (Existing)

`webview/drive-sidebar.html` already has:
- Wake word(s), submit word(s), tangent keyword, agent names
- Auto mic when Drive on
- "Open full settings" link

### 4.2 Extend Settings Panel

Add to Quick Settings:

| Field | Config key | Type |
|-------|------------|------|
| Input mode | `cursorDrive.voice.inputMode` | Dropdown: Continuous, Wake word, Push-to-talk, Hold-to-mute |
| PTT hotkey | — | Display: "Ctrl+Shift+V (edit in Keyboard Shortcuts)" |
| Stop voice hotkey | — | Same |

---

## 5. Implementation Approach

### 5.1 Use Cursor Commands (When Available)

| Action | Command(s) |
|--------|------------|
| Open chat | `workbench.action.chat.open`, `composer.openComposer`, etc. |
| Start mic | `composer.toggleVoiceDictation`, `workbench.action.chat.startVoiceChat` |
| Stop + submit | `workbench.action.chat.stopListeningAndSubmit` |
| Stop cancel | `workbench.action.chat.stopListening`, `composer.cancelVoiceDictation` |
| Focus composer | `composer.focusComposer` |

### 5.2 Build Ourselves (Extension Modules)

| Component | Approach |
|-----------|----------|
| **Input mode state machine** | `src/voiceInputMode.ts` — state: idle, listening, muted. Transitions based on mode + keybindings. |
| **PTT / mute toggle handlers** | `vscode.commands.registerCommand` for `cursorDrive.pttToggle`, `cursorDrive.muteToggle`. Track listening state; toggle invokes start or stop+submit. |
| **Settings UI** | Extend `drive-sidebar.html` + `driveSidebar.ts` `_getState()` and `updateConfig` handler. |
| **WebView SpeechRecognition** (P2) | Hidden webview with `webkitSpeechRecognition`; buffer transcript; gate by wake word; inject via `composer.startComposerPrompt2`. Per voice-mic-vs-wake-word-model.md. |

### 5.3 Pipeline Integration

- **Wake word**: Already in `pipeline.ts` (lines 148–181). No change for post-submit path.
- **Submit word**: Already in `pipeline.ts` (lines 201–212).
- **Input mode**: When `inputMode === "wakeWord"` and `autoActivateMicOnToggle` is false, do not auto-start mic on Drive toggle. Rely on wake word to trigger `activateVoiceInput` after detection.

---

## 6. Phased Milestones

### P0: Config + Settings UI (Minimal)

**Goal**: Users can configure input mode, wake words, submit words, and see hotkey hints.

**Tasks**:
1. Add `cursorDrive.voice.inputMode` to package.json configuration.
2. Extend `drive-sidebar.html` Settings panel: input mode dropdown, wire to `updateConfig`.
3. Extend `driveSidebar.ts` `_getState()` to include `inputMode`.
4. In `extension.ts` toggle handler: when `inputMode === "wakeWord"`, do not auto-activate mic unless `autoActivateMicOnToggle` is true (preserve existing behavior when continuous).
5. Add `cursorDrive.stopVoice` keybinding (e.g. `ctrl+shift+n` / `cmd+shift+n`) for stop+submit.
6. Document in Settings UI: "Voice hotkeys: Configure in Keyboard Shortcuts (Ctrl+K Ctrl+S)".

**Acceptance**:
- [ ] Input mode dropdown in Drive sidebar Settings.
- [ ] Changing input mode persists to config.
- [ ] When mode is "wakeWord" and auto-mic is off, Drive toggle does not start mic.
- [ ] Stop voice has a default keybinding.

---

### P1: Push-to-Talk (Toggle) + Hold-to-Mute (Toggle)

**Goal**: PTT and hold-to-mute as toggle (press to start, press again to stop) due to key-up limitation.

**Tasks**:
1. Add `cursorDrive.pttToggle` command: if mic off → start; if mic on → stop+submit.
2. Add `cursorDrive.muteToggle` command: if mic on → stop (cancel); if mic off → start.
3. Contribute keybindings: `cursorDrive.pttToggle` (e.g. `ctrl+shift+v`), `cursorDrive.muteToggle` (e.g. `ctrl+shift+u`).
4. Add `voiceInputMode.ts`: track `listening` state; `pttToggle` and `muteToggle` use it to decide action.
5. Wire `activateVoiceInput` / `stopVoiceInput` to update state.
6. Settings UI: show PTT and mute hotkeys, link to Keyboard Shortcuts.

**Acceptance**:
- [ ] PTT hotkey: first press starts mic, second press stops and submits.
- [ ] Mute hotkey: first press stops mic (cancel), second press starts mic.
- [ ] State survives Drive toggle (mic off when Drive off).

---

### P2: Real-Time Wake Word (WebView SpeechRecognition)

**Goal**: True wake-word gating — mic listens but does not send to chat until wake word is detected.

**Tasks**:
1. Create `src/voiceWakeWordGate.ts` and a hidden WebView with `webkitSpeechRecognition`.
2. Continuous recognition; buffer transcript; match wake word in stream.
3. On wake word: emit event; extension injects buffered text (after wake word) to composer via `composer.startComposerPrompt2` or equivalent.
4. Privacy: no raw audio retention; ephemeral buffer only (ADR-0005).
5. Config: `cursorDrive.voice.wakeWordGateEnabled` (default false); when true, use WebView path instead of Cursor mic for wake-word mode.

**Acceptance**:
- [ ] WebView captures speech; no text to chat until wake word detected.
- [ ] After wake word, transcript flows to composer.
- [ ] Submit word still strips and bypasses optimizer in pipeline.
- [ ] No audio or transcript persistence when disabled.

---

## 7. File Path Summary

| Change | File |
|-------|------|
| Config schema | `package.json` (contributes.configuration) |
| Keybindings | `package.json` (contributes.keybindings) |
| Toggle logic | `src/extension.ts` |
| Voice commands | `src/voiceCommands.ts` (existing) |
| Input mode state | `src/voiceInputMode.ts` (new, P1) |
| Pipeline | `src/pipeline.ts` (no change for P0/P1) |
| Sidebar state | `src/driveSidebar.ts` |
| Settings UI | `webview/drive-sidebar.html` |
| Wake word gate (P2) | `src/voiceWakeWordGate.ts` (new) |

---

## 8. References

- [voice-mic-vs-wake-word-model.md](../docs/design/ux/voice-mic-vs-wake-word-model.md)
- [drive-tab-vision-and-voice-flow.md](../docs/design/ux/drive-tab-vision-and-voice-flow.md)
- [composer-mode-dropdown-integration.md](../docs/design/ux/composer-mode-dropdown-integration.md)
- [ADR-0012: Voice Input Integration](../docs/architecture/adr/ADR-0012-voice-input-integration.md)
- [cursor-native-commands.md](../docs/reference/cursor-native-commands.md)
