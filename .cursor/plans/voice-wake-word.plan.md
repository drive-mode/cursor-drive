---
planId: voice-wake-word
planType: project
isProject: true
parentPlanId: cursor-drive-v1
childPlanIds:
  - voice-features
dependsOn: []
overview: Voice and wake-word features for Cursor Drive. Single child plan voice-features covers wake-word mic trigger, sleep word, configurable phrases, and auto-fallback voice commands.
todos:
  - id: complete-voice-features
    content: Complete voice-features child plan (wake, sleep, fallback)
    status: completed
  - id: sync-with-drive-mode
    content: Ensure voice flow aligns with drive-mode pipeline
    status: completed
---

## Reconciliation

**Verified:**
- voice-features child plan: all 13 TODOs completed or cancelled (vf-07 sandbox cancelled — no sandbox folder; drive-mode-full-build dev-preset owns that)
- Wake word: pipeline.ts activates Drive, strips phrase, TTS "Drive listening", status bar, `cursorDrive.activateVoiceInput` for hands-free follow-up
- Sleep word: pipeline.ts deactivates Drive, strips phrase, TTS "Drive sleeping", early return when empty; pass-through when text remains
- driveSidebar + webview: sleepWord added to config interface, _getState(), Quick Settings UI, saveConfig
- package.json: cursorDrive.sleepWord in contributes.configuration (default "park mode")
- config-schema.md: sleepWord documented; wakeWord default updated to "drive mode"
- voiceCommands.ts: all four execute functions append built-in candidates after user primary/fallbacks with deduplication
- extension.test.ts: mock config includes sleepWord
- pipeline.test.ts: wake-word and sleep-word tests pass (activate, strip, early return, pass-through)
- `npm run compile` exit 0; `npm test` 47/48 suites pass (pluginInstaller timeout is pre-existing)

**Voice flow alignment with drive-mode pipeline:**
- Voice flows through `src/pipeline.ts` — same pipeline as drive-mode-full-build (filler-clean → glossary-expand → sanitize → optimizer → approval-gate → route → model-select)
- Wake/sleep words run before Drive-active gate; drive-mode-next-sprint is archived; active drive-mode plan is drive-mode-full-build
- drive-mode-full-build "wake-ack" todo is satisfied by existing pipeline wake-word block

**Residual risks:**
- pluginInstaller.test.ts timeout (unrelated to voice)
- Manual verification of wake-word flow with Drive off + "drive mode" submission recommended for live testing
