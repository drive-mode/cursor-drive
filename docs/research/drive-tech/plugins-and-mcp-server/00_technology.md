# Building Plugins for Cursor Drive — Technology Landscape

**Topic:** Cursor plugin architecture, VS Code extension architecture, MCP server patterns, VSIX packaging, and marketplace considerations.

**Date:** February 2026

---

## 1. Overview

Cursor Drive ships as a hybrid: a VS Code extension (TypeScript, VSIX) plus a Cursor plugin layer (`.cursor/` files). This dual-layer strategy is dictated by the platform — Cursor is a VS Code fork with AI additions, and neither integration mechanism alone covers all of Drive's needs.

Three technology domains intersect:

| Domain | What it provides | Drive's usage |
|---|---|---|
| **VS Code Extension API** | UI surfaces (webview, status bar, commands, keybindings), extension host runtime | Agent Screen, TTS, status bar mode indicator, operator management commands |
| **Cursor Plugin Layer** (`.cursor/`) | AI-facing content (skills, rules, commands, hooks) auto-discovered by Cursor's AI | Drive persona, mode rules, slash commands, `beforeSubmitPrompt` hook |
| **MCP (Model Context Protocol)** | Standardized agent-to-tool communication over stdio or HTTP | Bridge between Cursor's AI and the extension's runtime (30+ tools on `:7891`) |

---

## 2. Cursor Plugin Architecture — The `.cursor/` Layer

### 2.1 Directory Structure

Cursor auto-discovers files in the workspace's `.cursor/` directory. Each subdirectory has a specific purpose:

| Directory | Purpose | Auto-discovered |
|---|---|---|
| `.cursor/skills/` | Markdown skill files teaching the AI specific capabilities | Yes — injected as available skills |
| `.cursor/rules/` | Rule files (`.mdc`) that constrain AI behavior | Yes — always applied or conditionally applied |
| `.cursor/commands/` | Slash command definitions | Yes — available as `/command` |
| `.cursor/hooks/` | Python/shell scripts triggered on prompt lifecycle events | Yes — via `hooks.json` registration |
| `.cursor/mcp.json` | MCP server configuration (project-scoped) | Yes — Cursor connects to listed servers |

### 2.2 hooks.json

Cursor's hook system is the primary prompt interception mechanism. Hooks are registered in `.cursor/hooks.json`:

```json
{
  "version": 1,
  "hooks": {
    "beforeSubmitPrompt": [
      { "command": ".cursor/hooks/drive-preprocessor.py beforeSubmitPrompt" }
    ]
  }
}
```

Hook lifecycle events:

| Event | When | What hooks can do |
|---|---|---|
| `beforeSubmitPrompt` | Before every prompt submission | Modify prompt text, add context, inject mode hints |
| `sessionStart` | When a chat session begins | Initialize session state, load config |
| `stop` | When the user stops generation | Clean up, persist state |
| `subagentStop` | When a subagent completes | Aggregate results, update parent |

Hooks receive input via stdin (JSON) and emit output via stdout. They run in the workspace context and can read files, environment variables, and `.cursor/` config.

### 2.3 MCP Configuration

Project-scoped MCP servers are registered in `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "drive": {
      "url": "http://127.0.0.1:7891/mcp"
    }
  }
}
```

Global MCP servers live in `~/.cursor/mcp.json`. Project config takes precedence.

### 2.4 Skills and Rules

Skills are markdown files with optional YAML frontmatter for requirements gating:

```yaml
---
name: drive-persona
requires:
  bins: [python3]
  os: [darwin, linux]
---
```

Rules (`.mdc` files) can be always-applied or conditional. They shape AI behavior without requiring the user to invoke them explicitly.

---

## 3. VS Code Extension Architecture

### 3.1 Extension Host Model

VS Code extensions run in an isolated **extension host** process, separate from the renderer. They interact with the editor via the `vscode` API namespace.

Key capabilities for Drive:

| Capability | API | Drive usage |
|---|---|---|
| **Webview panels** | `vscode.window.createWebviewPanel()` | Agent Screen (S-AS) |
| **Status bar** | `vscode.window.createStatusBarItem()` | Mode indicator |
| **Commands** | `vscode.commands.registerCommand()` | Toggle, set mode, diagnose, install plugin |
| **Keybindings** | `package.json` `contributes.keybindings` | `Cmd+Shift+D` (toggle), `Cmd+Shift+S` (Agent Screen) |
| **Configuration** | `package.json` `contributes.configuration` | All `cursorDrive.*` settings |
| **Workspace state** | `context.workspaceState` | Drive active flag, session data |

### 3.2 Cursor-Specific API Surface

Cursor extends VS Code with AI-specific APIs. Not all are publicly documented:

| API | Status | Notes |
|---|---|---|
| `vscode.cursor.mcp.registerServer()` | Limited | Programmatic MCP server registration. No custom headers support. Does not survive extension reload. |
| `registerMcpServerDefinitionProvider()` | Newer (VS Code) | Dynamic MCP server registration. More flexible but Cursor adoption unclear. |
| Chat Participant API | **Not exposed** in Cursor | VS Code's `vscode.chat.createChatParticipant()` exists but Cursor does not expose it. Drive uses MCP bridge instead (ADR-0003). |
| `vscode.cursor.setSystemPrompt()` | Not available | Would allow direct system prompt injection. Not exposed; Drive uses hooks and skills instead. |

### 3.3 Cursor vs VS Code API Divergence

| Dimension | VS Code | Cursor |
|---|---|---|
| **MCP support** | `registerMcpServerDefinitionProvider()` (dynamic) | `.cursor/mcp.json` (static) + `registerServer()` (limited) |
| **Chat Participant** | Full API (`createChatParticipant()`) | Not exposed |
| **Hooks** | Not available | Full hook system (`.cursor/hooks/`) |
| **Skills / Rules** | Not available | Auto-discovered from `.cursor/` |
| **Extension API** | Full `vscode.*` namespace | Full `vscode.*` + limited `vscode.cursor.*` |
| **Marketplace** | VS Code Marketplace | Cursor has its own marketplace (subset of VS Code extensions work) |

The key insight: Cursor adds AI primitives (hooks, skills, rules, MCP config) that VS Code lacks, but restricts some VS Code APIs (Chat Participant). Drive's hybrid architecture (ADR-0002) navigates this by using both layers.

---

## 4. MCP Server Patterns

### 4.1 Transport Options

MCP defines multiple transport mechanisms:

| Transport | Protocol | Use case | Drive usage |
|---|---|---|---|
| **stdio** | stdin/stdout JSON-RPC | Local servers spawned as child processes | Not used — Drive runs in extension host |
| **HTTP + StreamableHTTP** | HTTP POST with JSON-RPC | Local or remote servers accessible via URL | **Current** — `:7891/mcp` |
| **SSE (Server-Sent Events)** | HTTP GET with event stream | Legacy; being deprecated in favor of StreamableHTTP | Not used |

### 4.2 Drive's MCP Server Architecture

Drive's MCP server (`src/mcpServer.ts`) uses HTTP + `StreamableHTTPServerTransport`:

```
Cursor AI ──(HTTP POST)──► DriveMcpServer :7891/mcp ──► Extension runtime
                                │
                                ├── /mcp        → MCP tool calls (StreamableHTTPServerTransport)
                                ├── /health     → Health check + diagnostics
                                ├── /tasks      → A2A task management
                                ├── /pipeline   → Prompt pipeline execution
                                ├── /run        → Cursor CLI execution
                                └── /.well-known/agent-card.json → A2A Agent Card
```

The server binds to `127.0.0.1` (localhost only). It registers 30+ tools organized by domain:

| Domain | Tools | Count |
|---|---|---|
| TTS | `tts_speak`, `tts_stop` | 2 |
| Agent Screen | `agent_screen_activity`, `agent_screen_file`, `agent_screen_decision`, `agent_screen_plan_update` | 4 |
| Persistent Memory | `persistent_memory_append`, `persistent_memory_search`, `persistent_memory_write_curated`, `persistent_memory_context` | 4 |
| Operator Management | `operator_spawn`, `operator_switch`, `operator_list`, `operator_pause`, `operator_resume`, `operator_dismiss`, `operator_merge`, `operator_update_memory`, `operator_set_visibility`, `operator_delegate` | 10 |
| Drive Control | `drive_set_mode`, `drive_run_pipeline` | 2 |
| Cursor CLI | `cursor_cli_run` | 1 |
| Deprecated aliases | `share_screen_*`, `agent_*` | 8 |

### 4.3 Self-Hosted vs Remote MCP

| Approach | Pros | Cons |
|---|---|---|
| **Self-hosted (localhost)** | No auth needed, no network latency, direct access to VS Code APIs | Only accessible from local machine; dies with extension |
| **Remote (cloud)** | Accessible from anywhere, survives extension restarts | Requires auth, adds latency, cannot call VS Code APIs directly |
| **Hybrid** | Localhost for VS Code API calls, remote for stateless tools | Increased complexity; two servers to maintain |

Drive uses self-hosted because the MCP server must call VS Code APIs (webview, status bar) that only work in the extension host process.

---

## 5. VSIX Packaging

### 5.1 Package Structure

Drive is packaged as a VSIX using `@vscode/vsce`:

```
cursor-drive-0.3.0.vsix
├── extension/
│   ├── package.json          ← Extension manifest
│   ├── out/                  ← Compiled TypeScript
│   ├── mcp.json              ← MCP server config (copied to .cursor/ by installer)
│   ├── agents/               ← Plugin: agent definitions
│   ├── commands/             ← Plugin: slash commands
│   └── rules/                ← Plugin: rule files
├── extension.vsixmanifest
└── [Content_Types].xml
```

The VSIX bundles both the compiled extension and the plugin layer assets. The `pluginInstaller.ts` command copies plugin assets from the VSIX into the workspace's `.cursor/` directory.

### 5.2 vsce Configuration

Packaging uses `npx vsce package`. The `.vscodeignore` file controls what ships:

- **Included**: `out/`, `package.json`, `mcp.json`, `agents/`, `commands/`, `rules/`, `.cursor/hooks/`, `.cursor/skills/`
- **Excluded**: `src/` (TypeScript source), `tests/`, `docs/`, `.cursor/plans/`, `sandbox/`, `node_modules/`

### 5.3 Plugin Installer Flow

When the user runs `Drive: Install Drive Plugin to Workspace`:

1. Creates `.cursor/` directory in workspace root
2. Copies `agents/`, `commands/`, `rules/` from VSIX to `.cursor/`
3. Merges `mcp.json` into `.cursor/mcp.json` (preserves existing servers)
4. Copies `drive-preprocessor.py` hook script to `.cursor/hooks/`
5. Updates `.cursor/hooks.json` to register `beforeSubmitPrompt` hook (idempotent)
6. Installs skills with gating — skips skills whose `requires:` are unmet (missing binaries, env vars, wrong OS)

The installer is idempotent: running it again overwrites plugin assets (update) and merges config without duplication.

---

## 6. Marketplace Considerations

### 6.1 VS Code Marketplace

- Largest extension distribution platform (~50K extensions)
- VSIX upload via `vsce publish`
- Requires publisher account and personal access token
- Extensions must pass automated review (no malware, valid manifest)
- Categories: Drive would list under "AI" and "Chat"

### 6.2 Cursor Marketplace

- Cursor has its own extension marketplace (subset of VS Code Marketplace)
- Not all VS Code extensions work in Cursor (API compatibility varies)
- Cursor-specific features (hooks, skills, MCP config) work only in Cursor
- No separate Cursor marketplace publishing — extensions installed from VS Code Marketplace or local VSIX

### 6.3 Distribution Strategy

| Channel | Audience | Mechanism |
|---|---|---|
| **VSIX file** | Developers, CI/CD | `npx vsce package` → `.vsix` file |
| **VS Code Marketplace** | Broad | `vsce publish` |
| **Git repository** | Contributors | Clone repo, `npm install`, `npm run compile` |
| **Plugin-only** | Users who don't want the extension | Copy `.cursor/` directory to workspace (AI gets Drive persona via skills, but no UI) |

---

## 7. Comparison: Cursor Plugin vs VS Code Extension

| Dimension | Cursor Plugin (`.cursor/`) | VS Code Extension (VSIX) |
|---|---|---|
| **Language** | Markdown, Python, JSON | TypeScript (compiled to JS) |
| **Runtime** | Cursor's AI engine + hook runner | VS Code extension host |
| **UI surfaces** | None (AI-only) | Webview, status bar, commands, keybindings |
| **AI behavior** | Skills, rules, commands, hooks | Only via MCP tools or workspace state |
| **Distribution** | Copy `.cursor/` to workspace | VSIX install or marketplace |
| **Testing** | Manual (AI interaction) | Jest, Playwright, programmatic |
| **Versioning** | File-level (git) | Semantic versioning in `package.json` |
| **Hot reload** | Immediate (Cursor re-reads on file change) | Requires `Developer: Reload Window` |
| **Dependency on extension** | Works independently (AI gets skills) | N/A |

---

## 8. Industry Context

### 8.1 Other IDE Plugin Ecosystems

| IDE | Plugin mechanism | AI integration |
|---|---|---|
| **Cursor** | `.cursor/` + VS Code extensions | MCP, hooks, skills, rules |
| **VS Code** | Extensions only | MCP, Chat Participants, Language Model API |
| **JetBrains** | IntelliJ plugins (Java/Kotlin) | ACP (Agent Client Protocol), AI Assistant |
| **Zed** | Extensions (WASM) + Slash Commands | ACP (JetBrains × Zed collaboration) |
| **Windsurf** | VS Code extensions (Codeium fork) | Proprietary flows API |
| **Claude Code** | MCP servers + `/mcp` config | MCP tools, agent teams |

### 8.2 MCP Adoption

MCP has become the de facto standard for agent-to-tool communication:

- **Spec version:** 1.0 (November 2025), with extensions (Apps, Connectors)
- **Adoption:** All major AI coding tools (Cursor, Claude Code, VS Code Copilot, Windsurf, Goose)
- **SDK:** `@modelcontextprotocol/sdk` v1.26.0 (TypeScript), Python SDK available
- **Transport direction:** Moving toward stateless StreamableHTTP; SSE being deprecated

Drive's use of `@modelcontextprotocol/sdk` with `StreamableHTTPServerTransport` aligns with the protocol's trajectory.
