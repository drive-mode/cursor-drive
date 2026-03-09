---
name: Wake and Sleep Phrases
planId: wake-and-sleep-phrases
planType: task
overview: Add a configurable sleep word ("park mode") to deactivate Drive via voice, and set default wake phrase to "drive mode". Both phrases are configurable.
todos:
  - id: ws-01-config-defaults
    content: Add cursorDrive.sleepWord to package.json; change wakeWord default to "drive mode"
    status: completed
  - id: ws-02-pipeline-sleep
    content: Add sleep-word block in pipeline.ts (read sleepWord, strip phrase, setActive(false), speak, early return)
    status: completed
  - id: ws-03-sidebar-settings
    content: Add sleepWord to driveSidebar config and webview settings UI
    status: pending
  - id: ws-04-sandbox-defaults
    content: Add wakeWord/sleepWord to sandbox/.vscode/settings.json
    status: pending
  - id: ws-05-tests
    content: Update extension.test.ts and add pipeline sleep-word tests
    status: pending
isProject: false
---

# Wake and Sleep Voice Phrases

## User Preferences

- **Wake phrase** (activate Drive): `"drive mode"`
- **Sleep phrase** (deactivate Drive): `"park mode"`

Both remain configurable via settings; these are the defaults.

---

## Implementation

### 1. Config Defaults (`[package.json](package.json)`)


| Key                     | Current       | New            |
| ----------------------- | ------------- | -------------- |
| `cursorDrive.wakeWord`  | `"hey drive"` | `"drive mode"` |
| `cursorDrive.sleepWord` | (new)         | `"park mode"`  |


Add `cursorDrive.sleepWord` with default `"park mode"` and description: "Voice phrase that deactivates Drive."

### 2. Pipeline Logic (`[src/pipeline.ts](src/pipeline.ts)`)

**Wake word** (L150–179): Already implemented. Update default in `cfg.get("wakeWord", "hey drive")` to `"drive mode"`.

**Sleep word** (new block after wake, before drive-active gate ~L181):

- Read `cfg.get<string>("sleepWord", "park mode")`.
- Split on comma for multiple phrases (same pattern as wake/submit).
- If `ctx.driveActive` and `text.toLowerCase().startsWith(sleepWord)`:
  - Call `ctx.setActive(false)`.
  - Strip sleep phrase from `text`.
  - `speak("Drive sleeping")` (or "Park mode").
  - If no remaining text: return early with `ok: true`, `prompt: ""`, `route: { mode: "ask", reason: "Sleep word — Drive deactivated" }`.
  - If text remains: pass through (Drive now inactive).

### 3. Drive Sidebar / Settings

- Add `sleepWord` to config interface and `getConfig()` in `[src/driveSidebar.ts](src/driveSidebar.ts)`.
- Add input in `[webview/drive-sidebar.html](webview/drive-sidebar.html)` Settings (next to wake/submit).
- Update `[docs/reference/config-schema.md](docs/reference/config-schema.md)`.

### 4. Sandbox Defaults (`[sandbox/.vscode/settings.json](sandbox/.vscode/settings.json)`)

```json
"cursorDrive.wakeWord": "drive mode",
"cursorDrive.sleepWord": "park mode"
```

### 5. Tests

- Update mock config in `[tests/extension.test.ts](tests/extension.test.ts)` with new defaults.
- Add or extend pipeline test for sleep word: deactivates Drive, strips phrase, returns early when sleep-only.

---

## Edge Cases

- **"drive mode" vs "park mode"**: Wake only when `!ctx.driveActive`; sleep only when `ctx.driveActive`. No overlap.
- **Comma-separated**: Both support multiple phrases (e.g. `"drive mode, hey drive"`, `"park mode, sleep"`).
