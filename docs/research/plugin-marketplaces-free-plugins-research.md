# Plugin marketplaces — free plugins relevant to Cursor Drive

**Source:** [Discover and install prebuilt plugins (Claude Code)](https://code.claude.com/docs/en/discover-plugins)
**Date:** 2026-03
**Scope:** Free plugins only; benefit to Cursor Drive project or its contributors.

---

## Context: Claude Code vs Cursor

The documentation at **code.claude.com** describes the **Claude Code** plugin marketplace — plugins for the `claude` CLI / Claude Code product, not Cursor IDE. Cursor Drive is a **Cursor/VS Code extension**; it does not run Claude Code plugins directly.

Relevance to our project:

1. **Contributor workflow** — Contributors who also use Claude Code when working on the repo can use free plugins there (TypeScript LSP, git workflows, PR review).
2. **MCP overlap** — Many “plugins” are preconfigured MCP servers (e.g. `github`, `gitlab`). Cursor supports MCP; the same capabilities can be used in Cursor by adding those MCP servers to `.cursor/mcp.json`. Drive doesn’t bundle them but can recommend them.
3. **Design reference** — Marketplace format (e.g. `.claude-plugin/marketplace.json`), scopes (user/project/local), and plugin structure (skills, agents, hooks, MCP) are useful if Drive ever adds a plugin/marketplace story.

All plugins listed below are **free** (no paid tier mentioned in the official docs).

---

## Free plugins that benefit the project

### 1. For contributors (developing Cursor Drive)

Useful when working on the cursor-drive codebase in Claude Code:

| Plugin | Marketplace | Benefit |
|--------|-------------|--------|
| **typescript-lsp** | `claude-plugins-official` | Code intelligence: jump to definition, find references, diagnostics after edits. Requires `typescript-language-server` on `$PATH`. |
| **commit-commands** | `anthropics/claude-code` (demo) | Git workflows: stage, generate commit message, commit, push, PR. Reduces manual git steps during contribution. |
| **pr-review-toolkit** | `claude-plugins-official` | Specialized agents for PR review. Helpful for reviewing Drive PRs. |
| **plugin-dev** | `claude-plugins-official` | Toolkit for creating plugins. Reference for structure (skills, agents, hooks) if we document or build plugin-like features. |

**How to use (in Claude Code):**

- Official: `/plugin install typescript-lsp@claude-plugins-official`
- Demo marketplace first: `/plugin marketplace add anthropics/claude-code`, then `/plugin install commit-commands@anthropics-claude-code`

---

### 2. MCP integrations (usable in Cursor)

These “plugins” bundle MCP servers. The same MCP servers can be used in **Cursor** by configuring them in `.cursor/mcp.json`. Drive does not ship these; we can document them as optional recommendations for users who want GitHub/GitLab/etc. in the same workflow.

| Plugin / integration | Marketplace | What it provides | Cursor usage |
|----------------------|-------------|------------------|--------------|
| **github** | `claude-plugins-official` | Preconfigured GitHub MCP (issues, PRs, repo access). | Add GitHub MCP server to Cursor’s MCP config; no Claude Code required. |
| **gitlab** | `claude-plugins-official` | Preconfigured GitLab MCP. | Same: use GitLab MCP in Cursor. |
| **linear** | `claude-plugins-official` | Project management (issues, cycles). | Optional MCP for users who use Linear. |
| **notion** | `claude-plugins-official` | Notion workspace access. | Optional MCP for docs/specs in Notion. |
| **slack** | `claude-plugins-official` | Slack integration. | Optional; e.g. for `connector_publish_proposal`-style flows if we add a connector. |
| **sentry** | `claude-plugins-official` | Monitoring/errors. | Optional for teams using Sentry. |
| **vercel**, **firebase**, **supabase** | `claude-plugins-official` | Infrastructure/deploy. | Optional per stack. |
| **figma** | `claude-plugins-official` | Design files. | Optional for design–dev handoff. |

None of these are required for Drive; they’re optional “extend your Cursor + Drive setup” recommendations. Listing them in a short “Recommended MCP servers” or “Ecosystem” doc would align with what’s available for free in the Claude Code marketplace.

---

### 3. Code intelligence (LSP) — other languages

If the repo or related work uses other languages, these are free and only need the corresponding binary on `$PATH`:

| Language | Plugin | Binary |
|----------|--------|--------|
| Python | `pyright-lsp` | `pyright-langserver` |
| Rust | `rust-analyzer-lsp` | `rust-analyzer` |
| Go | `gopls-lsp` | `gopls` |
| C/C++ | `clangd-lsp` | `clangd` |
| Java | `jdtls-lsp` | `jdtls` |
| Kotlin | `kotlin-lsp` | `kotlin-language-server` |
| Lua | `lua-lsp` | `lua-language-server` |
| PHP | `php-lsp` | `intelephense` |
| Swift | `swift-lsp` | `sourcekit-lsp` |
| C# | `csharp-lsp` | `csharp-ls` |

Cursor Drive is TypeScript-first; `typescript-lsp` is the main one for the project. Others matter if we add runtimes, scripts, or docs in those languages.

---

### 4. Output / style (reference only)

- **explanatory-output-style** — Educational insights about implementation choices.
- **learning-output-style** — Interactive learning mode.

These change how Claude responds in Claude Code. They don’t integrate with Drive but could inform how we design “persona” or “verbosity” options (we already have concise-first and configurable verbosity).

---

## Summary

| Use case | Free plugins to use or recommend |
|----------|-----------------------------------|
| **Contributors (Claude Code)** | `typescript-lsp`, `commit-commands`, `pr-review-toolkit`, `plugin-dev` |
| **Cursor MCP (optional)** | Same capabilities as Claude plugins: GitHub, GitLab, Linear, Notion, Slack, Sentry, Vercel, Firebase, Supabase, Figma — configure in Cursor, not via Claude Code. |
| **Design reference** | Marketplace format, scopes, plugin structure (skills/agents/hooks/MCP) from [code.claude.com](https://code.claude.com/docs/en/discover-plugins). |

**Conclusion:** We don’t “install” Claude Code plugins into Drive. We can (1) recommend the above free plugins to contributors who use Claude Code, and (2) document optional MCP servers (GitHub, GitLab, etc.) for Cursor users who want the same integrations. All listed options are free.
