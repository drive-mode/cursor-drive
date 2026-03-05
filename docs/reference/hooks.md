# Cursor Hooks Reference

Drive uses Cursor's `beforeSubmitPrompt` hook as the primary pipeline entry when Drive is active. This document describes the hook contract, capabilities, and the boundary between hooks and the extension.

## Hook Contract

### Registration

Hooks are registered in `.cursor/hooks.json`:

```json
{
  "version": 1,
  "hooks": {
    "beforeSubmitPrompt": [
      { "command": "python .cursor/hooks/drive-preprocessor.py beforeSubmitPrompt" },
      { "command": "python .cursor/hooks/plan-runner.py beforeSubmitPrompt" }
    ]
  }
}
```

### Input

- **argv**: Event name (e.g. `beforeSubmitPrompt`) as first argument.
- **stdin**: JSON object when Cursor provides it:
  ```json
  { "prompt": "user's raw prompt text", "context": { ... } }
  ```
  If stdin is empty or invalid, the hook may receive raw text.

### Output

- **stdout**: JSON object. Format depends on Cursor's expected contract (see ADR-0009).
- **Current drive-preprocessor format**: `{ "decision": "allow", "message": "...", "details": { ... } }`
- **Modification format** (per ADR-0009): Same structure as input, with optional `prompt` and/or `context` modifications.

## Capabilities

| Capability | Supported | Notes |
|------------|-----------|-------|
| **Modify prompt text** | Yes (per ADR) | Hooks receive prompt via stdin; can emit modified prompt via stdout. Cursor applies the modified prompt. |
| **Add context only** | Yes | Hooks can emit JSON with `context` additions without changing the prompt text. |
| **Read workspace state** | Yes | Hooks run in workspace context; can read files, `.cursor/` config, env vars. |
| **Block submission** | No | Hooks cannot prevent the prompt from being submitted. Use extension-side approval gates for blocking. |

### Current Implementation

The `drive-preprocessor.py` hook currently **adds context only** — it does not modify the prompt text. It emits `decision: "allow"` with optional `details` (e.g. `drive_cleaned_prompt`, `drive_mode_hint`, `drive_hint`). This is a conservative implementation; prompt modification can be added when the full hook→extension handoff is wired.

## Edge Cases

### Drive Inactive

- Cursor invokes all registered `beforeSubmitPrompt` hooks regardless of Drive state.
- Drive hooks must detect inactive state and pass through unchanged (no-op).
- Detection: `DRIVE_ACTIVE` env var or workspace state file (e.g. `.cursor/drive-state.json`); hooks check before processing.
- When Drive is inactive, the hook emits `allow` with no `details` and does not add context.

### Hook Failure

- If a hook exits non-zero or emits invalid JSON, Cursor's behavior is host-dependent.
- Drive hooks should catch exceptions and emit a safe `allow` pass-through to avoid breaking the submission flow.

### Empty Prompt

- When `prompt` is empty or missing, the hook should emit `allow` and pass through immediately.

## Hook / Extension Boundary

| Responsibility | Layer | Rationale |
|----------------|-------|-----------|
| Filler analysis, mode hints, tangent detection | Python hook | Fast, no extension host; runs before prompt reaches Cursor. |
| Prompt modification (rewrite, sanitize) | Python hook or extension | Per ADR-0009, hooks can modify stdin→stdout. Extension pipeline can be invoked by hook via HTTP bridge. |
| Drive active check, routing decision | Extension | Drive state lives in `workspaceState`; extension has authoritative state. |
| Approval gates (block dangerous ops) | Extension | Requires VS Code APIs for dialogs; runs in extension host. |
| TTS, Agent Screen, status bar | Extension | Requires VS Code APIs; MCP server bridges AI to extension. |

### Handoff

- **Current**: Python hook adds context (cleaned prompt preview, mode hints, tangent hints). The TypeScript pipeline (`runPipeline`) runs in the extension when invoked (e.g. via MCP tool `drive_run_pipeline` or future HTTP `/pipeline` endpoint for hook→extension).
- **Future**: Hook can call `http://127.0.0.1:<mcpPort>/pipeline` with `{ prompt, driveActive }` to run the full TypeScript pipeline and receive `{ prompt, route, model }` for emission. This keeps prompt transforms in one place (TypeScript) while the hook remains the interception point.

## References

- [ADR-0009: Hook-Based Prompt Interception](../architecture/adr/ADR-0009-hook-based-prompt-interception.md)
- `.cursor/hooks/drive-preprocessor.py` — filler, mode hints, tangent detection
- `.cursor/hooks/plan-runner.py` — plan reminders, sync
- `docs/design/architecture/prompt-pipeline-design.md` — pipeline stages and flow
