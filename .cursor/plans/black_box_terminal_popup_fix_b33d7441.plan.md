---
name: Black box terminal popup fix
overview: "Identify the cause of the black console window when opening a new agent (MCP server spawn and/or plugin sessionStart hooks on Windows) and outline fixes: confirm via disable-test, then either silence npx-based MCP or disable unneeded plugins."
todos: []
isProject: false
---

# Black Box Terminal Popup When Opening a New Agent

## What’s Causing It

On Windows, the black box is almost certainly one or both of:

1. **MCP servers started by Cursor** when the agent starts
2. **Plugin `sessionStart` hooks** that run shell scripts (`.sh`) and thus bash

No project-level hooks or MCP in your Coding Projects are involved; everything relevant is under **user-level** `C:\Users\harri\.cursor`.

---

## 1. MCP servers (most likely)

**Config:** [C:\Users\harri\.cursor\mcp.json](C:\Users\harri\.cursor\mcp.json)

When you open a new agent, Cursor starts the configured MCP servers. You have two **stdio** servers that run via `npx`:

- **Playwright:** `command`: `npx -y @playwright/mcp@latest`
- **github:** `command`: `npx`, `args`: `["-y", "@modelcontextprotocol/server-github"]`

On Windows, Cursor spawns these as child processes. If the process is not created with `CREATE_NO_WINDOW` (or equivalent), the OS can attach a console window — the “black box.” This is a [known Cursor + Windows issue](https://forum.cursor.com/t/mcp-servers-on-windows-empty-powershell-windows-and-client-closed-issues/66462): empty PowerShell/console windows when using MCP with `npx`.

**What they’re for:** They provide the agent with tools (Playwright: browser automation; GitHub: issues, PRs, etc.). You only see the window because of how the process is spawned, not because of anything wrong with the tools.

---

## 2. Plugin hooks that run on session start

These run when a session (e.g. new agent) starts and execute **shell scripts**. On Windows, that usually means invoking bash (e.g. Git Bash), which can open a console.

| Plugin        | Hook          | What runs | Purpose |
|---------------|---------------|-----------|--------|
| **Runlayer** | `sessionStart` | `./scripts/runlayer-hook.sh` | Checks `~/.runlayer/config.yaml`, warns if missing; used for MCP governance and config. |
| **Superpowers** | `SessionStart` | `session-start.sh` | Injects “using superpowers” skill context into the session. |

**Where they live:**
- Runlayer: `C:\Users\harri\.cursor\plugins\cache\cursor-public\runlayer\32f6a6c6c957528c475406b38a5f9b77a5b15d4b\hooks\hooks.json`
- Superpowers: `C:\Users\harri\.cursor\plugins\cache\cursor-public\superpowers\a0b9ecce2b25aa7d703138f17650540c2e8b2cde\hooks\hooks.json`

**Do you need them?**

- **Runlayer:** Only if you use Runlayer (MCP security/config, audit, etc.). If you don’t, disabling the plugin removes this hook.
- **Superpowers:** Only if you want that plugin’s session context. Disabling the plugin removes this hook.

---

## How to confirm the cause

1. **Test MCP:** In [C:\Users\harri\.cursor\mcp.json](C:\Users\harri\.cursor\mcp.json), temporarily comment out or remove the **Playwright** and **github** entries (leave URL-based servers like Context7, Hugging Face, drive). Restart Cursor, open a new agent.
   - If the black box **stops** → MCP spawn is the cause.
   - If it **still appears** → likely the plugin hooks (or both).

2. **Test plugins:** If you have Runlayer and/or Superpowers **enabled** in Cursor (Settings → Plugins), disable both. Restart, open a new agent.
   - If the black box **stops** → a sessionStart hook (Runlayer or Superpowers) is involved.

You can also do the opposite order: disable plugins first, then MCP.

---

## Fixes (so the terminal doesn’t pop up)

### A. MCP (npx) – make process silent

- **Proper fix:** Cursor would need to spawn MCP stdio processes on Windows with `CREATE_NO_WINDOW` (or equivalent) so no console is created. There’s no setting in your config to do that; it’s an editor/IDE change.
- **Workarounds you can do:**
  - **Keep Playwright/github disabled** in `mcp.json` if you don’t need those tools in the agent (no popup).
  - **Use only URL-based MCP** where possible (you already use Context7, Hugging Face, drive via URL; they don’t spawn a local process from Cursor the same way).
  - **Wrapper that hides the window:** Point Cursor at a wrapper (e.g. a small `.vbs` or PowerShell script) that starts `npx ...` with a hidden window. This is brittle (PATH, quoting, Cursor’s working directory) and may still show a flash; only worth trying if you must keep Playwright/github and Cursor hasn’t fixed spawning yet.

So in practice: **confirm with the disable test**, then either leave the two npx-based MCP servers disabled or accept the popup until Cursor improves Windows MCP spawning.

### B. Runlayer / Superpowers – “silent” hooks

- There is no per-hook option in your repo or in the plugin files to “run silently.” Hooks are executed by Cursor; making the window hidden would require Cursor to run the hook script in a way that doesn’t create a visible console (e.g. `CREATE_NO_WINDOW` or running bash in a hidden process).
- **What you can do:** If you don’t use Runlayer or Superpowers, **disable those plugins** in Cursor (Settings → Plugins). That stops their sessionStart hooks and removes their contribution to the black box.

---

## Summary

| Cause | What it is | Why it happens | Fix (no popup) |
|-------|------------|----------------|----------------|
| **MCP (Playwright, github)** | Cursor starts `npx` for these servers when the agent starts | Windows shows a console for the spawned process | Disable those two in `mcp.json`, or use URL-based MCP only; full fix is Cursor spawning with CREATE_NO_WINDOW |
| **Runlayer** | `sessionStart` runs `runlayer-hook.sh` | Bash (or script host) gets a console on Windows | Disable Runlayer plugin if you don’t use it |
| **Superpowers** | `SessionStart` runs `session-start.sh` | Same as above | Disable Superpowers plugin if you don’t use it |

**Recommended order:** (1) Temporarily disable Playwright and github in [C:\Users\harri\.cursor\mcp.json](C:\Users\harri\.cursor\mcp.json) and test. (2) If the popup remains, disable Runlayer and Superpowers and test. (3) Re-enable only what you need; accept the popup for npx-based MCP until Cursor improves Windows behavior, or use a hidden-window wrapper if you’re willing to maintain it.
