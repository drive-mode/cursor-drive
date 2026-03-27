# claude-drive Repository Analysis

> **Repository:** [drive-mode/claude-drive](https://github.com/drive-mode/claude-drive)  
> **Date:** 2026-03-27  
> **Languages:** TypeScript 89.6%, JavaScript 9.3%, Python 1.1%  
> **Version:** 0.1.0 | **License:** None declared | **Stars:** 1

---

## 1. Repository Structure

```
drive-mode/claude-drive/
├── .claude/
│   └── CLAUDE.md                        # Claude Code agent instructions (repo-level)
├── .github/
│   ├── CODEOWNERS
│   └── workflows/
│       ├── ci.yml                       # Build + test on push/PR (Node 20)
│       ├── merge-to-develop.yml         # Auto-merge workflow
│       └── publish.yml                  # NPM publish workflow
├── docs/
│   ├── claude-code-feature-tier-list.md # Claude Code feature tier analysis
│   ├── plans/
│   │   ├── claude-drive-stabilization-plan.md
│   │   └── drive-mode-portfolio-roadmap.md
│   └── research/                        # 10 research sprint documents
│       ├── 00-executive-summary.md
│       ├── 01-build-health.md
│       ├── 02-operator-lifecycle.md
│       ├── 03-mcp-tools.md
│       ├── 04-infrastructure.md
│       ├── 05-tts-voice.md
│       ├── 06-test-coverage.md
│       ├── 07-ecosystem-fit.md
│       ├── 08-api-optimization.md
│       ├── 09-vision-and-requirements.md
│       └── RESEARCH-SPRINT-PROMPT.md
├── scripts/
│   ├── install-plugin.mjs               # Plugin installer for Claude Code
│   └── push-develop.py                  # Git workflow helper
├── src/                                 # 25 TypeScript source files
│   ├── agentOutput.ts                   # Terminal renderer (ANSI + SSE events)
│   ├── approvalGates.ts                 # Safety gate policies
│   ├── approvalQueue.ts                 # Pending approval request queue
│   ├── atomicWrite.ts                   # Atomic JSON file writes
│   ├── autoDream.ts                     # Background memory consolidation daemon
│   ├── checkpoint.ts                    # Session checkpoint/restore/fork
│   ├── cli.ts                           # CLI entry point (commander)
│   ├── config.ts                        # Config loader (~/.claude-drive/config.json)
│   ├── driveMode.ts                     # Drive state machine
│   ├── edgeTts.ts                       # Edge-TTS backend (neural, cloud)
│   ├── gitService.ts                    # Git command wrapper
│   ├── hooks.ts                         # Lifecycle hook registry
│   ├── mcpServer.ts                     # MCP server — 46 tools on :7891
│   ├── memoryManager.ts                 # High-level memory operations
│   ├── memoryStore.ts                   # Typed persistent memory store
│   ├── operatorManager.ts              # Agent SDK query() wrapper
│   ├── operatorRegistry.ts             # Operator lifecycle management
│   ├── piper.ts                         # Piper TTS backend (local, neural)
│   ├── planCostTracker.ts              # Per-plan cost tracking
│   ├── router.ts                        # Intent router (keywords → mode)
│   ├── sessionManager.ts              # Session create/resume
│   ├── sessionStore.ts                 # Session JSON persistence
│   ├── skillLoader.ts                  # Skill discovery and registry
│   ├── statusFile.ts                    # Status file writer
│   ├── statusLine.ts                   # Claude Code status line integration
│   ├── store.ts                         # JSON file KV store
│   ├── tts.ts                           # TTS dispatch layer
│   ├── tui.tsx                          # Ink/React two-pane TUI
│   └── worktreeManager.ts             # Git worktree per operator
├── tests/                               # 16 test files (168 tests)
│   ├── approvalGates.test.ts
│   ├── atomicWrite.test.ts
│   ├── autoDream.test.ts
│   ├── checkpoint.test.ts
│   ├── config.test.ts
│   ├── driveMode.test.ts
│   ├── hooks.test.ts
│   ├── mcpServer.test.ts
│   ├── memoryStore.test.ts
│   ├── mvpBlockers.test.ts
│   ├── operatorManager.test.ts
│   ├── operatorRegistry.test.ts
│   ├── planCostTracker.test.ts
│   ├── router.test.ts
│   ├── skillLoader.test.ts
│   ├── statusFile.test.ts
│   └── statusLine.test.ts
├── AGENTS.md                            # AI agent context
├── CLAUDE.md                            # Claude Code instructions
├── CONTRIBUTING.md
├── README.md
├── package.json
├── package-lock.json
└── tsconfig.json
```

**Total:** ~4,970 LOC across 25 source files + 16 test files.

---

## 2. Core Features

claude-drive is a **standalone Node.js CLI** that brings multi-operator AI pair programming to the Claude Code CLI. It is a port of `cursor-drive` (VS Code extension) with VS Code APIs replaced by Node.js equivalents (~60% shared code).

### Feature Matrix

| Feature | Description |
|---------|-------------|
| **Multi-operator orchestration** | Spawn, switch, dismiss, merge named operators (Claude subagents) |
| **MCP server** | Exposes 46 Drive tools to Claude Code on `localhost:7891` |
| **Voice narration (TTS)** | Three backends: Edge-TTS (cloud, neural), Piper (local, neural), system `say` |
| **Git worktree isolation** | Each operator gets its own worktree and branch; merge when done |
| **Typed memory system** | Structured memory entries (fact/preference/correction/decision/context) with confidence decay |
| **Auto-dream consolidation** | Background daemon that prunes stale entries, merges similar ones, promotes cross-operator patterns |
| **Lifecycle hooks** | 12 hook events (SessionStart, OperatorSpawn, TaskComplete, etc.) |
| **Reusable skills** | Markdown files with YAML frontmatter, parameter interpolation |
| **Session management** | Checkpoint/restore/fork with full state snapshots |
| **Approval gates** | Pattern-matched safety gates (block `rm -rf`, warn on `force push`, etc.) |
| **Cost tracking** | Per-operator and per-plan cost/duration/turns tracking |
| **Claude Code status line** | Rich status line script showing operator state in Claude Code |
| **Ink TUI** | Optional two-pane terminal UI (activity feed + operator list) |
| **One-shot tasks** | Run a prompt headlessly without starting a full session |

---

## 3. Architecture Patterns

### Overall Architecture

```
CLI (commander) → DriveMode state machine
                → OperatorRegistry (operator lifecycle)
                → OperatorManager (Agent SDK query() per operator)
                → MCP Server (localhost:7891) ← Claude Code reads tools
                → AgentOutput (terminal renderer / Ink TUI)
                → TTS (edgeTts → piper → say fallback chain)
                → WorktreeManager (git worktree per operator)
                → MemoryStore + AutoDream (persistent typed memory)
                → HookRegistry + SkillRegistry (extensibility)
```

### Key Architectural Patterns

1. **MCP Protocol (Model Context Protocol)** — The primary integration channel. claude-drive runs an HTTP MCP server that Claude Code connects to as a registered MCP server. Tools exposed via `@modelcontextprotocol/sdk` with `StreamableHTTPServerTransport` and `StdioServerTransport`.

2. **Agent SDK Integration** — Uses `@anthropic-ai/claude-agent-sdk` `query()` function to execute operators as subagents. Each operator gets a system prompt, tool permissions, and MCP server access.

3. **Event-Driven State** — `OperatorRegistry` and `DriveModeManager` use Node.js `EventEmitter` for state change notifications. Registry changes trigger status file writes, TUI updates, and hook executions.

4. **Singleton Pattern** — Key services (`memoryStore`, `hookRegistry`, `skillRegistry`, `store`) are module-level singletons. The MCP server builder receives registry and driveMode via dependency injection.

5. **Config Priority Chain** — CLI flags > environment variables > `~/.claude-drive/config.json` > hardcoded defaults. Env var format: `CLAUDE_DRIVE_TTS_BACKEND`.

6. **Permission Cascade** — Child operators cannot exceed parent preset. Preset order: `readonly < standard < full`. `minPreset()` enforces the constraint at spawn time.

7. **Role-Based System Prompts** — Five roles (implementer, reviewer, tester, researcher, planner) each with default presets, descriptions, and system hints injected into the operator's prompt.

8. **Port Discovery** — Server writes port to `~/.claude-drive/port` on startup, deletes on shutdown. Clients can read this file for service discovery.

---

## 4. Key Modules (Detailed)

### `cli.ts` (Entry Point — 20.6 KB)

The Commander-based CLI with these commands:

| Command | Description |
|---------|-------------|
| `claude-drive start` | Start the MCP server daemon |
| `claude-drive run <task>` | One-shot task with default operator |
| `claude-drive serve-stdio` | MCP server over stdin/stdout (Claude Desktop plugin mode) |
| `claude-drive operator spawn/list/switch/dismiss` | Operator management |
| `claude-drive mode set/status` | Drive mode control |
| `claude-drive tts <text>` | Speak text via TTS |
| `claude-drive config set/get` | Configuration management |
| `claude-drive port` | Print live MCP server URL |
| `claude-drive statusline install/uninstall/preview` | Status line integration |
| `claude-drive skill list/show` | Skill management |
| `claude-drive dream` | Manual dream consolidation cycle |
| `claude-drive session list/checkpoint/restore/fork` | Session management |
| `claude-drive memory stats/list` | Memory management |

On `start`, it: validates SDK availability, initializes hooks/skills/auto-dream, starts the MCP server, writes status.json on state changes, and keeps the process alive.

### `mcpServer.ts` (MCP Server — 31.3 KB)

The largest file. Builds an MCP server with **46 tools** across **11 domains**:

| Domain | Tools | Count |
|--------|-------|-------|
| Operator | spawn, switch, dismiss, list, update_task, update_memory, escalate, record_cost | 8 |
| Agent Screen | activity, file, decision, clear, chime | 5 |
| TTS | speak, stop | 2 |
| Drive Mode | set_mode, get_state, run_task | 3 |
| Approval | request, respond | 2 |
| Worktree | create, remove, merge, status | 4 |
| Session | save, restore, list, checkpoint, restore_checkpoint, list_checkpoints, fork, metadata | 8 |
| Cost | get_costs | 1 |
| Memory | remember, recall, correct, forget, share | 5 |
| Hooks | register, unregister, list | 3 |
| Skills | list, load, run | 3 |
| Dream | trigger, status | 2 |

**Transport:** HTTP on 127.0.0.1 with port range fallback (default 7891, tries up to 7895). Also supports stdio via `serve-stdio` command.

**Session management:** Each HTTP session gets its own `StreamableHTTPServerTransport` + `McpServer` instance, keyed by `mcp-session-id` header. All sessions share the same `registry` and `driveMode` (noted as a multi-client issue).

### `operatorRegistry.ts` (Operator Lifecycle — 14.9 KB)

Manages the operator pool with full lifecycle:

- **States:** `active | background | completed | merged | paused`
- **Roles:** `implementer | reviewer | tester | researcher | planner`
- **Permission Presets:** `readonly | standard | full` (child capped by parent)
- **Operations:** spawn, switchTo, pause, resume, dismiss (with cascade), merge, delegate, escalate
- **Name Pool:** Configurable via `operators.namePool`; defaults to "Operator 1", "Operator 2"
- **Stats Tracking:** Per-operator cost, duration, API duration, turns, task count
- **AbortController:** Each operator gets an abort controller for task cancellation on dismiss

### `operatorManager.ts` (Agent SDK Wrapper — 8.4 KB)

Wraps `@anthropic-ai/claude-agent-sdk` `query()` for each operator:

- **Tool Permissions:** Mapped from preset:
  - `readonly`: Read, Glob, Grep, WebSearch, WebFetch
  - `standard`: + Edit, Write, Bash, Agent
  - `full`: same as standard (all tools)
- **System Prompt:** Built from role template + memory context + MCP tool instructions
- **Subagent Definitions:** Other active operators exposed as subagents
- **SDK Hooks:** PostToolUse hooks for logging file edits and bash commands
- **Cost Tracking:** Extracts `total_cost_usd`, `duration_ms`, `num_turns` from SDK result messages
- **Abort Signal:** Propagated from operator's AbortController for cancellation

### `driveMode.ts` (State Machine — 2.7 KB)

Simple state machine with two properties:

- `active: boolean` — whether Drive mode is on
- `subMode: DriveSubMode` — `"ask" | "agent" | "plan" | "debug" | "off"`

Backed by `store.ts` for persistence. Fires `ModeChange` hook on transitions.

### `router.ts` (Intent Router — 2.2 KB)

Keyword-based intent classification (no LLM — Tier 0):

- Plan keywords: plan, clarify, requirements, design, architecture, break down
- Agent keywords: add, implement, fix, create, write, refactor, run, execute
- Debug keywords: debug, diagnose, trace, breakpoint, why does, why is
- Default: ask (pass-through)

Respects explicit commands (`/plan`, `/run`, `/drive`) and Drive sub-mode.

### `memoryStore.ts` + `memoryManager.ts` (Typed Memory System — 10 KB combined)

- **Entry Types:** fact, preference, correction, decision, context
- **Fields:** id, kind, content, source, operatorId, tags, confidence, supersededBy, expiresAt
- **Persistence:** `~/.claude-drive/memory.json` with atomic writes
- **Query System:** Filter by kind, tags, operator, search substring; sort by priority (corrections first) then confidence
- **Confidence Decay:** Configurable half-life (default 168 hours / 1 week)
- **Auto-Pruning:** Removes oldest lowest-confidence entries when max reached (default 500)

### `autoDream.ts` (Memory Consolidation — 7.6 KB)

Background daemon that runs every 15 minutes:

1. **Prune:** Remove expired and very low confidence (<0.2) entries
2. **Decay:** Apply exponential confidence decay based on time since last access
3. **Merge:** Find entries with >70% keyword overlap and keep the newer one
4. **Promote:** If an operator-scoped fact appears across 2+ operators, promote to shared/global

### `hooks.ts` (Lifecycle Hooks — 5.4 KB)

12 hook events: `PreToolUse`, `PostToolUse`, `SessionStart`, `SessionStop`, `OperatorSpawn`, `OperatorDismiss`, `ModeChange`, `PreApproval`, `PostApproval`, `MemoryWrite`, `TaskStart`, `TaskComplete`

Two hook types:
- **command:** Execute a shell command with hook context in env vars. Exit code 2 = abort.
- **prompt:** Inject text into the prompt.

Hooks loaded from: config definitions + JSON files in `~/.claude-drive/hooks/`.

### `skillLoader.ts` (Skill Registry — 7.3 KB)

Skills are markdown files with YAML frontmatter stored in `~/.claude-drive/skills/`:

```yaml
---
name: code-review
description: Perform a thorough code review
tags: [review, quality]
requiredRole: reviewer
requiredPreset: readonly
parameters:
  - name: target
    description: File or directory to review
    required: true
---
Review {{target}} for bugs, quality issues, and maintainability...
```

Features: frontmatter parsing, template variable interpolation (`{{name}}`), parameter validation with defaults.

### `approvalGates.ts` (Safety Gates — 4.9 KB)

Pattern-matched safety policy for operator commands:

| Action | Default Patterns |
|--------|-----------------|
| **block** | `rm -rf`, `del /f /s /q`, `format c:`, `rmdir /s` |
| **warn** | `revert`, `undo all`, `hard reset`, `force push`, `delete branch`, `drop database/table` |
| **log** | `sudo`, `npm publish`, `git push` |

Per-operator throttling: 3+ blocks or 5+ warnings → operator is throttled.

### `worktreeManager.ts` (Git Worktree Isolation — 5.4 KB)

Each operator gets:
- Branch: `drive/op/<operatorId>`
- Path: `<repoRoot>/.drive/worktrees/<operatorId>`
- Promise-chain mutex for serialized mutations
- Idempotent allocate/release

### `statusLine.ts` (Claude Code Integration — 7.1 KB)

Generates a bash script that reads `~/.claude-drive/status.json` and Claude Code session info, outputting a rich status line with:
- Claude Code model, context usage, cost
- Drive state (active/inactive, mode)
- Per-operator stats (cost, turns, duration, task)
- Plan cost tracking

Installed via `claude-drive statusline install` which patches `~/.claude/settings.json`.

### `tui.tsx` (Ink Terminal UI — 4 KB)

React/Ink-based two-pane terminal UI:
- **Left pane:** Activity feed (last 50 events)
- **Right pane:** Operator list with status, role, spinner for active
- **Bottom bar:** Drive status (active/inactive, mode)

Activated via `claude-drive start --tui`.

---

## 5. Configuration

Config file: `~/.claude-drive/config.json`

Priority chain: CLI flags → env vars (`CLAUDE_DRIVE_*`) → config file → defaults

### Complete Configuration Schema

| Key | Default | Description |
|-----|---------|-------------|
| **TTS** | | |
| `tts.enabled` | `true` | Enable TTS |
| `tts.backend` | `"edgeTts"` | Backend: `edgeTts`, `piper`, `say` |
| `tts.voice` | `undefined` | Voice name |
| `tts.speed` | `1.0` | Speed (0.5-2.0) |
| `tts.volume` | `0.8` | Volume (0.2-1.0) |
| `tts.maxSpokenSentences` | `3` | Max sentences to speak |
| `tts.interruptOnInput` | `true` | Stop speech on input |
| `tts.piperBinaryPath` | `undefined` | Path to piper binary |
| `tts.piperModelPath` | `undefined` | Path to piper voice model |
| **Operators** | | |
| `operators.maxConcurrent` | `3` | Max active operators |
| `operators.maxSubagents` | `2` | Max subagents per operator |
| `operators.namePool` | `[]` | Custom operator names |
| `operators.defaultPermissionPreset` | `"standard"` | Default preset |
| **MCP** | | |
| `mcp.port` | `7891` | MCP server port |
| `mcp.portRange` | `5` | Ports to try (7891-7895) |
| `mcp.appsEnabled` | `false` | MCP apps toggle |
| **Agent Screen** | | |
| `agentScreen.mode` | `"terminal"` | Output mode: `terminal`, `web` |
| `agentScreen.webPort` | `7892` | Web agent screen port |
| **Drive** | | |
| `drive.defaultMode` | `"agent"` | Default sub-mode |
| `drive.confirmGates` | `true` | Require confirmation for gates |
| **Voice** | | |
| `voice.enabled` | `false` | Voice input (not implemented) |
| `voice.wakeWord` | `"hey drive"` | Wake word |
| `voice.sleepWord` | `"go to sleep"` | Sleep word |
| **Privacy** | | |
| `privacy.persistTranscripts` | `false` | Persist transcripts to disk |
| **Approval Gates** | | |
| `approvalGates.enabled` | `true` | Enable gates |
| `approvalGates.blockPatterns` | `[]` | Additional block patterns |
| `approvalGates.warnPatterns` | `[]` | Additional warn patterns |
| `approvalGates.logPatterns` | `[]` | Additional log patterns |
| **Status Line** | | |
| `statusLine.enabled` | `true` | Enable status line |
| `statusLine.showModel` | `true` | Show model name |
| `statusLine.showContext` | `true` | Show context usage |
| `statusLine.showCost` | `true` | Show costs |
| `statusLine.showDriveState` | `true` | Show Drive state |
| `statusLine.showOperatorTask` | `true` | Show operator tasks |
| `statusLine.maxTaskLength` | `40` | Max task preview length |
| **Router** | | |
| `router.llmEnabled` | `false` | Use LLM for routing (Tier 0 only) |
| **Memory** | | |
| `memory.maxEntries` | `500` | Max memory entries |
| `memory.maxPerOperator` | `100` | Max entries per operator |
| `memory.defaultConfidence` | `0.8` | Default confidence score |
| `memory.decayEnabled` | `true` | Enable confidence decay |
| `memory.decayHalfLifeHours` | `168` | Decay half-life (1 week) |
| **Hooks** | | |
| `hooks.enabled` | `true` | Enable hooks |
| `hooks.directory` | `"~/.claude-drive/hooks"` | Hooks directory |
| `hooks.definitions` | `[]` | Inline hook definitions |
| **Skills** | | |
| `skills.directory` | `"~/.claude-drive/skills"` | Skills directory |
| `skills.enabled` | `true` | Enable skills |
| **Sessions** | | |
| `sessions.maxCheckpoints` | `20` | Max checkpoints per session |
| `sessions.autoCheckpoint` | `false` | Auto-checkpoint toggle |
| `sessions.autoCheckpointIntervalMs` | `300000` | Auto-checkpoint interval (5 min) |
| **Dream** | | |
| `dream.enabled` | `true` | Enable auto-dream |
| `dream.intervalMs` | `900000` | Dream interval (15 min) |
| `dream.minEntries` | `10` | Min entries to trigger dream |
| `dream.pruneThreshold` | `0.2` | Confidence threshold for pruning |
| `dream.mergeThreshold` | `0.7` | Similarity threshold for merging |
| `dream.maxAgeMs` | `604800000` | Max entry age (7 days) |

---

## 6. CLI Interface

### Installation

```bash
npm install && npm run build
# or global:
npm install -g .
```

### Claude Code Integration Setup

```json
// ~/.claude/settings.json
{
  "mcpServers": {
    "claude-drive": { "url": "http://localhost:7891/mcp" }
  }
}
```

### Full Command Reference

```
claude-drive start [-p, --port <n>] [--tui]   Start MCP server
claude-drive run <task> [-n, --name] [--role] [--preset]   One-shot task
claude-drive serve-stdio                       MCP over stdin/stdout
claude-drive operator spawn [name] [--task] [--role] [--preset]
claude-drive operator list
claude-drive operator switch <name>
claude-drive operator dismiss <name>
claude-drive mode set <plan|agent|ask|debug|off>
claude-drive mode status
claude-drive tts <text>
claude-drive config set <key> <value>
claude-drive config get <key>
claude-drive port [--json]
claude-drive statusline install|uninstall|preview
claude-drive skill list|show <name>
claude-drive dream
claude-drive session list|checkpoint [name]|restore <id>|fork [name]
claude-drive memory stats|list [--limit <n>]
```

---

## 7. Agent/Operator Model

### Operator Lifecycle

```
spawn → active ──→ background (when another becomes foreground)
                ──→ paused    ──→ resume → active/background
                ──→ completed (dismiss, cascade from parent)
                ──→ merged    (merge into another operator)
```

### Roles and Permission Presets

| Role | Default Preset | System Hint |
|------|---------------|-------------|
| `implementer` | `standard` | Write production-quality code, follow existing patterns |
| `reviewer` | `readonly` | Analyze code for bugs, risks, quality. Do NOT edit files |
| `tester` | `standard` | Write test cases, run test suites, verify behavior |
| `researcher` | `readonly` | Explore codebase, read docs, synthesize findings |
| `planner` | `readonly` | Analyze requirements, break tasks, produce plan artifacts |

### Permission Presets → Tool Access

| Preset | Allowed Tools |
|--------|-------------|
| `readonly` | Read, Glob, Grep, WebSearch, WebFetch |
| `standard` | + Edit, Write, Bash, Agent |
| `full` | Same as standard |

### Hierarchy Rules

- Children inherit the minimum of their requested preset and parent's preset
- Cascade dismiss: dismissing a parent dismisses all children
- `effectivePreset()` walks the parent chain to compute the runtime preset
- Delegation: operator A can delegate a task to operator B (spawns if B doesn't exist)

### Operator State

Each operator carries: id, name, voice, task, status, memory (string[]), visibility, depth, parentId, permissionPreset, role, systemHint, worktreePath, branchName, stats (cost/duration/turns), and an AbortController.

---

## 8. Voice/TTS Capabilities

### TTS Architecture

Three-backend fallback chain:

```
edgeTts (cloud, neural, free) → piper (local, neural, free) → say (system)
```

### Edge-TTS (`edgeTts.ts`)

- Uses `edge-tts-universal` npm package (optional dependency)
- Default voice: `en-US-EmmaMultilingualNeural`
- Synthesizes to temp MP3 file, plays via OS command (`afplay` on macOS, `aplay` on Linux, PowerShell on Windows)
- Cloud-based, requires internet

### Piper (`piper.ts`)

- Local neural TTS via the [Piper](https://github.com/rhasspy/piper) project
- Requires manual download of piper binary + voice model
- Configured via `tts.piperBinaryPath` and `tts.piperModelPath`
- Generates WAV files, plays via OS commands
- Cross-platform (shell: true on Windows)

### System `say` (`say` npm package)

- Final fallback
- Uses system TTS (macOS `say`, Windows SAPI, Linux `espeak`/`festival`)

### TTS Features

- Sentence truncation (max 3 sentences by default)
- Interrupt on new utterance
- Spoken history tracking (last 20)
- Volume and speed control
- Per-operator voice assignment possible via `voice` field

### Voice Input (Planned, Not Implemented)

Config keys exist (`voice.enabled`, `voice.wakeWord`, `voice.sleepWord`, `voice.whisperPath`) but voice input is not implemented.

---

## 9. Integration Points

### Claude Code (Primary Integration)

1. **MCP Server:** Tools registered at `localhost:7891/mcp` in `~/.claude/settings.json`
2. **Status Line:** Bash script patched into `~/.claude/settings.json` showing Drive state
3. **Stdio Transport:** `serve-stdio` command for Claude Desktop plugin mode
4. **Agent SDK:** `@anthropic-ai/claude-agent-sdk` `query()` for executing operator tasks

### Cursor Drive (Sibling Project)

~60% shared code. These files must be manually synced:
- `operatorRegistry.ts`, `router.ts`, `syncTypes.ts`
- `tts.ts`, `edgeTts.ts`, `piper.ts`

### Data Flow

```
User input → Claude Code → MCP tools → claude-drive server
                                         ↓
                         OperatorRegistry ← OperatorManager (Agent SDK)
                         ↓                   ↓
                    Status file         Agent Screen events
                    Memory store        TTS narration
                    Worktrees           Hooks execution
```

### Files and Directories Used

| Path | Purpose |
|------|---------|
| `~/.claude-drive/config.json` | Configuration |
| `~/.claude-drive/state.json` | Persistent state (KV store) |
| `~/.claude-drive/memory.json` | Memory entries |
| `~/.claude-drive/status.json` | Real-time status for status line |
| `~/.claude-drive/port` | MCP server port discovery |
| `~/.claude-drive/sessions/` | Session checkpoints |
| `~/.claude-drive/hooks/` | Hook definition JSON files |
| `~/.claude-drive/skills/` | Skill markdown files |
| `~/.claude-drive/statusline.sh` | Generated status line script |
| `~/.claude/settings.json` | Claude Code settings (MCP + status line) |

---

## 10. Dependencies

### Runtime Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `@anthropic-ai/claude-agent-sdk` | `0.2.77` | Execute operator tasks as Claude subagents |
| `@anthropic-ai/sdk` | `0.79.0` | Anthropic API client |
| `@modelcontextprotocol/sdk` | `^1.26.0` | MCP server implementation (StreamableHTTP + Stdio) |
| `chalk` | `^5.3.0` | Terminal colors |
| `commander` | `^12.0.0` | CLI framework |
| `edge-tts-universal` | `^1.4.0` | Edge-TTS neural speech synthesis |
| `ink` | `^5.0.0` | React-based terminal UI |
| `ink-spinner` | `^5.0.0` | Spinner component for Ink |
| `react` | `^18.0.0` | React runtime for Ink TUI |
| `say` | `^0.16.0` | System TTS fallback |
| `zod` | `^4.3.6` | Schema validation for MCP tools |

### Dev Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `@types/jest` | `^30.0.0` | Jest type definitions |
| `@types/node` | `^20.0.0` | Node.js type definitions |
| `@types/react` | `^18.0.0` | React type definitions |
| `jest` | `^30.2.0` | Test framework |
| `ts-jest` | `^29.4.6` | TypeScript preprocessor for Jest |
| `typescript` | `^5.3.0` | TypeScript compiler |

### Module System

- ESM (`"type": "module"` in package.json)
- `NodeNext` module resolution
- Relative imports use `.js` extension
- JSX support for Ink TUI (`"jsx": "react-jsx"`)

---

## Research Sprint Findings (From docs/research/)

The repository includes a comprehensive 10-document research sprint. Key findings:

### Build Health (01)
- **Grade: A-** — Clean build, 168 passing tests
- SDK pinned to `0.2.77` (was on `latest` — a fragile choice)
- 62% module test coverage

### Top 5 MVP Blockers (00 Executive Summary)
1. Pin SDK versions (done — was on `latest`)
2. Atomic writes for persistence (partially addressed with `atomicWrite.ts`)
3. Task cancellation via AbortController (implemented)
4. Fail fast on SDK import (implemented in `start` command)
5. Enforce `maxConcurrent` config (implemented in `drive_run_task` MCP tool)

### Cost Optimization (08)
- Estimated $64K-$90K/yr savings possible via: model routing by role, prompt caching, batch API, rate limit backpressure

### Ecosystem Integration (07)
- **Critical integration:** Map operators to Claude Code Agent Teams (the "10x moment")
- **High priority:** MCP channels for push events, Elicitation for approvals, native skills
- claude-drive's unique value: operator identity persistence, semantic memory, voice narration, permission trees, approval gates

---

## Comparison: claude-drive vs cursor-drive

| Aspect | claude-drive | cursor-drive |
|--------|-------------|-------------|
| Runtime | Node.js CLI | VS Code extension |
| UI | Terminal + Ink TUI | VS Code webviews (Agent Screen, Sidebar) |
| State | JSON files in ~/.claude-drive/ | vscode.Memento + workspace storage |
| MCP Transport | HTTP + Stdio | HTTP only |
| Config | ~/.claude-drive/config.json | vscode.workspace.getConfiguration |
| Agent Execution | @anthropic-ai/claude-agent-sdk query() | Cursor Composer (native) |
| Event System | Node EventEmitter | vscode.EventEmitter |
| TTS | Same 3 backends | Same 3 backends + webview |
| Status Line | Claude Code statusLine | VS Code status bar |
| Additional | autoDream, memoryStore, hooks, skills, checkpoint | beforeSubmitPrompt hook, plugin installer |

---

## Summary

claude-drive is a well-structured, feature-rich multi-operator orchestration layer for Claude Code. It provides sophisticated capabilities not available in native Claude Code: persistent operator identity with typed semantic memory, voice narration, permission hierarchy trees, approval gates, auto-dream memory consolidation, extensible hooks and skills, session checkpointing with fork support, and per-operator/per-plan cost tracking.

The codebase is clean TypeScript (strict mode, ESM) with 168 passing tests. The MCP server exposes 46 tools across 11 domains. The primary integration mechanism is the Model Context Protocol, with the MCP server acting as the bridge between Claude Code and the Drive orchestration layer.

Key architectural decisions: the port from cursor-drive maintains ~60% code sharing; the Agent SDK `query()` function is the execution engine for operators; the typed memory system with auto-dream consolidation provides cross-session knowledge retention; and the three-tier TTS fallback chain (Edge-TTS → Piper → say) provides voice narration across platforms.
