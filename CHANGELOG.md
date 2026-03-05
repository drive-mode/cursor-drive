# Changelog

## [Unreleased]

### Added
- **Workspace plugin installer command** — `Drive: Install Drive Plugin to Workspace` copies Drive plugin assets into `.cursor/`, merges MCP config, and ensures hook registration.
- **Installability docs and assets** — added `PLUGIN-README.md`, architecture ADR docs, and plugin logo asset.
- **Debug sub-mode in Drive state** — debug is now a first-class Drive sub-mode in config, mode picker, and MCP mode setting.
- **Expanded unit coverage** — new tests for `pluginInstaller`, `driveMode`, `statusBar`, and `agentRegistry`.

### Changed
- **Status bar UI** now shows `Drive > MODE | AGENT` with background-agent count suffix.
- **Mode picker UX** now includes direct access to the agent manager.
- **Agent manager UX** now supports switch, spawn, pause, resume, merge, and dismiss flows.
- **Share-screen behavior** now respects enablement settings and correctly resets touched-file tracking on clear.
- **VSIX packaging rules** now include Drive plugin runtime assets and exclude internal `.cursor` governance content from release payloads.

## [0.2.0] — 2026-02-18

### Added
- **Prompt optimizer** — AI-powered prompt refinement using cheapest available model before the main call. Shows original vs. optimized in chat for approval. Configurable with `cursorDrive.promptOptimizer.enabled` and `autoApprove`.
- **Filler word cleaner** — Client-side, zero-cost removal of voice dictation noise ("uhh", "like", "kinda", repetitions). Runs before the optimizer.
- **Cost-aware model routing** — 3-tier model selection: cheap model for routing/optimization, mid-tier for planning, user's model for execution. Shown in progress indicator.
- **Drive mode persona** — Hardened system prompt: leads with recommendations, adapts when pushed back, confirms before large changes, cost-aware.

### Changed
- Participant pipeline now runs: cancel guard → activation word → filler clean → optimize → route → model select → call.
- Progress indicator now shows route mode, drive sub-mode, and selected model name + tier.
- Version bumped to 0.2.0.

## [0.1.0] — 2026-02-18

### Added
- `@drive` chat participant with `plan`, `run`, `drive`, `cancel` slash commands.
- Drive mode state manager with `workspaceState` persistence.
- Status bar item (`Drive: PLAN/AGENT/ASK`) with QuickPick sub-mode selector.
- Activation word detection — "drive [plan|agent|ask] \<request\>" in any message.
- `Ctrl+Shift+D` keybinding to toggle drive mode.
- Intent router with drive sub-mode override (TypeScript implementation).
- Configuration: `cursorDrive.activationWord`, `cursorDrive.defaultSubMode`.
