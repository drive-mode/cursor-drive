# ADR-0001: Cursor-Native Extension Strategy (Standalone)

## Status
Superseded by [ADR-0009](ADR-0009-hook-based-prompt-interception.md)

## Metadata
- Date: 2026-02-13
- Revised: 2026-02-19
- Deciders: Cursor Drive maintainers
- Legacy: ADR-0006
- Supersedes: none
- Superseded by: ADR-0009 (hook-based prompt interception)
- Related docs:
  - `docs/design/architecture/cursor-native-system-design.md`
  - `docs/architecture/README.md`

## Context

**Cursor Drive** is a standalone Cursor IDE extension that adds **Drive mode** — a voice-first AI pair-programming driver. It uses Cursor primitives (Agent mode, Chat Participant API, @codebase, Rules, Skills, MCP, Webview).

How does the extension integrate with Cursor?

## Decision

Adopt the **hybrid extension + plugin** strategy:

1. **VS Code Extension** (TypeScript, `src/`): Provides all UI surfaces — Status Bar, ShareScreen WebviewPanel, Chat Participant (`@drive`), and keybindings. Runs in the VS Code extension host.
2. **Cursor Plugin layer** (`.cursor/`): Provides AI-facing capabilities — Skills (`.cursor/skills/`), Rules (`.cursor/rules/`), Commands (`.cursor/commands/`), and Hooks (`.cursor/hooks/`). These are auto-discovered by Cursor and shape how the AI behaves.
3. **Local MCP Server** (`:7891`): The extension starts a local HTTP MCP server. Cursor's AI calls tools on it to update the UI (ShareScreen events, TTS, mode changes, agent management) without the AI needing to know about VS Code APIs.

## Rationale

- **Extension-only for UI**: Cursor Plugins cannot render WebviewPanels or StatusBarItems. A VS Code extension is required for all custom UI surfaces.
- **Plugin layer for AI behavior**: Skills and Rules are the native Cursor mechanism for teaching the AI how to behave. Moving drive persona, mode awareness, and command definitions into `.cursor/skills/` and `.cursor/rules/` means the AI understands Drive without the extension injecting system prompts.
- **MCP as the bridge**: The AI cannot call VS Code extension APIs directly. The local MCP server is the contract layer between "AI wants to update the ShareScreen" and "extension updates the WebviewPanel".

## @drive ChatParticipant Removal (Superseded by ADR-0009)

The original decision assumed `@drive` as a ChatParticipant. **Cursor does not support `vscode.chat.createChatParticipant`.** The API exists in VS Code but is not implemented in Cursor's chat. Therefore:

1. **Why removed**: `vscode.chat.createChatParticipant` is not supported in Cursor. Registering `@drive` would fail or be a no-op.
2. **What replaced it**: The `beforeSubmitPrompt` hook + extension commands + status bar. When Drive is active, the hook intercepts every prompt; commands provide slash-style actions; status bar is the primary activation surface.
3. **Rationale**: Drive must work with Cursor's actual capabilities. The hook-based pipeline (ADR-0009) provides equivalent functionality without the ChatParticipant API. The `@drive` participant may exist as a dormant fallback only if Cursor adds support in future.

## Implementation Obligations (Historical — see ADR-0009 for current)

- ~~Register `@drive` as a `vscode.chat.createChatParticipant` with slash commands.~~ Replaced by beforeSubmitPrompt hook + commands + status bar.
- Start the MCP server on extension activation; stop on deactivation.
- Place all AI-facing content (persona, mode rules, commands) in `.cursor/`.
- Document the MCP tool contract in `docs/architecture/README.md`.

## Required Validation

- Extension activates in Cursor; `@drive` responds to prompts.
- MCP server health endpoint returns 200 on `:7891/health`.
- ShareScreen updates when the AI calls `share_screen_activity`.
- Status bar reflects current Drive mode in real time.

## Consequences

- **Positive**: No fork; Marketplace distribution; deep Cursor integration via native primitives.
- **Positive**: Clean separation — UI code in extension, AI behavior in plugin layer.
- **Negative**: MCP server adds one local process; must handle port conflicts.
- **Negative**: Chat Participant API allows one participant per extension — all multi-agent and mode logic must be internal.

## Alternatives Considered

- **Fork Cursor**: Rejected — fork maintenance burden; no Marketplace distribution.
- **Plugin-only (no extension)**: Rejected — plugins cannot render Webviews or Status Bars.
- **MCP-only (no extension)**: Rejected — no persistent UI; poor discoverability; can't register keybindings.
