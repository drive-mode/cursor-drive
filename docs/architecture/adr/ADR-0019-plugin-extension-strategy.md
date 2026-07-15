# ADR-0019: Plugin and Extension Strategy

## Status
Accepted

## Metadata
- Date: 2026-02-24
- Updated: 2026-07-11
- Deciders: Cursor Drive maintainers
- Related: ADR-0002 (Hybrid Extension+Plugin), ADR-0003 (MCP Bridge Pattern), ADR-0007 (Installable Distribution), ADR-0009 (Hook-Based Prompt Interception)

## Context

Drive uses a hybrid architecture: a VSIX extension provides the runtime (MCP server, webview, TTS, status bar) while `.cursor/` / `.cursor-plugin/` files (hooks, rules, skills, commands) provide the prompt-layer integration. This split was established in ADR-0002 and has proven effective.

Cursor's **plugin marketplace** can distribute skills/rules/agents/commands/hooks. It does **not** currently ship VS Code extensions (VSIX) through the same channel. Publishing therefore requires a clear SKU split.

VS Code is introducing new AI-oriented APIs that Cursor may eventually adopt (LM Tools, Chat Participant, MCP Server Definition Provider). Cursor does not currently expose all of these; tracking remains useful for forward compatibility.

## Decision

**ADOPT** a two-SKU hybrid:

### 1. Marketplace = plugin SKU

- Ship an allowlisted `.cursor-plugin/` package (persona, Drive skills/commands, user-facing rules, `drive-preprocessor` hook).
- **Do not require MCP** on plugin install. Missing localhost MCP must degrade cleanly (persona/hooks still work).
- License: MIT for public marketplace suitability.

### 2. Runtime = VSIX companion

- Agent Screen (webview + MCP Apps), TTS, status bar, and the Drive MCP HTTP server (`:7891` with fallback) ship via VSIX (`vsce package` / CI artifact).
- Optional: users install VSIX after the marketplace plugin for the full experience.
- MCP Apps (`cursorDrive.mcp.enableApps`, default on) remain feature-flagged but production-ready for Cursor 2.6+ hosts.

### 3. Agnostic of claude-drive

- **cursor-drive** must not depend on **claude-drive** packages or shared runtime.
- Porting ideas is fine; implementations use Cursor-native surfaces (`cursor-cli`, Cursor SDK / Cloud Agents APIs already in-tree).

### 4. Incremental API prep (unchanged intent)

- Conditional LM Tools / dynamic MCP registration when Cursor exposes them.
- MCP bridge (ADR-0003) remains primary for tool access today.

## Alternatives Considered

1. **Marketplace-only (no VSIX)** — Loses webview, OS TTS, reliable local MCP host. Rejected for full product.
2. **VSIX-only (no plugin)** — Blocks marketplace distribution of persona/skills. Rejected.
3. **Required plugin `.mcp.json`** — Causes install/config errors when extension is absent. Rejected for marketplace SKU.
4. **Shared monorepo package with claude-drive** — Couples products. Rejected; keep sibling inspiration only.

## Consequences

**Positive:**
- Clear install story: plugin works alone; VSIX unlocks UI/MCP.
- Marketplace submission hygiene (allowlist, MIT, no absolute paths).
- No forced coupling to claude-drive.

**Negative:**
- Two install steps for power users until Cursor unifies channels.
- Docs must keep marketplace vs companion paths distinct.

## Migration Strategy

- `npm run build:plugin` produces the allowlisted SKU.
- Extension activation continues to start MCP; status/output reports bind failures.
- Existing workspaces with manual `.cursor/mcp.json` keep working; marketplace plugin does not overwrite that requirement.

## Open Questions

- Cursor timeline for shipping extensions via the same marketplace as plugins.
- Whether dynamic MCP registration can eventually replace deep-link / manual mcp.json for the VSIX path.
