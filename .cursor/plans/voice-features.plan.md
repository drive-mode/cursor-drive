---
planId: voice-features
planType: task
parentPlanId: voice-wake-word
childPlanIds: []
dependsOn: []
name: Voice features (wake, sleep, fallback)
overview: Single plan for wake-word mic trigger, sleep word, configurable wake/sleep phrases, and auto-fallback voice commands.
todos:
  - id: vf-01
    content: "In src/pipeline.ts after TTS and status bar (lines 165-166) in the wake-word block, add void vscode.commands.executeCommand('cursorDrive.activateVoiceInput')."
    status: completed
  - id: vf-02
    content: "In docs/reference/cursor-native-commands.md add note that wake-word detection triggers mic activation for the next turn."
    status: completed
  - id: vf-03
    content: "Run npm run compile and npm test; verify wake-word flow with Drive off then 'hey drive' submission."
    status: completed
  - id: vf-04
    content: Add cursorDrive.sleepWord to package.json; change wakeWord default to "drive mode"
    status: completed
  - id: vf-05
    content: Add sleep-word block in pipeline.ts (read sleepWord, strip phrase, setActive(false), speak, early return)
    status: completed
  - id: vf-06
    content: Add sleepWord to driveSidebar config and webview settings UI
    status: completed
  - id: vf-07
    content: Add wakeWord/sleepWord to sandbox/.vscode/settings.json
    status: cancelled
  - id: vf-08
    content: Update extension.test.ts and add pipeline sleep-word tests
    status: completed
  - id: vf-09
    content: Add cursorDrive.sleepWord to package.json contributes.configuration
    status: completed
  - id: vf-10
    content: In pipeline.ts add sleep-word block after wake-word (read config, strip phrase, setActive(false), speak, return early)
    status: completed
  - id: vf-11
    content: Add sleepWord to driveSidebar config and webview Settings; update config-schema.md
    status: completed
  - id: vf-12
    content: Extend mock config and pipeline tests for sleep word (deactivate, strip, early return; pass-through when text remains)
    status: completed
  - id: vf-13
    content: In voiceCommands.ts always append built-in candidates after user primary/fallbacks in all four execute functions (executeChatOpen, executeMicStart, executeMicStopSubmit, executeMicStopCancel); deduplicate
    status: completed
---

# Voice features (wake, sleep, fallback)

## Wake word mic trigger

When the wake word is detected in submitted text, the pipeline triggers `cursorDrive.activateVoiceInput` so the mic is on for the next utterance — hands-free follow-up without clicking the mic again. Wake word is post-submission (detected in `beforeSubmitPrompt`); there is no live-audio path. See todos vf-01..vf-03 for implementation steps.

## Sleep word and phrases

Configurable sleep word (e.g. "park mode") deactivates Drive via voice; default wake phrase is "drive mode". Both are configurable in package.json and driveSidebar. Pipeline: read sleepWord, strip phrase, setActive(false), speak, early return when no remaining text. See todos vf-04..vf-12 for config, pipeline, sidebar, sandbox, and tests.

## Auto-fallback

Voice command execution should always try built-in fallback candidates (e.g. `composer.toggleVoiceDictation`) after user primary/fallbacks when the primary command fails — no user config required. Apply in all four execute functions in voiceCommands.ts; deduplicate. See todo vf-13.
