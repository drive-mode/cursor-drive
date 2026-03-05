# ADR-0008: Drive Mode Wrapper Architecture

## Status
Accepted

## Metadata
- Date: 2026-02-23
- Deciders: Cursor Drive maintainers
- Supersedes: none
- Superseded by: none
- Related: ADR-0009 (hook-based prompt interception), ADR-0011 (native mode compatibility)

## Context

Cursor Drive adds a voice-first AI pair-programming layer to Cursor IDE. The original design assumed an `@drive` ChatParticipant as the primary UX entry point. Cursor does not support `vscode.chat.createChatParticipant`. Drive must integrate without a custom chat participant.

How should Drive integrate with Cursor's native modes (Agent, Plan, Ask, Debug)?

## Decision

Drive is a **behavioral toggle/wrapper** around Cursor's native modes. It does not replace them; it layers behavior on top.

1. **What wrapping means**: When Drive is active, prompts pass through Drive's pipeline (filler cleaning, optimization, routing) before reaching the native mode. Drive injects persona, rules, and context. The user still interacts with Agent/Plan/Ask/Debug — Drive shapes *how* those modes behave.
2. **Primary pipeline entry**: The `beforeSubmitPrompt` hook is the primary pipeline entry when Drive is active. Hooks run on every prompt submission; Drive's hooks (drive-preprocessor.py, plan-runner.py) run first.
3. **@drive participant**: May exist as a dormant fallback only — never primary UX. If Cursor adds participant API support in future, Drive could optionally register `@drive` for discoverability, but the hook remains the canonical entry.
4. **Extension points**: Drive can modify prompt text, inject context, and influence routing via hooks; it cannot replace Cursor's mode selection UI or chat rendering.

## Mode-Wrapper Contract

| Aspect | Drive's role |
|--------|--------------|
| Mode selection | User selects Agent/Plan/Ask/Debug; Drive respects that choice |
| Prompt interception | `beforeSubmitPrompt` runs before the prompt reaches the model |
| Persona injection | Drive persona (skills, rules) is applied when Drive is active |
| Status bar | Drive status bar shows `Drive > [SubMode]` when active |
| MCP tools | Drive MCP server at `:7891` provides TTS, ShareScreen, mode changes |

## Invariants

1. Drive does not create a parallel chat surface. It augments the existing Cursor chat.
2. `beforeSubmitPrompt` is the single point of pipeline entry when Drive is active.
3. Drive sub-modes map 1:1 to Cursor native modes (see ADR-0011).
4. When Drive is inactive, prompts bypass Drive entirely; Cursor behaves as if Drive were not installed.

## Consequences

**Positive**: No dependency on unsupported ChatParticipant API; works with Cursor's current architecture; clear separation between Drive layer and native modes.

**Negative**: Drive cannot surface as a distinct chat participant; discoverability relies on status bar, commands, and keybindings.

## References

- ADR-0009: Hook-based prompt interception
- ADR-0011: Native mode compatibility
- `.cursor/hooks/drive-preprocessor.py` — pipeline entry
- `.cursor/rules/vision-invariants.mdc` — codified invariants
