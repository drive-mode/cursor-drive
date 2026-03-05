---
name: cursor-drive-handoff
description: Handoff prompt for a new chat continuing Cursor Drive extension work
disable-model-invocation: true
---

# Cursor Drive — Handoff Prompt

Paste this into a new chat to continue where we left off.

---

## What this project is

**Cursor Drive** is a standalone Cursor IDE extension that adds **Drive mode** — a voice-first AI pair-programming driver. It is a hybrid system:

- **VS Code extension** (`src/`) — TypeScript, runs in the extension host. Handles all UI: status bar, Agent Screen WebviewPanel, TTS, multi-operator pool.
- **Cursor plugin layer** (`.cursor/`) — Skills, rules, commands, and hooks that shape how the AI behaves in Drive mode.
- **Local MCP server** (`:7891`) — The bridge between the Cursor AI and the extension UI. AI calls MCP tools to update the Agent Screen, trigger TTS, switch modes, and manage operators.

Drive is a **behavioral toggle** — not an `@drive` chat participant. When Drive is active, the `beforeSubmitPrompt` hook routes prompts through the Drive pipeline transparently.

---

## Activation

- **Status bar**: Click the Drive status item or use `Ctrl+Shift+D` to toggle Drive mode.
- **Pipeline entry**: When Drive is active, `beforeSubmitPrompt` (via `drive-preprocessor.py`) intercepts prompts before they reach Cursor's native modes.
- **MCP bridge**: The extension starts a local HTTP server at `http://127.0.0.1:7891/mcp`. Cursor AI calls this server to update the Agent Screen, trigger TTS, and manage operators. Registered in `.cursor/mcp.json`.

---

## Current state of the codebase

**Source modules** in `src/`:

| File | What it does |
|---|---|
| `extension.ts` | Entry point — activates Drive, MCP server, commands, keybindings |
| `driveMode.ts` | State manager — `active` + `subMode`, `workspaceState` persistence, `EventEmitter` |
| `statusBar.ts` | Live status bar — `Drive > [Mode] \| [OperatorName]`, click → QuickPick |
| `router.ts` | Intent router — maps prompt + sub-mode to `plan/run/direct/collab` |
| `fillerCleaner.ts` | Client-side filler word stripper — zero cost, no API call |
| `modelSelector.ts` | 3-tier cost-aware model selection: routing → planning → execution |
| `mcpServer.ts` | Local MCP HTTP server with 11 tools for AI ↔ extension communication |
| `operatorRegistry.ts` | Multi-operator pool — spawn, switch, pause, resume, dismiss, merge |
| `agentScreen.ts` | Agent Screen (S-AS) — activity feed, files touched, decisions |
| `tts.ts` | OS-native TTS via `say.js` |

**Configuration** (`cursorDrive.*` settings):
- `defaultSubMode` — plan / agent / ask / direct (default: `"agent"`)
- `tts.enabled`, `tts.voice`, `tts.speed`, `tts.maxSpokenSentences`
- `agentScreen.enabled`, `agentScreen.autoOpen`
- `operators.maxConcurrent` (default: 3)
- `mcp.port` (default: 7891)

---

## How drive mode works

When Drive is active and the user submits a prompt:

1. `beforeSubmitPrompt` hook runs (`drive-preprocessor.py`)
2. Filler cleaner strips filler words
3. Intent router maps sub-mode (plan/agent/ask/direct) to route
4. Model selector picks tier (routing → planning → execution)
5. Main model call with Drive persona + execution system prompt
6. Response streams to chat

Voice activation: user speaks → Cursor STT → prompt submitted → hook intercepts when Drive is active.

---

## What needs to happen next

See the root plan at `.cursor/plans/cursor-drive.plan.md` and child plans in `.cursor/plans/` for pending todos. Run `/plan-sync` to refresh the plan graph.

---

## Key paths

| Purpose | Path |
|---|---|
| Extension source | `src/` |
| Extension manifest | `package.json` |
| Root plan | `.cursor/plans/cursor-drive.plan.md` |
| Plan dependency graph | `.cursor/plans/plan-graph.yaml` |
| MCP config | `.cursor/mcp.json` |
| Plugin manifest | `.cursor-plugin/plugin.json` |
| PRDs (5 total) | `docs/prd/` |
| Architecture ADRs | `docs/architecture/adr/` |
| Design docs | `docs/design/` |

---

## How to run

```bash
# Install dependencies
npm install

# Compile
npm run compile

# Launch Extension Development Host (press F5 in Cursor)
# Then in the new window: toggle Drive via status bar or Ctrl+Shift+D

# Run tests
npm test

# Package (produces cursor-drive-*.vsix)
npx vsce package
```

---

## Rules to follow

This repo enforces plan-before-implementation. Before writing code:
1. Read `.cursor/plans/cursor-drive.plan.md` and the relevant child plan
2. Map work to a plan TODO
3. Mark the TODO `in_progress` before starting
4. Mark `completed` when done

See `.cursor/rules/plan-governance.mdc` and `.cursor/rules/architecture-before-coding.mdc`.

Privacy: no raw transcript/audio retention. No PII in logs. See `.cursor/rules/policy-pack.mdc`.
