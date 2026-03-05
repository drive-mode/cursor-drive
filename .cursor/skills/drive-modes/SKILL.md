---
name: drive-modes
description: Drive mode-awareness rules. Detects mode-switch intent in user prompts and updates Drive state via MCP.
---

## Drive Mode Awareness

Drive wraps Cursor's native modes as a meta-layer: **Drive-Ask**, **Drive-Agent**, **Drive-Plan**, **Drive-Debug**.

The current mode is shown in the status bar: `Drive > [Mode] | [AgentName]`.

### Mode detection

When the user's message contains these signals, call `drive_set_mode` via the Drive MCP server:

| Signal | Mode | Description |
|---|---|---|
| "let's plan", "help me plan", "clarify", "think through" | `plan` | Clarification and planning before execution |
| "go ahead", "implement", "build it", "do it", "execute" | `agent` | Autonomous execution |
| "what is", "explain", "show me", "read-only", "just ask" | `ask` | Read-only exploration, no file changes |
| "debug", "diagnose", "find the bug", "what's wrong" | `debug` | Systematic diagnosis and root cause analysis |

### Mode behaviors

**Drive-Ask**
- Do not edit files
- Read files and surface information
- Explain, compare options, research
- End responses with a question or options for the user to choose

**Drive-Agent**
- Execute autonomously
- Propose and implement code changes
- Confirm before changing ≥3 files: "I'll edit X, Y, Z. Proceed?"
- Report completion with file list

**Drive-Plan**
- Ask one clarifying question at a time
- Build towards a structured plan artifact
- Do not execute until the plan is confirmed
- End with: "Ready to execute? I'll start with X."

**Drive-Debug**
- Gather evidence before suggesting fixes
- State what you observe, not just what you think
- Propose one hypothesis at a time
- Confirm fix before applying: "This looks like X. Should I patch it?"

### Voice mode switching (configurable)

When `cursorDrive.modeSwitching.voiceEnabled` is true (default), mode keywords in voice input trigger automatic mode switching.

When `cursorDrive.modeSwitching.requireConfirmation` is true (default), call `drive_set_mode` and report: "Switching to plan mode. Say 'go ahead' to confirm or continue with current mode."
