# PRD 5: Cursor Integration

## Problem

Cursor IDE has four built-in modes (Ask, Agent, Plan, Debug), a chat panel, a status bar, keyboard shortcuts, and a theming system. Extensions that add AI capabilities must feel native to Cursor, not bolted-on with separate UI language.

Drive introduces several new surfaces (multi-agent chat, share-screen, voice output, agent switching) that must blend into Cursor's existing UI patterns.

Specific integration challenges:
- Drive wraps Cursor's modes (Drive-Ask, Drive-Agent, etc.) but the Chat Participant API gives us one participant, not mode registration
- Share-screen needs a panel that shows agent work in real time, with interactive elements
- Multiple agents need visual differentiation that works in both dark and light themes
- Agent attribution needs to flow through to git blame and change tracking

## Solution

Drive integrates into Cursor through four UI surfaces:

1. **Drive mode toggle** -- status bar + Ctrl+Shift+D. When active, `beforeSubmitPrompt` hook routes prompts through the Drive pipeline. No `@drive` chat participant as primary entry.
2. **Status bar** -- shows `Drive > [Mode] | [AgentName]` with theme-aware styling. Click to switch mode or agent.
3. **Share-screen webview panel** -- a `WebviewPanel` in the editor area showing the active agent's research trail, file activity, and thought process.
4. **Agent switcher** -- a QuickPick for managing agents (switch, spawn, pause, dismiss).

All colors use VS Code theme tokens. No hardcoded hex values anywhere.

```
Cursor UI layout with Drive:

+---------------------------------------------------+
| Status Bar: Drive > Agent | Alpha            [mic] |
+---------------------------------------------------+
| Editor Area          | Share-Screen Panel          |
|                      |                             |
| (user's files)       | Alpha's research trail:     |
|                      |  - Reading src/auth.ts      |
|                      |  - Found 3 issues           |
|                      |  - Diagram: auth flow       |
|                      |                             |
|                      | [click file to open]        |
+---------------------------------------------------+
| Chat Panel                                         |
|                                                    |
| [Alpha] Refactored auth. 3 files changed.          |
| Want details?                                      |
|                                                    |
| [Beta] Rate limiting research done.                |
| Wrote findings to docs/research/rate-limiting.md   |
|                                                    |
| > User: show me beta                               |
+---------------------------------------------------+
```

## User Stories

- As a user, I want Drive to feel like a native Cursor feature, not a third-party plugin.
- As a user, I want to see which Drive mode and agent I'm in from the status bar at a glance.
- As a user, I want to click the status bar to switch modes or agents without typing commands.
- As a user, I want a share-screen panel showing what my agent is doing in real time.
- As a user, I want to click a file in the share-screen to open it in my editor.
- As a user, I want agent messages visually differentiated in a way that works in dark and light themes.
- As a user, I want git blame to show which agent made a change.
- As a user, I want Ctrl+Shift+D to toggle Drive mode, with configurable additional shortcuts.
- As a user, I want the share-screen to show diagrams when the agent is doing complex parallel work.

## Phased Milestones

### P0: Meta-layer mode wrapping + status bar + beforeSubmitPrompt

- Implement meta-layer via `beforeSubmitPrompt` hook (drive-preprocessor.py) when Drive is active:
  - Drive wraps Cursor's native modes: Drive-Ask, Drive-Agent, Drive-Plan, Drive-Debug
  - `CursorMode` type: `"ask" | "agent" | "plan" | "debug"`
  - The Drive layer (filler clean, glossary, sanitize, optimize, approval gates) runs first
  - Then the mode-specific system prompt + behavior takes over
  - Mode is reflected in the system prompt persona (e.g., Drive-Plan = Drive persona + planning behavior)
- Refactor status bar:
  - Format: `Drive > [Mode] | [AgentName]` when active
  - Format: `Drive (off)` when inactive
  - Use `>` separator to visually communicate the meta-layer hierarchy
  - Click: opens QuickPick with mode options + agent options + off
  - Theme: use `statusBarItem.warningBackground` when active (existing behavior, theme-aware)
- Extension commands (not chat slash commands): `/plan`, `/agent`, `/ask`, `/debug`, `/cancel`, `/tangent [task]`, `/switch [name]`, `/agents`
- Update followup provider with context-aware suggestions based on current mode and agent state
- Keybinding: `Ctrl+Shift+D` toggles Drive on/off (existing, keep)

### P1: Share-screen webview panel

- Implement `ShareScreenPanel` using `vscode.WebviewPanel`:
  - Opens in a secondary editor column (beside the user's code)
  - Title: `[AgentName]'s Work` (updates when foreground agent changes)
  - Content sections:
    - **Activity feed**: scrolling list of what the agent is doing ("Reading src/auth.ts", "Searching for login handler", "Editing tests/auth.test.ts")
    - **Files touched**: list of files read/written, with click-to-open
    - **Decisions**: key decisions the agent made ("Chose token bucket over leaky bucket for rate limiting")
    - **Diagrams**: mermaid or simple tree diagrams showing structure of what the agent is building
  - Communication between extension host and webview:
    - Extension host sends events via `webview.postMessage({ type: "activity", ... })`
    - Webview renders events into the UI
    - Webview sends click events back: `vscode.postMessage({ type: "openFile", path: "..." })`
    - Extension host handles: `vscode.workspace.openTextDocument(path)` then `vscode.window.showTextDocument(doc)`
  - Theming:
    - Webview HTML uses VS Code CSS variables: `var(--vscode-editor-background)`, `var(--vscode-editor-foreground)`, etc.
    - No hardcoded colors
    - Agent-specific tints use theme-relative `rgba()` with configurable opacity
  - Auto-show: panel opens when Drive activates (configurable: `shareScreen.autoOpen`)
  - Auto-switch: panel content updates when foreground agent changes
- Config: `shareScreen.enabled`, `shareScreen.autoOpen`, `shareScreen.position` (beside/below)

### P2: Interactive share-screen + agent switcher + blame

- Enhance share-screen with interactive features:
  - **File diff preview**: click a modified file to see a mini diff in the share-screen
  - **Approve/reject inline**: for file changes, show approve/reject buttons in the share-screen
  - **Diagram interaction**: click a node in a research diagram to see details or navigate to the code
  - **Search integration**: show what the agent searched for and the results, with click-to-navigate
- Implement agent switcher QuickPick (`cursorDrive.agents` command):
  - Lists all active agents with their status, current task, and mode
  - Actions per agent: Switch to, Pause, Resume, Dismiss, Merge into...
  - Spawn new: option at the bottom to create a new agent with a name and task
  - Keyboard shortcut: configurable (default: none, user can bind)
- Implement cursor blame integration:
  - When Drive makes file changes via the model, record the agent name in a metadata store
  - Provide a `cursorDrive.blame` command that shows which agent last modified a line
  - Integration with VS Code's source control decorations: show agent name in gutter tooltip
  - Stored in workspace state (not in git -- this is IDE-level attribution, not git history)
- Implement theme-aware agent message styling:
  - Each agent's messages in chat get a subtle tinted border or background
  - Tint colors sourced from a palette of theme color tokens:
    - In webview: `rgba(var(--vscode-charts-blue), 0.08)` for light, `0.15` for dark
    - In markdown chat: prefix with a colored indicator (e.g., a small colored square character)
  - Palette is configurable (`agents.messageTints`)
  - Automatic assignment: first agent gets first tint, second gets second, etc.
  - Respects `prefers-color-scheme` and VS Code's `vscode.window.activeColorTheme`

## Technical Constraints

- **Hook-based entry.** Drive uses `beforeSubmitPrompt` hook when active. No chat participant required. Multi-agent and mode logic run in the extension + hook pipeline.
- **Webview security.** Share-screen webview uses `enableScripts: true` and Content Security Policy. Scripts only from extension resources.
- **Webview lifecycle.** Webview panels are destroyed when hidden. Handle state preservation (serialize/deserialize) and lazy re-creation.
- **No access to Cursor's internal mode API.** Drive cannot programmatically switch Cursor to Agent/Plan/Ask mode. Drive emulates these modes via system prompts and chat participant behavior.
- **Git blame is git-level.** True git blame requires commits attributed to agent names, which would need custom git author info. The simpler path is IDE-level attribution stored in workspace state.
- **Theme color tokens.** Not all VS Code theme tokens are available in webviews. Must test with several themes (Default Dark+, Default Light+, GitHub Dark, Solarized) for readability.

## Config Schema

| Setting | Type | Default | Description |
|---|---|---|---|
| `cursorDrive.defaultMode` | enum: `ask`, `agent`, `plan`, `debug` | `"agent"` | Default Cursor mode when Drive activates |
| `cursorDrive.shareScreen.enabled` | boolean | `true` | Enable share-screen panel |
| `cursorDrive.shareScreen.autoOpen` | boolean | `true` | Auto-open panel when Drive activates |
| `cursorDrive.shareScreen.position` | enum: `beside`, `below` | `"beside"` | Panel position relative to editor |
| `cursorDrive.shareScreen.showDiagrams` | boolean | `true` | Show research diagrams |
| `cursorDrive.statusBar.showAgentName` | boolean | `true` | Show agent name in status bar |
| `cursorDrive.statusBar.showMode` | boolean | `true` | Show current mode in status bar |
| `cursorDrive.theme.agentTintOpacity` | number | `0.08` | Opacity for agent message background tints |
| `cursorDrive.blame.enabled` | boolean | `false` | Enable agent blame tracking |

## Acceptance Criteria

- [ ] Status bar shows `Drive > Agent | Alpha` when active, `Drive (off)` when inactive
- [ ] Clicking status bar opens QuickPick with mode + agent options
- [ ] beforeSubmitPrompt routes to correct mode-specific system prompt when Drive active
- [ ] `/tangent [task]` spawns a new agent from chat
- [ ] `/agents` opens the agent switcher QuickPick
- [ ] Share-screen panel opens beside the editor when Drive activates
- [ ] Share-screen shows real-time activity feed for the foreground agent
- [ ] Clicking a file in share-screen opens it in the user's editor
- [ ] Share-screen content updates when foreground agent switches
- [ ] Agent identity surfaces via ShareScreen and MCP tools (no chat participant; headers/tints via ShareScreen)
- [ ] Agent message tints render correctly in both Default Dark+ and Default Light+ themes
- [ ] No hardcoded color values anywhere in webview HTML/CSS
- [ ] Ctrl+Shift+D toggles Drive mode
- [ ] Agent blame shows which agent modified a line (when enabled)

## Future Vision

- Native Cursor mode registration: if Cursor exposes a mode API for extensions, migrate Drive from a participant to a native mode
- Picture-in-picture: a floating mini share-screen that overlays the editor corner
- Voice waveform visualizer: show a subtle waveform in the status bar or chat when TTS is speaking
- Agent timeline: a visual timeline showing when each agent was active, what they did, and how work flowed between them
- Collaborative Drive: multiple human users in a Live Share session, each steering their own agent pool
- Extension API: expose Drive's agent registry and session memory for other extensions

## Cross-References

- [PRD 1: Voice I/O](prd-voice-io.md) -- TTS webview shares infrastructure with share-screen webview
- [PRD 2: Session + Persona](prd-session-persona.md) -- agent name in status bar and chat headers
- [PRD 3: Multi-Agent](prd-multi-agent.md) -- agent switcher, message tints, share-screen per agent
- [PRD 4: Safety + Config](prd-safety-config.md) -- mode switching controls, config schema
