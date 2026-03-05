---
name: Drive UX Polish and Auto-MCP
overview: "Three improvements to Drive mode: MCP auto-registration via Cursor deep link, audio chimes and visual feedback on toggle/wake-word, and a dev-settings preset for the sandbox."
todos:
  - id: mcp-deeplink
    content: Implement MCP auto-registration via Cursor deep link in extension.ts (registerMcpViaDeepLink function)
    status: completed
  - id: audio-feedback
    content: Create src/audioFeedback.ts with hidden WebView chime player (Web Audio API sine tones)
    status: completed
  - id: wire-chimes
    content: Wire playChime(1) on Drive ON and playChime(2) on Drive OFF in the toggle command
    status: completed
  - id: wake-ack
    content: "Add wake-word acknowledgment in pipeline.ts: speak + status bar message + handle empty text"
    status: completed
  - id: dev-preset
    content: Expand sandbox/.vscode/settings.json with full dev-friendly config preset
    status: completed
  - id: tests
    content: Add audioFeedback.test.ts, update pipeline.test.ts for wake-word acknowledgment
    status: completed
isProject: false
---

# Drive UX Polish: Auto-MCP, Chimes, Wake Prompt, Dev Preset

## 1. MCP Auto-Registration via Deep Link

**Goal:** Remove friction point F2 -- user should never manually edit `.cursor/mcp.json`.

**Approach:** On extension activation, check a workspace-state flag `drive.mcpRegistered`. If false, construct a Cursor deep link URI and open it via `vscode.env.openExternal`. Per [Cursor docs](https://cursor.com/docs/context/mcp/install-links), the format is:

```
cursor://anysphere.cursor-deeplink/mcp/install?name=drive&config=BASE64
```

Where config is the base64-encoded JSON: `{"url":"http://127.0.0.1:<port>/mcp"}`

**Implementation in [src/extension.ts](src/extension.ts):**

```typescript
async function registerMcpViaDeepLink(port: number, ctx: vscode.ExtensionContext): Promise<void> {
  const alreadyRegistered = ctx.workspaceState.get<boolean>("drive.mcpRegistered", false);
  if (alreadyRegistered) return;

  const config = JSON.stringify({ url: `http://127.0.0.1:${port}/mcp` });
  const b64 = Buffer.from(config).toString("base64");
  const uri = vscode.Uri.parse(
    `cursor://anysphere.cursor-deeplink/mcp/install?name=drive&config=${b64}`
  );

  try {
    await vscode.env.openExternal(uri);
    await ctx.workspaceState.update("drive.mcpRegistered", true);
  } catch {
    // Cursor deep link not supported -- fall back to manual
    out.appendLine("[Drive] Deep link MCP registration failed; manual setup required");
  }
}
```

- Call this after `mcpServer.start()` succeeds
- Gate with `drive.mcpRegistered` workspace state so it only prompts once per workspace
- Port is dynamic from `cursorDrive.mcp.port` config
- If `vscode.env.openExternal` fails (e.g., running in plain VS Code, not Cursor), log and skip silently

**Additionally:** Wire the deep link into Drive mode activation as a hook. When the user toggles Drive ON for the first time, call `registerMcpViaDeepLink()` so MCP is always ready before the user needs it.

---

## 2. Audio Chimes on Toggle (1 for ON, 2 for OFF)

**Goal:** Make Drive ON/OFF state transitions unmistakably obvious with audio feedback matching Cursor's notification chime style.

**Approach:** Create a lightweight `src/audioFeedback.ts` module that uses the AgentScreen WebView (or a hidden WebView) to play synthesized chime tones via the Web Audio API. No bundled audio files needed -- generate short sine-wave tones programmatically.

**New module [src/audioFeedback.ts](src/audioFeedback.ts):**

- Export `playChime(count: 1 | 2): void`
- Manages a hidden WebView panel (`retainContextWhenHidden: true`) purely for audio
- Sends `postMessage({ type: "chime", count })` to the WebView
- WebView JS generates tones:
  - Single 880Hz sine wave, 150ms duration, gentle fade-out = 1 chime (ON)
  - Same tone played twice with 200ms gap = 2 chimes (OFF)
- CSP must include `media-src blob:` or use `AudioContext` (no CSP issue since it generates audio, not loading external media)

**Wire into [src/extension.ts](src/extension.ts) toggle command:**

```typescript
// In cursorDrive.toggle handler:
driveMgr.toggle();
playChime(driveMgr.active ? 1 : 2);
```

**Fallback:** If WebView creation fails (e.g., `retainContextWhenHidden` not available), fall back to TTS saying "Drive on" / "Drive off" via existing `speak()`.

---

## 3. Wake Word Acknowledgment: "How can I help?"

**Goal:** When wake word is detected, Drive acknowledges both audibly and visually.

**Where wake word is detected:** [src/pipeline.ts](src/pipeline.ts) line 127 -- `runPipeline()` checks if submitted text starts with the configured wake word.

**Changes to [src/pipeline.ts](src/pipeline.ts):**

After the wake word activates Drive (line 128-130), add an acknowledgment step:

```typescript
if (!ctx.driveActive && ctx.setActive && wakeWord &&
    text.toLowerCase().startsWith(wakeWord.toLowerCase())) {
  ctx.setActive(true);
  text = text.slice(wakeWord.length).trim();
  activatedByWakeWord = true;

  // Acknowledge wake word
  speak("How can I help?");
  void vscode.window.setStatusBarMessage("$(mic) Drive: How can I help?", 5000);
}
```

- `speak("How can I help?")` -- TTS acknowledgment (only plays if TTS is enabled)
- `vscode.window.setStatusBarMessage(...)` -- temporary 5-second message in the status bar, visible regardless of TTS/voice mode
- The `$(mic)` codicon provides a visual mic indicator

**If the user submitted text after the wake word** (e.g., "hey drive refactor auth"), the pipeline continues processing "refactor auth" -- the acknowledgment is a side effect, not blocking.

**If the user submitted ONLY the wake word** (e.g., "hey drive" with nothing after), `text` becomes empty after stripping. The pipeline should handle this gracefully:

- Route as a no-op or pass-through
- The acknowledgment ("How can I help?") becomes the entire response
- Add an early return when `text` is empty after wake word stripping

---

## 4. Dev Settings Preset for Sandbox

**Goal:** One-place configuration that auto-applies all voice/TTS/Drive settings when developing in the sandbox window.

**Approach:** Expand [sandbox/.vscode/settings.json](sandbox/.vscode/settings.json) with the full dev preset. Since VS Code applies workspace settings from `.vscode/settings.json` automatically when the workspace opens, no code changes are needed -- just the JSON file.

**New content for `sandbox/.vscode/settings.json`:**

```json
{
  "cursorDrive.mcp.port": 7891,
  "cursorDrive.defaultSubMode": "agent",
  "cursorDrive.tts.enabled": true,
  "cursorDrive.tts.speed": 1.0,
  "cursorDrive.tts.maxSpokenSentences": 3,
  "cursorDrive.tts.interruptOnInput": true,
  "cursorDrive.voice.autoActivateMicOnToggle": true,
  "cursorDrive.voice.chatOpenCommand": "workbench.action.chat.open",
  "cursorDrive.voice.micCommand": "workbench.action.chat.voice.start",
  "cursorDrive.wakeWord": "hey drive",
  "cursorDrive.submitWord": "send it",
  "cursorDrive.promptOptimizer.enabled": true,
  "cursorDrive.promptOptimizer.autoApprove": true,
  "cursorDrive.agentScreen.enabled": true,
  "cursorDrive.agentScreen.autoOpen": true,
  "cursorDrive.operators.maxConcurrent": 3,
  "cursorDrive.operators.defaultPermissionPreset": "standard"
}
```

Key dev-specific overrides vs production defaults:

- `tts.enabled: true` (prod default: false)
- `voice.autoActivateMicOnToggle: true` (prod default: false)
- `promptOptimizer.autoApprove: true` (prod default: false) -- prevents QuickPick interrupting voice flow
- `agentScreen.autoOpen: true` (prod default: false)

This file is in the sandbox workspace, so it ONLY applies when launching via "Dev: Drive in sandbox" (F5). Production users get the safe defaults from `package.json`.

---

## Files Changed Summary


| File                            | Change                                                                              |
| ------------------------------- | ----------------------------------------------------------------------------------- |
| `src/extension.ts`              | Add `registerMcpViaDeepLink()`, wire chimes into toggle, wire into Drive activation |
| `src/audioFeedback.ts`          | **New** -- hidden WebView audio player, `playChime(count)`                          |
| `src/pipeline.ts`               | Add wake-word acknowledgment (TTS + status bar message), handle empty-after-strip   |
| `sandbox/.vscode/settings.json` | Expand with full dev preset                                                         |
| `package.json`                  | No new config keys needed (existing keys suffice)                                   |
| `tests/`                        | Add `audioFeedback.test.ts`, update `pipeline.test.ts` for wake-word ack            |
