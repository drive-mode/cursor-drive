# Claude-Drive Gap Analysis: What's Missing or Incomplete

> **Date:** 2026-03-27 | **Source:** Full source code review of [drive-mode/claude-drive](https://github.com/drive-mode/claude-drive) `main` branch  
> **Compared against:** cursor-drive (this repo) source modules

---

## Overview

claude-drive is a standalone Node.js/TypeScript CLI that ports cursor-drive's multi-operator pair programming to the Claude Code CLI. It runs an MCP server on `:7891`, uses `@anthropic-ai/claude-agent-sdk` to execute operators as subagents, and provides a terminal/TUI-based UI.

**Source inventory:** 29 TypeScript modules in `src/`, 15 test suites (168 tests), 46 MCP tools, ~4,970 LOC.

**Bottom line:** claude-drive has a functional core (operators, MCP, memory, TTS, sessions) but is missing **the entire prompt pipeline**, **model routing**, **governance**, **state sync / mob programming**, **cloud agent integration**, **audio feedback chimes**, and **IDE mode switching**. It also has significant safety gaps (non-atomic writes, no task cancellation signal passing, approval gate bypasses) and incomplete feature wiring (7/12 hooks, 11 dead config keys, dead SSE code).

---

## 1. MISSING: Entire Prompt Pipeline

**cursor-drive has these pipeline modules; claude-drive has NONE of them:**

| cursor-drive Module | Purpose | claude-drive Status |
|---|---|---|
| `fillerCleaner.ts` | Removes filler words ("um", "like") from voice input | **Not ported** |
| `sanitizer.ts` | Sanitizes/normalizes user input | **Not ported** |
| `glossaryExpander.ts` | Expands project-specific glossary terms | **Not ported** |
| `promptOptimizer.ts` | Optimizes prompts before sending to model | **Not ported** |
| `pipeline.ts` | Orchestrates the full request pipeline | **Not ported** |
| `clarificationHandler.ts` | Handles ambiguous user requests | **Not ported** |

**Impact:** claude-drive sends raw user input directly to the router and then to operators. There is no preprocessing, no filler removal, no glossary expansion, no prompt optimization. This means:
- Voice input quality is degraded (filler words included)
- Project-specific terminology isn't expanded
- Prompts aren't optimized for the target model
- Ambiguous requests aren't caught and clarified

**The request pipeline in cursor-drive is:**
```
Voice/Text → fillerCleaner → sanitizer → glossaryExpander → router → promptOptimizer → operator
```
**In claude-drive it's just:**
```
Voice/Text → router → operator
```

---

## 2. MISSING: Tiered Model Routing

**cursor-drive modules not ported:**

| cursor-drive Module | Purpose | claude-drive Status |
|---|---|---|
| `modelSelector.ts` | Tier 0–3 model routing by task type | **Not ported** |
| `modelUtils.ts` | Model utility functions | **Not ported** |

**Impact:** claude-drive uses a single model for ALL operators regardless of role. The research docs (doc 08) estimate this wastes **$24K–$30K/yr** in unnecessary API costs. The config key `router.llmEnabled` exists but is dead — the router is purely keyword-based.

**What's needed:**
- Role-to-model mapping: researcher→Haiku, reviewer→Haiku, tester→Sonnet, implementer→Sonnet, planner→Opus
- Tier 0 deterministic routing (no model needed)
- Tier 1 cheap classification
- Tier 2 user's model for implementation
- Tier 3 reasoning model on explicit request only

---

## 3. MISSING: Governance System

**cursor-drive has:**
- `.cursor/hooks/plan-runner.py` — Tier 0 plan governance
- `.cursor/hooks/dep-auditor.py` — Tier 1 dependency triage
- Plan governance rules (`.cursor/rules/`)
- TODO lifecycle management
- Completion gates

**claude-drive has:** None of this. No plan governance, no completion gates, no dependency auditing, no plan-runner equivalent. The `hooks.ts` module exists but only 5 of 12 hook events are wired, and hooks are limited to shell commands and prompt injection — no governance logic.

---

## 4. MISSING: State Sync / Mob Programming

**cursor-drive modules not ported:**

| cursor-drive Module | Purpose | claude-drive Status |
|---|---|---|
| `stateSyncCoordinator.ts` | Coordinates state across multiple operators | **Not ported** |
| `syncLedger.ts` | Tracks sync operations between operators | **Not ported** |
| `syncTypes.ts` | Shared type definitions for sync | **Not ported** (different file exists but is sync types between repos) |
| `snapshotFeed.ts` | Real-time snapshot feed for operator state | **Not ported** |
| `ndjsonParser.ts` | Parses NDJSON streams for state sync | **Not ported** |

**Impact:** claude-drive operators work in complete isolation. There is no mechanism for:
- Operators to see each other's real-time progress
- Collaborative editing (mob programming)
- State synchronization between parallel operators
- Conflict detection and resolution between operators' work

The `OperatorContext` has `syncState` and `visibility` fields but they are never used — pure dead code.

---

## 5. MISSING: Cloud Agent Integration

**cursor-drive modules not ported:**

| cursor-drive Module | Purpose | claude-drive Status |
|---|---|---|
| `cloudAgentClient.ts` | Client for cloud-based agent coordination | **Not ported** |

**Impact:** No ability to coordinate with remote/cloud agents. All operators are local-only.

---

## 6. MISSING: IDE Mode Switching

**cursor-drive modules not ported:**

| cursor-drive Module | Purpose | claude-drive Status |
|---|---|---|
| `modeSwitcher.ts` | Switches Cursor IDE between Plan/Agent/Ask/Debug modes | **Not ported** |
| `cursorCliRunner.ts` | Runs Cursor CLI commands | **Not ported** |

**Impact:** claude-drive can set its own internal `subMode` state, but it cannot actually switch Claude Code CLI's behavior. The mode setting is informational only — it doesn't change how the host IDE operates.

---

## 7. MISSING: Audio Feedback / Chimes

**cursor-drive modules not ported:**

| cursor-drive Module | Purpose | claude-drive Status |
|---|---|---|
| `audioFeedback.ts` | Plays audio chimes for events (task complete, error, approval needed) | **Not ported** |

**Impact:** claude-drive has a `chime` event type in `agentOutput.ts` and an `agent_screen_chime` MCP tool, but the implementation just sends a terminal bell character (`\x07`). There are no actual audio chime files or sophisticated audio feedback. cursor-drive has proper audio feedback with different chime sounds for different events.

---

## 8. MISSING: Operator-Aware Permission Checks

**cursor-drive modules not ported:**

| cursor-drive Module | Purpose | claude-drive Status |
|---|---|---|
| `toolAllowlist.ts` | Operator-aware tool permission checks with `checkPermissionForOperator()` | **Not ported** |

**Impact:** claude-drive has `toolsForPreset()` in `operatorManager.ts` which maps presets to tool lists, but it lacks:
- The `checkPermissionForOperator()` function that cursor-drive's rules mandate
- Config overrides (`cursorDrive.agents.permissions.overrides`) that can restrict but never grant beyond registry preset
- Dynamic permission adjustment based on runtime conditions

---

## 9. MISSING: Additional UI Beyond Terminal

**cursor-drive has:**

| cursor-drive Module | Purpose | claude-drive Status |
|---|---|---|
| `agentScreen.ts` | VS Code webview showing operator activity | Replaced by `agentOutput.ts` (terminal only) |
| `agentScreenTemplate.ts` | HTML template for agent screen | **Not ported** |
| `agentScreenApp.ts` | Agent screen React app | **Not ported** |
| `driveSidebar.ts` | Activity Bar webview showing Drive state | **Not ported** |
| `statusBar.ts` | VS Code status bar item | Replaced by `statusLine.ts` + `statusFile.ts` |

**claude-drive has:**
- **Terminal output** (`agentOutput.ts`) — ANSI-colored operator activity in terminal
- **Ink TUI** (`tui.tsx`) — Two-pane React/Ink terminal UI (activity feed + operator list)
- **Status line** (`statusLine.ts`) — Bash script for Claude Code status line
- **Status file** (`statusFile.ts`) — JSON file at `~/.claude-drive/status.json`

**Missing UI capabilities:**
- No web dashboard (config key `agentScreen.mode: "web"` exists but is dead)
- No mobile dashboard
- No REST/SSE endpoints for remote monitoring
- SSE broadcast code (`setSseBroadcast`) is dead — never called
- Web port config (`agentScreen.webPort: 7892`) is unused

---

## 10. MISSING: Additional cursor-drive Features

| cursor-drive Module | Purpose | claude-drive Status |
|---|---|---|
| `tangentFlow.ts` | Manages tangent conversations (side tasks) | **Not ported** |
| `tangentNameExtractor.ts` | Extracts names for tangent flows | **Not ported** |
| `integrationQueue.ts` | Queues integration tasks | **Not ported** |
| `commsAgent.ts` | Communications agent for inter-operator messaging | **Not ported** |
| `apiDiscovery.ts` | Discovers available APIs | **Not ported** |
| `sessionMemory.ts` | Session-scoped memory management | **Not ported** (replaced by `memoryStore.ts`) |
| `persistentMemory.ts` | Cross-session persistent memory | **Not ported** (partially covered by `memoryStore.ts`) |
| `pluginInstaller.ts` | Installs plugin into `.cursor/` directory | **Not applicable** (CLI, not extension) |

---

## 11. INCOMPLETE: Existing Features with Gaps

### 11a. Hooks System — 7 of 12 Events Not Wired

| Event | Wired? | Location |
|---|---|---|
| OperatorSpawn | ✅ | operatorRegistry.ts |
| OperatorDismiss | ✅ | operatorRegistry.ts |
| TaskStart | ✅ | operatorManager.ts |
| TaskComplete | ✅ | operatorManager.ts |
| ModeChange | ✅ | driveMode.ts |
| SessionStart | ✅ | cli.ts (start command) |
| SessionStop | ✅ | cli.ts (SIGINT handler) |
| PreToolUse | ❌ | Not wired |
| PostToolUse | ❌ | Not wired |
| PreApproval | ❌ | Not wired |
| PostApproval | ❌ | Not wired |
| MemoryWrite | ❌ | Not wired |

### 11b. Approval System — Incomplete

- `approval_request` MCP tool only logs activity — doesn't actually enqueue to `approvalQueue`
- Empty `operatorId` bypasses throttle tracking (security issue)
- 30s auto-deny on block severity — too aggressive, users miss window
- Approval queue lost on restart — no persistence
- Warn-severity requests have no timeout — can hang forever

### 11c. Config System — 11 Dead Keys

| Dead Config Key | Why Dead |
|---|---|
| `operators.defaultPermissionPreset` | Never read in spawn logic |
| `drive.confirmGates` | No confirmation flow implemented |
| `mcp.appsEnabled` | Apps feature not implemented |
| `memory.maxPerOperator` | Per-operator limit not enforced |
| `voice.enabled` | Voice module not implemented |
| `voice.wakeWord` | Voice module not implemented |
| `voice.sleepWord` | Voice module not implemented |
| `voice.whisperPath` | Voice module not implemented |
| `privacy.persistTranscripts` | Transcripts not captured |
| `router.llmEnabled` | LLM routing not implemented |
| `sessions.autoCheckpoint` / `autoCheckpointIntervalMs` | Auto-checkpoint not implemented |

### 11d. Persistence — Non-Atomic Writes

| File | Atomic? |
|---|---|
| `config.json` | ❌ Uses `atomicWriteJSON` but via custom helper |
| `state.json` | ❌ |
| `memory.json` | ✅ |
| `port` | ❌ |
| `sessions/*.json` | ❌ |
| `sessions/*/checkpoints/*.json` | ❌ |
| `status.json` | ✅ |

5 of 7 file types use non-atomic writes. Crash during write = data corruption.

### 11e. OperatorContext — Dead Fields

| Field | Status |
|---|---|
| `visibility` | Set to "shared" on spawn, never changed or checked |
| `syncState` | Typed but never set |
| `voice` | Always `undefined` |

### 11f. Router — Keyword-Only

The router (`router.ts`) is copied verbatim from cursor-drive and uses simple substring matching:
- Plan keywords: "plan", "clarify", "requirements", "design", "architecture", "break down"
- Agent keywords: "add", "implement", "fix", "create", "write", "refactor", "run", "execute"
- Debug keywords: "debug", "diagnose", "trace", "breakpoint", "why does", "why is"

No LLM-based routing despite `router.llmEnabled` config key existing.

### 11g. Prompt Caching — Not Implemented

The research docs identify **$12K–$18K/yr savings** from prompt caching. No `cache_control` is used anywhere. The static role template + dynamic memory pattern is ideal for caching but not implemented.

---

## 12. INCOMPLETE: SDK Integration Gaps

| SDK Feature | Usage Status | Potential |
|---|---|---|
| `query()` | ✅ Core integration | Fully used |
| `resume: sessionId` | ❌ Captures but doesn't persist | Operator persistence across restarts |
| `AgentDefinition` | ❌ Uses string-keyed records | Standard type with metadata |
| `AgentTeam` | ❌ Not used | Native team coordination |
| `isolation: "worktree"` | ❌ Custom implementation | Simplify worktree management |
| MCP Channels | ❌ Not used | Real-time operator events |
| MCP Elicitation | ❌ Not used | Native approval UI |
| Skills/Slash Commands | ❌ Custom loader | Native `/spawn`, `/drive-mode` |
| `cache_control` | ❌ Not used | 90% savings on cached prompts |
| Model selection per query | ❌ Single model | Route by role for savings |
| `speed: "fast"` | ❌ Not used | Faster simple operators |
| `maxThinkingTokens` | ❌ Not used | Better planner output |
| Batch API | ❌ Not used | 50% savings on async tasks |

---

## 13. Test Coverage Gaps

### Zero Test Coverage (12 modules)

| Module | LOC | Risk |
|---|---|---|
| `cli.ts` | ~400 | CRITICAL — entry point |
| `mcpServer.ts` | ~600 | CRITICAL — only port utils tested |
| `worktreeManager.ts` | ~140 | HIGH |
| `gitService.ts` | ~280 | HIGH |
| `sessionManager.ts` | ~60 | MEDIUM |
| `sessionStore.ts` | ~100 | MEDIUM |
| `memoryManager.ts` | ~85 | MEDIUM |
| `approvalQueue.ts` | ~60 | MEDIUM |
| `store.ts` | ~52 | MEDIUM |
| `tts.ts` | ~150 | MEDIUM |
| `edgeTts.ts` | ~100 | MEDIUM |
| `piper.ts` | ~120 | MEDIUM |

### Infrastructure Gaps
- No CI integration
- No coverage threshold configured
- No integration tests (only unit tests)
- No shared test fixtures

---

## 14. Safety & Security Issues

| Issue | Severity | Details |
|---|---|---|
| Non-atomic writes | CRITICAL | 5/7 file types can corrupt on crash |
| No task cancellation signal | CRITICAL | Dismissed operators continue running and billing |
| SDK on `latest` | CRITICAL | Upstream breaking change = total failure (fixed in 0.2.77 pin) |
| Empty operatorId bypass | HIGH | Bypasses approval throttle tracking |
| No input validation on operatorId | HIGH | Path injection risk in worktree names |
| Localhost-only implicit trust | MEDIUM | No auth on MCP server |
| No maxConcurrent enforcement | HIGH | Config exists but was never checked (now checked in `drive_run_task` only, not in `operator_spawn`) |
| Warn requests hang forever | MEDIUM | No timeout on warn-severity approvals |
| 30s auto-deny too aggressive | MEDIUM | Users miss approval window |

---

## 15. Summary: What's Missing by Category

### Completely Missing (not ported from cursor-drive)
1. **Prompt pipeline** (filler cleaner, sanitizer, glossary expander, prompt optimizer, clarification handler)
2. **Tiered model routing** (model selector, model utils)
3. **Governance system** (plan runner, dep auditor, completion gates)
4. **State sync / mob programming** (state sync coordinator, sync ledger, snapshot feed)
5. **Cloud agent integration** (cloud agent client)
6. **IDE mode switching** (mode switcher, cursor CLI runner)
7. **Audio feedback chimes** (audio feedback module)
8. **Operator-aware permission checks** (tool allowlist with `checkPermissionForOperator()`)
9. **Tangent flows** (tangent flow, tangent name extractor)
10. **Inter-operator communication** (comms agent)
11. **API discovery** (api discovery)
12. **Integration queue** (integration queue)

### Partially Implemented (exists but incomplete)
1. **Hooks** — 7/12 events not wired
2. **Approval system** — `approval_request` tool doesn't enqueue; bypass vulnerability
3. **Config** — 11 dead keys; no validation; no hot reload
4. **Persistence** — 5/7 file types non-atomic
5. **SSE/Web mode** — dead code, never implemented
6. **Voice input** — config keys exist but voice module not built
7. **SDK integration** — doesn't use session resume, agent teams, channels, elicitation, caching
8. **Router** — keyword-only; LLM routing configured but not implemented
9. **Auto-checkpoint** — config exists but timer not implemented
10. **OperatorVisibility** — tracked but never enforced

### Unique to claude-drive (not in cursor-drive)
1. **Typed memory system** with confidence decay, auto-dream consolidation
2. **Checkpoint/fork system** for session branching
3. **Skill loader** with YAML frontmatter and parameter interpolation
4. **Plan cost tracker** per plan period
5. **Status line integration** for Claude Code CLI
6. **Ink TUI** two-pane terminal UI
7. **Hook registry** with command/prompt types
8. **Status file** JSON for external consumption
9. **Auto-dream daemon** for memory consolidation

---

## 16. Estimated Cost of Missing Features

| Missing Feature | Implementation Scope | Notes |
|---|---|---|
| Prompt pipeline (full) | ~500–800 LOC | Port from cursor-drive, adapt for CLI |
| Model routing | ~200–300 LOC | New module + config + SDK integration |
| Governance system | ~400–600 LOC | Plan runner, completion gates, dep auditor |
| State sync | ~800–1200 LOC | Most complex missing feature |
| Cloud agent integration | ~200–400 LOC | REST client for cloud coordination |
| Audio feedback | ~100–200 LOC | File-based chime playback |
| Tool allowlist | ~150–250 LOC | Port from cursor-drive |
| Tangent flows | ~300–500 LOC | Tangent management + name extraction |
| Comms agent | ~200–400 LOC | Inter-operator messaging |
| Complete hook wiring | ~50–100 LOC | Wire 7 remaining events |
| Fix approval system | ~100–200 LOC | Enqueue properly, fix bypass |
| Atomic writes | ~100 LOC | Apply .tmp+rename pattern |
| SDK integration (full) | ~500–800 LOC | Session resume, agent teams, channels, caching |

**Total estimated gap: ~3,600–5,850 LOC** to reach feature parity with cursor-drive plus the SDK integrations identified in the research docs.
