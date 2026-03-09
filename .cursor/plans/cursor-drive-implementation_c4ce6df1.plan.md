---
name: cursor-drive-implementation
overview: Implement Cursor Drive Mode as a Hybrid VS Code Extension + Cursor Plugin using MCP tools and async subagents.
todos:
  - id: org-directory
    content: Consolidate `.cursor/` directory (move rules, commands, create skills)
    status: pending
  - id: docs-architecture
    content: Draft `docs/architecture/README.md` and initial ADRs
    status: pending
  - id: ext-ui-foundation
    content: Implement Status Bar and basic commands in `src/statusBar.ts` & `src/extension.ts`
    status: pending
  - id: ext-share-screen
    content: Implement `vscode.WebviewPanel` in `src/shareScreen.ts`
    status: pending
  - id: mcp-bridge
    content: Flesh out `src/mcpServer.ts` with UI bridge tools (`tts_speak`, `share_screen_activity`)
    status: pending
  - id: mcp-multi-agent
    content: Implement `src/agentRegistry.ts` and the `agent_spawn` MCP tool for async subagents
    status: pending
  - id: ext-safety
    content: Implement safety approval gates and unified configuration reader
    status: pending
isProject: false
---

# Cursor Drive Mode Implementation Plan

This plan details the implementation of Cursor Drive as a hybrid system. It combines a standard VS Code extension (for UI/State) with a native Cursor Plugin (for AI autonomy, skills, and MCP tools) and uses Cursor's sub-agents (`Task` tool / MCP `agent_spawn`) to accomplish the multi-agent design detailed in the PRDs.

## 1. Directory Organization & Plugin Foundation

The project must be strictly structured to satisfy both the VS Code Extension Host and Cursor's Plugin auto-discovery engine.

*   **Action:** Move `rules/*.mdc` to `.cursor/rules/`.
*   **Action:** Move `commands/*.md` to `.cursor/commands/`.
*   **Action:** Convert `agents/drive.md` into a formal Cursor Skill at `.cursor/skills/drive-persona/SKILL.md`. This skill will instruct the AI on how to act in Drive Mode and when to invoke MCP tools.
*   **Action:** Ensure `.cursor-plugin/plugin.json` and `.cursor/mcp.json` accurately point to the MCP server.

## 2. VS Code Extension Setup (The UI Layer)

The extension acts as the host for the ShareScreen and Status Bar, and manages the local MCP server process.

*   **Status Bar (`src/statusBar.ts`):** Implement the `Drive > [Mode] | [AgentName]` indicator. Expose a command to open a QuickPick for switching modes/agents.
*   **ShareScreen (`src/shareScreen.ts`):** Implement `vscode.WebviewPanel`. 
    *   It should render the Activity Feed, Files Touched, and Decisions based on events emitted by the MCP Server.
*   **Agent Switcher (`src/agentRegistry.ts`):** Maintain the `AgentContext` pool. Ensure the extension tracks which agent is "foreground" (visible in the ShareScreen).

## 3. The MCP Server (The Bridge)

The MCP server (`src/mcpServer.ts`) is how the Cursor AI communicates with your VS Code extension UI.

*   **`tts_speak` / `tts_stop`:** Tools the AI calls to trigger text-to-speech in the extension.
*   **`share_screen_activity` / `share_screen_file`:** Tools the AI calls to post updates to the `ShareScreenPanel` Webview.
*   **`drive_set_mode`:** Tool the AI calls to change the Status Bar mode (Ask, Plan, Agent, Debug).

## 4. Multi-Agent Orchestration (Async Subagents)

To fulfill PRD 3 (Multi-Agent), we will leverage Cursor's native `Task` capabilities via an MCP tool exposed by our extension.

*   **`agent_spawn` Tool:** Build an MCP tool that accepts a `{ name, task }`.
    *   When the AI receives a prompt like *"tangent: research rate limiting"*, it calls `agent_spawn`.
    *   The extension intercepts this, creates an `AgentContext` in `src/agentRegistry.ts`, and updates the UI.
    *   The extension then triggers a background process (or instructs the Cursor AI via system prompt) to fork a new subagent to handle the task asynchronously.
*   **Comms Agent:** The extension will poll background agent statuses. When an agent finishes, the extension injects a notification into the chat stream or triggers TTS.

## 5. Safety & Configuration (PRD 4)

*   Implement the unified config reader in `src/extension.ts` reading from `vscode.workspace.getConfiguration('cursorDrive')`.
*   Implement Approval Gates: Before executing dangerous MCP tools or VS Code commands, the extension will show `vscode.window.showWarningMessage` with a Proceed/Cancel option.

## 6. Documentation & Architecture Logs

*   **Action:** Create `docs/architecture/README.md`.
*   **Action:** Create Architecture Decision Records (ARDs) for the Hybrid approach, the MCP bridge pattern, and the async subagent implementation in `docs/architecture/decisions/`.