# Cursor Drive Improvement Strategy

> Informed by analysis of [drive-mode/claude-drive](https://github.com/drive-mode/claude-drive), ACP/MCP/Plugin architecture research, and current cursor-drive codebase audit.
>
> **Date:** 2026-03-27  
> **Scope:** Feature gaps, architecture evolution, concrete improvement plan  
> **Supporting docs:** [claude-drive-repo-analysis.md](claude-drive-repo-analysis.md), [architecture-strategy-acp-mcp-plugin-2026-03.md](architecture-strategy-acp-mcp-plugin-2026-03.md)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Feature Gap Analysis: claude-drive vs cursor-drive](#2-feature-gap-analysis)
3. [Architecture Evolution: ACP + MCP + Plugin Strategy](#3-architecture-evolution)
4. [Improvement Areas (Detailed)](#4-improvement-areas)
5. [Implementation Priorities](#5-implementation-priorities)
6. [Risk Assessment](#6-risk-assessment)
7. [ADR and Test Requirements](#7-adr-and-test-requirements)

---

## 1. Executive Summary

**claude-drive** is a standalone Node.js CLI that brings multi-operator AI pair programming to Claude Code. It shares ~60% of its code with cursor-drive but has diverged significantly in several areas: **typed memory with auto-dream consolidation**, **session checkpointing/fork**, **lifecycle hooks**, **reusable skills**, **per-plan cost tracking**, **Edge-TTS + Piper TTS backends**, and **Ink TUI**. These features represent concrete engineering work that cursor-drive can selectively adopt.

Cursor-drive has its own strengths: **VS Code webview UI** (Agent Screen, sidebar), **plugin-based prompt pipeline** (`beforeSubmitPrompt`), **MCP Apps** prototype, **governance system**, **cursor-sdk bridge** (`SessionAccumulator`, `ToolCallTracker`), **Cloud Agent integration**, and **mob-sync state coordination**. These are cursor-ecosystem features that claude-drive lacks.

The recommended strategy is **selective port of claude-drive's most valuable features** into cursor-drive's existing Extension + MCP + Plugin architecture, with **incremental adoption of ACP** as a session/agent protocol layer when concrete external-agent needs arise.

### Top 5 Improvements by Impact

| # | Improvement | Source | Impact |
|---|-------------|--------|--------|
| 1 | Typed memory system + auto-dream | claude-drive | Cross-session knowledge retention for operators |
| 2 | Edge-TTS + Piper TTS backends | claude-drive | Neural voice quality; offline capability |
| 3 | Session checkpointing with fork | claude-drive | Resumable multi-operator sessions |
| 4 | Lifecycle hook registry (extensible) | claude-drive | User-extensible automation at 12 lifecycle events |
| 5 | Skill loader with parameter templates | claude-drive | Reusable, parameterized operator instructions |

---

## 2. Feature Gap Analysis

### 2.1 Features claude-drive Has, cursor-drive Lacks

| Feature | claude-drive Implementation | cursor-drive Status | Priority |
|---------|---------------------------|---------------------|----------|
| **Typed memory store** | `memoryStore.ts` — fact/preference/correction/decision/context entries with confidence, tags, decay, search, persistence to `~/.claude-drive/memory.json` | `persistentMemory.ts` stores daily logs + curated `MEMORY.md`; no typed entries, no confidence, no search-by-kind | **Critical** |
| **Auto-dream consolidation** | `autoDream.ts` — background daemon every 15min: prune expired, decay confidence, merge similar (70% keyword overlap), promote cross-operator entries | Not present | **High** |
| **Edge-TTS backend** | `edgeTts.ts` — `edge-tts-universal` package, neural cloud voices, temp MP3 + OS playback | MCP tool description mentions it; `tts.ts` only has `say.js` | **High** |
| **Piper TTS backend** | `piper.ts` — local neural TTS via Piper binary, WAV output, configurable model path | MCP tool description mentions it; not implemented | **High** |
| **Session checkpoint/restore/fork** | `checkpoint.ts` + `sessionManager.ts` + `sessionStore.ts` — full state snapshots, named checkpoints (max 20), fork creates new session from checkpoint | Not present | **High** |
| **Lifecycle hooks** | `hooks.ts` — 12 events, command + prompt hook types, loaded from config + `~/.claude-drive/hooks/` JSON files | Plugin hooks exist in `.cursor/hooks/` but are Cursor-plugin-level (Python scripts); no runtime extensible hook registry in the extension | **Medium** |
| **Skill loader** | `skillLoader.ts` — markdown + YAML frontmatter, `{{param}}` interpolation, role/preset requirements, discovery from directory | `.cursor/skills/` exist but are Cursor-plugin skills; no runtime skill registry in the extension | **Medium** |
| **Per-plan cost tracking** | `planCostTracker.ts` — per-operator cost/duration/turns, aggregated per plan, exposed via MCP `get_costs` tool | Operator stats exist in `operatorRegistry.ts` but no plan-level aggregation or cost MCP tool | **Medium** |
| **Approval queue** | `approvalQueue.ts` — pending approval request queue with resolve/reject lifecycle | `approvalGates.ts` has pattern-based gates but no queued approval request flow | **Low** |
| **Ink TUI** | `tui.tsx` — React/Ink two-pane: activity feed + operator list | N/A (VS Code extension doesn't need terminal UI) | **Skip** |
| **Status line script** | `statusLine.ts` — bash script for Claude Code's status area | N/A (VS Code has status bar) | **Skip** |
| **Status file writer** | `statusFile.ts` — writes `~/.claude-drive/status.json` | N/A (extension uses VS Code Memento) | **Skip** |
| **CLI commands** | `cli.ts` — 15+ Commander commands | N/A (extension uses VS Code commands) | **Skip** |
| **Agent SDK `query()`** | `operatorManager.ts` — `@anthropic-ai/claude-agent-sdk` for subagent execution | Uses Cursor Composer natively; `cursorCliRunner.ts` for CLI-based execution | **Skip** (different execution model) |

### 2.2 Features cursor-drive Has, claude-drive Lacks

| Feature | cursor-drive | Claude-drive |
|---------|-------------|-------------|
| VS Code webview Agent Screen | `agentScreen.ts` + `agentScreenTemplate.ts` | Terminal-only `agentOutput.ts` |
| MCP Apps Agent Screen | `agentScreenApp.ts` — portable iframe UI | Not present |
| Activity Bar sidebar | `driveSidebar.ts` | Not present |
| Status bar integration | `statusBar.ts` — Drive > Mode \| Operator | Status line script (different UX) |
| Prompt pipeline hooks | `pipeline.ts` — `beforeSubmitPrompt` with filler/sanitizer/glossary/optimizer | Direct Agent SDK prompting |
| Mob-sync state coordination | `stateSyncCoordinator.ts` + `integrationQueue.ts` | Not present |
| Cloud Agent integration | `cloudAgentClient.ts` | Not present |
| Cursor CLI runner | `cursorCliRunner.ts` — spawn/stream Cursor CLI | N/A |
| Governance system | `src/governance/` — entropy, task ledger, project graph, scans | Not present |
| Cursor SDK bridge | `src/cursor-sdk/` — `SessionAccumulator`, `ToolCallTracker`, `PermissionBroker` | Not present |
| Plugin installer | `pluginInstaller.ts` — copies `.cursor-plugin` into workspace | `install-plugin.mjs` for Claude Code |
| Audio feedback chimes | `audioFeedback.ts` | Not present |
| Tangent flow UX | `tangentFlow.ts` + `tangentNameExtractor.ts` | Not present |

### 2.3 Shared Code (Manually Synced per AGENTS.md)

| Module | Sync Status | Notes |
|--------|------------|-------|
| `operatorRegistry.ts` | Diverged — cursor-drive has more features (visibility, workspace fields, events API) | claude-drive has simpler but similar core |
| `router.ts` | Similar — both keyword-based Tier 0 | cursor-drive adds slash commands |
| `tts.ts` | **cursor-drive behind** — only `say.js`; claude-drive has Edge-TTS + Piper + say chain | Primary sync gap |
| `driveMode.ts` | Similar state machines | cursor-drive uses VS Code Memento; claude-drive uses JSON store |
| `approvalGates.ts` | Similar pattern matching | cursor-drive adds steering stats |
| `worktreeManager.ts` | Similar git worktree isolation | cursor-drive adds `gitService.ts` |

---

## 3. Architecture Evolution

### 3.1 Current Architecture (Phase 1 — Today)

```
┌─────────────────────────────────────────────────────┐
│ VS Code Extension (VSIX)                            │
│  ├── MCP Server :7891 (tools + .well-known/agent)   │
│  ├── Agent Screen (webview + MCP App)                │
│  ├── Status Bar + Sidebar                           │
│  ├── TTS (say.js only)                              │
│  ├── Operator Registry (in-memory)                  │
│  ├── Pipeline (filler → sanitize → route → optimize)│
│  └── Approval Gates + Governance                    │
├─────────────────────────────────────────────────────┤
│ Cursor Plugin (.cursor/)                            │
│  ├── Rules (.mdc)                                   │
│  ├── Skills (SKILL.md)                              │
│  ├── Hooks (Python + JS)                            │
│  └── Commands                                       │
└─────────────────────────────────────────────────────┘
```

### 3.2 Target Architecture (Phase 2 — Near-term Improvements)

```
┌─────────────────────────────────────────────────────┐
│ VS Code Extension (VSIX)                            │
│  ├── MCP Server :7891                               │
│  │   ├── 46+ tools (operator, screen, TTS, memory,  │
│  │   │   hooks, skills, session, cost, dream)       │
│  │   └── MCP App (Agent Screen portable UI)         │
│  ├── Agent Screen (webview + MCP App)               │
│  ├── Status Bar + Sidebar                           │
│  ├── TTS (Edge-TTS → Piper → say chain)      [NEW] │
│  ├── Operator Registry (in-memory + persistence)    │
│  │   ├── Typed Memory Store              [NEW]      │
│  │   ├── Auto-Dream Consolidation        [NEW]      │
│  │   └── Per-Plan Cost Tracking          [NEW]      │
│  ├── Session Manager                     [NEW]      │
│  │   ├── Checkpoint / Restore / Fork                │
│  │   └── Session Persistence                        │
│  ├── Hook Registry (runtime extensible)  [NEW]      │
│  ├── Skill Loader (parameterized)        [NEW]      │
│  ├── Pipeline (filler → sanitize → route → optimize)│
│  └── Approval Gates + Governance                    │
├─────────────────────────────────────────────────────┤
│ Cursor Plugin (.cursor/)                            │
│  ├── Rules (.mdc)                                   │
│  ├── Skills (SKILL.md)                              │
│  ├── Hooks (Python + JS)                            │
│  └── Commands                                       │
└─────────────────────────────────────────────────────┘
```

### 3.3 Future Architecture (Phase 3 — ACP Integration)

```
┌─────────────────────────────────────────────────────┐
│ VS Code Extension (VSIX)                            │
│  ├── MCP Server :7891 (unchanged)                   │
│  ├── ACP Client Adapter                   [NEW]     │
│  │   ├── AcpOperatorAdapter                         │
│  │   │   (external ACP agents as operators)         │
│  │   ├── Session routing → Agent Screen             │
│  │   └── Permission bridging → approvalGates        │
│  ├── A2A Agent Cards (.well-known/agent.json) [NEW] │
│  └── [all Phase 2 modules]                          │
├─────────────────────────────────────────────────────┤
│ Cursor Plugin (.cursor/)                            │
│  └── [unchanged]                                    │
└─────────────────────────────────────────────────────┘
```

### 3.4 ACP + MCP + Plugin — How They Relate

| Layer | Protocol | Role in Cursor Drive | When to Adopt |
|-------|----------|---------------------|---------------|
| **Plugin** | Cursor-proprietary | AI behavior (rules, hooks, skills, prompt interception) | **Already adopted** |
| **MCP** | Model Context Protocol | Tool bridge between AI and extension; portable UI via MCP Apps | **Already adopted**; expand with new tools for memory/hooks/skills/sessions |
| **ACP** | Agent Client Protocol | External agent integration; standardized sessions | **Defer** until external agent integration is needed |

**Key insight:** ACP is complementary to, not a replacement for, the current architecture. The MCP server remains the primary bridge. ACP adds the ability to spawn external agents (Goose, Copilot CLI, Gemini-ACP, etc.) as Drive operators through a standardized adapter pattern.

---

## 4. Improvement Areas (Detailed)

### 4.1 Typed Memory System

**Gap:** cursor-drive's `persistentMemory.ts` writes unstructured daily logs and a curated `MEMORY.md`. claude-drive has a fully typed memory system with entry kinds, confidence scoring, decay, search, and auto-pruning.

**Port plan:**
- Create `src/memoryStore.ts` — typed entries (fact/preference/correction/decision/context) with `id`, `kind`, `content`, `source`, `operatorId`, `tags`, `confidence`, `supersededBy`, `expiresAt`
- Persistence: store in workspace `.drive/memory.json` (atomic writes via existing pattern)
- Query: filter by kind, tags, operator; search substring; sort by priority (corrections first) then confidence
- Confidence decay: configurable half-life (default 168 hours)
- Auto-pruning: remove oldest lowest-confidence entries when max reached (default 500)
- MCP tools: `memory_remember`, `memory_recall`, `memory_correct`, `memory_forget`, `memory_share`
- Integration with `persistentMemory.ts`: keep curated `MEMORY.md` as a read-through view; typed store is source of truth

**Config keys to add:**
```
cursorDrive.memory.maxEntries (default: 500)
cursorDrive.memory.maxPerOperator (default: 100)
cursorDrive.memory.defaultConfidence (default: 0.8)
cursorDrive.memory.decayEnabled (default: true)
cursorDrive.memory.decayHalfLifeHours (default: 168)
```

**Test requirements:** Unit tests for store CRUD, confidence decay math, auto-pruning, query filtering, operator scoping. Integration test for MCP tool calls.

### 4.2 Auto-Dream Consolidation

**Gap:** No background knowledge consolidation exists.

**Port plan:**
- Create `src/autoDream.ts` — background daemon on configurable interval (default 15 min)
- Four phases: prune expired/low-confidence → decay confidence → merge similar entries (>70% keyword overlap) → promote cross-operator entries to shared
- Runs via `setInterval` in extension; cancelable on deactivation
- MCP tools: `dream_trigger` (manual), `dream_status`
- Dependencies: requires typed memory store (4.1)

**Config keys to add:**
```
cursorDrive.dream.enabled (default: true)
cursorDrive.dream.intervalMs (default: 900000)
cursorDrive.dream.minEntries (default: 10)
cursorDrive.dream.pruneThreshold (default: 0.2)
cursorDrive.dream.mergeThreshold (default: 0.7)
cursorDrive.dream.maxAgeMs (default: 604800000)
```

**Test requirements:** Unit tests for each dream phase, timer lifecycle, config respect.

### 4.3 TTS Backend Chain (Edge-TTS + Piper)

**Gap:** cursor-drive's `tts.ts` only implements `say.js`. The MCP tool descriptions mention Piper and ElevenLabs but they are aspirational. claude-drive has working Edge-TTS and Piper backends with a fallback chain.

**Port plan:**
- Create `src/edgeTts.ts` — port from claude-drive; uses `edge-tts-universal` npm package; synthesizes to temp MP3; plays via OS command (`afplay`/`aplay`/PowerShell)
- Create `src/piper.ts` — port from claude-drive; local neural TTS via Piper binary; WAV output; cross-platform
- Update `src/tts.ts` — implement fallback chain: Edge-TTS → Piper → say; backend selection via config
- Add `edge-tts-universal` as optional dependency in `package.json`

**Config keys to add:**
```
cursorDrive.tts.backend (default: "edgeTts", options: "edgeTts" | "piper" | "say")
cursorDrive.tts.speed (default: 1.0, range: 0.5-2.0)
cursorDrive.tts.volume (default: 0.8, range: 0.2-1.0)
cursorDrive.tts.maxSpokenSentences (default: 3)
cursorDrive.tts.piperBinaryPath (optional)
cursorDrive.tts.piperModelPath (optional)
```

**Test requirements:** Unit tests for backend selection, fallback chain, sentence truncation, config parsing. Mock OS commands in tests.

### 4.4 Session Checkpoint / Restore / Fork

**Gap:** No session persistence exists. Operator state is lost on reload.

**Port plan:**
- Create `src/sessionManager.ts` — session create/resume, session metadata
- Create `src/checkpoint.ts` — checkpoint/restore/fork with full state snapshots
  - Snapshot: operator registry state, memory store, drive mode, agent screen history, config snapshot
  - Storage: workspace `.drive/sessions/` directory
  - Fork: creates new session branching from a checkpoint
  - Max checkpoints per session: configurable (default 20)
- MCP tools: `session_checkpoint`, `session_restore`, `session_list_checkpoints`, `session_fork`, `session_metadata`

**Config keys to add:**
```
cursorDrive.sessions.maxCheckpoints (default: 20)
cursorDrive.sessions.autoCheckpoint (default: false)
cursorDrive.sessions.autoCheckpointIntervalMs (default: 300000)
```

**Test requirements:** Unit tests for snapshot serialization/deserialization, checkpoint CRUD, fork branching, max checkpoint limit, auto-checkpoint timer.

### 4.5 Runtime Hook Registry

**Gap:** cursor-drive has `.cursor/hooks/` (Python scripts invoked by the Cursor plugin system) but no runtime-extensible hook registry within the extension itself. claude-drive has 12 hook events with command + prompt hook types that can be registered dynamically.

**Port plan:**
- Create `src/hookRegistry.ts` — 12 events: `PreToolUse`, `PostToolUse`, `SessionStart`, `SessionStop`, `OperatorSpawn`, `OperatorDismiss`, `ModeChange`, `PreApproval`, `PostApproval`, `MemoryWrite`, `TaskStart`, `TaskComplete`
- Two hook types: `command` (shell command with env context, exit code 2 = abort) and `prompt` (inject text)
- Hook sources: extension config + workspace `.drive/hooks/` directory
- MCP tools: `hooks_register`, `hooks_unregister`, `hooks_list`
- Integration: hooks fire from relevant modules (operator registry, drive mode, approval gates, memory store)

**Config keys to add:**
```
cursorDrive.hooks.enabled (default: true)
cursorDrive.hooks.directory (default: ".drive/hooks")
cursorDrive.hooks.definitions (default: [])
```

**Design note:** This is distinct from Cursor's `.cursor/hooks/` system. The runtime hook registry operates within the extension process and is controllable via MCP tools. Cursor's hooks operate in the plugin layer and intercept the AI prompt pipeline. Both can coexist.

**Test requirements:** Unit tests for event emission, hook registration/unregistration, command hook execution (mock child_process), prompt hook injection, abort-on-exit-2.

### 4.6 Skill Loader with Parameter Templates

**Gap:** cursor-drive has `.cursor/skills/` (Cursor plugin skills with `SKILL.md` files) but no runtime skill registry with parameterized templates. claude-drive has markdown skills with YAML frontmatter, `{{param}}` interpolation, role/preset requirements.

**Port plan:**
- Create `src/skillLoader.ts` — discover skills from workspace `.drive/skills/` directory
- YAML frontmatter: `name`, `description`, `tags`, `requiredRole`, `requiredPreset`, `parameters` (with `name`, `description`, `required`, `default`)
- Template interpolation: `{{paramName}}` replaced with provided values
- MCP tools: `skills_list`, `skills_load`, `skills_run`

**Config keys to add:**
```
cursorDrive.skills.directory (default: ".drive/skills")
cursorDrive.skills.enabled (default: true)
```

**Design note:** Complementary to Cursor plugin skills. Plugin skills guide AI behavior; runtime skills are operator-loadable task templates that can be parameterized and executed.

**Test requirements:** Unit tests for YAML frontmatter parsing, parameter validation, template interpolation, role/preset enforcement, directory discovery.

### 4.7 Per-Plan Cost Tracking

**Gap:** cursor-drive's `operatorRegistry.ts` tracks per-operator stats (cost, duration, turns) but has no plan-level aggregation. claude-drive has `planCostTracker.ts` for per-plan cost rollups.

**Port plan:**
- Create `src/planCostTracker.ts` — aggregate operator costs into plan-level summaries
- Track: total cost, total duration, total API duration, total turns, task count, per-operator breakdown
- MCP tool: `cost_get_costs` — returns plan and per-operator cost summaries
- Integration: operators report costs via existing stats; plan tracker aggregates on query

**Test requirements:** Unit tests for cost aggregation, multi-operator rollup, formatting.

### 4.8 Config Schema Completion

**Gap:** cursor-drive's `config.ts` only validates 3 settings via Zod. Many settings used at point of access via `vscode.workspace.getConfiguration()` are undocumented in `package.json` contributes. claude-drive has 50+ typed config keys with defaults.

**Port plan:**
- Expand `src/config.ts` Zod schema to cover all settings documented in `docs/reference/config-schema.md`
- Add missing settings to `package.json` `contributes.configuration` so they appear in VS Code Settings UI
- Add validation on extension activation (log warnings for invalid config)
- Reconcile `config-schema.md` with actual `package.json` contributes

**Test requirements:** Unit tests for schema validation, default values, invalid input handling.

### 4.9 Atomic Writes for State Files

**Gap:** claude-drive has `atomicWrite.ts` for safe JSON persistence. cursor-drive uses VS Code Memento for most state but `persistentMemory.ts` writes directly to files.

**Port plan:**
- Create `src/atomicWrite.ts` — write-to-temp-then-rename pattern for all `.drive/` state files
- Use for: memory store, session checkpoints, hook definitions, skill cache

**Test requirements:** Unit tests for write-then-rename, error handling, concurrent write safety.

### 4.10 MCP Tool Expansion

**Gap:** cursor-drive exposes ~35 MCP tools. claude-drive exposes 46 across 11 domains. Several domains are missing from cursor-drive.

**New tool domains to add:**

| Domain | Tools | Source Module |
|--------|-------|--------------|
| Memory | `memory_remember`, `memory_recall`, `memory_correct`, `memory_forget`, `memory_share` | `memoryStore.ts` (4.1) |
| Session | `session_checkpoint`, `session_restore`, `session_list_checkpoints`, `session_fork`, `session_metadata` | `sessionManager.ts` (4.4) |
| Hooks | `hooks_register`, `hooks_unregister`, `hooks_list` | `hookRegistry.ts` (4.5) |
| Skills | `skills_list`, `skills_load`, `skills_run` | `skillLoader.ts` (4.6) |
| Dream | `dream_trigger`, `dream_status` | `autoDream.ts` (4.2) |
| Cost | `cost_get_costs` | `planCostTracker.ts` (4.7) |

**Total new tools:** ~19, bringing cursor-drive to ~54 MCP tools.

---

## 5. Implementation Priorities

### Tier 1: Core Value (Highest Impact, Moderate Effort)

These improvements directly enhance the developer experience and fill the largest gaps with claude-drive.

| # | Improvement | Depends On | Effort | Files Changed/Created |
|---|-------------|-----------|--------|----------------------|
| 1 | TTS backend chain (Edge-TTS + Piper) | — | Moderate | Create `edgeTts.ts`, `piper.ts`; update `tts.ts`, `package.json` |
| 2 | Typed memory store | — | Moderate | Create `memoryStore.ts`; update `mcpServer.ts`, `package.json` |
| 3 | Auto-dream consolidation | #2 | Low | Create `autoDream.ts`; update `extension.ts`, `mcpServer.ts` |
| 4 | Session checkpoint/restore/fork | — | Moderate | Create `sessionManager.ts`, `checkpoint.ts`; update `mcpServer.ts`, `extension.ts` |

### Tier 2: Extensibility (Medium Impact, Medium Effort)

These add extensibility surfaces that power users and operators need.

| # | Improvement | Depends On | Effort | Files Changed/Created |
|---|-------------|-----------|--------|----------------------|
| 5 | Runtime hook registry | — | Moderate | Create `hookRegistry.ts`; update `extension.ts`, `mcpServer.ts`, `operatorRegistry.ts`, `driveMode.ts` |
| 6 | Skill loader with templates | — | Low | Create `skillLoader.ts`; update `mcpServer.ts` |
| 7 | Per-plan cost tracking | — | Low | Create `planCostTracker.ts`; update `mcpServer.ts` |
| 8 | Atomic writes | — | Low | Create `atomicWrite.ts`; update memory/session modules |

### Tier 3: Polish & Architecture (Lower Impact, Varied Effort)

| # | Improvement | Depends On | Effort | Files Changed/Created |
|---|-------------|-----------|--------|----------------------|
| 9 | Config schema completion | — | Low | Update `config.ts`, `package.json` |
| 10 | MCP tool expansion (all new domains) | #2-7 | Included above | `mcpServer.ts` updated with each feature |
| 11 | MCP Apps Agent Screen polish | — | Medium | Update `agentScreenApp.ts` |
| 12 | ACP client adapter (when triggered) | — | High | Create `acpAdapter.ts`; update `operatorRegistry.ts`, `mcpServer.ts` |

### Implementation Dependency Graph

```
[TTS Chain]           [Typed Memory] ──→ [Auto-Dream]
                           │
[Session Mgmt]             │
                           ▼
[Hook Registry] ──→ [fires from operatorRegistry, driveMode, memory]
                           
[Skill Loader]      [Cost Tracker]     [Atomic Writes]

[Config Schema]     [MCP Apps Polish]

                    [ACP Adapter] ← triggered by external need
```

### Sync Considerations

Per `AGENTS.md`, these files must stay in sync with `claude-drive`:
- `operatorRegistry.ts` — both repos should converge on the same types and API
- `router.ts` — already similar; keep aligned
- `tts.ts`, `edgeTts.ts`, `piper.ts` — after porting, these become shared code
- `syncTypes.ts` — type definitions

New modules (`memoryStore.ts`, `autoDream.ts`, `hookRegistry.ts`, `skillLoader.ts`, `checkpoint.ts`) should be written to be portable between both repos with minimal adapter code (use dependency injection for VS Code vs Node.js differences).

---

## 6. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Memory store corruption on crash | Medium | High | Atomic writes (4.9); validate on load |
| Auto-dream deletes valuable memories | Low | High | Conservative defaults (pruneThreshold: 0.2); log all deletions; add `dream_undo` later |
| Edge-TTS network failure in offline env | Medium | Low | Fallback chain handles this by design |
| Piper binary not available | Medium | Low | Skip to next backend; log warning |
| Session checkpoint disk usage | Low | Medium | Max checkpoint limit (default 20); cleanup on session end |
| Hook command execution security | Medium | High | Only execute hooks from trusted directories; no network commands by default; honor approval gates |
| ACP spec breaking changes | High | Medium | Defer adoption; adapter pattern isolates changes |
| Config schema migration breaks existing users | Low | Medium | All new config keys have defaults; validate + warn, don't error |
| Bundle size increase from new deps | Low | Medium | `edge-tts-universal` is small; Piper is optional binary; tree-shake ACP SDK if adopted |

---

## 7. ADR and Test Requirements

### New ADRs Needed

| ADR | Title | Covers |
|-----|-------|--------|
| ADR-0025 | Typed Memory System and Auto-Dream Consolidation | Memory entry types, confidence model, dream cycle, relation to existing `persistentMemory.ts` |
| ADR-0026 | TTS Backend Chain and Voice Quality Strategy | Edge-TTS → Piper → say fallback; neural voice selection; offline capability |
| ADR-0027 | Session Checkpoint, Restore, and Fork | Snapshot schema, storage location, fork semantics, max limits |
| ADR-0028 | Runtime Hook and Skill Registry | Extension-level vs plugin-level hooks; skill templates; security model |

### Test Requirements per Feature

| Feature | Unit Tests | Integration Tests | Manual Test |
|---------|-----------|-------------------|-------------|
| Typed memory store | CRUD, query, decay math, pruning | MCP tool calls | Operator creates memories; recalled across sessions |
| Auto-dream | Phase logic, timer lifecycle | Full dream cycle with real store | Memory count decreases after dream; duplicates merged |
| Edge-TTS | Backend init, fallback trigger | TTS speak with Edge-TTS | Audible neural voice output |
| Piper TTS | Backend init, WAV generation | TTS speak with Piper binary | Audible local voice output |
| Session mgmt | Snapshot serialize/deserialize, checkpoint CRUD | MCP checkpoint + restore cycle | Save session; restart extension; restore |
| Hook registry | Event emission, registration, abort | Hook fires on operator spawn | Custom shell hook runs on operator spawn |
| Skill loader | YAML parse, template interpolation, validation | MCP skill list + run | Operator loads and executes parameterized skill |
| Cost tracker | Aggregation math | MCP cost query | Cost summary after multi-operator session |
| Config schema | Validation, defaults | Extension activation with various configs | Settings UI shows all Drive settings |

### TDD Workflow (per `tdd-enforcement.mdc`)

For each feature:
1. Write failing test capturing expected behavior
2. Implement feature minimally to pass test
3. Refactor; run `npm test`; verify pass
4. Run `npm run compile`; fix type errors
5. Commit

---

## Appendix A: claude-drive → cursor-drive Porting Guide

### Adaptation Patterns

When porting claude-drive modules to cursor-drive, apply these adaptations:

| claude-drive Pattern | cursor-drive Equivalent |
|---------------------|----------------------|
| `import { readFileSync } from 'fs'` | `import * as vscode from 'vscode'` + workspace storage API |
| Module-level singletons | Dependency injection via `extension.ts` activate() |
| `process.env.CLAUDE_DRIVE_*` | `vscode.workspace.getConfiguration('cursorDrive')` |
| `EventEmitter` (Node.js) | `vscode.EventEmitter` |
| `~/.claude-drive/` directories | Workspace `.drive/` or `globalStorageUri` |
| `console.log` / `chalk` | `vscode.window.showInformationMessage` or `OutputChannel` |
| ESM (`import x from 'y'`) | CommonJS (`import * as x from 'y'`) — cursor-drive uses CJS |
| `child_process.exec` for audio playback | Same, but behind `vscode.workspace.isTrusted` check |
| JSON file persistence | Atomic write to workspace storage; consider VS Code Memento for small state |

### File Mapping

| claude-drive File | cursor-drive Target | Adaptation Notes |
|------------------|--------------------|--------------------|
| `memoryStore.ts` | `src/memoryStore.ts` | Replace file I/O with workspace storage |
| `autoDream.ts` | `src/autoDream.ts` | Use `setInterval`; cancel in `deactivate()` |
| `edgeTts.ts` | `src/edgeTts.ts` | Mostly portable; add VS Code output channel logging |
| `piper.ts` | `src/piper.ts` | Mostly portable; add workspace trust check |
| `checkpoint.ts` | `src/checkpoint.ts` | Replace file paths with `globalStorageUri` |
| `sessionManager.ts` | `src/sessionManager.ts` | Replace file paths; integrate with VS Code Memento |
| `hooks.ts` | `src/hookRegistry.ts` | Replace file discovery with workspace-scoped paths |
| `skillLoader.ts` | `src/skillLoader.ts` | Replace `~/.claude-drive/skills` with workspace `.drive/skills` |
| `planCostTracker.ts` | `src/planCostTracker.ts` | Directly portable |
| `atomicWrite.ts` | `src/atomicWrite.ts` | Directly portable |

## Appendix B: Architecture Decision — Why Not Fork claude-drive?

claude-drive is a **CLI for Claude Code**. cursor-drive is a **VS Code extension for Cursor**. The execution models are fundamentally different:

| Dimension | claude-drive | cursor-drive |
|-----------|-------------|-------------|
| Runtime | Node.js process (standalone daemon) | VS Code extension host (managed lifecycle) |
| UI framework | Terminal (Ink TUI) | VS Code webview API |
| State storage | JSON files in `~/.claude-drive/` | VS Code Memento + workspace storage |
| Config | JSON config file + env vars | VS Code settings (JSON-schema contributed) |
| Agent execution | Agent SDK `query()` directly | Cursor Composer (native) or Cursor CLI runner |
| Module system | ESM | CommonJS |
| Event system | Node.js EventEmitter | VS Code EventEmitter |
| Distribution | npm global install | VSIX marketplace |

The correct strategy is **selective port** of claude-drive's best features into cursor-drive's existing architecture, not a fork or wholesale migration. The ~60% shared code base should converge on common types and business logic, with platform-specific adapters for VS Code vs Node.js.
