# Claude-Drive Improvement Strategy

> Informed by deep analysis of cursor-drive's codebase, Claude Code extensibility surface research, and claude-drive gap analysis.
>
> **Date:** 2026-03-27  
> **Scope:** Feature gaps, architecture evolution, concrete improvement plan for [drive-mode/claude-drive](https://github.com/drive-mode/claude-drive)  
> **Supporting docs:** [claude-drive-gap-analysis.md](claude-drive-gap-analysis.md), [claude-code-extensibility-surface-2026-03.md](claude-code-extensibility-surface-2026-03.md), [cursor-drive-improvement-strategy.md](cursor-drive-improvement-strategy.md)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Feature Gap Analysis: cursor-drive → claude-drive](#2-feature-gap-analysis)
3. [Claude Code Extensibility Leverage Points](#3-claude-code-extensibility-leverage-points)
4. [Architecture Evolution Strategy](#4-architecture-evolution-strategy)
5. [Improvement Areas (Detailed)](#5-improvement-areas-detailed)
6. [Existing Issues to Fix](#6-existing-issues-to-fix)
7. [SDK Integration Gaps](#7-sdk-integration-gaps)
8. [Implementation Priorities](#8-implementation-priorities)
9. [Risk Assessment](#9-risk-assessment)
10. [Test Coverage Plan](#10-test-coverage-plan)

---

## 1. Executive Summary

**cursor-drive** is a VS Code extension with a mature prompt pipeline, governance system, state-sync mob programming, cloud agent integration, and rich UI surfaces (Agent Screen webview, sidebar, status bar). claude-drive has **none** of these systems — it sends raw user input directly to the router, has no prompt preprocessing, no governance, no state sync, and terminal-only output.

claude-drive has its own strengths: **typed memory with auto-dream**, **session checkpointing/fork**, **lifecycle hooks**, **reusable skills**, **Edge-TTS + Piper TTS**, **Ink TUI**, and **per-plan cost tracking**. But it has 12 completely missing feature categories and 10 partially-implemented ones, with an estimated **~3,600–5,850 LOC gap** to feature parity.

The recommended strategy is **port cursor-drive's prompt pipeline and governance first** (highest impact on output quality and cost savings), then **fix safety/completeness issues** (non-atomic writes, hook wiring, approval bypasses), then **adopt Claude Code native features** (Agent Teams, Channels, prompt caching) to replace custom implementations where appropriate.

### Top 10 Improvements by Impact

| # | Improvement | Source | Impact |
|---|-------------|--------|--------|
| 1 | Prompt pipeline (filler → sanitize → glossary → optimize) | cursor-drive | Dramatically better voice input quality |
| 2 | Tiered model routing | cursor-drive | **$24K–$30K/yr** cost savings |
| 3 | Prompt caching (`cache_control`) | Claude SDK | **$12K–$18K/yr** cost savings |
| 4 | Fix non-atomic writes (5/7 file types) | Bug fix | Prevent data corruption on crash |
| 5 | Wire remaining 7/12 hooks | Bug fix | Complete the hooks system |
| 6 | State sync / mob programming | cursor-drive | Multi-operator collaboration |
| 7 | CommsAgent (inter-operator messaging) | cursor-drive | Background operator coordination |
| 8 | Governance system (plan runner, completion gates) | cursor-drive | Quality gates for operator work |
| 9 | Claude Code hook-based pipeline (`UserPromptSubmit`) | Claude Code native | Pipeline runs without MCP roundtrip |
| 10 | Operator-aware permission checks (`checkPermissionForOperator`) | cursor-drive | Proper operator security model |

---

## 2. Feature Gap Analysis

### 2.1 Features cursor-drive Has, claude-drive Completely Lacks

| # | Feature | cursor-drive Module(s) | Impact | Portability |
|---|---------|----------------------|--------|-------------|
| 1 | **Prompt pipeline** | `pipeline.ts` | Critical — voice quality, security | High (core transforms portable) |
| 2 | **Filler cleaner** | `fillerCleaner.ts` | High — removes "um", "uh", duplicates | Excellent (pure regex) |
| 3 | **Sanitizer** | `sanitizer.ts` | High — injection defense, truncation | Excellent (pure regex) |
| 4 | **Glossary expander** | `glossaryExpander.ts` | Medium — project terminology | Excellent (config-driven regex) |
| 5 | **Prompt optimizer** | `promptOptimizer.ts` | High — LLM-based prompt rewrite | Medium (needs LLM API adapter) |
| 6 | **Clarification handler** | `clarificationHandler.ts` | Medium — ambiguous input handling | Medium (needs TTS/LLM integration) |
| 7 | **Tiered model routing** | `modelSelector.ts`, `modelUtils.ts` | Critical — cost optimization | Medium (replace `vscode.lm` with SDK) |
| 8 | **State sync / mob programming** | `stateSyncCoordinator.ts`, `syncLedger.ts`, `integrationQueue.ts`, `syncTypes.ts` | High — multi-operator collaboration | High (pure git + files) |
| 9 | **CommsAgent** | `commsAgent.ts` | Medium — background operator batching | Medium (needs LLM + event sink) |
| 10 | **Tangent flow** | `tangentFlow.ts`, `tangentNameExtractor.ts` | Medium — side-task spawn UX | Medium (replace modal with CLI prompt) |
| 11 | **Cloud agent integration** | `cloudAgentClient.ts` | Low for claude-drive | Excellent (pure Node fetch) |
| 12 | **Governance system** | `src/governance/*` (10 files) | High — codebase quality tracking | High (pure FS + optional LLM) |
| 13 | **Operator-aware permissions** | `toolAllowlist.ts` | High — security model | Excellent (pure logic) |
| 14 | **Mode switcher** | `modeSwitcher.ts` | Medium — voice mode switching | High (pure regex + config) |
| 15 | **Audio feedback** | `audioFeedback.ts` | Low — event chimes | Medium (replace webview with `play-sound`) |
| 16 | **NDJSON parser** | `ndjsonParser.ts` | Medium — streaming CLI output | Excellent (pure string parsing) |
| 17 | **Agent Screen** | `agentScreen.ts`, `agentScreenTemplate.ts`, `agentScreenApp.ts` | High — operator activity visibility | Low (VS Code-specific) |
| 18 | **Sidebar** | `driveSidebar.ts` | Low — IDE-specific UI | Low (VS Code-specific) |
| 19 | **Status bar** | `statusBar.ts` | Low — already has `statusLine.ts` | N/A (already replaced) |
| 20 | **Cursor SDK bridge** | `src/cursor-sdk/*` | Medium — pattern reusable | High (data structures) |
| 21 | **API discovery** | `apiDiscovery.ts` | Low — IDE probe | Low (VS Code-specific) |
| 22 | **Plugin installer** | `pluginInstaller.ts` | Medium — auto-setup | Concept only (different target) |
| 23 | **Voice commands** | `voiceCommands.ts` | Low — IDE command dispatch | Low (VS Code-specific) |
| 24 | **Snapshot feed** | `snapshotFeed.ts` | Low — interface-only spec | N/A (no implementation either side) |

### 2.2 Incomplete Features in claude-drive

| # | Feature | Issue | Fix Effort |
|---|---------|-------|------------|
| 1 | **Hooks** — 7/12 events not wired | `PreToolUse`, `PostToolUse`, `PreApproval`, `PostApproval`, `MemoryWrite` never fire | ~50 LOC |
| 2 | **Approval system** — `approval_request` doesn't enqueue | Tool logs but doesn't use `approvalQueue` | ~100 LOC |
| 3 | **Empty operatorId bypass** | Skips throttle tracking — security hole | ~10 LOC |
| 4 | **Config** — 11 dead keys | `operators.defaultPermissionPreset`, `drive.confirmGates`, `mcp.appsEnabled`, voice.*, etc. | ~200 LOC (implement or remove) |
| 5 | **Persistence** — 5/7 non-atomic writes | `state.json`, `port`, `sessions/*.json`, `checkpoints/*.json`, `config.json` | ~100 LOC |
| 6 | **SSE/Web agent output** — dead code | `setSseBroadcast`, `agentScreen.webPort` never wired | ~50 LOC (implement or remove) |
| 7 | **Voice input** — config keys exist, module not built | `voice.enabled`, `voice.wakeWord`, etc. | ~300 LOC |
| 8 | **Router** — `llmEnabled` dead key | Config exists but LLM routing not implemented | ~200 LOC |
| 9 | **Auto-checkpoint** — config exists, timer not implemented | `sessions.autoCheckpoint`, `autoCheckpointIntervalMs` | ~50 LOC |
| 10 | **OperatorVisibility** — tracked but never enforced | `visibility` field set but never checked | ~50 LOC |

### 2.3 SDK Integration Gaps

| SDK Feature | Current | Potential |
|-------------|---------|-----------|
| `query()` | ✅ Used | Core integration |
| `resume: sessionId` | ❌ Captures but doesn't persist | Operator persistence across restarts |
| Agent Teams | ❌ Not used | Native multi-agent coordination |
| `isolation: "worktree"` | ❌ Custom implementation | Simplify worktree code |
| MCP Channels | ❌ Not used | Real-time operator push events |
| Elicitation | ❌ Not used | Native approval UI |
| `cache_control` | ❌ Not used | 90% savings on cached system prompts |
| Model selection per `query()` | ❌ Single model | Role-based model routing |
| `speed: "fast"` | ❌ Not used | Faster lightweight operators |
| `maxThinkingTokens` | ❌ Not used | Better planner reasoning |
| Batch API | ❌ Not used | 50% savings on async tasks |
| `--json-schema` structured output | ❌ Not used | Validated JSON from agents |

---

## 3. Claude Code Extensibility Leverage Points

Claude Code offers extensibility surfaces that can replace or enhance custom implementations:

### 3.1 Hooks → Prompt Pipeline

Claude Code's `UserPromptSubmit` hook is the **exact equivalent** of Cursor's `beforeSubmitPrompt`. claude-drive should implement the prompt pipeline as a `UserPromptSubmit` hook rather than (or in addition to) MCP-based pipeline invocation.

**Advantage:** Pipeline runs in the Claude Code process itself — no MCP roundtrip latency.

```
Current:  User → Claude Code → MCP tool `drive_run_pipeline` → response
Better:   User → UserPromptSubmit hook (pipeline runs) → modified prompt → Claude Code
```

The hook can be implemented as:
- **command type:** Shell script that runs pipeline stages and outputs modified prompt
- **HTTP type:** Drive MCP server handles the hook request at a `POST /hooks/prompt` endpoint

### 3.2 Subagents → Operator Definitions

Claude Code subagents map naturally to Drive operators:

| Drive Concept | Subagent Field |
|--------------|----------------|
| Operator name | `name` |
| Operator role | `description` + system prompt |
| Permission preset | `tools`/`disallowedTools` + `permissionMode` |
| Worktree isolation | `isolation: "worktree"` |
| Operator model | `model` (haiku/sonnet/opus) |
| Operator memory | `memory: "project"` |
| Skills | `skills` array |
| MCP server access | `mcpServers` |

**Opportunity:** Define operators as `.claude/agents/*.md` files with Drive-specific system prompts. The Agent SDK `query()` already supports `agents` parameter for programmatic definition.

### 3.3 Agent Teams → Operator Pool

Agent Teams are Claude Code's native multi-agent system. They provide:
- Shared task list with dependencies
- Inter-agent messaging (mailbox)
- Automatic tmux pane management
- `TeammateIdle`/`TaskCreated`/`TaskCompleted` hooks

**Limitation:** No programmatic teammate spawn — teams are created via natural language. Drive's `OperatorRegistry` provides more control but less native integration.

**Recommendation:** Evaluate Agent Teams as an optional execution backend for operator orchestration. Keep `OperatorRegistry` as the control plane; optionally map operators to Agent Team teammates for display and coordination.

### 3.4 Channels → Event Push

MCP Channels let Drive push messages into Claude Code sessions. This could replace the need for agents to poll MCP tools for updates.

### 3.5 Plugin Distribution

claude-drive should be distributable as a Claude Code plugin, bundling:
- Skills (`skills/`) — Drive persona, mode awareness
- Agents (`agents/`) — Operator definitions
- Hooks (`hooks/hooks.json`) — `UserPromptSubmit` for pipeline
- MCP server (`.mcp.json`) — Drive MCP at `:7891`
- Commands (`commands/`) — `/drive`, `/operator`, `/tangent`

---

## 4. Architecture Evolution Strategy

### 4.1 Current Architecture

```
CLI (commander)
  ├── MCP Server :7891 (46 tools)
  ├── Operator Registry (in-memory)
  ├── Operator Manager (Agent SDK query())
  ├── Router (keyword-only)
  ├── Agent Output (terminal ANSI / Ink TUI)
  ├── TTS (Edge-TTS → Piper → say)
  ├── Memory Store + Auto-Dream
  ├── Hooks (5/12 wired)
  ├── Skills Loader
  ├── Checkpoint/Session
  └── Worktree Manager
```

**Missing layers:** No prompt pipeline, no governance, no state sync, no model routing.

### 4.2 Target Architecture (Phase 2)

```
CLI (commander)
  ├── MCP Server :7891 (60+ tools)
  │   ├── Pipeline tools (run_pipeline, pipeline_stats)
  │   ├── Governance tools (scan, entropy, tasks)
  │   └── State sync tools (sync_status, proposals, apply)
  ├── Prompt Pipeline                              [NEW]
  │   ├── fillerCleaner (regex)
  │   ├── sanitizer (regex + truncation)
  │   ├── glossaryExpander (config-driven)
  │   ├── promptOptimizer (SDK model call)
  │   └── clarificationHandler (TTS + SDK)
  ├── Claude Code Hook Integration                 [NEW]
  │   └── UserPromptSubmit → pipeline
  ├── Tiered Model Routing                         [NEW]
  │   ├── modelSelector (role → tier → model)
  │   └── Per-query() model selection
  ├── Operator Registry (in-memory + persistence)
  ├── Operator Manager (Agent SDK query())
  │   ├── Session resume                           [NEW]
  │   ├── Prompt caching (cache_control)           [NEW]
  │   └── Structured output (json-schema)          [NEW]
  ├── CommsAgent                                   [NEW]
  │   └── Background operator event batching
  ├── State Sync Coordinator                       [NEW]
  │   ├── SyncLedger (proposals.json + decisions)
  │   └── IntegrationQueue (serialized merges)
  ├── Governance System                            [NEW]
  │   ├── Project graph (import/export analysis)
  │   ├── Entropy scoring (dead code, TODOs, etc.)
  │   ├── Task ledger (prioritized fixes)
  │   └── Focus guard (active plan limits)
  ├── Tool Allowlist (checkPermissionForOperator)  [NEW]
  ├── Router (keyword + optional LLM)
  ├── Agent Output (terminal + optional web UI)
  ├── TTS (Edge-TTS → Piper → say)
  ├── Memory Store + Auto-Dream
  ├── Hooks (12/12 wired)                          [FIX]
  ├── Skills Loader
  ├── Checkpoint/Session (auto-checkpoint)         [FIX]
  └── Worktree Manager
```

### 4.3 Future Architecture (Phase 3 — Native Integration)

```
claude-drive
  ├── Claude Code Plugin                           [NEW]
  │   ├── Skills (Drive persona, modes)
  │   ├── Agents (operator definitions)
  │   ├── Hooks (UserPromptSubmit pipeline)
  │   ├── MCP server config (auto-start)
  │   └── Commands (/drive, /operator, /tangent)
  ├── Agent Teams adapter                          [NEW]
  │   └── Operator ↔ Teammate mapping
  ├── MCP Channels adapter                         [NEW]
  │   └── Push operator events to sessions
  ├── Web Agent Screen                             [NEW]
  │   └── Local HTTP dashboard (WebSocket updates)
  └── [all Phase 2 modules]
```

---

## 5. Improvement Areas (Detailed)

### 5.1 Prompt Pipeline

**The single highest-impact improvement.** Raw voice input → operator produces significantly worse results than cleaned/optimized input.

**Implementation plan:**

1. **Port `fillerCleaner.ts`** — Direct copy; pure regex, no dependencies. ~100 LOC.
2. **Port `sanitizer.ts`** — Direct copy; injection pattern removal + truncation. ~100 LOC.
3. **Port `glossaryExpander.ts`** — Adapt config from `vscode.workspace.getConfiguration` to claude-drive's `config.ts`. ~80 LOC.
4. **Create `promptOptimizer.ts`** — Replace `vscode.lm` with Agent SDK `query()` using cheap model (Haiku). Add `--auto-approve` flag. ~150 LOC.
5. **Create `clarificationHandler.ts`** — Use Agent SDK for classification; integrate with existing TTS. ~100 LOC.
6. **Create `pipeline.ts`** — Orchestrate: filler → sanitize → glossary → router → optimize. Track stats. ~200 LOC.

**Claude Code hook integration:**
- Add `UserPromptSubmit` hook in `hooks.json` that calls `http://localhost:7891/hooks/prompt`
- Add `/hooks/prompt` endpoint in `mcpServer.ts` that runs `pipeline()`
- Fallback: `drive_run_pipeline` MCP tool for manual invocation

**Config keys to add:**
```json
{
  "pipeline.enabled": true,
  "pipeline.fillerCleaning": true,
  "pipeline.sanitization": true,
  "pipeline.glossaryExpansion": true,
  "pipeline.promptOptimization": true,
  "pipeline.autoApproveOptimizer": false,
  "glossary": [],
  "sanitizer.maxLength": 2000
}
```

**Total:** ~730 LOC new, ~100 LOC config changes.

### 5.2 Tiered Model Routing

**Impact:** Research doc 08 estimates **$24K–$30K/yr savings** from routing cheap tasks to Haiku.

**Implementation plan:**

1. **Create `modelSelector.ts`** — Map role → tier → model:
   - Tier 0: No model needed (deterministic: regex, config lookup)
   - Tier 1: Haiku (classification, extraction, yes/no)
   - Tier 2: User's model / Sonnet (implementation, code gen)
   - Tier 3: Opus (reasoning — **only on explicit request**)
2. **Integrate with `operatorManager.ts`** — Pass `model` option to `query()` based on operator role and task tier
3. **Add per-role default models:**
   - `researcher` → Haiku
   - `reviewer` → Haiku
   - `planner` → Sonnet or Opus (configurable)
   - `implementer` → Sonnet
   - `tester` → Sonnet

**Config keys to add:**
```json
{
  "modelRouting.enabled": true,
  "modelRouting.tier1Model": "haiku",
  "modelRouting.tier2Model": "sonnet",
  "modelRouting.tier3Model": "opus",
  "modelRouting.roleOverrides": {}
}
```

**Total:** ~250 LOC.

### 5.3 Prompt Caching

**Impact:** Research doc 08 estimates **$12K–$18K/yr savings**. Static role templates + memory context are ideal for `cache_control` breakpoints.

**Implementation plan:**

1. **Update `operatorManager.ts`** — Add `cache_control: { type: "ephemeral" }` to system prompt message
2. **Structure system prompt for caching:**
   ```
   [CACHED] Role template + Drive instructions (static per role)
   [CACHED] Memory context (changes less frequently)
   [DYNAMIC] Current task + recent turns
   ```
3. **Track cache hit rates** in operator stats

**Config keys to add:**
```json
{
  "promptCaching.enabled": true
}
```

**Total:** ~50 LOC.

### 5.4 State Sync / Mob Programming

**Port plan:**

1. **Port `syncTypes.ts`** — Types only; direct copy. ~100 LOC.
2. **Port `syncLedger.ts`** — Replace workspace paths with `~/.claude-drive/state-sync/`. Use `atomicWriteJSON`. ~200 LOC.
3. **Port `stateSyncCoordinator.ts`** — Core git-based sync logic. Uses `gitService` + `worktreeManager` (already exist). ~400 LOC.
4. **Port `integrationQueue.ts`** — Single-flight FIFO merge. ~200 LOC.
5. **Add MCP tools:** `operator_sync_status`, `operator_sync_proposals`, `operator_sync_approve`, `operator_sync_reject`, `operator_sync_apply`, `integration_queue_status`. ~150 LOC in `mcpServer.ts`.

**Total:** ~1,050 LOC.

### 5.5 CommsAgent (Inter-Operator Communication)

**Port plan:**

1. **Create `commsAgent.ts`** — Subscribe to operator registry events; batch `completion`/`progress`/`sync` events; on idle timeout, summarize batch with cheap model; deliver to Agent Output + TTS. ~250 LOC.
2. **Replace `vscode` calls:**
   - `showInformationMessage` → `console.log` or `agentOutput.logActivity`
   - `selectCheapModel` → Agent SDK `query()` with Haiku

**Config keys to add:**
```json
{
  "commsAgent.enabled": true,
  "commsAgent.idleSeconds": 10,
  "commsAgent.maxQueueSize": 100
}
```

**Total:** ~250 LOC.

### 5.6 Governance System

**Port plan:**

1. **Port `governance/paths.ts`** — Adapt to `~/.claude-drive/governance/`. ~30 LOC.
2. **Port `governance/fsUtils.ts`** — Already Node.js; direct copy. ~80 LOC.
3. **Port `governance/schemas.ts`** — Zod schemas; direct copy. ~50 LOC.
4. **Port `governance/projectGraph.ts`** — Pure FS recursion + regex; direct copy. Change default entrypoint from `src/extension.ts` to `src/cli.ts`. ~200 LOC.
5. **Port `governance/entropy.ts`** — Pure computation; direct copy. ~200 LOC.
6. **Port `governance/taskLedger.ts`** — Pure computation; direct copy. ~150 LOC.
7. **Port `governance/scan.ts`** — Orchestrator; direct copy. ~100 LOC.
8. **Port `governance/focusGuard.ts`** — Pure function; direct copy. ~50 LOC.
9. **Create `governance/aiSummary.ts`** — Replace `vscode.lm` with Agent SDK `query()` for cheap model. ~80 LOC.
10. **Add CLI command:** `claude-drive governance scan --root <path>`. ~30 LOC.
11. **Add MCP tools:** `governance_scan`, `governance_entropy`, `governance_tasks`. ~100 LOC.

**Total:** ~1,070 LOC.

### 5.7 Operator-Aware Permission Checks

**Port plan:**

1. **Create `toolAllowlist.ts`** — Port `checkPermissionForOperator()` from cursor-drive. Effective preset = min(operator preset, parent cascade, config overrides). ~150 LOC.
2. **Integrate with `operatorManager.ts`** — Check permissions before adding tools to `query()`.
3. **Add config overrides:**

```json
{
  "operators.permissions.overrides": {}
}
```

**Total:** ~200 LOC.

### 5.8 Tangent Flow

**Port plan:**

1. **Create `tangentNameExtractor.ts`** — Direct copy of regex-first, LLM-fallback name extraction. ~80 LOC.
2. **Create `tangentFlow.ts`** — Adapt modals to CLI prompts (stdin readline or `enquirer`). TTS intro + confirmation with timeout. ~200 LOC.
3. **Integrate with pipeline** — Detect tangent keywords in pipeline, spawn operator, confirm.

**Config keys to add:**
```json
{
  "tangent.keyword": "tangent|side task|branch off",
  "tangent.autoConfirm": false,
  "tangent.confirmationTimeout": 30000
}
```

**Total:** ~280 LOC.

### 5.9 Web Agent Screen

**New feature — not a port.** Replaces the dead `agentScreen.mode: "web"` config.

**Implementation plan:**

1. **Create `webAgentScreen.ts`** — Express/Koa HTTP server on configurable port (default 7892)
2. **WebSocket updates** — Push activity events, operator changes, sync status
3. **Static HTML dashboard** — Responsive single-page app with tabs (Activity, Files, Decisions, Sync)
4. **SSE fallback** — For environments without WebSocket support
5. **Integrate with `agentOutput.ts`** — Dual sink: terminal output + web dashboard

**Config keys to add:**
```json
{
  "agentScreen.mode": "terminal",
  "agentScreen.webPort": 7892,
  "agentScreen.webEnabled": false
}
```

**Total:** ~500 LOC (excluding HTML/CSS).

### 5.10 Claude Code Plugin Package

**New feature** — Package claude-drive as an installable Claude Code plugin.

**Implementation plan:**

1. **Create plugin structure:**
   ```
   claude-drive-plugin/
   ├── .claude-plugin/
   │   └── plugin.json
   ├── agents/
   │   ├── implementer.md
   │   ├── reviewer.md
   │   ├── tester.md
   │   ├── researcher.md
   │   └── planner.md
   ├── skills/
   │   ├── drive-persona/SKILL.md
   │   ├── drive-concise/SKILL.md
   │   └── drive-modes/SKILL.md
   ├── hooks/
   │   └── hooks.json
   ├── commands/
   │   ├── drive.md
   │   ├── operator.md
   │   └── tangent.md
   ├── .mcp.json
   └── settings.json
   ```
2. **Auto-generate from existing config** — Extract operator role templates into agent definitions; map skills; generate hooks.json with `UserPromptSubmit` → pipeline.
3. **Add `claude-drive plugin build` CLI command.**

**Total:** ~300 LOC code + plugin content files.

---

## 6. Existing Issues to Fix

### 6.1 Critical: Non-Atomic Writes

**Problem:** 5/7 file types can corrupt on crash.

**Fix:** Apply `atomicWrite.ts` (already exists) to all state files:
- `state.json` — use `atomicWriteJSON`
- `port` — use `atomicWrite`
- `sessions/*.json` — use `atomicWriteJSON`
- `sessions/*/checkpoints/*.json` — use `atomicWriteJSON`
- `config.json` — verify existing `atomicWriteJSON` usage

**Total:** ~50 LOC.

### 6.2 Critical: Wire Remaining Hooks

**Problem:** 7/12 hook events never fire.

**Fix by module:**

| Hook Event | Wire Location | LOC |
|-----------|---------------|-----|
| `PreToolUse` | `operatorManager.ts` — Agent SDK `PostToolUse` hook | ~5 |
| `PostToolUse` | `operatorManager.ts` — Agent SDK `PostToolUse` hook | ~5 |
| `PreApproval` | `approvalGates.ts` — before gate check | ~5 |
| `PostApproval` | `approvalGates.ts` — after gate result | ~5 |
| `MemoryWrite` | `memoryStore.ts` — after `remember()`/`correct()` | ~5 |

**Total:** ~25 LOC.

### 6.3 High: Fix Approval System

**Problem:** `approval_request` MCP tool doesn't enqueue; empty operatorId bypasses throttle.

**Fix:**
1. Wire `approval_request` to `approvalQueue.enqueue()`
2. Validate `operatorId` — reject empty/missing
3. Add timeout for warn-severity requests (default 60s)
4. Add approval persistence (survive restart)

**Total:** ~100 LOC.

### 6.4 High: Implement `maxConcurrent` in `operator_spawn`

**Problem:** `operators.maxConcurrent` only checked in `drive_run_task`, not `operator_spawn`.

**Fix:** Add check in `operatorRegistry.spawn()`.

**Total:** ~10 LOC.

### 6.5 Medium: Clean Up Dead Config Keys

**Options per key:**

| Dead Key | Action |
|----------|--------|
| `operators.defaultPermissionPreset` | **Implement** — read in `spawn()` |
| `drive.confirmGates` | **Implement** or **remove** |
| `mcp.appsEnabled` | **Remove** (not applicable to CLI) |
| `memory.maxPerOperator` | **Implement** — enforce in `memoryStore` |
| `voice.enabled/wakeWord/sleepWord/whisperPath` | **Defer** — voice input is a future feature |
| `privacy.persistTranscripts` | **Implement** when pipeline exists |
| `router.llmEnabled` | **Implement** with model routing (5.2) |
| `sessions.autoCheckpoint/autoCheckpointIntervalMs` | **Implement** — add `setInterval` in `cli.ts` |

**Total:** ~200 LOC.

### 6.6 Medium: Enforce OperatorVisibility

**Problem:** `visibility` field set to `"shared"` on spawn but never checked.

**Fix:** Add visibility filtering to `listActive()`, `listAll()`, and memory queries.

**Total:** ~50 LOC.

### 6.7 Medium: Remove or Implement Dead SSE Code

**Problem:** `setSseBroadcast` in `agentOutput.ts` is never called; `agentScreen.webPort` unused.

**Options:** Remove dead code (if web agent screen is separate) or wire it (if web agent screen reuses this path).

**Total:** ~30 LOC.

---

## 7. SDK Integration Gaps

### 7.1 Session Resume

**Current:** `operatorManager.ts` captures `session_id` from SDK results but doesn't persist it.

**Fix:** Store `sessionId` in operator state; pass `resume: sessionId` on next `query()` for the same operator. Enables operator persistence across Drive restarts.

**Total:** ~30 LOC.

### 7.2 Prompt Caching

See 5.3 above. **Estimated savings: $12K–$18K/yr.**

### 7.3 Model Selection per `query()`

**Current:** All operators use the same model.

**Fix:** Pass `model` option to `query()` based on operator role and tier. See 5.2.

### 7.4 `speed: "fast"` for Lightweight Operators

**Fix:** Use `speed: "fast"` for Tier 1 tasks (classification, extraction).

**Total:** ~5 LOC.

### 7.5 `maxThinkingTokens` for Planners

**Fix:** Set `maxThinkingTokens` for planner-role operators to get better structured plans.

**Total:** ~5 LOC.

### 7.6 Structured Output

**Fix:** Use `--json-schema` for state sync proposals, governance scan results, and memory queries to get validated JSON output.

**Total:** ~50 LOC per integration point.

### 7.7 Agent Teams Integration (Evaluate)

**Status:** Experimental. Requires `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`.

**Evaluation criteria:**
- Can Drive operators map to teammates? Yes, conceptually.
- Can Drive control teammate spawn? No — natural language only.
- Can Drive control teammate permissions? Partially — inherit from lead.
- Can Drive merge teammates? No — no merge concept.

**Recommendation:** Monitor Agent Teams maturity. When programmatic teammate spawn is available, evaluate as alternative execution backend.

### 7.8 MCP Channels Integration (Evaluate)

**Status:** Research preview.

**Opportunity:** Push operator status changes and alerts into Claude Code sessions without polling.

**Recommendation:** Defer until Channels is stable. Current MCP tool approach works.

---

## 8. Implementation Priorities

### Tier 1: Critical Impact (Fix Safety + Biggest Wins)

| # | Improvement | Type | LOC | Impact |
|---|-------------|------|-----|--------|
| 1 | Fix non-atomic writes | Bug fix | ~50 | Prevent data corruption |
| 2 | Wire remaining 7/12 hooks | Bug fix | ~25 | Complete hooks system |
| 3 | Fix approval system | Bug fix | ~100 | Security + correctness |
| 4 | Prompt pipeline (filler + sanitize + glossary + optimize) | Feature port | ~730 | Voice quality + security |
| 5 | Tiered model routing | Feature port | ~250 | **$24K–$30K/yr savings** |
| 6 | Prompt caching | SDK integration | ~50 | **$12K–$18K/yr savings** |
| 7 | `maxConcurrent` in `operator_spawn` | Bug fix | ~10 | Resource protection |

**Tier 1 total:** ~1,215 LOC. Estimated savings: **$36K–$48K/yr**.

### Tier 2: Feature Parity (Multi-Operator Collaboration)

| # | Improvement | Type | LOC | Impact |
|---|-------------|------|-----|--------|
| 8 | State sync / mob programming | Feature port | ~1,050 | Operator collaboration |
| 9 | CommsAgent | Feature port | ~250 | Background coordination |
| 10 | Operator-aware permissions | Feature port | ~200 | Security model |
| 11 | Tangent flow | Feature port | ~280 | Side-task UX |
| 12 | Implement `defaultPermissionPreset` | Config fix | ~20 | Correctness |
| 13 | Implement auto-checkpoint | Config fix | ~50 | Session safety |
| 14 | Enforce OperatorVisibility | Fix | ~50 | Correctness |

**Tier 2 total:** ~1,900 LOC.

### Tier 3: Quality & Extensibility

| # | Improvement | Type | LOC | Impact |
|---|-------------|------|-----|--------|
| 15 | Governance system | Feature port | ~1,070 | Code quality tracking |
| 16 | Claude Code plugin package | New feature | ~300 | Distribution |
| 17 | Claude Code hook integration (`UserPromptSubmit`) | New feature | ~100 | Native pipeline |
| 18 | Session resume via SDK | SDK integration | ~30 | Operator persistence |
| 19 | Web Agent Screen | New feature | ~500 | Remote monitoring |
| 20 | Clean up dead config keys | Cleanup | ~200 | Code hygiene |

**Tier 3 total:** ~2,200 LOC.

### Dependency Graph

```
[Atomic Writes] ← used by all persistence
[Wire Hooks] ← used by pipeline, governance, approval
[Fix Approvals] ← depends on hook wiring

[Prompt Pipeline] ← depends on nothing (portable modules)
  ├── fillerCleaner (standalone)
  ├── sanitizer (standalone)
  ├── glossaryExpander (standalone + config)
  ├── promptOptimizer (standalone + SDK model call)
  └── pipeline orchestrator (wires stages)

[Model Routing] ← enhances pipeline + operatorManager
[Prompt Caching] ← enhances operatorManager

[State Sync] ← depends on gitService + worktreeManager (exist)
[CommsAgent] ← depends on operatorRegistry events (exist)
[Tool Allowlist] ← depends on operatorRegistry (exists)
[Tangent Flow] ← depends on pipeline + operatorRegistry

[Governance] ← standalone; optional AI summary needs model routing
[Claude Code Plugin] ← depends on pipeline + hooks
[Web Agent Screen] ← depends on agentOutput events (exist)
```

---

## 9. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Pipeline latency for voice input | Medium | High | Benchmark each stage; skip optimizer if < 80 chars |
| Model routing miscategorization | Medium | Medium | Default to user's model; tier down only on high confidence |
| Prompt caching invalidation issues | Low | Medium | Conservative cache keys; monitor hit rates |
| State sync conflicts between operators | Medium | High | Serialized merge queue; conflict detection before apply |
| Governance scan false positives | Medium | Low | Configurable thresholds; human review of task ledger |
| Agent Teams API changes (experimental) | High | Medium | Don't depend on it; keep as optional adapter |
| Breaking `atomicWrite` across all files | Low | High | Test atomicity under concurrent access |
| Plugin marketplace rejection | Medium | Low | Follow plugin guidelines; test with `--plugin-dir` first |
| `UserPromptSubmit` hook latency budget | Medium | Medium | 600s timeout is generous; pipeline should run < 2s |
| Dead config cleanup breaks users | Low | Medium | Deprecation warnings before removal; keep for 2 releases |

---

## 10. Test Coverage Plan

### Current State: 12 Modules with Zero Tests

| Module | LOC | Priority |
|--------|-----|----------|
| `cli.ts` | ~400 | Critical — entry point |
| `mcpServer.ts` | ~600 | Critical — 46 tools |
| `worktreeManager.ts` | ~140 | High |
| `gitService.ts` | ~280 | High |
| `tts.ts` | ~150 | Medium |
| `edgeTts.ts` | ~100 | Medium |
| `piper.ts` | ~120 | Medium |
| `sessionManager.ts` | ~60 | Medium |
| `sessionStore.ts` | ~100 | Medium |
| `memoryManager.ts` | ~85 | Medium |
| `approvalQueue.ts` | ~60 | Medium |
| `store.ts` | ~52 | Medium |

### Test Plan for New Features

| New Module | Test Focus | Test Count |
|-----------|------------|------------|
| `fillerCleaner.ts` | Filler removal, dictation detection, edge cases | 15-20 |
| `sanitizer.ts` | Injection patterns, truncation, word boundaries | 10-15 |
| `glossaryExpander.ts` | Expansion, ordering, cache invalidation | 10-15 |
| `promptOptimizer.ts` | Skip heuristics, mock SDK call, approval flow | 10-15 |
| `pipeline.ts` | Full pipeline, stage toggling, stats tracking | 15-20 |
| `modelSelector.ts` | Tier mapping, role defaults, config overrides | 10-15 |
| `toolAllowlist.ts` | Preset checks, parent cascade, config overrides | 10-15 |
| `stateSyncCoordinator.ts` | Snapshot computation, proposal lifecycle | 15-20 |
| `integrationQueue.ts` | FIFO ordering, conflict handling, abort | 10-15 |
| `commsAgent.ts` | Event batching, idle timeout, summary | 10-15 |
| `tangentFlow.ts` | Detection, confirmation, timeout | 10-15 |
| `governance/*` | Graph build, entropy calc, task prioritization | 20-30 |

**Estimated total new tests:** ~155-210.

### Infrastructure Improvements

1. **Add CI workflow** — Run tests on push/PR (GitHub Actions)
2. **Add coverage threshold** — Start at 50%, increase to 70%
3. **Add integration tests** — MCP tool call round-trips
4. **Add shared test fixtures** — Mock operator registry, mock config
5. **Add test for `cli.ts`** — Command parsing, error handling
6. **Add test for `mcpServer.ts`** — Tool registration, HTTP handling

---

## Appendix A: cursor-drive → claude-drive Porting Guide

### Adaptation Patterns

| cursor-drive Pattern | claude-drive Equivalent |
|---------------------|----------------------|
| `vscode.workspace.getConfiguration('cursorDrive')` | `loadConfig()` from `config.ts` |
| `vscode.EventEmitter` | Node.js `EventEmitter` (already used) |
| `vscode.window.showInformationMessage` | `console.log` or `agentOutput.logActivity` |
| `vscode.window.showQuickPick` | `enquirer` or `readline` prompt |
| `vscode.window.showInputBox` | `readline.question` or `enquirer` |
| `vscode.lm.selectChatModels` | Agent SDK `query()` with `model: "haiku"` |
| `vscode.commands.executeCommand` | Direct function call or CLI command |
| `vscode.workspace.workspaceFolders` | `process.cwd()` or `--root` flag |
| `vscode.Memento` (workspace state) | `store.ts` (JSON KV) |
| CommonJS (`import * as x from 'y'`) | ESM (`import x from 'y'`) |
| `vscode.OutputChannel` | `process.stdout` or `agentOutput` |
| VS Code webview panel | Ink TUI pane or web dashboard |

### Module Portability Tiers

| Tier | Modules | Adaptation |
|------|---------|------------|
| **Drop-in** (no changes) | `fillerCleaner`, `sanitizer`, `ndjsonParser`, `syncTypes`, `syncLedger`, `governance/schemas`, `governance/fsUtils`, `governance/focusGuard` | None — pure TypeScript |
| **Config adapter** (~5 LOC each) | `glossaryExpander`, `modeSwitcher`, `governance/paths`, `governance/projectGraph`, `governance/entropy`, `governance/taskLedger` | Replace `vscode.workspace.getConfiguration` with `loadConfig()` |
| **LLM adapter** (~30 LOC each) | `promptOptimizer`, `clarificationHandler`, `tangentNameExtractor`, `commsAgent`, `governance/aiSummary` | Replace `vscode.lm.selectChatModels` with Agent SDK `query()` |
| **UI adapter** (~50 LOC each) | `pipeline`, `tangentFlow`, `audioFeedback` | Replace modals/notifications with CLI prompts |
| **Major rewrite** | `agentScreen*`, `driveSidebar`, `statusBar`, `apiDiscovery`, `voiceCommands`, `pluginInstaller` | VS Code-specific; build from scratch or skip |

## Appendix B: Estimated Cost Savings Summary

| Improvement | Annual Savings | Effort |
|-------------|---------------|--------|
| Tiered model routing (role → model) | $24K–$30K | ~250 LOC |
| Prompt caching (`cache_control`) | $12K–$18K | ~50 LOC |
| Batch API for async operators | $5K–$8K | ~100 LOC |
| Total pipeline (fewer retries from better prompts) | $3K–$5K | ~730 LOC |
| **Total** | **$44K–$61K/yr** | **~1,130 LOC** |

## Appendix C: File Mapping

| cursor-drive Source | claude-drive Target | Status |
|--------------------|--------------------|----|
| `src/fillerCleaner.ts` | `src/fillerCleaner.ts` | Port (drop-in) |
| `src/sanitizer.ts` | `src/sanitizer.ts` | Port (drop-in) |
| `src/glossaryExpander.ts` | `src/glossaryExpander.ts` | Port (config adapter) |
| `src/promptOptimizer.ts` | `src/promptOptimizer.ts` | Port (LLM adapter) |
| `src/clarificationHandler.ts` | `src/clarificationHandler.ts` | Port (LLM adapter) |
| `src/pipeline.ts` | `src/pipeline.ts` | Port (UI adapter) |
| `src/modelSelector.ts` | `src/modelSelector.ts` | Port (LLM adapter) |
| `src/modelUtils.ts` | `src/modelUtils.ts` | Port (LLM adapter) |
| `src/toolAllowlist.ts` | `src/toolAllowlist.ts` | Port (drop-in) |
| `src/stateSyncCoordinator.ts` | `src/stateSyncCoordinator.ts` | Port (config adapter) |
| `src/syncLedger.ts` | `src/syncLedger.ts` | Port (config adapter) |
| `src/syncTypes.ts` | `src/syncTypes.ts` | Port (drop-in) |
| `src/integrationQueue.ts` | `src/integrationQueue.ts` | Port (drop-in) |
| `src/commsAgent.ts` | `src/commsAgent.ts` | Port (LLM + UI adapter) |
| `src/tangentFlow.ts` | `src/tangentFlow.ts` | Port (UI adapter) |
| `src/tangentNameExtractor.ts` | `src/tangentNameExtractor.ts` | Port (LLM adapter) |
| `src/ndjsonParser.ts` | `src/ndjsonParser.ts` | Port (drop-in) |
| `src/modeSwitcher.ts` | `src/modeSwitcher.ts` | Port (config adapter) |
| `src/audioFeedback.ts` | `src/audioFeedback.ts` | Port (UI adapter) |
| `src/governance/*` | `src/governance/*` | Port (config + LLM adapter) |
| `src/cloudAgentClient.ts` | `src/cloudAgentClient.ts` | Port (drop-in) |
| `src/agentScreen.ts` | N/A — build `webAgentScreen.ts` | New (different UI) |
| `src/driveSidebar.ts` | N/A — Ink TUI exists | Skip |
| `src/statusBar.ts` | N/A — `statusLine.ts` exists | Skip |
| `src/apiDiscovery.ts` | N/A — VS Code specific | Skip |
| `src/voiceCommands.ts` | N/A — VS Code specific | Skip |
| `src/pluginInstaller.ts` | N/A — different target | New concept |
| `src/cursor-sdk/*` | `src/sdk-utils/*` | Port (data structures) |
