# Drive on Claude Code — Research Report

What is needed from Claude Code to build Drive mode as an MCP app or plugin, and how to structure the codebase with `claude/` and `cursor/`.

**Sources:** [Claude Code agent-teams](https://code.claude.com/docs/en/agent-teams), [hooks](https://code.claude.com/docs/en/hooks), [plugins](https://code.claude.com/docs/en/plugins-reference), [headless](https://code.claude.com/docs/en/headless), cursor-drive repo audit, parallel subagent research.

---

## Executive Summary

| Approach | Feasibility | Notes |
|----------|-------------|-------|
| **Drive as Claude Code plugin** | High | Hooks (UserPromptSubmit, SubagentStart, SubagentStop, TeammateIdle, TaskCompleted), skills, agents map well. |
| **Drive as MCP server for Claude Code** | High | Claude Code connects to MCP servers. Drive can run at :7891; Claude Code connects via `.mcp.json`. |
| **Spawn operators via Agent SDK** | High | `claude -p` or Agent SDK `query()` with `agents` for programmatic subagent spawns. |
| **Agent Screen for Claude Code** | Medium | No built-in equivalent. Use TUI, VS Code extension panel, or web UI via MCP. |
| **Full operator model (merge, per-operator permissions)** | Partial | Agent teams lack nested teams, per-teammate permissions at spawn. Subagents fit tangent; teams fit switch. Merge needs custom MCP tool. |

---

## 1. Claude Code API Gaps (What's Missing)

### 1.1 No MCP Server for Claude Code

Claude Code is an MCP **client**. There is no MCP server that lets external tools invoke Claude Code (spawn sessions, send prompts, read task list). Integration options:

- **File-based:** Read `~/.claude/tasks/{team-name}/` and `~/.claude/teams/{team-name}/config.json`
- **CLI:** `claude -p "prompt"` for headless runs
- **Agent SDK:** `query(prompt, { agents })` for programmatic subagent spawns

### 1.2 Task List Schema

| Resource | Path | Schema (inferred) |
|----------|------|-------------------|
| Task list | `~/.claude/tasks/{team-name}/` | `{session-uuid}/` or `{team-name}/` with `.lock`, `.highwatermark`, `1.json`…`N.json` (status, description, dependencies, ownership) |
| Team config | `~/.claude/teams/{team-name}/config.json` | `members` array: `name`, `agent_id`, `agent_type` |

Task tools (TaskCreate, TaskList, TaskUpdate) had runtime gaps ([#23816](https://github.com/anthropics/claude-code/issues/23816)); status may have improved.

### 1.3 UserPromptSubmit — Prompt Modification

**Yes.** Plain text stdout (or equivalent HTTP response) from a `UserPromptSubmit` hook can replace the prompt. [egghead.io lesson](https://egghead.io/lessons/rewrite-prompts-on-the-fly-with-user-prompt-submit-hooks~76rrt) demonstrates this. Drive's filler cleaning and tangent detection can run in this hook.

### 1.4 Programmatic Spawn

| Type | API | Notes |
|------|-----|-------|
| **Subagents** | Agent SDK `agents` param, `claude -p` | Programmatic spawn with per-agent tool limits |
| **Teammates** | Natural language only | No documented programmatic spawn API |

### 1.5 SubagentStart / SubagentStop Hooks

- **SubagentStart:** `agent_id`, `agent_type` + common fields. Can add context; cannot block.
- **SubagentStop:** `agent_id`, `agent_type`, `agent_transcript_path`, `last_assistant_message`, `stop_hook_active` + common fields. Can block with `decision: "block"`.

---

## 2. Codebase Mapping — Cursor vs Portable

### 2.1 Component Portability

| Component | Portable? | Cursor Dependencies |
|-----------|-----------|---------------------|
| `fillerCleaner.ts` | Yes | None |
| `router.ts` | Yes | None |
| `operatorRegistry.ts` | Mostly | `vscode.workspace.getConfiguration` for name pool |
| `pipeline.ts` | No | `vscode.window.*`, `vscode.commands`, AgentScreenPanel, speak |
| `tangentFlow.ts` | No | `vscode.window.showInformationMessage`, `showInputBox` |
| `approvalGates.ts` | No | `vscode.window.*`, `vscode.workspace.*` |
| `modelSelector.ts` | No | `vscode.LanguageModelChat`, `vscode.CancellationToken` |
| `modelUtils.ts` | No | `vscode.lm.selectChatModels` |

### 2.2 Cursor-Only Surfaces

| Surface | File | Claude Code Equivalent |
|---------|------|------------------------|
| beforeSubmitPrompt | `.cursor/hooks/drive-preprocessor.py` | `UserPromptSubmit` hook |
| Status bar | `src/statusBar.ts` | Terminal status line or none |
| Agent Screen | `src/agentScreen.ts` | None; TUI or VS Code extension |
| Voice commands | `src/voiceCommands.ts`, `extension.ts` | Terminal input only |

### 2.3 Drive MCP Tools → Claude Code

Drive exposes MCP tools at `http://127.0.0.1:7891/mcp`. Claude Code can connect:

```json
{
  "mcpServers": {
    "drive": {
      "url": "http://127.0.0.1:7891/mcp"
    }
  }
}
```

**Tools that work with Claude Code:** `tts_speak`, `tts_stop`, `persistent_memory_*`, `operator_*` (spawn, switch, list, merge, etc.), `drive_run_pipeline`, `drive_pipeline_stats`.

**Tools that need adaptation:** `agent_screen_*` (no Drive UI), `cursor_cli_*` (Cursor-specific), `cloud_agent_*` (Cursor API), `drive_set_mode` (uses `vscode.window.showQuickPick`).

---

## 3. Architecture Proposal — claude/ vs cursor/

### 3.1 Proposed Directory Layout

```
cursor-drive/
├── claude/                    # Claude Code plugin
│   └── plugins/drive/
│       └── .claude-plugin/
│           ├── plugin.json
│           ├── hooks/
│           │   └── hooks.json
│           ├── skills/        # From .cursor-plugin/skills/
│           ├── agents/        # From .cursor-plugin/agents/
│           ├── commands/
│           └── .mcp.json      # Optional: bundle Drive MCP
├── cursor/                    # Cursor/VS Code extension (current codebase)
│   ├── src/                   # extension.ts, agentScreen, statusBar, etc.
│   ├── .cursor/
│   │   ├── hooks.json
│   │   └── hooks/
│   └── package.json
├── shared/                    # Portable logic
│   ├── fillerCleaner.ts
│   ├── router.ts
│   ├── operatorRegistry.ts   # Abstract config
│   └── tangentNameExtractor.ts
└── docs/
```

### 3.2 What Moves Where

| From | To | Notes |
|------|-----|-------|
| `fillerCleaner.ts`, `router.ts` | `shared/` | Pure logic |
| `tangentNameExtractor.ts` | `shared/` | Pure logic |
| `.cursor-plugin/skills/*` | `claude/plugins/drive/skills/` | Same layout |
| `.cursor-plugin/agents/*` | `claude/plugins/drive/agents/` | Same layout |
| `drive-preprocessor.py` logic | `claude/` hooks (UserPromptSubmit) | Filler, tangent, mode hints |
| `src/extension.ts`, `agentScreen.ts`, etc. | `cursor/` | Cursor-specific |
| `src/mcpServer.ts` | Shared or `cursor/` | MCP server; some tools Cursor-specific |

### 3.3 Drive Plugin Hooks for Claude Code

| Hook | Role |
|------|------|
| **UserPromptSubmit** | Filler clean, tangent detection, mode/escale hints; return modified prompt or block |
| **SubagentStart** | Log, inject Drive persona context (cannot block) |
| **SubagentStop** | Emit completion, optional quality gate (block with reason) |
| **TeammateIdle** | Quality gate; exit 2 to keep teammate working |
| **TaskCompleted** | Quality gate; exit 2 to prevent completion |

---

## 4. Operator Model — Subagents vs Agent Teams

| Drive Concept | Subagents | Agent Teams |
|---------------|-----------|-------------|
| **Tangent** (spawn focused sub-work) | Yes — report back only | Overkill; coordination overhead |
| **Switch** (change active operator) | No — single caller | Yes — Shift+Down, direct messaging |
| **Merge** (combine results) | Manual in caller | Lead synthesizes; no explicit merge |
| **Delegate** | Yes | Yes — task assignment |

**Gaps:**

- **Merge:** Neither model has explicit merge. Implement via MCP tool (`operator_merge`) that updates shared state and optionally triggers git merge.
- **Per-operator permissions:** Agent teams inherit lead's permissions; no per-teammate at spawn. [Issue #29333](https://github.com/anthropics/claude-code/issues/29333) tracks this.
- **Nested teams:** Not supported. Drive's operator hierarchy (parent/child, cascade dismiss) would need a custom layer.

---

## 5. Agent Screen for Claude Code

Claude Code is terminal-based. Options:

| Option | Feasibility | Notes |
|--------|-------------|-------|
| **TUI** | Medium | Terminal UI showing operator activity; read from `~/.claude/` or MCP |
| **VS Code extension** | High | Claude Code has VS Code extension; add Drive panel that reads MCP or `~/.claude/` |
| **Web UI** | Medium | MCP server exposes `/screen` endpoint; browser connects |
| **Split panes** | Limited | tmux/iTerm2 only; not VS Code integrated terminal, Windows Terminal |

---

## 6. What Claude Code Needs (Feature Requests)

| Need | Status | Reference |
|------|--------|-----------|
| MCP server to invoke Claude Code | Not available | External tools use CLI or Agent SDK |
| Programmatic teammate spawn | Natural language only | Subagents: Agent SDK `agents` |
| Task list API | Task tools had gaps | [#23816](https://github.com/anthropics/claude-code/issues/23816) |
| Per-teammate permissions at spawn | Requested | [#29333](https://github.com/anthropics/claude-code/issues/29333) |
| UserPromptSubmit prompt rewrite | Supported | Plain text stdout replaces prompt |

---

## 7. Priority Build List for Drive on Claude Code

1. **Extract shared/ package** — `fillerCleaner`, `router`, `tangentNameExtractor` with no vscode deps.
2. **Create claude/ plugin skeleton** — `plugins/drive/.claude-plugin/` with plugin.json, hooks/hooks.json.
3. **Implement UserPromptSubmit hook** — Filler clean, tangent detect, mode hints; return modified prompt.
4. **Port Drive skills** — Copy tangent, switch, merge, drive-persona, plan-* from `.cursor-plugin/skills/`.
5. **Run Drive MCP server for Claude Code** — Ensure Claude Code can connect; adapt tools that use vscode.
6. **SubagentStart/SubagentStop hooks** — Log, inject context, optional quality gate.
7. **Agent Screen for Claude Code** — TUI or VS Code extension panel reading `~/.claude/` or MCP.
8. **operator_merge MCP tool** — Implement merge semantics for agent teams (state + optional git).
9. **Reorganize cursor/** — Move Cursor-specific code under `cursor/`; keep shared in `shared/`.
10. **Document compatibility matrix** — Which Drive features work on Cursor vs Claude Code.

---

## 8. References

- [Claude Code agent-teams](https://code.claude.com/docs/en/agent-teams)
- [Claude Code hooks](https://code.claude.com/docs/en/hooks)
- [Claude Code plugins reference](https://code.claude.com/docs/en/plugins-reference)
- [Run Claude Code programmatically](https://code.claude.com/docs/en/headless)
- [Claude Code in VS Code](https://code.claude.com/docs/en/vs-code)
- [Agent SDK subagents](https://docs.anthropic.com/en/docs/claude-code/sdk/subagents)
- [UserPromptSubmit prompt rewrite](https://egghead.io/lessons/rewrite-prompts-on-the-fly-with-user-prompt-submit-hooks~76rrt)
- [anthropics/claude-code#23816](https://github.com/anthropics/claude-code/issues/23816) — Task tools
- [anthropics/claude-code#29333](https://github.com/anthropics/claude-code/issues/29333) — Per-teammate permissions
