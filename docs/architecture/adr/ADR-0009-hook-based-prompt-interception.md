# ADR-0009: Hook-Based Prompt Interception

## Status
Accepted

## Metadata
- Date: 2026-02-23
- Deciders: Cursor Drive maintainers
- Supersedes: ADR-0001 (ingress strategy)
- Superseded by: none
- Related: ADR-0008 (mode wrapper), ADR-0011 (native mode compatibility)

## Context

Drive needs to intercept every prompt when Drive is active — for filler cleaning, optimization, routing, and context injection. Cursor provides a `beforeSubmitPrompt` hook. What can hooks do, and where does the extension boundary lie?

## Decision

The `beforeSubmitPrompt` hook intercepts every prompt when Drive is active. Hooks run in the Cursor plugin layer (`.cursor/hooks/`); the extension (TypeScript) handles UI and MCP.

### Hook Capabilities

| Capability | Supported | Notes |
|------------|-----------|-------|
| **Modify prompt text** | Yes | Hooks receive prompt via stdin; can emit modified prompt via stdout. Cursor applies the modified prompt. |
| **Add context only** | Yes | Hooks can emit JSON with `context` additions without changing the prompt text. |
| **Read workspace state** | Yes | Hooks run in workspace context; can read files, `.cursor/` config, env vars. |
| **Block submission** | No | Hooks cannot prevent the prompt from being submitted. Use extension-side approval gates for blocking. |

### Python Hook vs Extension Boundary

| Responsibility | Layer | Rationale |
|----------------|-------|-----------|
| Filler cleaning, mode hints, plan reminders | Python hooks | Fast, no extension host; runs before prompt reaches Cursor. |
| Prompt modification (rewrite, sanitize) | Python hooks | Hooks can modify stdin→stdout; extension cannot intercept at this point. |
| Drive active check, routing decision | Extension or hook | Drive state lives in `workspaceState`; hooks can read it via env or a small bridge. |
| TTS, ShareScreen, status bar | Extension | Requires VS Code APIs; MCP server bridges AI to extension. |
| Approval gates (block dangerous ops) | Extension | Must run in extension host to access full context; can be triggered by hook output. |

### Fallback When Drive Inactive

When Drive is inactive:
- Hooks still run (Cursor invokes all registered `beforeSubmitPrompt` hooks).
- Drive hooks must detect inactive state and pass through unchanged (no-op).
- Detection: `DRIVE_ACTIVE` env var or workspace state file; hooks check before processing.

## Implementation Notes

- `.cursor/hooks.json` registers `drive-preprocessor.py` and `plan-runner.py` for `beforeSubmitPrompt`.
- Hook contract: stdin = `{"prompt": "...", "context": {...}}`; stdout = same structure, possibly with modified `prompt` and/or augmented `context`.
- Extension cannot directly call hooks; Cursor invokes them. Extension and hooks communicate via workspace state, env, or MCP.

## Consequences

**Positive**: Single interception point; hooks run on every prompt; no extension host dependency for lightweight processing.

**Negative**: Hook capabilities are constrained by Cursor's contract; complex logic may need to move to extension with a different trigger.

## References

- ADR-0008: Drive mode wrapper architecture
- `.cursor/hooks/drive-preprocessor.py` — filler, mode hints
- `.cursor/hooks/plan-runner.py` — plan reminders, sync
- `.cursor/hooks.json` — hook registration
