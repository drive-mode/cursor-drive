---
name: Add Sleep Word to Drive
overview: Add a configurable sleep word (e.g. "sleep") that deactivates Drive via voice, mirroring the existing wake word behavior.
todos: []
isProject: false
---

# Add Sleep Word to Drive Voice Flow

## Current State

- **Wake word** (`[pipeline.ts](src/pipeline.ts)` L150–179): If Drive inactive and input starts with `wakeWord`, activates Drive, strips phrase, speaks "Drive listening".
- **Submit word** (L199–210): If input ends with `submitWord`, strips and submits.
- **No sleep word**: Drive stays active until user toggles off or mutes mic.

## Proposed Behavior

When Drive is active and transcribed input **starts with** a configured sleep word:

1. Deactivate Drive (`ctx.setActive(false)`).
2. Strip the sleep phrase from the prompt.
3. Speak acknowledgment (e.g. "Drive sleeping").
4. Return early with empty/no prompt (do not submit).

## Implementation

### 1. Config

Add to `[package.json](package.json)` contributes.configuration:

```json
"cursorDrive.sleepWord": {
  "type": "string",
  "default": "sleep",
  "description": "Voice phrase that deactivates Drive"
}
```

### 2. Pipeline Logic (`[src/pipeline.ts](src/pipeline.ts)`)

Insert **after** wake-word block (around L181), **before** drive-active gate:

- Read `cfg.get<string>("sleepWord", "sleep")`.
- Split on comma (like wake/submit) for multiple phrases.
- If `ctx.driveActive` and `text.toLowerCase().startsWith(sleepWord)`:
  - Call `ctx.setActive(false)`.
  - Strip sleep phrase from `text`.
  - `speak("Drive sleeping")`.
  - If no remaining text, return early with `ok: true`, `prompt: ""`, `route: { mode: "ask", reason: "Sleep word — Drive deactivated" }`.
  - If text remains after strip, treat as pass-through (Drive now inactive) — existing gate at L182 will handle.

### 3. Drive Sidebar / Settings

- Add `sleepWord` to `[driveSidebar.ts](src/driveSidebar.ts)` config interface and `getConfig()`.
- Add input in `[webview/drive-sidebar.html](webview/drive-sidebar.html)` Settings (next to wake/submit).
- Add to `[docs/reference/config-schema.md](docs/reference/config-schema.md)`.

### 4. Tests

- `[tests/extension.test.ts](tests/extension.test.ts)`: Extend mock config with `sleepWord`.
- New or extended pipeline test: sleep word deactivates Drive, strips phrase, returns early when sleep-only; pass-through when text remains.

## Edge Cases

- **Sleep + submit in same utterance**: e.g. "sleep send it" — sleep wins (checked first); strip "sleep", remaining "send it" is pass-through.
- **Wake and sleep both match**: Wake only runs when `!ctx.driveActive`; sleep only when `ctx.driveActive`. No conflict.
- **Empty sleepWord**: Disable sleep-word behavior (same pattern as wake).

## Alignment

- ADR-0012: Mic remains mute/unmute. Sleep word is optional, additive.
- Vision invariants: No change to primary pipeline entry or mode mapping.
