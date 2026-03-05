# ADR-0002: Hybrid Extension + Plugin Strategy

## Status
Accepted

## Metadata
- Date: 2026-02-19
- Deciders: Cursor Drive maintainers
- Legacy: ADR-0007
- Related: ADR-0001, ADR-0003

## Context

Cursor supports two distinct integration mechanisms:
1. **VS Code Extensions**: TypeScript packages that run in the extension host. Can render Webviews, Status Bar items, register Chat Participants, handle commands and keybindings. Distributed via Marketplace.
2. **Cursor Plugin layer** (`.cursor/`): Markdown-based skills, rules, commands, and hooks auto-discovered by Cursor. Shape AI behavior at the model prompt level. No TypeScript required.

Neither mechanism alone can satisfy all Cursor Drive requirements:
- A plugin alone cannot render a `WebviewPanel` (ShareScreen) or `StatusBarItem`.
- An extension alone cannot teach the AI Drive's persona and mode behaviors as Cursor primitives — it would require injecting these into every system prompt manually.

## Decision

Use **both mechanisms together** as a hybrid:

- **VS Code Extension (`src/`)**: All UI surfaces (Status Bar, ShareScreen Webview, Chat Participant, keybindings). All runtime logic (agent registry, MCP server, TTS, approval gates). Compiled TypeScript.
- **Cursor Plugin layer (`.cursor/`)**: All AI-facing content (drive persona as a Skill, mode rules, slash command definitions, pre-submit hooks). Plain markdown and Python. Auto-discovered by Cursor.

The two layers are coordinated via the local MCP server (see ADR-0003): the extension starts it, the AI calls tools on it.

## Rationale

- **Separation of concerns**: UI code in extension (typed, testable, versioned); AI behavior in plugin layer (readable, editable without recompile).
- **Cursor-native AI**: Skills and Rules are Cursor's mechanism for teaching AI. The persona and mode behaviors work even when the extension's `@drive` participant is not explicitly invoked.
- **Progressive disclosure**: New users install the extension for full UI; power users can edit `.cursor/skills/` to customize Drive behavior without touching TypeScript.
- **Distribution**: Extension distributed via VS Code Marketplace / `.vsix`. Plugin layer ships with the repo (usable immediately by anyone who clones it).

## Consequences

- **Positive**: Clean separation; AI behavior is human-readable in `.cursor/skills/` and `.cursor/rules/`.
- **Positive**: Plugin layer works independently if extension is not installed (AI gets Drive persona via skills).
- **Negative**: Two deployment units to keep in sync when behavior changes.
- **Negative**: Extension must start cleanly before MCP server is available; plugin layer references tools that won't respond until extension activates.
