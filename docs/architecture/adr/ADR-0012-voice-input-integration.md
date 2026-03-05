# ADR-0012: Voice Input Integration

## Status
Accepted

## Metadata
- Date: 2026-02-23
- Deciders: Cursor Drive maintainers
- Supersedes: none
- Superseded by: none
- Related: PRD 1 (Voice I/O), ADR-0008 (mode wrapper)

## Context

Drive is voice-first. How should mic activation, wake words, and the voice→text→prompt pipeline work?

## Decision

### Mic Button: Mute/Unmute for Continuous Listening

The mic button is **mute/unmute** for continuous listening. When unmuted, the system listens continuously; when muted, it stops. There is no "push-to-talk" as the default — continuous listening is the primary model.

| State | Behavior |
|-------|----------|
| Unmuted | STT active; speech is transcribed and buffered |
| Muted | STT paused; no transcription |

### Wake Word: Optional, Not Required

A wake word (e.g., "Drive", "Cursor") is **optional**. It is not required for activation. Users can:
- Activate Drive via status bar toggle or keybinding (Ctrl+Shift+D)
- Use a wake word to activate if configured — but it is an enhancement, not a gate

Activation does not depend on saying a wake word. The primary activation is the Drive mode toggle.

### TTS: Speaks AI Responses

TTS speaks AI responses when Drive is active and TTS is enabled. Integration points:
- MCP tool `tts_speak` — AI calls this to speak text
- Extension `src/tts.ts` — OS-native speech (e.g., via say.js)
- Voice interrupt: user typing while TTS is speaking → call `tts_stop`

### Pipeline: Filler-Clean → Glossary → Sanitize → Optimize

The voice→prompt pipeline order:

1. **Filler clean** — Remove "um", "uh", "like" etc. (client-side, free)
2. **Glossary expand** — Map voice shortcuts to intents (user-configurable phrase-to-intent)
3. **Sanitize** — Truncate, strip injection patterns
4. **Optimize** — Routing-tier model rewrite for clarity (conditional, user approval)

Pipeline runs in `beforeSubmitPrompt` when Drive is active. See ADR-0009 for hook contract.

## Implementation Map

| Component | File | Responsibility |
|-----------|------|----------------|
| Filler cleaner | `src/fillerCleaner.ts` | Remove filler words |
| Glossary expander | `src/glossaryExpander.ts` | Voice shortcut → intent mapping |
| Sanitizer | `src/sanitizer.ts` | Truncation, injection stripping |
| Prompt optimizer | `src/promptOptimizer.ts` | AI rewrite (Tier 1) |
| TTS | `src/tts.ts` | OS-native speech |
| MCP tts_speak | `src/mcpServer.ts` | Bridge AI → TTS |

## Consequences

**Positive**: Simple mic model; no wake-word dependency; clear pipeline stages.

**Negative**: Continuous listening may raise privacy concerns; strict default (ADR-0005) mitigates.

## References

- ADR-0005: Privacy strict default
- ADR-0009: Hook-based prompt interception
- `docs/prd/prd-voice-io.md` — Voice I/O PRD
