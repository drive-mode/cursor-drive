---
name: Drive composer input UX
overview: Add a configurable "Drive active" border color setting and document the desired composer UX (send-button border when Drive is on; mic always visible with waveform). The composer UI is Cursor-owned DOM, so the extension cannot implement the visual changes itself—only add the setting and formalize the feature request for Cursor.
todos:
  - id: composer-01-setting
    content: Add cursorDrive.composer.driveActiveBorderColor in package.json (hex string, default #e51400)
    status: completed
  - id: composer-02-docs
    content: Document desired composer UX in docs/design/ux (send-button border + mic always visible with waveform)
    status: completed
  - id: composer-03-feature-request
    content: Add composer send-button border and always-visible mic to Cursor feature-request draft
    status: completed
isProject: false
---

# Drive composer input UX (border + always-visible mic)

## Constraint

The composer input area (send button, mic, voice waveform) is **Cursor’s internal workbench UI**. Extensions run in the extension host and have **no access to the workbench DOM**. We cannot inject elements, add classes, or style the send button or mic from the extension (same as the mode dropdown). See [docs/design/ux/composer-mode-dropdown-integration.md](docs/design/ux/composer-mode-dropdown-integration.md).

## What we can do

### 1. Add configurable Drive-active border color

- **Setting:** `cursorDrive.composer.driveActiveBorderColor` (or `cursorDrive.driveActiveBorderColor`).
- **Type:** string (hex color), e.g. `#e51400` (subtle red); allow empty to mean “no border” once Cursor supports it.
- **Place:** [package.json](package.json) `configuration` under a small `cursorDrive.composer` group (or at root).
- **Description:** State that this is the border color for the composer send button when Drive mode is active; used when Cursor supports extension-driven composer styling (or for future Drive UI).
- No code in the extension today will *apply* this (we have no composer DOM access); the value is for (a) user preference in one place and (b) a future Cursor API or our own UI.

### 2. Document desired composer input UX

Add a short section (e.g. in [docs/design/ux/composer-mode-dropdown-integration.md](docs/design/ux/composer-mode-dropdown-integration.md) or in [docs/design/ux/drive-ui-surfaces-and-devtools.md](docs/design/ux/drive-ui-surfaces-and-devtools.md)):

- **Send button when Drive is on:** Thin border around the send button (arrow-up), color from `cursorDrive.composer.driveActiveBorderColor`, subtle and consistent with Cursor so it’s obvious the user is in Drive without being loud.
- **Mic always visible:** Mic control always shown to the **left** of the send button (not only when input is empty), with the **voice waveform** (e.g. the 3–5 bar “voice-waveform-container” that animates when speaking) so the user can mute at any time while in Drive.
- **Note:** Implemented by Cursor when they expose composer input styling and/or mic placement; extension cannot do this today.

### 3. Extend Cursor feature request

In the same doc (or the feature-request draft), add a **second ask** for Cursor:

- **Composer input when Drive (or extension mode) is active:** Allow the extension to supply a border color (or a class name) for the composer send button so we can show a thin, configurable border when Drive is on.
- **Composer mic:** Either (a) always show the mic to the left of the send button with the waveform, or (b) provide an API so extensions can control mic visibility/placement (e.g. “always show when Drive is active”).

## What we cannot do (without Cursor)

- Add a border to the send button from the extension (no DOM access).
- Force the mic to be always visible or move it (Cursor controls composer UI).
- Inject the voice-waveform component (no DOM access).

## Implementation summary


| Item            | Action                                                                                                                                                            |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Setting         | Add `cursorDrive.composer.driveActiveBorderColor` in package.json (hex string, default e.g. `#e51400`).                                                           |
| Docs            | Add “Composer input (Drive active)” subsection: send-button border + mic always visible with waveform; note “Cursor-owned; not implementable by extension today.” |
| Feature request | Add composer send-button border and always-visible mic (with waveform) to the Cursor feature-request draft.                                                       |


No changes to status bar, QuickPick, or any code that assumes we can touch the composer DOM.