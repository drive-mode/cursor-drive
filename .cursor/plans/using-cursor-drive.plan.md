---
planId: using-cursor-drive
planType: task
parentPlanId: cursor-drive-v1
childPlanIds: []
dependsOn: []
name: Using Cursor Drive
overview: A practical guide for building, installing, and using the Cursor Drive extension -- covering setup, core commands, operator management, and MCP integration.
todos:
  - id: build-install
    content: Build the extension (npm ci, compile, package VSIX) and install in Cursor
    status: completed
  - id: activate-test
    content: Toggle Drive mode, test sub-mode switching, verify status bar
    status: completed
  - id: agent-screen
    content: Open Agent Screen, spawn an operator, verify activity feed
    status: completed
  - id: mcp-verify
    content: Confirm MCP server starts on port 7891, test a tool call
    status: completed
  - id: configure
    content: Review and adjust cursorDrive.* settings for your preferences
    status: completed
---

# Using the Cursor Drive Extension

## 1. Build and Install

The extension lives at the repo root (`c:\Users\harri\Documents\Coding Projects\fun\cursor-drive`). Build steps:

```bash
npm ci
npm run compile
npx vsce package --allow-missing-repository
```

This produces a `.vsix` file. Install it in Cursor via **Extensions > ... > Install from VSIX**.

Alternatively, for development: press **F5** in Cursor with the repo open to launch an Extension Development Host.

## 2. Core Commands

All commands are in the **Drive** category (open Command Palette with `Ctrl+Shift+P`):

- **Toggle Drive Mode** (`Ctrl+Shift+D`) -- activates/deactivates Drive. Status bar shows `Drive > [Mode]`.
- **Set Drive Mode** -- picker to switch sub-mode: `plan`, `agent`, `ask`, `debug`. Maps 1:1 to Cursor native modes.
- **Show Agent Screen** (`Ctrl+Shift+S`) -- opens the webview panel showing operator activity, files touched, decisions.
- **Manage Operators** -- list/switch/dismiss operators.
- **Spawn Operator** -- create a new operator (with permission preset: readonly, standard, full).
- **Test TTS Speak** / **Stop TTS** -- test text-to-speech output.
- **Diagnose Drive APIs** -- runtime introspection of available Cursor APIs.

## 3. Configuration

Key settings under `cursorDrive.*` in VS Code settings:

- `defaultSubMode` -- starting mode when Drive activates (default: `plan`)
- `tts.enabled` / `tts.voice` / `tts.speed` -- text-to-speech preferences
- `operators.maxOperators` / `operators.defaultPreset` -- operator limits and permissions
- `agentScreen.displayMode` / `agentScreen.autoOpen` -- Agent Screen behavior
- `mcp.port` -- MCP server HTTP port (default: `7891`)
- `promptOptimizer.enabled` / `promptOptimizer.autoApprove` -- AI prompt optimization
- `wakeWord` / `submitWord` -- voice activation phrases

## 4. MCP Server Integration

When the extension activates, it starts an HTTP MCP server on port 7891 (configurable). This exposes 20+ tools that Cursor AI can call:

- TTS tools (speak, stop)
- Agent Screen tools (post activity, clear)
- Operator tools (spawn, dismiss, list)
- Pipeline tools (run prompt through filler cleaner, glossary, router, etc.)
- Drive state tools (get/set mode, session memory)

The MCP server config for Cursor is in [sandbox/.cursor/mcp.json](sandbox/.cursor/mcp.json) or can be set up manually.

## 5. Typical Workflow

```
1. Activate Drive (Ctrl+Shift+D)
2. Choose sub-mode (plan/agent/ask/debug)
3. Open Agent Screen (Ctrl+Shift+S) to monitor
4. Work via Cursor chat -- prompts pass through the Drive pipeline
5. Spawn additional operators for parallel work
6. Use voice commands if TTS/wake-word configured
```

## 6. Plugin Layer (.cursor/ assets)

The [sandbox/.cursor/](sandbox/.cursor/) directory contains hooks, skills, rules, agents, and commands that integrate with Cursor's plugin system:

- **Hooks** (`hooks/`) -- `beforeSubmitPrompt` pipeline entry, dep-auditor, plan-runner
- **Skills** (`skills/`) -- persona definitions, mode awareness, doc workflows
- **Rules** (`rules/`) -- always-applied rules for vision invariants, model routing, operator hierarchy, privacy policy
- **Agents** (`agents/`) -- agent definitions for Drive operators

## Reconciliation

### What was verified

- **Build**: `npm install`, `npm run compile`, and `npx vsce package` completed successfully. VSIX produced: `cursor-drive-0.3.1.vsix` (1.04 MB, 221 files).
- **MCP config**: `.cursor/mcp.json` has Drive server at `http://127.0.0.1:7891/mcp`.
- **Configuration**: All `cursorDrive.*` settings documented in plan §3; defaults from `package.json` are in place.

### Manual steps required

1. **Install VSIX**: Extensions > ... > Install from VSIX → select `cursor-drive-0.3.1.vsix`.
2. **Activate-test**: After install, press `Ctrl+Shift+D` to toggle Drive; use Set Drive Mode picker to switch sub-modes; verify status bar shows `Drive > [Mode]`.
3. **Agent Screen**: Press `Ctrl+Shift+S`; spawn operator via Manage Operators or Spawn New Operator; verify activity feed.
4. **MCP verify**: With extension active, run `curl http://127.0.0.1:7891/health` (or `Invoke-WebRequest -Uri http://127.0.0.1:7891/health -UseBasicParsing`). Expected: `{"status":"ok","name":"cursor-drive","port":7891}`. If port differs, update `.cursor/mcp.json`.

### Residual risks

- `npm ci` failed with EPERM on `resolver.win32-x64-msvc.node` (file lock); `npm install` succeeded. If `npm ci` is required for CI, run it in a clean environment.
- MCP server was not reachable during execution (extension not active). Verification depends on user installing the VSIX and activating Drive.

### Evidence

- VSIX: `cursor-drive-0.3.1.vsix` at repo root
- Compile: `out/` populated with extension bundle
