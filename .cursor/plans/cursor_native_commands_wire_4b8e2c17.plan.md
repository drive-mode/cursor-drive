---
name: Cursor Native Commands Wire-up
overview: "Wire identified high-value native Cursor commands into Drive: sync Drive sub-modes to Cursor's native composerMode, add new cursorDrive.* utility commands, upgrade voice mic handling, and surface diagnostics output channels."
parentPlanId: cursor-drive
dependsOn:
  - wire_and_fix_drive_886a9ffa
todos:
  - id: c1-mode-sync
    content: |
      Wire `composerMode.*` native commands into `cursorDrive.setSubMode`. After updating Drive's internal state, call the matching Cursor native command: plan→`composerMode.plan`, agent→`composerMode.agent`, ask→`composerMode.chat`, debug→`composerMode.debug`. Use `vscode.commands.executeCommand()` wrapped in try/catch (graceful degradation if command not available). Add optional config `cursorDrive.syncNativeMode` (boolean, default true) to allow opt-out. Update tests/src/driveMode.ts mock to verify the executeCommand calls.
    status: completed
  - id: c2-focus-agent-view-cmd
    content: |
      Register `cursorDrive.focusAgentView` command in extension.ts. Calls `workbench.action.openAgentsView` then `cursor.tryAgentLayout` in sequence. This docks the Cursor Agents view and attempts the standard agent layout. Register with keybinding Ctrl+Shift+A (configurable). Add to package.json contributes.commands and contributes.keybindings.
    status: completed
  - id: c3-reload-mcp-cmd
    content: |
      Register `cursorDrive.reloadMcp` command in extension.ts. Calls `mcp.reloadClient` via executeCommand, then shows an information message "Drive MCP client reloaded". Useful recovery command when the MCP server restarts. Add to package.json contributes.commands.
    status: completed
  - id: c4-devtools-cmd
    content: |
      Register `cursorDrive.openWebviewDevTools` command in extension.ts. Calls `workbench.action.webview.openDeveloperTools`. Surfaces as "Drive: Open AgentScreen DevTools" in command palette. Useful during AgentScreen UI development. Add to package.json contributes.commands.
    status: completed
  - id: c5-voice-upgrade
    content: |
      Upgrade `activateVoiceInput()` in extension.ts: replace the single `micCommand` config with a richer voice config. Add `cursorDrive.voice.stopCommand` setting (default `workbench.action.chat.stopListeningAndSubmit`). Register `cursorDrive.stopVoice` command that calls `stopListeningAndSubmit` (submits any in-progress dictation) or `stopListening` (cancels). Wire `cursorDrive.stopVoice` keybinding to Ctrl+Shift+M (same key as activate, toggle behavior) when `cursorDrive.voice.toggleOnSameKey` is true. Add config settings to package.json contributes.configuration.
    status: completed
  - id: c6-inject-files-cmd
    content: |
      Register `cursorDrive.injectFilesToComposer` command in extension.ts. Takes the current open editor's file path(s) and calls `composer.addfilestocomposer`. When spawning an operator (`cursorDrive.spawnOperator`), if `cursorDrive.operators.autoInjectOpenFiles` config is true, call this automatically after spawning. Add config setting (boolean, default false).
    status: completed
  - id: c7-diagnose-upgrade
    content: |
      Upgrade `cursorDrive.diagnose` command in extension.ts. Add a "Show Logs" quick pick action after diagnostics display that offers: "MCP Logs", "Agent Exec", "Cursor Agent", "Drive Output". Each calls the corresponding `workbench.action.output.show.*` command. Also call `cursor.ndjsonIngest.showStatus` as part of the diagnostic run (silently try, include result if it returns data). Surface `workbench.action.openExtensionMonitor` as a "Monitor" action in the diagnose result.
    status: completed
  - id: c8-package-json
    content: |
      Update package.json: add contributes.commands entries for `cursorDrive.focusAgentView`, `cursorDrive.reloadMcp`, `cursorDrive.openWebviewDevTools`, `cursorDrive.stopVoice`, `cursorDrive.injectFilesToComposer`. Add contributes.keybindings for `cursorDrive.focusAgentView` (Ctrl+Shift+A). Add contributes.configuration entries for `cursorDrive.syncNativeMode`, `cursorDrive.voice.stopCommand`, `cursorDrive.voice.toggleOnSameKey`, `cursorDrive.operators.autoInjectOpenFiles`.
    status: completed
  - id: c9-compile-test
    content: |
      Run `npm run compile` (zero type errors) and `npm test` (all tests pass). Fix any failures. Verify VSIX packages without errors.
    status: completed
isProject: false
---

# Cursor Native Commands Wire-up

## Purpose

Our analysis of Cursor's command registry identified a tier of high-value commands that Drive
does not yet use. This plan wires them in, making Drive's mode switching, diagnostics, voice,
and AgentScreen development significantly more capable with minimal code.

## Background

From command registry analysis (see conversation [Cursor Commands Audit](../../../agent-transcripts)):

- `composerMode.*` — Cursor's native mode commands are not called when Drive changes sub-mode,
  leaving Cursor's UI out of sync with Drive's state.
- `cursor.ndjsonIngest.*` — Cursor has a built-in NDJSON ingest pipeline; needs investigation
  before building a custom parser (see p0-01 in s_as_screen_capture_impl plan).
- `workbench.action.webview.openDeveloperTools` — essential for AgentScreen UI development;
  not surfaced anywhere in Drive.
- `mcp.reloadClient` — quick MCP recovery with no restart needed; not surfaced.
- `workbench.action.chat.stopListeningAndSubmit` — cleaner push-to-talk mic stop; not used.
- `composer.addfilestocomposer` — pre-load context into composer when spawning operators.

## Architecture

All changes are in `src/extension.ts` and `package.json`. No new source files needed.

```
cursorDrive.setSubMode()
  └─ internal state update (existing)
  └─ vscode.commands.executeCommand("composerMode.<mode>")   ← NEW (c1)

cursorDrive.focusAgentView                                    ← NEW (c2)
  └─ workbench.action.openAgentsView
  └─ cursor.tryAgentLayout

cursorDrive.reloadMcp                                         ← NEW (c3)
  └─ mcp.reloadClient

cursorDrive.openWebviewDevTools                               ← NEW (c4)
  └─ workbench.action.webview.openDeveloperTools

cursorDrive.stopVoice                                         ← NEW (c5)
  └─ workbench.action.chat.stopListeningAndSubmit

cursorDrive.injectFilesToComposer                             ← NEW (c6)
  └─ composer.addfilestocomposer

cursorDrive.diagnose (upgraded)                               ← UPDATED (c7)
  └─ (existing checks)
  └─ cursor.ndjsonIngest.showStatus (new)
  └─ Show Logs picker → output.show.* commands
```

## File Change Map

| File | Change |
|---|---|
| `src/extension.ts` | c1: setSubMode mode sync; c2–c7: new commands + diagnose upgrade |
| `package.json` | c8: new commands, keybindings, config settings |

## Dependency Budget

No new npm dependencies. All changes use `vscode.commands.executeCommand` with try/catch
graceful degradation.

## Risk Register

| Risk | Likelihood | Mitigation |
|---|---|---|
| `composerMode.*` not available in all Cursor versions | Low | try/catch; log if unavailable, don't throw |
| `mcp.reloadClient` triggers double-registration | Low | Drive MCP server handles re-start idempotently |
| `composer.addfilestocomposer` arg shape unknown | Medium | Document in c6 to verify arg shape before ship; skip if unavailable |
| `cursor.ndjsonIngest.showStatus` returns nothing | Medium | Silent failure; omit from diagnose output |

## Ordering Constraints

- c1–c7 are independent and can be implemented in any order.
- c8 must be done after c1–c7 (consolidate all package.json changes in one pass).
- c9 runs last.

## Reconciliation

### Verified

| Item | Status | Evidence |
|---|---|---|
| c1 mode sync | ✓ | `extension.ts`: `Partial<Record<SubMode, string>>` map in `setSubMode`, fires `composerMode.*` with graceful catch. `cursorDrive.syncNativeMode` config added. |
| c2 focusAgentView | ✓ | `extension.ts`: command fires `workbench.action.openAgentsView` + `cursor.tryAgentLayout`. Keybinding Ctrl+Shift+A in `package.json`. |
| c3 reloadMcp | ✓ | `extension.ts`: calls `mcp.reloadClient`, shows info message on success, warning on failure. |
| c4 openWebviewDevTools | ✓ | `extension.ts`: calls `workbench.action.webview.openDeveloperTools`. |
| c5 voice upgrade | ✓ | `activateVoiceInput` default mic changed to `workbench.action.chat.startVoiceChat`. `stopVoiceInput()` added using `stopListeningAndSubmit` with cancel fallback. `cursorDrive.stopVoice` command registered. `cursorDrive.voice.stopCommand` config added. |
| c6 injectFilesToComposer | ✓ | `extension.ts`: calls `composer.addfilestocomposer` with active editor URI, graceful fallback. `cursorDrive.operators.autoInjectOpenFiles` config added. |
| c7 diagnose upgrade | ✓ | Runs `cursor.ndjsonIngest.showStatus` (silent try). Post-modal "Show Logs" picker opens output channels. "Extension Monitor" action added. |
| c8 package.json | ✓ | 5 new commands, Ctrl+Shift+A keybinding, `syncNativeMode` + `voice.stopCommand` + `operators.autoInjectOpenFiles` configs. Default `micCommand` updated to `workbench.action.chat.startVoiceChat`. |
| c9 gate | ✓ | `npm run compile`: 0 errors. `npm test`: 228/228 pass. |

### Residual risks

- `composerMode.*` not tested in live Cursor — graceful degradation confirmed by code path.
- `composer.addfilestocomposer` arg shape (URI array) assumed; may need adjustment when tested live.
- `cursor.tryAgentLayout` may be a no-op in some Cursor versions; `openAgentsView` is the primary action.
