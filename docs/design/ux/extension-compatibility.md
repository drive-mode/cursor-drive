# Extension Compatibility Guide

How Cursor Drive coexists with popular extensions in the Cursor ecosystem.

Last updated: 2026-02-25

---

## Drive's Registered Keybindings


| Keybinding (Win/Linux) | macOS         | Command                          | When                               |
| ---------------------- | ------------- | -------------------------------- | ---------------------------------- |
| `Ctrl+Shift+D`         | `Cmd+Shift+D` | `cursorDrive.toggle`             | `editorTextFocus || terminalFocus` |
| `Ctrl+Shift+S`         | `Cmd+Shift+S` | `cursorDrive.showAgentScreen`    | `editorTextFocus || terminalFocus` |
| `Ctrl+Shift+A`         | `Cmd+Shift+A` | `cursorDrive.focusAgentView`     | always                             |
| `Ctrl+Shift+M`         | `Cmd+Shift+M` | `cursorDrive.activateVoiceInput` | always                             |


Source: `package.json` → `contributes.keybindings`.

---

## Claude Code (Anthropic)

### What it does

Claude Code is Anthropic's terminal-based agentic coding assistant. It runs as a CLI process (`claude`) and ships a thin VS Code/Cursor extension that launches and connects to that process inside the IDE terminal. It can autonomously read/write files, run shell commands, and navigate codebases.

### How it integrates with Cursor

The extension (VSIX from `~/.claude/local/…/claude-code.vsix`) adds a panel that embeds the Claude Code terminal session. It does **not** use `beforeSubmitPrompt` or Cursor's Composer — it operates through its own terminal I/O channel. Must be installed manually in Cursor (auto-detection of Cursor-as-VSCode-fork is unreliable as of early 2026).

### Keybinding conflicts with Drive


| Binding                       | Claude Code action      | Drive conflict?    |
| ----------------------------- | ----------------------- | ------------------ |
| `Ctrl+Esc` / `Cmd+Esc`        | Open Claude Code panel  | No                 |
| `Ctrl+Alt+K` / `Cmd+Option+K` | Insert file reference   | No                 |
| `Ctrl+C`                      | Interrupt/cancel (CLI)  | No — terminal only |
| `Ctrl+T`                      | Toggle task list (CLI)  | No — terminal only |
| `Ctrl+S`                      | Stash prompt (CLI chat) | No — terminal only |


**No keybinding conflicts with Drive.** All Claude Code VS Code-level bindings use `Ctrl+Esc` or `Ctrl+Alt+`* patterns; none overlap with Drive's `Ctrl+Shift+*` set.

### MCP interaction

Claude Code has its own MCP client that can connect to external MCP servers. Drive's MCP server runs on port 7891. Claude Code can be pointed at Drive's MCP endpoint (`http://127.0.0.1:7891/mcp`) as an additional tool, which would allow Claude Code sessions to call Drive's operator-management and screen tools. No automatic connection — must be configured manually in `~/.claude/settings.json`.

### Recommendation

Safe to install alongside Drive. The two operate on entirely separate input channels (Claude Code → terminal; Drive → Cursor Composer via `beforeSubmitPrompt`). No keybinding or hook conflicts. If you want Claude Code to see Drive's MCP tools, add `http://127.0.0.1:7891/mcp` to Claude Code's MCP server list.

---

## OpenAI Codex Extension

### What it does

OpenAI's Codex extension (`OpenAI.chatgpt` on the VS Code Marketplace) provides a sidebar chat panel backed by GPT-based models. It supports a "plan → patch → validate" agentic workflow with sandboxed code execution. The companion Codex CLI (`npm install -g @openai/codex`) provides a terminal-based interface with its own slash commands (`/plan`, `/agent`, `/diff`).

### How it integrates with Cursor

The extension operates through its own sidebar panel. It does not hook into `beforeSubmitPrompt` or Cursor's Composer pipeline. The CLI is entirely terminal-based, similar to Claude Code.

### Keybinding conflicts with Drive

The extension does **not** register default keybindings in its current release (as of early 2026). Users have filed requests for a default open shortcut (e.g. `Ctrl+Shift+C`) but none has shipped. The CLI slash commands (`/plan`, `/agent`) are scoped to the Codex CLI context and do not register VS Code commands.

VS Code settings use the `chatgpt.`* prefix; Drive uses `cursorDrive.*`. No namespace collision.

**No confirmed keybinding conflicts with Drive.**

### Recommendation

Safe to install alongside Drive. Operates in a separate sidebar; no pipeline integration. Note that both Codex and Drive offer "agent mode" workflows — keep them conceptually separate to avoid confusion. Drive manages Cursor's native Composer/Agent modes; Codex is its own standalone panel.

---

## Other Notable Extensions

### Continue (continuedev.continue)

**What it does:** Open-source AI coding assistant. Embeds a chat panel in the sidebar, supports multiple LLM backends, and can reference code context via `@` mentions.

**Command prefix:** `continue.`*

**Key default keybindings:**


| Binding            | Action                     | Drive conflict?               |
| ------------------ | -------------------------- | ----------------------------- |
| `Ctrl+L` / `Cmd+L` | Send selected code to chat | No                            |
| `Ctrl+K Ctrl+C`    | Open config JSON           | No (chord, not single stroke) |


`Ctrl+Shift+M` was reported anecdotally as a Continue binding in older versions, but the current documented default for sending code to chat is `Ctrl+L`. **Verify after install** — if Continue registers `Ctrl+Shift+M`, it will conflict with Drive's `cursorDrive.activateVoiceInput`. Resolve by reassigning one binding in the VS Code Keyboard Shortcuts editor (`Ctrl+K Ctrl+S`).

**MCP interaction:** Continue has its own context system separate from MCP. No port conflict with Drive's port 7891.

**Recommendation:** Generally safe. Confirm `Ctrl+Shift+M` is not registered by Continue after installation via Keyboard Shortcuts editor.

---

### GitHub Copilot (GitHub.copilot + GitHub.copilot-chat)

**What it does:** Inline code completions and a Copilot Chat sidebar panel (GPT-4 / Claude Sonnet family). Deeply integrated into VS Code's editor API.

**Key default keybindings:**


| Binding              | Action                   | Drive conflict? |
| -------------------- | ------------------------ | --------------- |
| `Tab`                | Accept inline suggestion | No              |
| `Esc`                | Dismiss suggestion       | No              |
| `Alt+\` / `Option+\` | Trigger suggestion       | No              |
| `Ctrl+Enter`         | Open completions panel   | No              |
| `Ctrl+Shift+I`       | Open Copilot Chat        | No              |


**No keybinding conflicts with Drive.**

Copilot Chat operates through VS Code's built-in chat API, not `beforeSubmitPrompt`. Drive and Copilot coexist cleanly.

**Recommendation:** Fully compatible. Drive controls Cursor's Composer; Copilot provides inline completions and its own sidebar chat. No functional overlap in hooks.

---

### GitLens (eamodio.gitlens)

**What it does:** Rich Git history visualization, blame annotations, repository explorer, and interactive rebase support.

**Key default keybindings:** GitLens uses `Alt+B` (toggle blame) and several `Ctrl+Shift+G`* chords internally, but does not occupy `Ctrl+Shift+D/S/A/M`.

**No keybinding conflicts with Drive.**

**Recommendation:** Fully compatible. GitLens is purely a Git visualization tool with no AI pipeline hooks.

---

### GitHub Pull Requests (GitHub.vscode-pull-request-github)

**What it does:** Manage pull requests and issues directly from VS Code/Cursor.

**Key default keybindings:** No `Ctrl+Shift+`* bindings that overlap with Drive's set.

**No keybinding conflicts with Drive.**

**Recommendation:** Fully compatible.

---

## General Rules for Coexistence

1. **Keybinding conflicts:** VS Code resolves conflicts by "last registration wins" — the extension that activates last takes the binding. If another extension uses the same keybinding, reassign one via the Keyboard Shortcuts editor (`Ctrl+K Ctrl+S`). Drive's four `Ctrl+Shift+`* bindings are the ones to protect.
2. **MCP coexistence:** Drive's MCP server runs on port 7891 (configurable via `cursorDrive.mcp.port`). Other MCP servers use different ports and coexist in `.cursor/mcp.json` as separate named entries. No port conflicts expected. If port 7891 is already taken on your machine, change it in settings.
3. **Status bar:** Multiple extensions can occupy the status bar simultaneously. Drive uses the left section (`$(play-circle) Drive > …`). No conflicts observed with GitLens, Copilot, or other common extensions.
4. `**beforeSubmitPrompt` hook:** Drive intercepts Cursor's `beforeSubmitPrompt` to run the filler-clean → glossary → sanitize → approval-gate pipeline. Extensions that also register `beforeSubmitPrompt` handlers (uncommon in practice) would chain with Drive's handler. Execution order depends on extension activation order. No known extensions as of early 2026 register a competing `beforeSubmitPrompt` hook.
5. `**composerMode.`* commands:** Drive calls Cursor's internal `composerMode.`* commands to switch between Plan/Agent/Ask/Debug modes. Extensions that independently call these commands in sequence (e.g. toggling modes automatically) could interfere with Drive's active sub-mode state. No known extensions do this.
6. **Terminal-based AI tools (Claude Code, Codex CLI):** These run as separate processes and do not interact with Drive's pipeline. They can be used in the integrated terminal while Drive is active without interference.

---

## Conflict Matrix


| Extension               | Keybinding conflict                            | Hook conflict                    | MCP conflict                                 | Recommendation           |
| ----------------------- | ---------------------------------------------- | -------------------------------- | -------------------------------------------- | ------------------------ |
| Claude Code (Anthropic) | None confirmed                                 | None — separate terminal channel | None (can optionally connect to Drive's MCP) | Safe; install freely     |
| OpenAI Codex extension  | None confirmed                                 | None — separate sidebar          | None                                         | Safe; install freely     |
| Continue (continuedev)  | Possible `Ctrl+Shift+M` — verify after install | None                             | None                                         | Safe; verify one binding |
| GitHub Copilot          | None                                           | None — separate VS Code chat API | None                                         | Fully compatible         |
| GitLens                 | None                                           | None                             | None                                         | Fully compatible         |
| GitHub Pull Requests    | None                                           | None                             | None                                         | Fully compatible         |


