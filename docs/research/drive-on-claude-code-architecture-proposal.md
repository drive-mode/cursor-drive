# Drive on Claude Code — Architecture Proposal & Gap Analysis

Answers to research questions 10–13 from `drive-on-claude-code-research-questions.md`, synthesizing cursor-drive codebase and Claude Code agent-teams docs.

---

## 10. Minimal `cursor/` Layout After Extracting Portable Code

### What Moves to `claude/`

| Component | Current Location | Moves to `claude/` | Rationale |
|-----------|------------------|--------------------|-----------|
| **Pipeline logic** | `src/pipeline.ts`, `src/router.ts`, `src/modelSelector.ts` | `claude/shared/` or plugin | Filler clean, route, model tier — no vscode deps |
| **Filler cleaner** | `src/fillerCleaner.ts` | `claude/shared/` | Pure function, zero vscode |
| **Tangent name extractor** | `src/tangentNameExtractor.ts` | `claude/shared/` | LLM extraction only |
| **Approval gates** | `src/approvalGates.ts` | `claude/shared/` | Config-driven block/warn logic |
| **Glossary expander** | `src/glossaryExpander.ts` | `claude/shared/` | Pure expansion |
| **Sanitizer** | `src/sanitizer.ts` | `claude/shared/` | Length/redaction logic |
| **Operator semantics** | `src/operatorRegistry.ts` (logic only) | `claude/shared/` | Spawn/switch/merge/delegate semantics; registry impl is Cursor-specific |
| **Tiered model routing** | `src/modelSelector.ts` | `claude/shared/` | Tier 0–3 routing rules |
| **Plan governance** | `.cursor/hooks/plan-runner.py`, `plan-frontmatter-changed.py`, `dep-auditor.py` | `claude/hooks/` or plugin | Tier 0/1 governance; adapt for Claude Code hooks |
| **Drive persona / skills** | `.cursor/skills/drive-*.md`, `.cursor/rules/*.mdc` | `claude/plugins/drive/skills/`, `rules/` | Map to Claude Code plugin skills/rules |
| **Tangent / switch / merge skills** | `.cursor/skills/tangent.md`, `switch.md`, `merge.md` | `claude/plugins/drive/skills/` | Direct mapping |

### What Stays in `cursor/`

| Component | Location | Rationale |
|-----------|----------|-----------|
| VS Code extension | `cursor/src/` | `vscode` namespace, WebviewPanel, StatusBarItem |
| Cursor hooks | `cursor/.cursor/hooks.json`, `drive-preprocessor.py` | `beforeSubmitPrompt` is Cursor-specific |
| Agent Screen Webview | `cursor/src/agentScreen.ts`, `agentScreenApp.ts` | VS Code WebviewPanel; no Claude Code equivalent |
| Status bar | `cursor/src/statusBar.ts` | VS Code StatusBarItem |
| Drive sidebar | `cursor/src/driveSidebar.ts` | VS Code TreeView |
| Composer integration | `cursor/src/extension.ts` (chat open, mic) | `composer.toggleVoiceDictation`, etc. |
| Cursor CLI runner | `cursor/src/cursorCliRunner.ts` | Spawns Cursor CLI for operators |
| Cloud agent client | `cursor/src/cloudAgentClient.ts` | Cursor Cloud API |
| Session accumulator / snapshot feed | `cursor/src/cursor-sdk/*`, `snapshotFeed.ts` | Cursor Agent SDK |
| Plugin installer | `cursor/src/pluginInstaller.ts` | Cursor workspace `.cursor/` setup |

### Proposed Directory Structure

```
cursor-drive/
├── cursor/                    # Cursor-specific
│   ├── src/                   # VS Code extension (current src/ minus portable)
│   │   ├── extension.ts
│   │   ├── agentScreen.ts
│   │   ├── agentScreenApp.ts
│   │   ├── driveMode.ts
│   │   ├── driveSidebar.ts
│   │   ├── statusBar.ts
│   │   ├── cursorCliRunner.ts
│   │   ├── cloudAgentClient.ts
│   │   ├── mcpServer.ts       # Adapts to use shared pipeline/registry logic
│   │   ├── cursor-sdk/
│   │   └── ...
│   ├── .cursor/
│   │   ├── hooks.json
│   │   ├── hooks/drive-preprocessor.py
│   │   └── ...
│   └── package.json
│
├── claude/                    # Claude Code plugin
│   ├── .claude-plugin/
│   │   └── plugin.json
│   ├── hooks/
│   │   └── hooks.json
│   ├── skills/
│   │   ├── drive-persona/
│   │   ├── tangent/
│   │   ├── switch/
│   │   └── merge/
│   ├── agents/                # Custom subagents if needed
│   └── .mcp.json              # Drive MCP server config for Claude Code to connect to
│
├── shared/                    # Portable logic (no vscode, no Cursor-specific)
│   ├── fillerCleaner.ts
│   ├── router.ts
│   ├── modelSelector.ts
│   ├── approvalGates.ts
│   ├── tangentNameExtractor.ts
│   ├── operatorSemantics.ts   # Spawn/switch/merge/delegate rules (no registry impl)
│   └── ...
│
└── docs/
```

**Alternative:** Keep a single `src/` and use conditional imports / dependency injection so Cursor extension pulls from shared modules. The `cursor/` vs `claude/` split is then logical (Cursor extension vs Claude plugin), with `shared/` as a sibling consumed by both.

---

## 11. Operator Model vs Claude Code Subagents vs Agent Teams

### Drive Operator Model (cursor-drive)

| Operation | Behavior |
|-----------|----------|
| **Spawn** | Create named operator with task; optional role (implementer, reviewer, etc.); permission preset; worktree allocation |
| **Switch** | Change foreground operator; Agent Screen tab switches |
| **Merge** | Mark source as merged into target; cascade dismiss children |
| **Delegate** | From operator A to B: spawn B if absent, assign task, B at depth+1 with readonly default |

### Claude Code: Subagents vs Agent Teams

| Aspect | Subagents | Agent Teams |
|--------|-----------|-------------|
| Context | Own context; results return to caller | Own context; fully independent |
| Communication | Report back to main agent only | Teammates message each other |
| Coordination | Main agent manages work | Shared task list, self-coordination |
| Spawn | Via Agent tool; natural language or explicit | Via lead; natural language |
| Best for | Focused tasks, result-only | Complex work, discussion, collaboration |

### Mapping: Tangent / Switch / Merge

| Drive Concept | Subagents Fit? | Agent Teams Fit? | Recommendation |
|---------------|----------------|------------------|----------------|
| **Tangent** (spawn parallel worker) | ✅ Yes | ✅ Yes | **Subagents** for quick tangents (research, review). **Agent teams** when user wants multiple workers that coordinate (e.g. "tangent frontend, tangent backend, have them sync"). |
| **Switch** (change foreground) | ⚠️ Partial | ✅ Yes | Subagents: no "foreground" — main agent receives summaries. Agent teams: Shift+Down cycles teammates; user can message any directly. **Agent teams** map better to switch. |
| **Merge** (combine work) | ❌ No | ⚠️ Partial | Subagents: no merge — summaries return. Agent teams: no explicit merge; lead synthesizes. Drive's merge is git-branch merge + status update. **Gap:** Claude Code has no operator merge; would need custom MCP tool or file-based coordination. |
| **Delegate** (A → B task) | ✅ Yes | ✅ Yes | Subagents: main spawns subagent with task. Agent teams: lead assigns task to teammate. Both fit. |

### Summary

- **Tangent** → Prefer **subagents** for single-offload ("tangent researcher: find X"); **agent teams** for multi-worker coordination.
- **Switch** → **Agent teams** (Shift+Down, direct messaging) match Drive's switch UX.
- **Merge** → **Gap.** Neither model has Drive-style merge. Requires: MCP tool that performs git merge + updates `~/.claude/tasks/` or team config, or a Drive-specific convention.
- **Delegate** → Both support it; agent teams give richer task-list semantics.

---

## 12. Drive Claude Code Plugin Hooks / hooks.json

### Proposed `hooks/hooks.json`

```json
{
  "description": "Drive mode: filler clean, tangent detect, quality gates",
  "hooks": {
    "UserPromptSubmit": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PLUGIN_ROOT}/scripts/drive-preprocessor.sh",
            "timeout": 5
          }
        ]
      }
    ],
    "SubagentStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PLUGIN_ROOT}/scripts/drive-subagent-start.sh",
            "timeout": 2
          }
        ]
      }
    ],
    "SubagentStop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PLUGIN_ROOT}/scripts/drive-subagent-stop.sh",
            "timeout": 5
          }
        ]
      }
    ],
    "TeammateIdle": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PLUGIN_ROOT}/scripts/drive-teammate-idle.sh",
            "timeout": 10
          }
        ]
      }
    ],
    "TaskCompleted": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PLUGIN_ROOT}/scripts/drive-task-completed.sh",
            "timeout": 10
          }
        ]
      }
    ]
  }
}
```

### Hook Responsibilities

| Hook | Input (from Claude Code) | Drive Behavior |
|------|--------------------------|----------------|
| **UserPromptSubmit** | `prompt`, `session_id`, `cwd`, `permission_mode` | 1) Run filler cleaner (or call shared logic via Node/Python). 2) Tangent detection: if "tangent [name] [task]", add `additionalContext` instructing Claude to spawn subagent/teammate with that task; optionally `decision: "block"` to intercept and handle via MCP. 3) Mode-switch detection: add hint for plan/agent/ask. 4) Escalation detection: add context. Exit 0 with `additionalContext` or `decision: "block"`. |
| **SubagentStart** | `agent_id`, `agent_type`, `session_id`, `cwd` | 1) Log/notify for observability. 2) Inject `additionalContext` with Drive persona hints, permission reminders. 3) Cannot block (SubagentStart is non-blocking). |
| **SubagentStop** | `agent_id`, `agent_type`, `agent_transcript_path`, `last_assistant_message` | 1) Emit completion event (if Drive MCP/coordinator is running). 2) Optional: `decision: "block"` with `reason` to prevent subagent from stopping (e.g. quality gate failed). 3) Sync operator state if Drive maintains a registry. |
| **TeammateIdle** | `teammate_name`, `team_name` | 1) Quality gate: run lint/tests; exit 2 with stderr message to keep teammate working if gate fails. 2) Or `{"continue": false, "stopReason": "..."}` to stop teammate. 3) Drive equivalent: "operator about to complete" — enforce approval gates. |
| **TaskCompleted** | (task metadata; see Claude Code hooks reference) | 1) Quality gate: exit 2 to prevent task completion if checks fail. 2) Drive equivalent: "task done" — ensure tests pass, files valid before marking complete. |

### Cursor vs Claude Code Hook Differences

| Cursor | Claude Code |
|--------|-------------|
| `beforeSubmitPrompt` | `UserPromptSubmit` |
| Can add `details` to context; does not modify prompt in hook | Can add `additionalContext`; can `decision: "block"` to reject prompt |
| `subagentStop` | `SubagentStop` |
| No `TeammateIdle`, `TaskCompleted` | Agent-team-specific; enable with `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` |

---

## 13. Agent Screen (S-AS) for Claude Code

### Claude Code Runtime Environments

| Environment | UI | Agent Screen Hosting? |
|-------------|-----|------------------------|
| **Terminal (CLI)** | Terminal only | No built-in panel |
| **VS Code extension** | Chat panel, diffs, @-mentions | Could add a Drive panel as a second view |
| **Desktop app** | Code, Cowork, Chat tabs | Could add Drive tab or sidebar |
| **Web** | Research preview | Cloud-based; no local Agent Screen |

### Terminal Constraints

- Claude Code CLI is terminal-based.
- Split panes: **tmux** or **iTerm2** (`teammateMode: "tmux"`).
- No native webview in terminal.
- Agent Screen = live activity feed, operator tabs, sync status — requires a graphical surface.

### Options for Agent Screen on Claude Code

| Option | Feasibility | Notes |
|--------|-------------|-------|
| **tmux/iTerm2 split panes** | ✅ Exists | Each teammate gets a pane; no unified "Agent Screen" — just multiple terminal sessions. Drive could render a simple TUI (e.g. `blessed`) in one pane showing operator list + status. |
| **Claude Code VS Code extension** | ✅ High | Extension has panels. Drive could ship a **separate** VS Code extension that adds an "Agent Screen" view when Claude Code is active. Reads `~/.claude/tasks/`, `~/.claude/teams/` or MCP for state. |
| **Claude Code Desktop app** | ⚠️ Unknown | Desktop app has tabs; unclear if extensible. Would need Anthropic to add plugin/extension support. |
| **Standalone web UI** | ✅ Possible | Drive MCP server (:7891) could serve a small web app. User opens `http://localhost:7891/screen` in browser. MCP already has `/tasks`, SSE; could add Agent Screen HTML. |
| **Standalone Electron app** | ⚠️ Heavy | Possible but adds another process; likely overkill. |

### Recommended Approach

1. **Terminal users:** TUI in a tmux pane, or rely on in-process mode (Shift+Down) + task list. No full Agent Screen.
2. **VS Code + Claude Code:** Build a **Drive Agent Screen** extension that:
   - Activates when Claude Code extension is present.
   - Connects to Drive MCP server (or reads `~/.claude/`).
   - Renders operator/teammate list, activity feed, sync status.
3. **Web fallback:** MCP server serves `/screen` route with minimal HTML/JS for users who want a separate window.

### Gap Summary

| Capability | Cursor Drive | Claude Code |
|-------------|--------------|-------------|
| Agent Screen Webview | ✅ VS Code WebviewPanel | ❌ No equivalent in CLI |
| Operator tabs | ✅ In Agent Screen | ⚠️ Teammate cycling (Shift+Down) in terminal |
| Activity feed | ✅ Snapshot feed from Cursor SDK | ❌ No SDK; would need transcript parsing or MCP |
| Sync status (merge proposals) | ✅ IntegrationQueue, state sync | ❌ No built-in; custom MCP |

---

## Architecture Proposal Summary

### Phase 1: Shared Core

- Extract `fillerCleaner`, `router`, `modelSelector`, `approvalGates`, `tangentNameExtractor`, operator semantics to `shared/`.
- Cursor extension imports from `shared/`.
- No `claude/` yet.

### Phase 2: Claude Code Plugin (Hooks + Skills)

- Create `claude/` plugin with `hooks/hooks.json` (UserPromptSubmit, SubagentStart, SubagentStop, TeammateIdle, TaskCompleted).
- Implement scripts that call shared logic (Node or Python).
- Add Drive skills (persona, tangent, switch, merge) to `claude/skills/`.
- Drive MCP server runs separately; Claude Code connects as MCP client.

### Phase 3: Operator Model Mapping

- Use **subagents** for tangent (single parallel worker).
- Use **agent teams** when user wants multi-worker coordination + switch UX.
- Implement **merge** via MCP tool: git merge + update team/task state.
- Document mapping and limitations.

### Phase 4: Agent Screen for Claude Code

- **Terminal:** TUI or status-only; no full Agent Screen.
- **VS Code:** Drive extension that works alongside Claude Code extension; reads MCP or `~/.claude/`.
- **Web:** MCP server `/screen` route for browser-based view.

---

## Gap Analysis

| Gap | Severity | Mitigation |
|-----|----------|------------|
| No prompt modification in UserPromptSubmit | Medium | Claude Code allows `additionalContext` and `decision: "block"`. Cannot rewrite prompt in-place; must add context or block and re-submit via another path. |
| No operator merge in Claude Code | High | MCP tool `operator_merge` that runs `git merge` and updates local state. |
| No Agent Screen in terminal | High | TUI or accept terminal-only UX; VS Code extension for full experience. |
| Subagents report only; no inter-teammate messaging for tangent | Medium | Use agent teams when tangent needs coordination; subagents for simple offload. |
| No per-teammate permissions at spawn | Medium | Claude Code: all teammates inherit lead's permissions. Document as limitation. |
| beforeSubmitPrompt vs UserPromptSubmit | Low | Different schemas; adapter in hook script. |
| Cursor SDK (snapshot feed) vs Claude Code | High | No equivalent. Would need transcript parsing or MCP push from Claude Code (if available). |

---

## References

- [Claude Code Agent Teams](https://code.claude.com/docs/en/agent-teams)
- [Claude Code Hooks](https://code.claude.com/docs/en/hooks)
- [Claude Code Plugins](https://code.claude.com/docs/en/plugins)
- [Claude Code Features Overview](https://code.claude.com/docs/en/features-overview)
- [Claude Code VS Code Extension](https://code.claude.com/docs/en/vs-code)
- cursor-drive: `repo-audit.md`, `docs/design/architecture/cursor-drive-walkthrough.md`
