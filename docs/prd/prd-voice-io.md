# PRD 1: Voice I/O

## Problem

Cursor provides hold-to-speak STT for input, but raw transcription is noisy (filler words, repetitions, hedging) and there is no speech output. Users who want a pair-programming "call" experience cannot hear the AI respond or clean up messy voice input before it burns tokens.

Drive needs a full voice pipeline: clean input in, spoken output out, with strict user control.

## Solution

A two-sided voice pipeline inside the Drive extension:

**Input side** (already partially built):
1. Cursor's hold-to-speak STT delivers raw text
2. Filler cleaner strips noise (client-side, zero cost)
3. Glossary expander maps voice shortcuts to intents
4. Sanitizer truncates and strips injection sequences
5. Prompt optimizer refines via cheap model call, user approves via QuickPick

**Output side** (new):
1. Model response passes through a response formatter (see PRD 2)
2. Formatted text is sent to a pluggable TTS engine
3. TTS speaks the response; user can interrupt at any time
4. TTS backend is configurable: Web Speech API, Piper, or ElevenLabs

```
User speaks --> Cursor STT --> raw text
  --> fillerCleaner --> glossaryExpander --> sanitizer --> promptOptimizer
  --> [routed to agent]
  --> model response --> responseFormatter --> TTS engine --> user hears
```

## User Stories

- As a user, I want my "uhh like maybe add tests" cleaned to "add tests" before the model sees it, so I don't waste tokens on filler.
- As a user, I want to hear the agent's response spoken aloud so I can keep my eyes on the code.
- As a user, I want to choose which voice the agent uses and how fast it speaks.
- As a user, I want to interrupt the agent mid-speech by starting to talk or type.
- As a user, I want TTS to be completely off by default until I opt in.
- As a user, I want a wake word ("hey drive") that activates drive mode hands-free.
- As a user, I want a submit word ("send it", "go") that confirms my prompt without clicking.

## Phased Milestones

### P0: Core pipeline + Web Speech TTS

- Port existing `fillerCleaner.ts` and `promptOptimizer.ts` into new repo structure
- Fix promptOptimizer approval stub: real `vscode.window.showQuickPick` with Use optimized / Use original / Edit options
- Add glossary expander module (user-configurable phrase-to-intent map)
- Add sanitizer (truncation + injection stripping)
- Implement TTS engine abstraction with Web Speech API backend
  - Web Speech API runs in a hidden webview (Cursor's extension host doesn't expose `speechSynthesis` directly; a webview does)
  - Extension host sends text to webview via `postMessage`; webview calls `speechSynthesis.speak()`
  - 5-15 voices available depending on OS (Windows SAPI, macOS AVSpeechSynthesizer, Linux espeak)
- Implement interrupt: cancel current utterance when user sends a new message or presses a key
- Add wake word detection (configurable activation phrase parsed from prompt start); on detection, activate mic for next utterance
- Add submit word detection (configurable confirmation phrase)
- Config: `tts.enabled` (default `false`), `tts.backend` (default `"webSpeech"`), `tts.voiceId`, `tts.speed`

### P1: Piper TTS (free, better quality)

- Bundle or auto-download Piper TTS binary + a default voice model (~50MB)
- Spawn Piper as a child process; pipe text in, get PCM audio out
- Play audio via the webview's `AudioContext`
- Support 10+ voice models (download on demand, cache locally)
- Add accent/language configuration per voice slot
- Config: `tts.piper.modelPath`, `tts.piper.voiceModels` (array of up to 10)

### P2: ElevenLabs API (premium quality)

- HTTP client calling ElevenLabs streaming TTS API (adapted from OpenClaw patterns, MIT licensed)
- User provides API key in settings (stored in secret storage, never logged)
- Configurable voice ID, model ID, output format
- Streaming: audio chunks play as they arrive (low latency)
- Optional OpenClaw bridge: if OpenClaw gateway is detected on `localhost:18789`, delegate TTS to it instead of calling ElevenLabs directly
- Config: `tts.elevenlabs.apiKey`, `tts.elevenlabs.voiceId`, `tts.elevenlabs.modelId`

## Technical Constraints

- **No native audio API in VS Code extensions.** TTS playback happens in a webview via Web Audio API / `speechSynthesis`. Extension host communicates with webview via `postMessage`.
- **Cursor's STT is not extensible.** Cannot replace or intercept hold-to-speak. Extension receives final transcription text only.
- **Piper TTS is a native binary.** Requires platform-specific builds (Windows, macOS, Linux). Use `process.platform` to pick the right binary. Consider optional install step.
- **ElevenLabs requires an API key.** Use `vscode.SecretStorage`. Never log it. Show setup prompt when user selects ElevenLabs but hasn't provided a key.
- **Node 22 is available** in the Cursor extension host (VS Code 1.101+ ships Node 22).

## Config Schema

| Setting | Type | Default | Description |
|---|---|---|---|
| `cursorDrive.tts.enabled` | boolean | `false` | Enable text-to-speech output |
| `cursorDrive.tts.backend` | enum: `webSpeech`, `piper`, `elevenLabs` | `"webSpeech"` | TTS engine to use |
| `cursorDrive.tts.voiceId` | string | `""` | Voice identifier (OS voice name, Piper model, or ElevenLabs voice ID) |
| `cursorDrive.tts.speed` | number | `1.0` | Speech rate multiplier (0.5 - 2.0) |
| `cursorDrive.tts.maxSpokenSentences` | number | `3` | Max sentences to speak per response (rest available in chat) |
| `cursorDrive.tts.interruptOnInput` | boolean | `true` | Stop speaking when user starts typing or talking |
| `cursorDrive.tts.voices` | array | `[]` | Up to 10 named voice slots with voiceId, accent, language |
| `cursorDrive.wakeWord` | string | `"hey drive"` | Phrase that activates Drive mode hands-free |
| `cursorDrive.submitWord` | string | `"send it"` | Phrase that confirms/submits the current prompt |
| `cursorDrive.tts.piper.modelPath` | string | `""` | Path to Piper TTS binary (auto-detected if empty) |
| `cursorDrive.tts.elevenlabs.voiceId` | string | `""` | ElevenLabs voice ID |
| `cursorDrive.tts.elevenlabs.modelId` | string | `"eleven_v3"` | ElevenLabs model ID |

## Acceptance Criteria

- [ ] Filler cleaner removes "uhh", "like", "kinda", repetitions from voice input
- [ ] Prompt optimizer shows QuickPick with 3 options; "Edit" opens pre-filled input box
- [ ] Glossary expander maps configurable phrases to intents/commands/mode switches
- [ ] Sanitizer truncates prompts exceeding `maxPromptLength` and strips injection patterns
- [ ] Web Speech TTS speaks agent responses when enabled
- [ ] TTS stops immediately when user sends a new message
- [ ] Wake word activates Drive mode without clicking
- [ ] Submit word confirms prompt without clicking
- [ ] All TTS settings are configurable and default to off/safe values

## Future Vision

- Real-time voice conversation mode (full duplex: user speaks while agent responds)
- Voice emotion detection to adjust agent tone
- Whisper-based local STT as alternative to Cursor's built-in (for offline use)
- Voice cloning for personalized agent voices
- Integration with system-level accessibility speech services

## Cross-References

- [PRD 2: Session + Persona](prd-session-persona.md) -- response formatter feeds TTS
- [PRD 3: Multi-Agent](prd-multi-agent.md) -- each agent gets a distinct voice
- [PRD 4: Safety + Config](prd-safety-config.md) -- TTS settings schema, API key storage
- [PRD 5: Cursor Integration](prd-cursor-integration.md) -- TTS webview panel architecture
