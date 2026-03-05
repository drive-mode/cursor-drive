# Commands and Shortcuts Reference

All VS Code commands and keybindings contributed by Cursor Drive.

Source: `package.json` → `contributes.commands` and `contributes.keybindings`.

---

## Commands

All commands use the `Drive` category. Open with `Ctrl+Shift+P` → type "Drive".

| Command ID | Title | Description |
|---|---|---|
| `cursorDrive.toggle` | Toggle Drive Mode | Activate/deactivate Drive mode. Applies `defaultSubMode` on activation. |
| `cursorDrive.setSubMode` | Set Drive Mode | Opens QuickPick with Plan / Agent / Ask / Direct / Off. Activates Drive if selecting a mode. |
| `cursorDrive.exit` | Exit Drive Mode | Deactivate Drive mode. Shows info notification. |
| `cursorDrive.showAgentScreen` | Show Agent Screen | Open the Agent Screen (S-AS) panel beside the editor. |
| `cursorDrive.clearAgentScreen` | Clear Agent Screen | Clear all entries in the Agent Screen panel. |
| `cursorDrive.speak` | Test TTS Speak | Speak a test phrase via TTS (if enabled). |
| `cursorDrive.stopSpeaking` | Stop Speaking | Stop any ongoing TTS speech. |
| `cursorDrive.operators` | Manage Operators | Open QuickPick to view, switch, or spawn operators. |
| `cursorDrive.spawnOperator` | Spawn New Operator | Input box to name and describe a new operator task. |
| `cursorDrive.processInput` | (internal) | Run the full input pipeline: filler clean → glossary → sanitize → approval gate. |
| `cursorDrive.diagnose` | Diagnose Drive APIs | Show a modal with current Drive state: LM models, MCP port, active mode. |
| `cursorDrive.clearMemory` | (internal) | Clear the current session memory. |

---

## Keybindings

| Keybinding (Win/Linux) | macOS | Command | When |
|---|---|---|---|
| `Ctrl+Shift+D` | `Cmd+Shift+D` | `cursorDrive.toggle` | `editorTextFocus \|\| terminalFocus` |
| `Ctrl+Shift+S` | `Cmd+Shift+S` | `cursorDrive.showAgentScreen` | `editorTextFocus \|\| terminalFocus` |

---

## Plugin slash commands

These commands are registered via `.cursor/commands/` and appear in the Cursor chat `/` menu.

| Command | Description |
|---|---|
| `/tangent [task]` | Spawn a parallel operator for the given task |
| `/switch [name]` | Switch the foreground operator |
| `/merge [source] into [target]` | Merge one operator's context into another |
| `/brainstorm` | Invoke the brainstorming skill |
| `/execute-plan` | Invoke the execute-plan skill |
| `/write-plan` | Invoke the write-plan skill |
| `/plan-start` | Start a plan (validates dependencies) |
| `/plan-next` | Select the next executable plan TODO |
| `/plan-split` | Split a plan into child plans |
| `/plan-complete` | Run completion checklist for a plan |
| `/update-docs` | Update docs after source changes |
| `/doc-review` | Run a staleness check on docs/ |

---

## Status bar

The status bar item (left side) shows:
- `$(circle-slash) Drive` — inactive
- `$(play-circle) Drive > Agent | Alpha` — active, Agent sub-mode (Cursor native), foreground operator is Alpha

Click the status bar item to open the Set Drive Mode QuickPick.
