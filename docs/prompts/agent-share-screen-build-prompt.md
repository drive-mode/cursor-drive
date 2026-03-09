# Agent Share Screen (S-AS) Build Prompt

Single, self-contained prompt for **Claude Sonnet 4.6 (thinking mode)** to build the Agent Share Screen UI for cursor-drive. All context is inline; no external file references.

---

## Merge Instructions

Three subagents produce outputs that fill placeholders in this prompt shell:

| Placeholder | Subagent | Purpose |
|-------------|----------|---------|
| `[CONTEXT_FROM_AGENT_1]` | Agent 1 (Context Gatherer) | Project structure, architecture, key files, data flow, event types |
| `[REQUIREMENTS_FROM_AGENT_2]` | Agent 2 (Requirements Analyst) | Functional/non-functional requirements, UX specs, acceptance criteria |
| *(none)* | Agent 3 (Prompt Author) | Produces this shell; coordinates merge |

**Merge steps:**
1. Agent 1 outputs raw context (architecture, code structure, event schema).
2. Agent 2 outputs requirements (features, UX, constraints).
3. Agent 3 (this file) provides the prompt shell.
4. **Final merge:** Replace `[CONTEXT_FROM_AGENT_1]` with Agent 1's output. Replace `[REQUIREMENTS_FROM_AGENT_2]` with Agent 2's output. The result is the final prompt.
5. Send the merged prompt as a single chat message to Claude Sonnet 4.6 with thinking enabled.

**Subagent instructions:**

- **Agent 1 (Context):** Produce a block of text to replace `[CONTEXT_FROM_AGENT_1]`. Include: repo structure (src/, docs/), key modules (agentScreen.ts, agentScreenApp.ts, pipeline, MCP server), ActivityEvent interface and all event types, postMessage schema, buildHtml structure, CSP/nonce usage, config keys. Inline only — no "see file X".

- **Agent 2 (Requirements):** Produce a block of text to replace `[REQUIREMENTS_FROM_AGENT_2]`. Include: functional requirements (Live tab layout, files strip, streaming text, tabs), non-functional (performance, accessibility), UX targets from agent-screen-share-vision.md and s-as-v1-ux-proposal.md, acceptance criteria. Inline only — no "see file X".

---

## Prompt Shell (Copy Below)

---

You are a senior frontend engineer building the **Agent Share Screen (S-AS)** UI for Cursor Drive, a voice-first multi-operator pair-programming layer for Cursor IDE. Use extended thinking to design and implement a complete, production-ready UI.

### (a) Role and Context

- **Target model:** Claude Sonnet 4.6 with thinking mode enabled.
- **Output:** Complete UI code (HTML/CSS/JS or React) plus any extension-side changes required.
- **Scope:** The Agent Screen is a live view of what operators are doing — files in focus, operator thinking stream, activity feed, decisions, sync status, and Cloud Agent artifacts. It runs inside a VS Code WebviewPanel or as an MCP App in chat.

[CONTEXT_FROM_AGENT_1]

### (b) Project Summary

Cursor Drive is a VS Code/Cursor extension (TypeScript). Single package, no monorepo. No databases or external services. The Agent Screen (S-AS) is one of four UI surfaces Drive owns: status bar, Agent Screen webview, Drive sidebar, and audio feedback. The Agent Screen displays operator activity, files touched, decisions, plan progress, sync status, and Cloud Agent artifacts. Data flows via `postMessage` from the extension host; the webview renders events and sends back `openFile`, `askAboutItem`, `openPlanTodo` for extension handling.

### (c) Current Implementation Summary

- **Extension host:** `src/agentScreen.ts` — `AgentScreenPanel` singleton, `createOrShow()`, `postEvent()`, `buildHtml()`. Display modes: `tab` (WebviewPanel beside editor), `panel` (same as tab, bug), `bottomLog` (OutputChannel, text-only).
- **Webview HTML:** Inline in `buildHtml()` — tabs (Live, Activity, Files, Decisions, Sync, Artifacts), operator badge, plan progress bar, live files strip, activity feed, cliStream handling. Uses `acquireVsCodeApi()`, `postMessage`/`addEventListener('message')`. CSP with nonce; VS Code CSS variables for theming.
- **MCP App variant:** `src/agentScreenApp.ts` — `buildAgentScreenAppHtml()` for sandboxed iframe (MCP Apps). Uses `@modelcontextprotocol/ext-apps` `App` class; no `acquireVsCodeApi()`. Simpler tabs: Activity, Files, Decisions. Receives tool results via `ontoolresult`.
- **Event types:** `activity`, `file`, `decision`, `agentSwitch`, `clear`, `planProgress`, `cliStream` (text_delta, tool_call, user, error), `syncStatus`, `proposalUpdate`, `queueStatus`, `cloudAgentStatus`, `cloudAgentArtifact`.
- **Config:** `cursorDrive.agentScreen.displayMode`, `clickBehavior`, `showPlanProgress`.

### (d) Requirements

[REQUIREMENTS_FROM_AGENT_2]

### (e) Technical Constraints

- **Webview:** `enableScripts: true`, CSP with `style-src` and `script-src` from `cspSource` and nonce. No external script URLs except MCP App's `esm.sh` when bundle not provided.
- **Theming:** Use VS Code CSS variables only: `var(--vscode-editor-background)`, `var(--vscode-editor-foreground)`, `var(--vscode-panel-border)`, `var(--vscode-textLink-foreground)`, etc. No hardcoded hex colors.
- **Message protocol:** Extension sends `{ type, operatorName?, text?, filePath?, ... }`; webview sends `{ type: 'openFile', path }`, `{ type: 'askAboutItem', text }`, `{ type: 'openPlanTodo', planPath }`.
- **Accessibility:** `role`, `aria-label`, `aria-selected`, `aria-controls`, `data-testid` for automation. Semantic HTML.
- **MCP App:** Must work in sandboxed iframe; no `acquireVsCodeApi()`. Uses `App` from `@modelcontextprotocol/ext-apps` for host communication.
- **Composer UI not extensible:** Extensions cannot modify chat input, send button, or mic. Agent Screen is a separate panel.

### (f) Deliverables

1. **Complete webview HTML/CSS/JS** — Drop-in replacement for the inline HTML in `AgentScreenPanel.buildHtml()`, or a structured template that can be injected. Include:
   - Live tab: sticky files strip, streaming operator thinking (cliStream text_delta), tool calls inline, user prompts (italic), errors highlighted.
   - Activity, Files, Decisions, Sync, Artifacts tabs with current behavior preserved.
   - Operator badge, plan progress bar (collapsible), empty states.
   - File chips and items clickable → `openFile`. Ctrl/Cmd+click → `askAboutItem`.
   - Chime playback via Web Audio API.
2. **MCP App HTML** — Updated `buildAgentScreenAppHtml()` output for iframe rendering, aligned with webview behavior where possible.
3. **Extension-side changes** — Any modifications to `agentScreen.ts` required to support the new UI (e.g., message schema, config).
4. **Tests** — Unit tests or test selectors (`data-testid`) sufficient for `tests/agentScreen.test.ts` and `tests/agentScreenApp.test.ts` to pass.

### (g) Format for Response

Structure your response as:

```
## Summary
Brief description of changes and design decisions.

## Webview HTML
[Full HTML string or template, ready to paste into buildHtml()]

## MCP App HTML
[Full HTML for buildAgentScreenAppHtml(), if different from webview]

## Extension Changes
[Diff or description of agentScreen.ts changes, if any]

## Test Updates
[Changes to tests, if any, or confirmation that existing tests pass]
```

Do not reference external files. Include all code inline. Prefer minimal diff; preserve existing behavior unless requirements explicitly change it.

---
