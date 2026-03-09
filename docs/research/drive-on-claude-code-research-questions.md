# Drive on Claude Code — Research Questions

Generated from analysis of [Claude Code agent-teams docs](https://code.claude.com/docs/en/agent-teams) and cursor-drive repo audit.

## Context

Goal: Build Drive mode as an MCP app or plugin for Claude Code. Possible structure:
- `claude/` — Claude Code plugin/MCP app
- `cursor/` — Cursor-specific extension (current codebase reorganized)

---

## Research Question List (for parallel subagents)

### A. Claude Code API & Extensibility Gaps

1. **Does Claude Code expose an MCP server?** Search docs and web for any MCP server that lets external tools invoke Claude Code (spawn sessions, send prompts, read task list).

2. **What is the exact schema of `~/.claude/tasks/{team-name}/` and `~/.claude/teams/{team-name}/config.json`?** Needed for file-based integration. Search Claude Code source or docs.

3. **Can HTTP hooks receive `UserPromptSubmit` and return modified prompts?** Drive's beforeSubmitPrompt modifies prompts (filler clean, tangent detect). Does Claude Code support prompt modification in hooks?

4. **Is there a programmatic API to spawn teammates or subagents?** Docs say "natural language" only. Search for Agent SDK, headless mode, or CLI flags.

5. **What hooks does Claude Code support for `SubagentStart` / `SubagentStop`?** Drive needs to observe and potentially control subagent lifecycle. Compare to Cursor's beforeSubmitPrompt.

### B. Codebase Mapping — Cursor vs Claude Code

6. **Which Drive components are Cursor-specific (VS Code extension, Composer) vs portable?** Map: pipeline, fillerCleaner, router, operatorRegistry, tangentFlow, approvalGates, modelSelector. List dependencies on `vscode` namespace.

7. **What would a `claude/` directory need?** Plugin structure: `plugins/drive/.claude-plugin/` with plugin.json, hooks, skills, agents. What skills/agents from `.cursor-plugin/` map directly? What needs adaptation?

8. **How does Drive's MCP server (`mcpServer.ts`, :7891) differ from Claude Code's MCP client?** Drive *provides* MCP tools. Claude Code *consumes* MCP servers. Can Drive run as an MCP server that Claude Code connects to? What tools would Claude Code need?

9. **What is the Cursor-only surface?** beforeSubmitPrompt (Cursor hooks), status bar, Agent Screen webview, voice commands (composer.toggleVoiceDictation). Document each and whether Claude Code has an equivalent.

### C. Architecture & Migration

10. **What is the minimal `cursor/` layout after extracting portable code?** Proposed: `cursor/` = VS Code extension (src/), Cursor hooks, Cursor-specific UI. What moves to `claude/`?

11. **Can Drive's operator model (spawn, switch, merge, delegate) map to Claude Code subagents vs agent teams?** Subagents: report back only, no inter-agent messaging. Agent teams: shared task list, messaging. Which fits tangent/switch/merge?

12. **What would a Drive Claude Code plugin's hooks/hooks.json contain?** TeammateIdle, TaskCompleted, UserPromptSubmit, SubagentStart, SubagentStop. What would each hook do?

13. **How would "Agent Screen" (S-AS) work for Claude Code?** Claude Code is terminal-based; split panes require tmux/iTerm2. Is there a web UI, desktop app, or VS Code extension for Claude Code that could host an Agent Screen?

### D. Web & Roadmap

14. **Claude Code headless / Agent SDK** — [Run Claude Code programmatically](https://code.claude.com/docs/en/headless). Can we run Claude Code from a Drive process to implement "spawn operator"?

15. **Claude Code VS Code extension** — [Use Claude Code in VS Code](https://code.claude.com/docs/en/vs-code). Does it support hooks, plugins, or Agent Screen–style UI?

16. **Feature requests or roadmap** — Any GitHub issues or forum posts requesting: MCP server for Claude Code, programmatic teammate spawn, task list API, per-teammate permissions at spawn?

---

## Subagent Assignment (parallel)

| Subagent | Questions | Mode |
|----------|-----------|------|
| **Research A** | 1–5 (Claude Code API gaps) | Web + docs search |
| **Research B** | 6–9 (Codebase mapping) | Codebase exploration |
| **Research C** | 10–13 (Architecture & migration) | Codebase + docs |
| **Research D** | 14–16 (Web & roadmap) | Web search |

---

## Research Answers (from parallel subagents)

### A. Claude Code API Gaps (1–5)

| # | Answer |
|---|--------|
| 1 | **No** MCP server for external tools. Use file-based integration or `claude -p`. |
| 2 | Tasks: `~/.claude/tasks/{team-name}/` with `.lock`, `.highwatermark`, `1.json`…`N.json`. Teams: `config.json` with `members` (name, agent_id, agent_type). |
| 3 | **Yes.** UserPromptSubmit hook can return modified prompt via plain text stdout. |
| 4 | **Subagents:** Agent SDK `agents` param, `claude -p`. **Teammates:** Natural language only. |
| 5 | SubagentStart: `agent_id`, `agent_type`. SubagentStop: `agent_id`, `agent_type`, `agent_transcript_path`, `last_assistant_message`, `stop_hook_active`; can block with `decision: "block"`. |

### B. Codebase Mapping (6–9)

| # | Answer |
|---|--------|
| 6 | Portable: fillerCleaner, router. Mostly: operatorRegistry. Cursor-only: pipeline, tangentFlow, approvalGates, modelSelector, modelUtils. |
| 7 | claude/ needs: plugin.json, hooks/hooks.json, skills/, agents/, commands/. Skills map directly; hooks need UserPromptSubmit instead of beforeSubmitPrompt. |
| 8 | Drive is MCP server; Claude Code is MCP client. Claude Code can connect to Drive at :7891. Some tools (agent_screen_*, cursor_cli_*) need adaptation. |
| 9 | Cursor-only: beforeSubmitPrompt (.cursor/hooks), statusBar, agentScreen, voiceCommands (composer.toggleVoiceDictation). |

### C. Architecture (10–13)

| # | Answer |
|---|--------|
| 10 | cursor/ = extension + Cursor hooks + UI. claude/ = plugin. shared/ = fillerCleaner, router, tangentNameExtractor. |
| 11 | Tangent → subagents. Switch → agent teams. Merge → custom MCP tool (neither model has it). |
| 12 | UserPromptSubmit: filler, tangent, mode hints. SubagentStart: log, inject context. SubagentStop: quality gate. TeammateIdle, TaskCompleted: quality gates. |
| 13 | No built-in Agent Screen. Options: TUI, VS Code extension panel, web UI via MCP. |

### D. Web & Roadmap (14–16)

| # | Answer |
|---|--------|
| 14 | **Yes.** `claude -p` or Agent SDK `query()` with `agents` for programmatic spawn. |
| 15 | Hooks and plugins: yes. Agent Screen–style UI: no. |
| 16 | Task tools had gaps (#23816). Per-teammate permissions requested (#29333). No MCP server to invoke Claude Code. |

---

## Research Answers (1–5)

### 1. Does Claude Code expose an MCP server for external tools to invoke it?

**No.** Claude Code is an MCP *client* — it connects to MCP servers to consume tools. It does not expose an MCP server that lets external tools invoke Claude Code (spawn sessions, send prompts, read task list).

- [Connect Claude Code to tools via MCP](https://code.claude.com/docs/en/mcp): "MCP servers give Claude Code access to your tools, databases, and APIs."
- [Claude API MCP docs](https://docs.claude.com/en/api/agent-sdk/mcp): The Agent SDK can connect to MCP servers; the docs MCP server at `https://code.claude.com/docs/mcp` serves documentation, not Claude Code control.

**Implication:** Drive cannot use MCP to remotely control Claude Code. File-based integration (`~/.claude/tasks`, `~/.claude/teams`) or the Agent SDK CLI (`claude -p`) are the available integration paths.

---

### 2. What is the exact schema of `~/.claude/tasks/{team-name}/` and `~/.claude/teams/{team-name}/config.json`?

**Tasks directory** (`~/.claude/tasks/`):

- **Single-session tasks:** `~/.claude/tasks/{session-uuid}/` — one directory per task list (session UUID).
- **Agent-team tasks:** `~/.claude/tasks/{team-name}/` — shared task list for the team.

Per-directory structure:

| File | Purpose |
|------|---------|
| `.lock` | Concurrency lock |
| `.highwatermark` | Next available task ID |
| `1.json`, `2.json`, … | Individual task files |

Per-task JSON fields (from [diljitpr.net blog](https://www.diljitpr.net/blog-post-2026-02-24-inside-dot-claude-filesystem-architecture.html)): `status` (pending, in_progress, completed), `description`, `dependencies`, `ownership`.

**Teams config** (`~/.claude/teams/{team-name}/config.json`):

From [agent-teams docs](https://code.claude.com/docs/en/agent-teams):

- Contains a `members` array with each teammate’s `name`, `agent_id`, and `agent_type`.
- Grows as agents join and shrinks as they shut down.
- Teammates can read it to discover other members.

**Note:** Official schema docs are limited. The above is inferred from docs and community analysis. Agent teams also use `~/.claude/teams/{team-name}/inboxes/` for inter-agent messaging.

---

### 3. Can HTTP hooks receive `UserPromptSubmit` and return modified prompts?

**Yes.** `UserPromptSubmit` hooks (including HTTP) can change the prompt that Claude sees.

- **Official docs** ([Hooks reference](https://code.claude.com/docs/en/hooks)): HTTP hooks receive the event JSON as the POST body and return the same JSON output format as command hooks. `UserPromptSubmit` supports `additionalContext` and `decision: "block"`.
- **Prompt replacement:** The [egghead.io lesson](https://egghead.io/lessons/rewrite-prompts-on-the-fly-with-user-prompt-submit-hooks~76rrt) (John Lindquist) shows that plain text on stdout replaces the prompt: "anything you console.log at the end of your hook can be used to essentially rewrite the prompt." HTTP hooks use the same output contract.
- **Example:** `console.log(\`Create a detailed plan for: ${input.prompt}\`)` rewrites the prompt before Claude processes it.

**Implication:** Drive’s `beforeSubmitPrompt`-style behavior (filler clean, tangent detect, prompt modification) can be implemented via `UserPromptSubmit` HTTP hooks.

---

### 4. Is there a programmatic API to spawn teammates or subagents?

**Subagents: Yes.** **Teammates (agent teams): Natural language only.**

**Subagents** (via Agent SDK):

- [Run Claude Code programmatically](https://code.claude.com/docs/en/headless): `claude -p "prompt"` runs non-interactively.
- [Subagents in the SDK](https://docs.anthropic.com/en/docs/claude-code/sdk/subagents): Define subagents via `agents` in `query()` options; use the `Agent` tool. Python/TypeScript SDKs support this.
- [Create custom subagents](https://code.claude.com/docs/en/sub-agents): Filesystem-based agents in `.claude/agents/` or programmatic `AgentDefinition`.

**Teammates (agent teams):**

- [Agent teams docs](https://code.claude.com/docs/en/agent-teams): "Tell Claude to create an agent team and describe the task and the team structure you want in natural language." No documented programmatic spawn API.
- Teammates are separate Claude Code instances; coordination is via shared task list and inbox files.

**Implication:** Drive can spawn subagents programmatically via the Agent SDK. Spawning agent-team teammates requires natural-language prompts; no direct API is documented.

---

### 5. What do `SubagentStart` / `SubagentStop` hooks receive? (Input schema)

From [Hooks reference](https://code.claude.com/docs/en/hooks), both hooks receive the common input fields plus event-specific fields.

**Common input fields** (all hooks):

| Field | Description |
|-------|-------------|
| `session_id` | Current session identifier |
| `transcript_path` | Path to conversation JSON |
| `cwd` | Current working directory |
| `permission_mode` | `"default"`, `"plan"`, `"acceptEdits"`, `"dontAsk"`, or `"bypassPermissions"` |
| `hook_event_name` | Event name (e.g. `"SubagentStart"`) |

**SubagentStart** (when a subagent is spawned):

| Field | Description |
|-------|-------------|
| `agent_id` | Unique identifier for the subagent |
| `agent_type` | Agent name (e.g. `"Bash"`, `"Explore"`, `"Plan"`, or custom agent names) |

**Matcher:** Filters by `agent_type` (e.g. `Bash`, `Explore`, `Plan`, or custom names).

**Decision control:** Cannot block; can return `additionalContext` to inject into the subagent’s context.

**SubagentStop** (when a subagent finishes):

| Field | Description |
|-------|-------------|
| `stop_hook_active` | `true` when Claude Code is already continuing due to a stop hook |
| `agent_id` | Unique identifier for the subagent |
| `agent_type` | Agent name (same as SubagentStart) |
| `agent_transcript_path` | Path to subagent’s transcript in `subagents/` folder |
| `last_assistant_message` | Text of the subagent’s final response |

**Matcher:** Same as SubagentStart.

**Decision control:** Can block with `decision: "block"` and `reason` to prevent the subagent from stopping (same pattern as `Stop` hooks).

**Example SubagentStart input:**

```json
{
  "session_id": "abc123",
  "transcript_path": "/Users/.../.claude/projects/.../00893aaf-19fa-41d2-8238-13269b9b3ca0.jsonl",
  "cwd": "/Users/...",
  "permission_mode": "default",
  "hook_event_name": "SubagentStart",
  "agent_id": "agent-abc123",
  "agent_type": "Explore"
}
```

**Example SubagentStop input:**

```json
{
  "session_id": "abc123",
  "transcript_path": "~/.claude/projects/.../abc123.jsonl",
  "cwd": "/Users/...",
  "permission_mode": "default",
  "hook_event_name": "SubagentStop",
  "stop_hook_active": false,
  "agent_id": "def456",
  "agent_type": "Explore",
  "agent_transcript_path": "~/.claude/projects/.../abc123/subagents/agent-def456.jsonl",
  "last_assistant_message": "Analysis complete. Found 3 potential issues..."
}
```
