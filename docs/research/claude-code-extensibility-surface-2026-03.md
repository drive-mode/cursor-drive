# Claude Code Extensibility Surface — Comprehensive Research Report

**Date:** 2026-03-27
**Purpose:** Document the full extensibility surface of Claude Code (Anthropic's terminal-based coding agent) that `claude-drive` can leverage to implement features inspired by `cursor-drive`.

**Sources:** Official Anthropic documentation at `docs.anthropic.com`, `code.claude.com`, `platform.claude.com`; web search results; existing Drive research in this repository.

---

## Table of Contents

1. [MCP Support](#1-mcp-support)
2. [Hooks System](#2-hooks-system)
3. [Settings & Configuration](#3-settings--configuration)
4. [Agent Teams (Multi-Agent)](#4-agent-teams-multi-agent)
5. [Subagents](#5-subagents)
6. [CLAUDE.md & Project Memory](#6-claudemd--project-memory)
7. [Plugins](#7-plugins)
8. [Agent SDK (Programmatic API)](#8-agent-sdk-programmatic-api)
9. [CLI API](#9-cli-api)
10. [Voice / Realtime](#10-voice--realtime)
11. [Status Line](#11-status-line)
12. [Channels (Push Messaging)](#12-channels-push-messaging)
13. [Mapping to claude-drive Features](#13-mapping-to-claude-drive-features)

---

## 1. MCP Support

Claude Code is an MCP **client** — it connects to MCP servers to consume tools, resources, and prompts. It does not expose an MCP server for external control (though `claude mcp serve` exposes Claude Code's own tools as an MCP server for other clients).

### Transport Types

| Transport | Status | Usage |
|-----------|--------|-------|
| **HTTP** | Recommended | Remote/cloud MCP servers |
| **SSE** | Deprecated | Legacy remote servers |
| **stdio** | Supported | Local processes, scripts |

### MCP Features Supported

| Feature | Supported | Notes |
|---------|-----------|-------|
| **Tools** | Yes | Full tool consumption; dynamic `list_changed` notifications |
| **Resources** | Yes | `@server:protocol://path` syntax for referencing |
| **Prompts** | Yes | Via MCP prompt protocol |
| **Sampling** | Unknown | Not explicitly documented |
| **Elicitation** | Yes | Form mode and URL mode; `Elicitation` / `ElicitationResult` hooks |
| **MCP Apps** | Not documented | No mention of MCP Apps as a surface |
| **Tool Search** | Yes | Deferred tool loading; only names loaded at start to save context |
| **OAuth 2.0** | Yes | Full OAuth support with `/mcp` auth flow, CIMD, dynamic registration |
| **Dynamic headers** | Yes | `headersHelper` runs shell commands to generate auth headers |

### Scoping

| Scope | Storage | Shared? |
|-------|---------|---------|
| **Local** (default) | `~/.claude.json` under project path | No |
| **Project** | `.mcp.json` at project root | Yes, via git |
| **User** | `~/.claude.json` global section | No |
| **Managed** | `managed-mcp.json` in system dirs | Yes, admin-deployed |
| **Plugin** | `.mcp.json` at plugin root or inline in `plugin.json` | Yes, with plugin |

### Key Capability: `claude mcp serve`

Claude Code can itself act as an MCP server exposing its built-in tools (Read, Edit, Bash, etc.) to other MCP clients. This is significant for `claude-drive`: a Drive process could connect to Claude Code as an MCP client, or vice versa.

### Relevance to claude-drive

- **Drive as MCP server:** Claude Code connects to Drive's MCP server at `:7891` via `.mcp.json`. Drive exposes tools like `drive_update_agent_screen`, `drive_speak`, `drive_register_operator`.
- **Plugin-bundled MCP:** A Drive plugin can bundle its MCP server, auto-starting when the plugin is enabled.
- **Tool Search:** With many MCP tools, tool search keeps context usage low by deferring tool definitions.
- **Managed MCP:** Enterprise admins can allowlist/denylist MCP servers via managed settings.

---

## 2. Hooks System

Claude Code has a comprehensive hooks system — the most important extensibility surface for prompt pipeline integration.

### Hook Events (Complete List)

| Event | Can Block? | Matcher | Drive Use Case |
|-------|-----------|---------|----------------|
| `SessionStart` | No | startup/resume/clear/compact | Initialize Drive state |
| `UserPromptSubmit` | Yes | None (always fires) | **Prompt pipeline** (filler clean, tangent detect, mode hints) |
| `PreToolUse` | Yes | Tool name | Approval gates, governance |
| `PermissionRequest` | Yes | Tool name | Policy enforcement |
| `PostToolUse` | No | Tool name | State sync, Agent Screen updates |
| `PostToolUseFailure` | No | Tool name | Error tracking |
| `Notification` | No | Notification type | UI notifications |
| `SubagentStart` | No | Agent type | Operator lifecycle tracking |
| `SubagentStop` | Yes | Agent type | Quality gates, merge decisions |
| `TaskCreated` | Yes | None | Task governance |
| `TaskCompleted` | Yes | None | Quality gates |
| `Stop` | Yes | None | Keep agent running |
| `StopFailure` | No | Error type | Error handling |
| `TeammateIdle` | Yes | None | Reassign work |
| `InstructionsLoaded` | No | Load reason | Context tracking |
| `ConfigChange` | Yes | Config source | Dynamic config |
| `CwdChanged` | No | None | Directory awareness |
| `FileChanged` | No | Filename | Watch config files |
| `WorktreeCreate` | Yes | None | Worktree management |
| `WorktreeRemove` | No | None | Cleanup |
| `PreCompact` | No | Manual/auto | Pre-compaction state save |
| `PostCompact` | No | Manual/auto | Post-compaction state restore |
| `Elicitation` | Yes | MCP server name | Control MCP elicitation |
| `ElicitationResult` | Yes | MCP server name | Validate elicitation responses |
| `SessionEnd` | No | End reason | Cleanup |

### Hook Handler Types

| Type | Description | Latency |
|------|-------------|---------|
| `command` | Shell script; receives JSON stdin, returns via exit code + stdout | Sync (600s timeout) |
| `http` | HTTP POST to URL; JSON body, JSON response | Sync (30s timeout) |
| `prompt` | Single-turn LLM call for yes/no decisions | Sync (30s timeout) |
| `agent` | Subagent with tool access for complex validation | Sync (60s timeout) |

### Key Capability: UserPromptSubmit

This is the equivalent of Cursor's `beforeSubmitPrompt`. Plain text on stdout **replaces** the user's prompt. JSON output can add `additionalContext`, `decision: "block"`, or modify behavior. This is the primary entry point for Drive's prompt pipeline.

### Hook Input

All hooks receive JSON with `session_id`, `transcript_path`, `cwd`, `permission_mode`, `hook_event_name`. When running as a subagent, `agent_id` and `agent_type` are also included.

### Hook Scopes

| Location | Scope |
|----------|-------|
| `~/.claude/settings.json` | All projects (user) |
| `.claude/settings.json` | Project (shared) |
| `.claude/settings.local.json` | Project (personal) |
| Managed policy | Organization-wide |
| Plugin `hooks/hooks.json` | When plugin is enabled |
| Skill/Agent frontmatter | While component is active |

### Relevance to claude-drive

The hooks system maps directly to cursor-drive's pipeline:

| cursor-drive Feature | Claude Code Hook |
|---------------------|-----------------|
| `beforeSubmitPrompt` | `UserPromptSubmit` |
| Filler cleaning | `UserPromptSubmit` (stdout replaces prompt) |
| Tangent detection | `UserPromptSubmit` (block or modify) |
| Approval gates | `PreToolUse` + `PermissionRequest` |
| Operator lifecycle | `SubagentStart` / `SubagentStop` |
| Quality gates | `TaskCompleted` / `TeammateIdle` / `SubagentStop` |
| State sync | `PostToolUse` (observe tool results) |

---

## 3. Settings & Configuration

### Settings Hierarchy (highest to lowest priority)

1. **Managed** — Server-managed, MDM/OS-level, or file-based (`managed-settings.json`)
2. **Command-line flags** — Session overrides
3. **Local** — `.claude/settings.local.json` (gitignored)
4. **Project** — `.claude/settings.json` (committed)
5. **User** — `~/.claude/settings.json`

### Key Settings for claude-drive

| Setting | Type | Purpose |
|---------|------|---------|
| `hooks` | Object | Define lifecycle hooks |
| `permissions.allow/deny/ask` | Arrays | Tool permission rules |
| `model` | String | Override default model |
| `availableModels` | Array | Restrict model selection |
| `statusLine` | Object | Custom status bar |
| `agent` | String | Run as named subagent |
| `teammateMode` | String | Agent team display mode |
| `env` | Object | Environment variables |
| `sandbox.enabled` | Boolean | Bash sandboxing |
| `worktree.*` | Object | Git worktree config |
| `effortLevel` | String | Model effort level |
| `voiceEnabled` | Boolean | Voice dictation toggle |
| `language` | String | Response and dictation language |
| `autoMemoryEnabled` | Boolean | Auto memory toggle |
| `plansDirectory` | String | Custom plan file location |
| `fileSuggestion` | Object | Custom `@` file autocomplete |
| `outputStyle` | String | Response style adjustment |

### Managed Settings (Enterprise)

Managed settings cannot be overridden. Key managed-only settings:

- `disableBypassPermissionsMode` — Prevent `--dangerously-skip-permissions`
- `disableAutoMode` — Prevent auto mode
- `allowManagedHooksOnly` — Only allow managed hooks
- `allowManagedPermissionRulesOnly` — Only allow managed permission rules
- `allowManagedMcpServersOnly` — Only allow managed MCP servers
- `channelsEnabled` — Enable/disable channels
- `companyAnnouncements` — Display messages at startup

### Permission Rule Syntax

Rules follow `Tool` or `Tool(specifier)` format with glob-like matching:

- `Bash(npm run *)` — Allow npm run commands
- `Read(./.env)` — Match reading .env
- `WebFetch(domain:example.com)` — Match fetches to domain
- `Agent(my-agent)` — Match specific subagent

---

## 4. Agent Teams (Multi-Agent)

Agent teams are Claude Code's multi-agent coordination system. **Experimental** — requires `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`.

### Architecture

| Component | Role |
|-----------|------|
| **Team lead** | Main session; creates team, spawns teammates, coordinates |
| **Teammates** | Separate Claude Code instances with independent context |
| **Task list** | Shared work items with pending/in_progress/completed states and dependencies |
| **Mailbox** | Inter-agent messaging (message + broadcast) |

### Storage

- Team config: `~/.claude/teams/{team-name}/config.json` — `members` array with `name`, `agent_id`, `agent_type`
- Task list: `~/.claude/tasks/{team-name}/` — `.lock`, `.highwatermark`, `1.json`…`N.json`
- Inboxes: `~/.claude/teams/{team-name}/inboxes/`

### Display Modes

| Mode | Description |
|------|-------------|
| `in-process` | All in main terminal; `Shift+Down` to cycle |
| `tmux` | Split panes in tmux or iTerm2 |
| `auto` (default) | tmux if in tmux session, else in-process |

### Limitations

- No session resumption for in-process teammates
- One team per session; no nested teams
- Leader is fixed for team lifetime
- Permissions set at spawn (inherit from lead)
- Teammates cannot spawn their own teams
- Task status can lag

### Agent Team Hooks

| Hook | Purpose |
|------|---------|
| `TeammateIdle` | Runs when teammate about to go idle; exit 2 to keep working |
| `TaskCreated` | Runs when task created; exit 2 to prevent |
| `TaskCompleted` | Runs when task marked complete; exit 2 to prevent |

### Relevance to claude-drive

| cursor-drive Concept | Agent Teams Mapping |
|---------------------|-------------------|
| Operator pool | Team members |
| Spawn operator | Natural language to lead (no programmatic API) |
| Switch operator | Direct messaging to teammates |
| Merge | No direct equivalent; custom MCP tool needed |
| Dismiss operator | Ask lead to shut down teammate |
| Per-operator permissions | Not at spawn time; can change after |

---

## 5. Subagents

Subagents are specialized agents that run within a single session with independent context windows.

### Built-in Subagents

| Agent | Model | Tools | Purpose |
|-------|-------|-------|---------|
| **Explore** | Haiku | Read-only | Codebase search/analysis |
| **Plan** | Inherited | Read-only | Research for plan mode |
| **General-purpose** | Inherited | All | Complex multi-step tasks |
| **Bash** | Inherited | Terminal | Running commands |

### Custom Subagent Configuration (Frontmatter)

| Field | Description |
|-------|-------------|
| `name` | Unique identifier |
| `description` | When to delegate |
| `tools` / `disallowedTools` | Tool allow/deny lists |
| `model` | sonnet/opus/haiku/inherit or full ID |
| `permissionMode` | default/acceptEdits/dontAsk/bypassPermissions/plan |
| `maxTurns` | Max agentic turns |
| `skills` | Skills to preload |
| `mcpServers` | Scoped MCP servers (inline or reference) |
| `hooks` | Lifecycle hooks scoped to subagent |
| `memory` | Persistent memory (user/project/local) |
| `background` | Run as background task |
| `effort` | Effort level override |
| `isolation` | `worktree` for git-isolated execution |
| `initialPrompt` | Auto-submitted first turn |

### Subagent Scopes

| Location | Priority |
|----------|----------|
| `--agents` CLI flag | 1 (highest) |
| `.claude/agents/` | 2 (project) |
| `~/.claude/agents/` | 3 (user) |
| Plugin `agents/` | 4 (lowest) |

### Persistent Memory

Subagents can maintain memory across sessions with `memory: user|project|local`. Storage at `~/.claude/agent-memory/{agent-name}/` with a `MEMORY.md` index.

### Relevance to claude-drive

- **Operator types → Subagent definitions:** Each Drive operator personality/capability maps to a subagent with custom prompt, tools, and model.
- **Tangent → Subagent:** Fork work to a subagent; it reports back.
- **Programmatic spawn:** Agent SDK supports `agents` parameter for defining and spawning subagents.
- **Scoped MCP:** Each operator/subagent can have its own MCP servers.
- **Worktree isolation:** `isolation: "worktree"` gives each operator its own git worktree.

---

## 6. CLAUDE.md & Project Memory

### CLAUDE.md Files

Persistent instructions loaded at session start. Equivalent to cursor-drive's skill and rule system.

| Scope | Location | Shared? |
|-------|---------|---------|
| Managed policy | System directories | All users |
| Project | `./CLAUDE.md` or `./.claude/CLAUDE.md` | Via git |
| User | `~/.claude/CLAUDE.md` | Personal |

Features:
- **Imports:** `@path/to/file` syntax to pull in other files
- **Subdirectory loading:** CLAUDE.md in subdirs loads on demand
- **AGENTS.md compatibility:** Can import `@AGENTS.md` for cross-tool compatibility
- **HTML comments stripped:** Block comments removed before injection (save tokens)

### .claude/rules/

Path-scoped rules in `.claude/rules/*.md` with optional `paths` frontmatter for glob-based file matching. Loaded at session start or on demand when matching files are opened.

### Auto Memory

Claude automatically saves learnings across sessions:
- Storage: `~/.claude/projects/{project}/memory/`
- `MEMORY.md` index (first 200 lines loaded at session start)
- Topic files loaded on demand
- Toggle: `autoMemoryEnabled` setting or `/memory` command

### Relevance to claude-drive

| cursor-drive Feature | Claude Code Equivalent |
|---------------------|----------------------|
| `.cursor/rules/*.mdc` | `.claude/rules/*.md` with `paths` frontmatter |
| `.cursor/skills/` | `.claude/skills/` (invoked by name) |
| `CLAUDE.md` in repo root | `CLAUDE.md` (identical concept) |
| Drive persona instructions | Subagent system prompt + skills |
| Operator memory | Subagent persistent memory |

---

## 7. Plugins

Plugins are the distribution mechanism for bundling skills, agents, hooks, MCP servers, LSP servers, and settings.

### Plugin Structure

```
my-plugin/
├── .claude-plugin/
│   └── plugin.json        # Manifest (name, version, description)
├── commands/              # Slash commands (Markdown)
├── agents/                # Custom subagent definitions
├── skills/                # Agent Skills (SKILL.md)
├── hooks/
│   └── hooks.json         # Event handlers
├── .mcp.json              # MCP server configs
├── .lsp.json              # LSP server configs
└── settings.json          # Default settings (only `agent` key supported)
```

### Plugin Distribution

- **Local:** `--plugin-dir ./my-plugin` for development
- **Marketplace:** Install via `claude plugin install name@marketplace`
- **Official marketplace:** Submit via claude.ai or platform.claude.com
- **Team marketplace:** GitHub repos as plugin sources

### Plugin Restrictions

Plugin subagents **cannot** use `hooks`, `mcpServers`, or `permissionMode` frontmatter fields (security restriction). These must be promoted to `.claude/agents/` or `~/.claude/agents/`.

### Relevance to claude-drive

A Drive plugin for Claude Code would bundle:
- **Skills:** Drive persona, concise-first response, mode awareness
- **Agents:** Operator subagent definitions with Drive system prompts
- **Hooks:** `UserPromptSubmit` for prompt pipeline, `SubagentStart/Stop` for lifecycle
- **MCP server:** Drive MCP server at `:7891` for state updates, TTS, Agent Screen
- **Commands:** `/drive`, `/operator`, `/tangent`, etc.

---

## 8. Agent SDK (Programmatic API)

The Agent SDK provides Python and TypeScript libraries for running Claude Code programmatically.

### Installation

```bash
# TypeScript
npm install @anthropic-ai/claude-agent-sdk

# Python
pip install claude-agent-sdk
```

### Core API: `query()`

```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

for await (const message of query({
  prompt: "Find and fix the bug in auth.py",
  options: {
    allowedTools: ["Read", "Edit", "Bash"],
    permissionMode: "acceptEdits",
    agents: {
      "code-reviewer": {
        description: "Expert code reviewer",
        prompt: "You are a senior code reviewer.",
        tools: ["Read", "Glob", "Grep"]
      }
    },
    hooks: {
      PostToolUse: [{ matcher: "Edit|Write", hooks: [logCallback] }]
    },
    mcpServers: {
      playwright: { command: "npx", args: ["@playwright/mcp@latest"] }
    }
  }
})) {
  console.log(message);
}
```

### SDK Capabilities

| Capability | Support |
|-----------|---------|
| Built-in tools | Read, Write, Edit, Bash, Glob, Grep, WebSearch, WebFetch, AskUserQuestion |
| Hooks | Callback functions (PreToolUse, PostToolUse, Stop, SessionStart, etc.) |
| Subagents | Define via `agents` option with full configuration |
| MCP servers | Connect via `mcpServers` option |
| Sessions | Resume via `session_id`; fork sessions |
| Permissions | `allowedTools`, `permissionMode` |
| Structured output | `--json-schema` for validated JSON responses |
| Streaming | `stream-json` output format with partial messages |
| Skills/Memory/Plugins | Via `settingSources`, `plugins` options |
| Authentication | `ANTHROPIC_API_KEY`, Bedrock, Vertex, Foundry |

### SDK vs CLI vs Claude Code Interactive

| Use Case | Best Choice |
|----------|-------------|
| Interactive development | Claude Code CLI |
| CI/CD pipelines | Agent SDK |
| Custom applications | Agent SDK |
| One-off tasks | CLI (`claude -p`) |
| Production automation | Agent SDK |

### Relevance to claude-drive

The Agent SDK is how `claude-drive` can programmatically:
- **Spawn operators:** Create subagents with custom prompts, tools, and MCP servers
- **Pipeline integration:** Use SDK hooks (callback functions) for prompt preprocessing
- **State management:** Track sessions, resume conversations
- **Structured output:** Get validated JSON from agents for state sync
- **MCP integration:** Connect Drive's MCP server to spawned agents

---

## 9. CLI API

### Key Commands

| Command | Description |
|---------|-------------|
| `claude` | Interactive REPL |
| `claude -p "query"` | Non-interactive (print mode) |
| `claude -c` | Continue most recent conversation |
| `claude -r "name"` | Resume by session ID or name |
| `claude mcp add/list/get/remove` | Manage MCP servers |
| `claude mcp serve` | Run Claude Code as MCP server |
| `claude agents` | List configured subagents |
| `claude plugin install/list/remove` | Manage plugins |
| `claude auth login/logout/status` | Authentication |
| `claude update` | Update to latest version |
| `claude remote-control` | Control from Claude.ai |
| `claude auto-mode defaults` | Print auto mode rules |

### Key Flags for Programmatic Use

| Flag | Purpose |
|------|---------|
| `--bare` | Skip auto-discovery; fast startup for scripts |
| `--allowedTools` | Pre-approve tools |
| `--output-format json\|stream-json` | Structured output |
| `--json-schema` | Validated JSON output |
| `--model` | Set model |
| `--agent` | Run as named subagent |
| `--agents` | Define subagents via JSON |
| `--mcp-config` | Load MCP servers from JSON |
| `--append-system-prompt` | Add to system prompt |
| `--system-prompt` | Replace system prompt |
| `--worktree` | Isolated git worktree |
| `--continue` / `--resume` | Session management |
| `--max-turns` | Limit agentic turns |
| `--max-budget-usd` | Cost limit |
| `--permission-mode` | Set permission mode |
| `--channels` | Enable channel notifications |
| `--plugin-dir` | Load plugins from directory |
| `--settings` | Load additional settings |

### Session Management

- Sessions persist to disk by default
- Resume by ID: `claude -r "session-id"`
- Resume by name: `claude -r "auth-refactor"`
- Fork sessions: `--fork-session` with `--resume`
- Link to PRs: `--from-pr 123`

---

## 10. Voice / Realtime

### Voice Dictation in Claude Code

Claude Code has **push-to-talk voice dictation** (`/voice` command):
- Hold `Space` (or custom key) to record
- Speech transcribed live into prompt input
- Requires Claude.ai account (uses streaming STT service)
- Local microphone access only (no remote/SSH)
- 20+ languages supported
- Tuned for coding vocabulary (regex, OAuth, JSON, etc.)
- Configurable keybinding via `~/.claude/keybindings.json`

### No Anthropic Realtime/Voice API

Anthropic does **not** have a general-purpose realtime voice API comparable to OpenAI's Realtime API. Voice in Claude Code is:
- Input only (STT for dictation)
- Requires Claude.ai subscription
- Local microphone, not an API
- No streaming voice output / TTS API from Anthropic

### Relevance to claude-drive

| cursor-drive Feature | Claude Code Equivalent |
|---------------------|----------------------|
| Voice input (continuous listening) | Push-to-talk dictation (hold key) |
| Wake word | Not supported |
| TTS output (say.js, Edge-TTS, Piper) | No equivalent; Drive must provide its own TTS |
| Voice-first UX | Dictation is supplementary, not primary |

**Gap:** Claude Code's voice is input-only and push-to-talk. Drive's voice-first, continuous-listening, TTS-output model must be provided by the Drive layer itself, potentially via MCP tools that Claude Code calls.

---

## 11. Status Line

Claude Code has a customizable status bar at the bottom of the terminal.

### Configuration

```json
{
  "statusLine": {
    "type": "command",
    "command": "~/.claude/statusline.sh",
    "padding": 2
  }
}
```

### Available Data (JSON on stdin)

| Field | Description |
|-------|-------------|
| `model.id`, `model.display_name` | Current model |
| `workspace.current_dir`, `workspace.project_dir` | Directories |
| `cost.total_cost_usd`, `cost.total_duration_ms` | Session cost/time |
| `context_window.used_percentage` | Context usage |
| `session_id` | Session identifier |
| `agent.name` | Active agent name |
| `worktree.name`, `worktree.path` | Worktree info |
| `vim.mode` | Vim mode state |
| `rate_limits.*` | Rate limit usage |

### Capabilities

- Multiple lines (each echo = separate row)
- ANSI colors
- Clickable links (OSC 8)
- Runs after each assistant message
- 300ms debounce

### Relevance to claude-drive

The status line is claude-drive's equivalent of cursor-drive's `statusBar.ts`. A Drive status line script can display:
- Current Drive mode (plan/agent/ask/debug)
- Active operator name
- Operator count
- Drive state indicators

---

## 12. Channels (Push Messaging)

Channels are a research preview feature that lets MCP servers push messages into Claude Code sessions.

### How It Works

- MCP server declares `claude/channel` capability
- User opts in with `--channels plugin:name@marketplace` at startup
- Server pushes messages; Claude reacts to external events
- Use cases: CI results, monitoring alerts, chat messages (Telegram, Discord)

### Managed Settings

- `channelsEnabled` — Admin toggle
- `allowedChannelPlugins` — Allowlist of channel plugins

### Relevance to claude-drive

Channels could enable:
- **External event reactions:** Drive could push operator status changes, alerts, or coordination messages into Claude Code sessions
- **Cross-session communication:** Operators in different sessions could communicate via channel messages
- **CI/webhook integration:** Build results, deployment status pushed to Drive-managed sessions

---

## 13. Mapping to claude-drive Features

### Prompt Pipeline

| cursor-drive Component | Claude Code Implementation |
|-----------------------|---------------------------|
| `beforeSubmitPrompt` hook | `UserPromptSubmit` hook (command or HTTP) |
| `fillerCleaner.ts` | `UserPromptSubmit` hook — stdout replaces prompt |
| `sanitizer.ts` | `UserPromptSubmit` hook — additional processing |
| `glossaryExpander.ts` | `UserPromptSubmit` hook or skill preload |
| `router.ts` (intent) | `UserPromptSubmit` hook — classify and modify prompt |
| `promptOptimizer.ts` | `UserPromptSubmit` hook — rewrite prompt before submission |
| `tangentFlow.ts` | `UserPromptSubmit` — detect tangent, spawn subagent or block |

### Governance & Approval

| cursor-drive Component | Claude Code Implementation |
|-----------------------|---------------------------|
| `approvalGates.ts` | `PreToolUse` hooks + permission rules in settings |
| Policy enforcement | `PermissionRequest` hooks + `permissions.deny` rules |
| Action audit | `PostToolUse` hooks for logging |
| Cost control | `--max-budget-usd` flag + status line cost display |

### Multi-Operator / Agent Coordination

| cursor-drive Component | Claude Code Implementation |
|-----------------------|---------------------------|
| `operatorRegistry.ts` | Subagent definitions + Agent SDK `agents` param |
| Spawn operator | Agent SDK `query()` with `agents`, or subagent definitions |
| Switch operator | Agent teams (teammate messaging) or subagent selection |
| Dismiss operator | `SubagentStop` hook + team lead shutdown command |
| Merge operator | Custom MCP tool (no native equivalent) |
| Operator permissions | Subagent `tools`/`disallowedTools` + `permissionMode` |
| Operator hierarchy | Subagent nesting rules (subagents cannot spawn subagents) |

### State & UI

| cursor-drive Component | Claude Code Implementation |
|-----------------------|---------------------------|
| `statusBar.ts` | Status line script |
| `agentScreen.ts` (S-AS) | No direct equivalent; TUI, VS Code extension, or web UI via MCP |
| `driveSidebar.ts` | No direct equivalent; status line + `/agents` command |
| `driveMode.ts` | Settings `agent` + subagent system prompt + `UserPromptSubmit` mode hints |

### Voice & TTS

| cursor-drive Component | Claude Code Implementation |
|-----------------------|---------------------------|
| Voice input (continuous) | Push-to-talk dictation (partial match) |
| Wake word | Not available |
| `tts.ts` (output) | Drive MCP tool `drive_speak` (Claude Code calls it) |
| `edgeTts.ts`, `piper.ts` | Drive-provided; runs as MCP server process |

### Configuration & Memory

| cursor-drive Component | Claude Code Implementation |
|-----------------------|---------------------------|
| `config.ts` (Zod schemas) | `settings.json` hierarchy |
| `.cursor/rules/*.mdc` | `.claude/rules/*.md` with `paths` frontmatter |
| `.cursor/skills/` | `.claude/skills/` + plugin skills |
| Operator memory | Subagent persistent memory (`memory` field) |
| Auto memory | Auto memory (MEMORY.md) |

### Cloud / Remote Execution

| cursor-drive Feature | Claude Code Equivalent |
|---------------------|----------------------|
| Cursor Cloud Agents | `claude --remote` (web sessions) |
| Programmatic execution | Agent SDK `query()` |
| CI/CD integration | `claude -p --bare` + GitHub Actions/GitLab CI |
| Remote control | `claude remote-control` (control from claude.ai) |

---

## Summary: Extensibility Surface Ranking

| Surface | Maturity | Relevance to claude-drive |
|---------|----------|--------------------------|
| **Hooks** | Stable | Critical — prompt pipeline, governance, lifecycle |
| **MCP (client)** | Stable | Critical — Drive as MCP server, tool exposure |
| **Subagents** | Stable | High — operator definitions, programmatic spawn |
| **Agent SDK** | Stable | High — programmatic control, CI/CD, spawn |
| **Plugins** | Stable | High — distribution, bundling skills/hooks/MCP |
| **CLAUDE.md / Rules** | Stable | High — persistent instructions, path-scoped rules |
| **CLI API** | Stable | High — scripting, automation |
| **Settings** | Stable | Medium — configuration, permissions |
| **Status Line** | Stable | Medium — UI state display |
| **Agent Teams** | Experimental | Medium — multi-agent coordination |
| **Voice Dictation** | Stable | Low — push-to-talk only, no TTS |
| **Channels** | Research Preview | Low — push messaging, future potential |
| **Realtime/Voice API** | None | N/A — Anthropic has no voice API |

### Critical Gaps for claude-drive

1. **No TTS / voice output API** — Drive must provide its own TTS layer via MCP tools
2. **No Agent Screen equivalent** — Terminal-based; must build TUI or separate UI
3. **No programmatic teammate spawn** — Agent teams require natural language
4. **No merge operator** — Must implement via custom MCP tools
5. **No per-teammate permissions at spawn** — All inherit from lead
6. **Push-to-talk only** — No continuous listening or wake word
7. **Subagents cannot spawn subagents** — Limits operator hierarchy depth
