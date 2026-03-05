# Prompt: Generate Cursor Drive Project Plan Tree

## Your task

You are a senior staff engineer and technical planner. Your job is to produce a complete, executable plan tree for the **Cursor Drive** project — a VS Code extension + Cursor plugin that adds a voice-first, multi-agent pair-programming meta-layer to Cursor IDE.

Output a set of `.plan.md` files (one code block per file) that collectively represent the full project plan, granular enough for parallel sub-agents to execute independently.

**Output exactly these files**, each as a fenced code block with the filename as the fence language label:

1. `cursor-drive-project_root.plan.md` — project root (isProject: true)
2. `cursor-drive_infra.plan.md` — shared infrastructure (config, MCP server, plugin layer foundation)
3. `cursor-drive_voice-io.plan.md` — PRD 1: Voice I/O pipeline
4. `cursor-drive_session-persona.plan.md` — PRD 2: Session + Persona
5. `cursor-drive_multi-agent.plan.md` — PRD 3: Multi-Agent Orchestration
6. `cursor-drive_safety-config.plan.md` — PRD 4: Safety + Configuration
7. `cursor-drive_cursor-integration.plan.md` — PRD 5: Cursor Integration
8. `cursor-drive_testing.plan.md` — Test coverage and CI

Files 2–8 are workstream plans (isProject: false). If any workstream has a major phase (P1 or P2) that is **fully independent** of its P0 and large enough (5+ tasks), split it into a separate sub-plan file and list it in `childPlanIds`.

---

## Plan file format

Every `.plan.md` file MUST follow this exact format:

```
---
name: Human-Readable Plan Name
overview: One or two sentences describing the scope.
planType: project | workstream | subplan
planId: kebab-case-unique-id
parentPlanId: parent-plan-id | null
childPlanIds: [list, of, child, plan, ids]
todos:
  - id: short-kebab-id
    content: "Detailed task. Include: what to build, which file(s) to create or edit, acceptance criteria in 1-2 sentences."
    status: pending
isProject: true | false
---

# Plan Name

## Purpose

One paragraph.

## Dependency notes

Bullet list of what this plan depends on (other planIds or external things).

## Phase overview (optional, for multi-phase plans)

Table of phases, focus, key deliverables.

## TODO detail

For each TODO, one subsection:
### id: short-kebab-id
What exactly needs to be done, what files are involved, what done looks like.
```

### Rules for TODOs

- **Concrete**: name the files and modules. "Implement `fillerCleaner.ts` with `cleanFillerWords(text: string): string`" not "implement filler cleaning".
- **Atomic**: one logical unit of work per TODO. A sub-agent should be able to pick it up without reading the others.
- **Testable**: include an acceptance criterion. "Returns input unchanged if density < 0.1" is testable. "Works correctly" is not.
- **Independent within a plan where possible**: prefer orderings that allow parallel execution.
- **Cross-plan dependencies explicit**: if TODO X in plan A must come before TODO Y in plan B, note it in the dependency notes section.
- **IDs**: use `{plan-prefix}-{phase}-{seq}` format. Example: `voice-p0-01`, `infra-p0-config`.

---

## Project context

### What this is

Cursor Drive is a voice-first, multi-agent, pair-programming meta-layer for Cursor IDE. It has three layers:

**Layer 1 — Cursor Plugin** (`.cursor-plugin/` directory, installed as a Cursor plugin):
- `agents/drive.md` — Agent persona definition (concise-first, senior engineer, mode-aware)
- `rules/drive-concise.mdc` — Response discipline rules
- `rules/drive-modes.mdc` — Mode awareness rules (Drive-Ask, Drive-Agent, Drive-Plan, Drive-Debug)
- `skills/tangent/SKILL.md` — `/tangent` command: spawn a parallel agent
- `skills/switch/SKILL.md` — `/switch` command: bring a background agent to foreground
- `skills/merge/SKILL.md` — `/merge` command: merge a tangent's context back to main
- `mcp.json` — Registers the Drive MCP server (stdio transport, no hosting)

**Layer 2 — VS Code Extension** (`src/` directory, installed as a VSIX):
- `extension.ts` — Entry point
- `driveMode.ts` — Drive state management (active, sub-mode)
- `statusBar.ts` — Status bar: `Drive > Agent | Alpha` with click-to-switch
- `tts.ts` — Text-to-speech: OS native (say.js), Piper, or ElevenLabs backends
- `agentRegistry.ts` — Multi-agent lifecycle: spawn, pause, merge, status
- `shareScreen.ts` — WebviewPanel showing agent file activity in real time (clickable)
- `mcpServer.ts` — Local MCP server (stdio, 11 tools) bridging plugin to extension
- `router.ts` — Intent router: prompt + sub-mode → plan/agent/ask/direct
- `fillerCleaner.ts` — Filler word stripper (pure function, zero cost)
- `modelSelector.ts` — 3-tier cost-aware model selection via `vscode.lm` API
- `promptOptimizer.ts` — Cheap-model prompt rewrite with QuickPick approval

**Layer 3 — Python Hooks** (`.cursor/hooks/`):
- `drive-preprocessor.py` — Filler analysis, tangent detection, mode hints injected as context
- `plan-runner.py` — Plan governance hook

### What's already built and working

- `fillerCleaner.ts` ✅
- `router.ts` ✅ (basic slash command and mode hints)
- `modelSelector.ts` ✅ (3-tier selection)
- `driveMode.ts` ✅
- `statusBar.ts` ✅
- `tts.ts` ✅ (say.js backend only)
- `agentRegistry.ts` ✅ (data model only, no execution)
- `shareScreen.ts` ✅ (webview with file activity, clickable files)
- `mcpServer.ts` ✅ (11 tools registered, stdio not yet wired in plugin)
- `extension.ts` ✅ (commands registered)
- `drive.md` agent ✅
- `drive-concise.mdc`, `drive-modes.mdc` rules ✅
- `tangent.md`, `switch.md`, `merge.md` commands ✅
- `mcp.json` plugin manifest ✅
- `drive-preprocessor.py` hook ✅
- Unit tests for fillerCleaner, router, modelSelector ✅

### What is NOT yet built (by PRD)

See PRD sections below.

---

## PRD 1: Voice I/O

### P0 (foundation — block everything else in this PRD)
- Fix `promptOptimizer.ts` approval stub: replace placeholder with real `vscode.window.showQuickPick` with three options (Use optimized / Use original / Edit)
- Add glossary expander module (`glossaryExpander.ts`): user-configurable phrase-to-intent map, reads from `cursorDrive.voice.glossary` setting, applies before optimizer
- Add sanitizer module (`sanitizer.ts`): truncates input to `maxInputTokens`, strips prompt injection sequences (patterns like `ignore previous instructions`, `system:`, XML-style injections)
- Web Speech API TTS backend: a browser-side implementation in the webview (no native process dependency). Only used in share-screen webview context.
- Wire TTS into extension commands: `cursorDrive.speak` already registered in extension.ts, needs to route to configured backend

### P1 (parallel with P0, no hard dependency)
- Piper TTS backend: `piper.ts` module. Spawns `piper` binary as child process if installed. Falls back to say.js if binary not found. Configurable via `cursorDrive.tts.backend: "piper"`.
- ElevenLabs TTS backend: `elevenlabs.ts` module. HTTP calls to ElevenLabs API using `cursorDrive.tts.elevenLabsApiKey` from `vscode.SecretStorage`. Voice selection from `cursorDrive.tts.elevenLabsVoiceId`.
- Voice interrupt: detect user starting to type while TTS is speaking → call `tts.stop()`. Wire into `vscode.workspace.onDidChangeTextDocument` and the `beforeSubmitPrompt` hook.
- Wake word detection: `wakeWord.ts` module. Listens for configured phrase (default: `"hey drive"`) in the drive-preprocessor hook. Emits `wakeWordDetected` event that activates Drive if inactive.
- Submit word detection: `submitWord.ts` module. Detects end-of-dictation phrase (default: `"send it"`, `"go"`, `"submit"`) in drive-preprocessor hook. Emits `submitDetected` event that triggers prompt submission.

### P2 (depends on P0 and P1)
- Multi-voice routing: each agent in `AgentRegistry` has a `voice` field. When TTS is active and an agent speaks, use that agent's configured voice. Default voices configurable globally or per-agent.
- TTS queue: if multiple agents want to speak, queue their messages. Respects speaking priority rules (foreground agent > comms agent > background agents).
- Audio device selection: `cursorDrive.tts.outputDevice` setting. On macOS, uses `say` `-a` flag. On Windows, uses available SAPI device. Not supported on Linux.

---

## PRD 2: Session + Persona

### P0 (foundation)
- `responseFormatter.ts` module:
  - Takes full model response text + current verbosity config
  - Calls cheapest available model (routing tier from modelSelector) with a compression prompt
  - Compression prompt: "Summarize this in 1-3 sentences. Name any files or locations changed. End with 'Want details?'. Do not include code snippets."
  - Returns `{ formatted: string, full: string }`
  - `verbose` mode: pass through unchanged
  - Configurable: `cursorDrive.agent.verbosity` (terse | normal | verbose), `cursorDrive.agent.offerElaboration`, `cursorDrive.agent.maxSpokenSentences`
- Wire formatter into the plugin's MCP `drive_speak` tool: formatted version goes to TTS, full version is logged
- Add `cursorDrive.agent.name` setting (default: `"Drive"`). On first activation with no name set, show `vscode.window.showInputBox` asking user to name their agent. Persist to workspace config.
- Status bar update: show agent name: `Drive > Agent | {name}`

### P1 (depends on P0)
- Session memory store (`sessionMemory.ts`):
  - Per-workspace, persisted to `vscode.ExtensionContext.workspaceState`
  - Tracks: conversation turns (summaries, not full text), active tasks (name + status), pending actions, decisions made
  - Memory window: configurable `maxEntries` (default 50). When exceeded, summarize oldest N entries into single compressed entry using routing-tier model call.
  - Privacy constraint: summarization prompt must include "Do not include code snippets, secrets, or file contents."
  - Inject context into Drive agent's system prompt via MCP tool `drive_get_context`: returns formatted string "Previous: [summary]. Active: [tasks]. Pending: [actions]." bounded by `tokenBudget` setting (default 500 tokens, ~2000 chars).
- Add settings: `cursorDrive.agent.sessionMemory.enabled`, `cursorDrive.agent.sessionMemory.maxEntries`, `cursorDrive.agent.sessionMemory.tokenBudget`

### P2 (depends on P1, fully independent deliverable)
- Proactive steering (`proactiveSteering.ts`):
  - Idle detection: after agent response, start timer. If user hasn't typed in `idleSeconds` seconds, agent sends a suggestion based on session memory's pending tasks.
  - Commitment tracking: detect phrases like "I'll do X", "let's do X next" in user messages, store as pending actions.
  - On next session start, remind: "Last time you mentioned X — ready for that?"
  - Settings: `cursorDrive.agent.proactiveSteering.enabled` (default false), `cursorDrive.agent.proactiveSteering.idleSeconds` (default 30)

---

## PRD 3: Multi-Agent Orchestration

### P0 (foundation — many P1/P2 features depend on this)
- AgentRegistry execution layer: AgentRegistry exists as a data model. Now add:
  - `spawn(task: string, voice?: string): AgentContext` — creates agent, assigns default name from configurable name pool (Alpha, Beta, Gamma, ...), adds to registry, posts `agentSpawned` event to ShareScreen
  - `setForeground(id: string)` — switches active agent, updates status bar
  - `merge(fromId: string, toId: string)` — copies `fromId.memory` into `toId.memory`, sets `fromId.status = "merged"`, fires `agentMerged` event
  - `pause(id: string)` / `resume(id: string)`
  - AgentRegistry exposes these via MCP tools: `drive_spawn_agent`, `drive_switch_agent`, `drive_merge_agent`, `drive_list_agents` (all already registered in mcpServer.ts but currently stub implementations)
- Tangent keyword processing: `drive-preprocessor.py` detects `"tangent"` keyword in prompt, extracts task description, emits hint in context. Drive agent persona (`agents/drive.md`) reads hint and calls `drive_spawn_agent` MCP tool.
- Agent status bar: update `statusBar.ts` to show multiple agents: `Drive > Agent | Alpha [Beta●]` where `●` = background. Click opens QuickPick listing all agents with status.

### P1 (depends on P0)
- Group chat visual differentiation:
  - Each agent gets a color from a configurable palette (`cursorDrive.agents.colors` setting, array of CSS color strings)
  - ShareScreen panel already shows per-agent color in agent name header
  - Chat panel: Drive uses MCP `drive_post_message` to prefix messages with agent name. No VS Code API to color individual chat messages; use bold name prefix + emoji indicator per agent instead.
- Agent filter: `cursorDrive.agents.visibleAgents` setting: array of agent names to show in share-screen. If empty, show all.
- CommsAgent: a special agent (cheap model) that monitors background agent completions and delivers batched updates to the user:
  - Triggered when any background agent completes a task or hits a question
  - Collects pending updates, waits for natural pause (foreground agent idle), delivers: "Beta finished rate limiting research. Want to hear more?"
  - CommsAgent speaks in its own voice (configurable `cursorDrive.agents.commsVoice`)
  - Settings: `cursorDrive.agents.commsAgent.enabled` (default false), `cursorDrive.agents.commsAgent.voice`

### P2 (depends on P1, independent deliverable)
- Speaking priority enforcer: given N agents wanting to speak, enforce: foreground agent > comms agent > background agents. No two agents speak simultaneously.
  - Implement `SpeakingQueue` class in `tts.ts`: queue of `{ agentId, text, voice }`, processes one at a time
  - Interrupt handling: if user starts speaking (detected via drive-preprocessor wakeWord or submit event), pause queue, clear foreground agent's remaining speech
- Agent context isolation: `cursorDrive.agents.contextIsolation` setting. When true, background agents do NOT receive the main thread's memory context. When false, all agents share context.
- Agent persistence: on workspace close, serialize active agents to `workspaceState`. On re-open, offer to resume: "You had 2 active agents when you last closed. Resume?"

---

## PRD 4: Safety + Configuration

### P0 (foundation — must be done before P1/P2 of other PRDs)
- Centralized config module (`config.ts`):
  - Single source of truth for all `cursorDrive.*` settings
  - Typed `DriveConfig` interface covering ALL settings across all 5 PRDs
  - `getConfig(): DriveConfig` function — reads from `vscode.workspace.getConfiguration("cursorDrive")`
  - `onConfigChange(listener: (config: DriveConfig) => void)` — subscribes to `onDidChangeConfiguration`
  - Validates values: enum membership, number ranges, path existence
  - Log config at startup with `redactedConfig(config)` — replaces API key values with `"[redacted]"`
  - All modules import from `config.ts` rather than calling `vscode.workspace.getConfiguration` directly
- Approval gates module (`approvalGates.ts`):
  - `PatternLevel = "warn" | "block"`
  - `checkPrompt(text: string): ApprovalResult` — pre-routing scan
  - `checkResponse(text: string): ApprovalResult` — post-response scan
  - Default warn patterns: `revert`, `reset --hard`, `push --force`, `push -f`, `delete branch`, `drop database`, `drop table`
  - Default block patterns: `rm -rf`, `del /f /s /q`, `rmdir /s`, `format c:`
  - `warn` result: show `vscode.window.showWarningMessage` with Proceed/Cancel. Return `allowed` or `blocked`.
  - `block` result: show `vscode.window.showErrorMessage`. Return `blocked` always.
  - User-configurable additional patterns: `cursorDrive.safety.warnPatterns`, `cursorDrive.safety.blockPatterns` (string arrays)
  - Wire into extension.ts: wrap all MCP tool invocations that could affect files/git/terminal

### P1 (depends on P0)
- Tool allowlist module (`toolAllowlist.ts`):
  - Capabilities: `fileRead`, `fileWrite`, `terminalExecute`, `gitRead`, `gitWrite`, `webSearch`, `modelCall`
  - Per-agent allowlist: `cursorDrive.agents.allowlist` — map of agent name to array of allowed capabilities
  - Default for spawned agents: `fileRead`, `modelCall` only
  - Default for primary agent (Alpha): all capabilities
  - `canDo(agentId: string, capability: Capability): boolean` — checked by MCP server before executing any tool
  - If capability blocked: return MCP error response with message "Capability [X] not in allowlist for agent [Y]"
- Mode switching controls:
  - `cursorDrive.modeSwitching.voiceEnabled` (default true)
  - `cursorDrive.modeSwitching.semanticEnabled` (default false) — AI cannot auto-switch modes
  - `cursorDrive.modeSwitching.requireConfirmation` (default true) — show QuickPick before switching
  - `cursorDrive.modeSwitching.allowedModes` (default: all)
  - Wire into `driveMode.ts` `setSubMode()`: check controls before switching

### P2 (depends on P1)
- Audit log (`auditLog.ts`):
  - Append-only log to `vscode.ExtensionContext.globalStorageUri/audit.jsonl`
  - Each entry: `{ timestamp, agentId, action, details, result }`
  - Logged actions: mode switch, agent spawn/merge/pause, approval gate result, tool call
  - `cursorDrive.safety.auditLog.enabled` (default false), `cursorDrive.safety.auditLog.maxSizeMb` (default 10)
  - Rotate when size exceeds max: rename to `audit.jsonl.1`, start fresh
  - View command: `cursorDrive.viewAuditLog` opens audit file in editor
- API key management:
  - All API keys (ElevenLabs, future providers) stored in `vscode.SecretStorage`
  - `cursorDrive.setApiKey` command: prompts for provider name and key, stores in SecretStorage
  - `cursorDrive.clearApiKey` command: clears key for provider
  - Never log, never serialize to workspace config

---

## PRD 5: Cursor Integration

### P0 (foundation — depends on infra plan)
- Meta-layer mode wrapping: refactor the Drive agent's system prompt and `drive-modes.mdc` rule to implement Drive-Ask, Drive-Agent, Drive-Plan, Drive-Debug clearly:
  - Each mode has a distinct system prompt section that the agent switches to
  - `CursorMode` type in `driveMode.ts`: `"ask" | "agent" | "plan" | "debug"`
  - Mode is injected into the MCP context tool `drive_get_context` result
  - Update `statusBar.ts` format: `Drive > {mode} | {agentName}` (capitalize mode)
- Status bar click → QuickPick: modes section + agents section + "Turn off Drive" option. QuickPick uses `$(play-circle)` and `$(circle-slash)` icons.

### P1 (depends on P0 of multi-agent plan)
- Share-screen refinements:
  - `shareScreen.ts` already exists. Add: agent filter (show only selected agent's activity)
  - Add diagram rendering: when agent logs markdown with a mermaid code block, render it as SVG in the webview using `mermaid.js` (bundled, not CDN)
  - Webview theme: use VS Code CSS variables (`--vscode-editor-background`, `--vscode-editor-foreground`, `--vscode-textLink-foreground`) throughout. Zero hardcoded colors.
  - Mermaid dark/light theme: detect `body.vscode-dark` class on webview body, pass `theme: 'dark'` or `theme: 'default'` to mermaid init
  - File click: already implemented. Verify it works for relative paths by resolving against workspace root.
- Agent chat visual differentiation: implement the agent color scheme in shareScreen's message feed. Each agent's messages get a left border in their assigned color. Colors from `cursorDrive.agents.colors` setting (default: `["#4A90E2", "#E2844A", "#4AE290", "#E24A72", "#9B4AE2"]`).

### P2 (depends on P1)
- Cursor Blame integration:
  - When Drive agent makes file changes, annotate the git commit message with `[Drive: {agentName}]`
  - Implement via a post-commit hook or by intercepting the MCP `drive_write_file` tool's response
  - `cursorDrive.integration.cursorBlame.enabled` setting (default false — requires explicit opt-in)
- Plugin marketplace submission:
  - Clean up `.cursor-plugin/plugin.json` manifest (add logo, description, keywords)
  - Write `PLUGIN-README.md` — plugin-specific readme for marketplace listing
  - Submit via cursor.com/marketplace (manual process, document the steps)

---

## Shared Infrastructure (feeds all PRDs)

### What must exist before PRD workstreams can proceed

- `config.ts` centralized config module — PRD 4 P0. Every other module depends on this.
- MCP server stdio wiring — `mcpServer.ts` exists but the plugin's `mcp.json` needs to point to a startup script. Create `scripts/start-mcp.js` entry point that bootstraps the server.
- Plugin layer validation: confirm that `agents/drive.md`, `rules/*.mdc`, `commands/*.md` are read correctly by Cursor's plugin system. This requires a local Cursor install test.
- Jest test infrastructure already set up. Confirm all existing tests pass (`npm test`) before starting any new work.

---

## Dependency graph

```
config.ts (infra-p0-config)
  └─> approvalGates.ts (safety-p0-gates)
      └─> toolAllowlist.ts (safety-p1-allowlist)

mcp-stdio-wiring (infra-p0-mcp)
  └─> all MCP tool implementations

promptOptimizer fix (voice-p0-optimizer)
glossaryExpander (voice-p0-glossary)
sanitizer (voice-p0-sanitizer)
  └─> voice pipeline complete

responseFormatter (persona-p0-formatter)
  └─> sessionMemory (persona-p1-memory)
      └─> proactiveSteering (persona-p2-steering)

agentRegistry execution (multi-p0-registry)
  └─> commsAgent (multi-p1-comms)
  └─> speakingQueue (multi-p2-queue)

meta-layer mode wrap (integration-p0-modes)
shareScreen refine (integration-p1-share)
```

Key rule: **complete infra-p0 before starting any PRD P1 work**. PRD P0s can run in parallel with each other after infra-p0 is done.

---

## Parallelism map

These workstream plans can run in parallel after `cursor-drive_infra.plan.md` P0 is complete:

| Track | Plans | Blocking dependency |
|---|---|---|
| A | voice-io P0 + P1 | infra P0 |
| B | session-persona P0 | infra P0 |
| C | multi-agent P0 | infra P0 |
| D | safety-config P0 | none (can start now) |
| E | cursor-integration P0 | infra P0 |

PRD P2 phases always depend on their own P1.

---

## Existing plan to supersede

The file `.cursor/plans/hh-plan_cursor-drive.plan.md` has `planId: cursor-drive` and is currently a flat workstream. The new plan tree should:
- Replace this as the detailed execution plan
- The root plan `cursor-drive-project_root.plan.md` should have `parentPlanId: hh-project` (to preserve the existing graph)
- The old `cursor-drive` workstream should be marked as superseded in its overview once new plans are in place

---

## Output requirements

For each file:
1. Output a fenced code block labeled with the filename (e.g., ` ```cursor-drive-project_root.plan.md `)
2. The content must be a valid `.plan.md` file with YAML frontmatter exactly matching the format spec above
3. TODOs must be concrete enough for an independent sub-agent to execute without reading this prompt
4. Mark currently-built items as `status: completed`, unbuilt items as `status: pending`
5. Do NOT generate fictional module names or APIs not mentioned in this prompt
6. Every TODO that touches a TypeScript file must name the file and the exported function/class being added

All 8 files are required. Do not abbreviate or skip any.
