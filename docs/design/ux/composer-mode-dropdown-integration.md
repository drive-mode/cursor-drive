# Composer Mode Dropdown: Drive as a Native Mode (Future)

**Product goal:** Drive should appear as a selectable mode in the chat composer unified dropdown (the pill that shows Agent / Plan / Debug / Ask). Selecting "Drive" would turn on Drive (listening mic, wake word) and keep the session in a sensible native mode (e.g. Agent).

**Current constraint:** Cursor does not expose an extension API or contribution point to register a custom composer mode. The dropdown is internal Cursor UI. Extensions run in the extension host process and have no access to the workbench DOM, so DOM injection from the extension is not feasible.

Until Cursor adds support, Drive is entered via the **status bar** (click "Drive" or "Drive (off)") or **Ctrl+Shift+D** / **Cmd+Shift+D**, and the **Set Drive Mode** QuickPick lists sub-modes (Plan, Agent, Ask, Debug, Off).

---

## Target DOM Structure (for when an API exists)

Captured from Cursor workbench so we can implement quickly once a contribution point or API is available.

### Trigger (pill)

- `div.composer-unified-dropdown` with `data-mode` (e.g. `"plan"`).
- Contains: icon (`codicon codicon-todos` etc.), label span ("Plan"), `codicon codicon-chevron-down`.

### Dropdown popover

- Container: `typeahead-popover mentions-menu`.
- Mode items have IDs: `composer-mode-{instanceId}-agent`, `-plan`, `-debug`, `-chat`.

### Single mode item

- `div.composer-unified-context-menu-item`.
- Icon: `span.codicon.codicon-{name}` — Agent: `codicon-infinity`, Plan: `codicon-todos`, Debug: `codicon-bug`, Ask: `codicon-chat`.
- Label: `span.monaco-highlighted-label` with text "Agent" / "Plan" / "Debug" / "Ask".
- Optional keybinding span, optional checkmark.

**Drive item (desired):** Same structure; icon = extension asset `assets/logo.svg` (so a future API must support icon as URI or path, not only codicon); label "Drive"; keybinding Ctrl+Shift+D / Cmd+Shift+D. On select: run `cursorDrive.toggle` and `composerMode.agent`. (The status bar currently uses `$(play-circle)` because `StatusBarItem` does not support custom images.)

---

## Composer Input (Drive active)

When Drive mode is active, the composer input area should visually indicate it and keep the mic always accessible.

**Send button when Drive is on:** A thin border around the send button (arrow-up), color from `cursorDrive.composer.driveActiveBorderColor` (default `#e51400`). Subtle and consistent with Cursor so it’s obvious the user is in Drive without being loud.

**Mic always visible:** The mic control should always be shown to the **left** of the send button (not only when the input is empty), with the **voice waveform** (e.g. the 3–5 bar `voice-waveform-container` that animates when speaking) so the user can mute at any time while in Drive.

**Note:** The composer input is Cursor-owned DOM. The extension cannot implement this today. Implemented by Cursor when they expose composer input styling and/or mic placement.

---

## Feature Request (draft for Cursor)

**Title:** Extension API or contribution point to add a custom composer mode

**Summary:** Allow extensions to register a custom mode in the chat composer mode dropdown (the pill that currently shows Agent, Plan, Debug, Ask). So that extensions like Cursor Drive can offer "Drive" as a first-class mode alongside the built-in ones.

**Proposed shape:**

- **Contribution point** in `package.json`, e.g. `contributes.composer.modes`:
  - Each entry: `id`, `label`, `icon` (codicon name **or** extension-relative path / URI for custom image, e.g. `assets/logo.svg`), `command` (to run when selected), optional `keybinding` for display.
- Or a **programmatic API**, e.g. `vscode.composer.registerMode({ id, label, icon, command })`, with `icon` supporting both codicon and `Uri` so Drive can use `assets/logo.svg`.

**Use case:** Cursor Drive wants to add "Drive" to the dropdown. When the user selects it, Drive turns on (mic listening, wake word) and the session stays in Agent mode; the status bar shows "Drive > Agent". Today we can only offer Drive via the status bar and a separate QuickPick, not inside the same mode list the user already uses.

**Reference:** The dropdown’s mode items use IDs like `composer-mode-{instanceId}-agent` and class `composer-unified-context-menu-item`; structure is icon + label + optional keybinding. A contribution would let Cursor render an equivalent row for extension-defined modes.

---

### Second ask: Composer input (send button + mic)

**Composer send button when Drive (or extension mode) is active:** Allow the extension to supply a border color (or class name) for the composer send button so we can show a thin, configurable border when Drive is on. Drive exposes `cursorDrive.composer.driveActiveBorderColor` (hex); Cursor would apply it when Drive reports active.

**Composer mic always visible:** Either (a) always show the mic to the left of the send button with the voice waveform (3–5 bar `voice-waveform-container` that animates when speaking), so the user can mute at any time, or (b) provide an API so extensions can control mic visibility/placement (e.g. "always show when Drive is active").
