# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Project Is

**Cursor Drive** is a VS Code/Cursor extension that adds voice-first, multi-operator AI pair programming. It exposes a local MCP server on `:7891` that operators (AI agents running in Cursor's Composer) call to update UI, speak via TTS, and coordinate with each other.

## Commands

```bash
npm run compile          # TypeScript compilation (tsc -p ./)
npm run watch            # Watch mode
npm test                 # Jest unit tests
npm run test:integration # VS Code extension integration tests (requires display)
npm run reinstall        # Rebuild + reinstall extension to dev Cursor host
npm run dev-loop         # Auto-recompile dev loop
```

Run a single test file:
```bash
npx jest tests/agentScreen.test.ts
```

Press **F5** in VS Code/Cursor to launch the Extension Development Host.

## Architecture

Three layers work together:

### 1. VS Code Extension (`src/`)
TypeScript compiled to `out/`. Activated via `Ctrl+Shift+D`. Key modules:

- **`extension.ts`** — Entry point. Registers commands, initializes all services, starts MCP server.
- **`mcpServer.ts`** — Local HTTP server on `:7891`. Exposes tools that operators call (e.g., `drive_update_agent_screen`, `drive_speak`, `drive_register_operator`).
- **`operatorRegistry.ts`** — Pool of named operators. Handles spawn/switch/merge/dismiss lifecycle.
- **`driveMode.ts`** — Drive state machine: `active` flag + `subMode` (`plan | agent | ask | debug`).
- **`agentScreen.ts`** — Webview panel ("S-AS") showing live operator activity feed, files touched, decisions made.
- **`driveSidebar.ts`** — Activity Bar webview showing Drive state and operator list.
- **`statusBar.ts`** — Status bar item rendering `Drive > Mode | OperatorName`.
- **`tts.ts`** — TTS engine abstraction over `say.js`, Edge-TTS, and Piper backends.
- **`router.ts`** — Intent router dispatching commands to `plan/run/direct/collab` flows.
- **`approvalGates.ts`** — Pre/post scan gates for dangerous operations.
- **`worktreeManager.ts`** — Git worktree management for parallel operator isolation.

### 2. Cursor Plugin (`.cursor/`)
Rules (`.cursor/rules/*.mdc`), skills (`.cursor/skills/`), and hooks that configure AI behavior inside Cursor. The plugin auto-installs into the user's `.cursor/` directory via `pluginInstaller.ts`.

### 3. MCP Bridge
Operators call the MCP server at `localhost:7891` using standard MCP tool calls. This is the only channel between Cursor's AI and the extension's UI/state. No cloud backend.

## Request Pipeline

```
Voice/Text Input
  → fillerCleaner → sanitizer → glossaryExpander
  → router (intent classification)
  → promptOptimizer
  → operator (Cursor Composer with MCP tools)
  → mcpServer (state updates, TTS, Agent Screen)
  → UI (statusBar, driveSidebar, agentScreen)
```

## Testing

- Unit tests live in `tests/` and use Jest + `ts-jest`.
- VSCode APIs are mocked in `tests/__mocks__/vscode.ts`.
- Integration tests (`.vscode-test.mjs`) run in a real Extension Development Host via `xvfb` in CI.
- CI runs on push to `master`/`develop` and PRs: compile → unit test → integration test → package VSIX.

## Branch & Merge Strategy

From `CONTRIBUTING.md` and cursor rules:
- Work on `develop` (or `feature/*`, `hotfix/*` branches).
- Features: **squash merge** → `develop`.
- Releases: **merge commit** → `master`.
- Never force-push `master`.
- Run `npm test` before committing (enforced by `tdd-enforcement.mdc` rule).

## Key Cursor Rules (`.cursor/rules/`)

- **`architecture-before-coding.mdc`** — Update arch docs and ADRs for major features before coding.
- **`tdd-enforcement.mdc`** — Write failing tests before refactors; `npm test` must pass before commit.
- **`pr-merge-workflow.mdc`** — Merge only to `develop`; squash for features.
- **`vision-invariants.mdc`** — Core invariants: privacy-strict (no cloud data), local-first, operator-native UX.
- **`operator-hierarchy.mdc`** — Operator roles and permissions model.

## Configuration

Extension settings are under `cursorDrive.*` in VS Code settings. Full schema documented in `docs/reference/config-schema.md`. Zod schemas live in `src/config.ts`.

## Architecture Decision Records

Major decisions are in `docs/architecture/adr/`. Key ones:
- **ADR-0003** — MCP bridge chosen over direct Cursor API injection.
- **ADR-0004** — Hybrid extension + plugin architecture (not pure extension).
- **ADR-0005** — Multi-agent registry (named operator pool).
- **ADR-0008** — Privacy-strict default (no telemetry, no cloud state).
