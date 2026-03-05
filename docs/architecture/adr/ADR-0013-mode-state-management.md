# ADR-0013: Mode State Management

## Status
Accepted

## Metadata
- Date: 2026-02-23
- Deciders: Cursor Drive maintainers
- Supersedes: none
- Superseded by: none
- Related: ADR-0008 (mode wrapper), ADR-0011 (native mode compatibility)

## Context

Drive has two state dimensions: whether Drive is active, and which sub-mode is selected. This state must persist across sessions and stay synchronized with Cursor's native mode. How should we manage it?

## Decision

### State Persistence Strategy

Drive state is persisted to **workspaceState** (VS Code `Memento`):

| Key | Type | Default | Purpose |
|-----|------|---------|---------|
| `drive.active` | boolean | false | Whether Drive mode is on |
| `drive.subMode` | string | "agent" | Sub-mode: plan, agent, ask, debug |

Persistence is per-workspace. State survives extension reload and Cursor restart.

### SubMode Maps to Cursor Mode Enum

SubMode values align 1:1 with Cursor native modes (see ADR-0011):

| SubMode | Cursor mode |
|---------|-------------|
| plan | Plan |
| agent | Agent |
| ask | Ask |
| debug | Debug |

The extension synchronizes `drive.subMode` with the user's Cursor mode selection when Drive is active. If the user switches mode in Cursor's UI, Drive updates its subMode to match.

### Status Bar Reflects Actual Drive + Native Mode

The status bar shows `Drive > [SubMode]` when Drive is active, and hides or shows a minimal indicator when inactive. The displayed subMode is the actual persisted value — no stale display.

### Synchronization Model

1. **User toggles Drive on** → `drive.active = true`; subMode from config `defaultSubMode` or last used.
2. **User switches Cursor mode** → Extension listens for mode change; updates `drive.subMode` to match.
3. **User toggles Drive off** → `drive.active = false`; subMode is retained for next activation.
4. **Hooks read state** → Hooks can infer Drive active via env var or a small state file written by the extension on change.

### What Happens on Deactivation

When Drive is deactivated:
- `drive.active` is set to false
- SubMode is **not** cleared — it is retained for next activation
- Hooks receive inactive signal and pass through prompts unchanged
- Status bar hides Drive indicator or shows "Drive off"
- MCP server remains running (it serves other purposes); TTS/ShareScreen calls are no-ops when Drive inactive if desired, or can remain available

## State Machine (Simplified)

```
[Drive off] --toggle--> [Drive on, subMode=X]
[Drive on]  --toggle--> [Drive off]
[Drive on, subMode=X] --user switches Cursor mode--> [Drive on, subMode=Y]
```

## Implementation

- `src/driveMode.ts` — DriveModeManager, workspaceState keys
- `src/statusBar.ts` — Status bar updates on `onDidChange`
- Sync with Cursor mode: extension subscribes to Cursor mode change events (when available) or infers from context

## Consequences

**Positive**: Simple persistence; survives restarts; status bar is source of truth for user.

**Negative**: WorkspaceState is workspace-scoped; no global "Drive on everywhere" without additional logic.

## References

- ADR-0008: Drive mode wrapper architecture
- ADR-0011: Native mode compatibility
- `src/driveMode.ts` — implementation
