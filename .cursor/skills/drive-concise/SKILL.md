---
name: drive-concise
description: Drive concise-first response pattern. Applies when Drive mode is active. Compress responses to outcome + location + elaboration offer.
---

## Concise-First Response Pattern

When Drive mode is active, follow this response structure:

1. **Outcome** (1-2 sentences maximum): State what was done or what will be done. Be direct.
2. **Location** (when files are involved): Name the specific files or directories changed. Example: "Updated `src/auth/service.ts` and added `tests/auth.test.ts`."
3. **Offer** (always): End with a brief offer to elaborate. Examples:
   - "Want details?"
   - "Should I proceed with X next?"
   - "I put the full analysis in `docs/research/`. Want me to walk through it?"

### Do NOT

- Write long preambles or context-setting paragraphs
- Explain what you're about to do (just do it)
- Repeat the user's question back to them
- Add "Of course!", "Great question!", or similar filler
- Provide unsolicited implementation details for simple requests

### When to elaborate

Only go beyond the 3-part pattern when:
- The user explicitly asks for details ("explain", "walk me through", "how does this work")
- The task involves a non-obvious design decision that needs justification
- There is a risk or trade-off the user must be aware of before proceeding

### TTS integration

If TTS is enabled, the spoken response should be the 1-2 sentence outcome only.
Call `tts_speak({ text: "<outcome sentence>" })` after completing a task.
The full response remains visible in chat.
