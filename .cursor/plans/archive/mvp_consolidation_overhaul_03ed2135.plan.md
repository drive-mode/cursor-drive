---
planId: mvp-consolidation-overhaul
planType: task
parentPlanId: null
childPlanIds: []
dependsOn: []
name: MVP consolidation overhaul
overview: Reconcile plan/doc/code state, consolidate duplicate plans into a proper hierarchy, restructure docs/ for AI discoverability, and set up automation (commands, skills, hooks) for ongoing doc maintenance.
todos:
  - id: archive-completed-plan
    content: Archive drive_ext_+_hooks_cleanup_181e41b7.plan.md (100% complete)
    status: completed
  - id: consolidate-optimizer-plans
    content: Merge 3 duplicate optimizer plans into single code-optimization.plan.md, delete duplicates
    status: completed
  - id: reconcile-root-plan
    content: Rewrite cursor-drive.plan.md TODOs to match reality (mark built items complete, add actual gaps)
    status: completed
  - id: create-child-plans
    content: Create mvp-gaps.plan.md, test-coverage.plan.md, docs-overhaul.plan.md as child plans of root
    status: completed
  - id: rebuild-plan-graph
    content: Rewrite plan-graph.yaml and registry.yaml to reflect real plan file hierarchy
    status: completed
  - id: restructure-docs-dirs
    content: Create guides/ and reference/ dirs, move live-testing.md and handoff to guides/
    status: completed
  - id: fix-stale-docs
    content: Fix 2 stale files (walkthrough, model-cost-tiers) and update plan-governance-quickstart
    status: completed
  - id: create-index-files
    content: Create README.md for docs/, docs/prd/, docs/design/, docs/guides/, docs/reference/
    status: completed
  - id: create-agents-md
    content: Create docs/AGENTS.md with intent-based routing for AI agents
    status: completed
  - id: create-reference-docs
    content: Generate config-schema.md, mcp-tools.md, commands-and-shortcuts.md from source
    status: completed
  - id: create-doc-commands
    content: Create .cursor/commands/update-docs.md and doc-review.md
    status: completed
  - id: create-doc-skills
    content: Create .cursor/skills/doc-writer/SKILL.md and doc-reviewer/SKILL.md
    status: completed
  - id: create-doc-rule-and-hook
    content: Create .cursor/rules/doc-maintenance.mdc and add stop hook for doc reminder
    status: completed
isProject: false
---

# MVP Consolidation and Documentation Overhaul

## Current State Analysis

### What is built (18 modules, all real implementations — not stubs)

Every `src/*.ts` file is a complete implementation. 8 of 18 have tests. The extension compiles and the MCP server serves 11 tools.

### Plan drift — plans do not match reality

The root plan ([cursor-drive.plan.md](.cursor/plans/cursor-drive.plan.md)) lists 10 pending TODOs, but several are **already built**:

- `f0-3-sanitization` (pending) — `src/sanitizer.ts` exists, tested
- `f1-2-approval-gates` (pending) — `src/approvalGates.ts` exists, tested
- `f2-2-tool-allowlist` (pending) — `src/toolAllowlist.ts` exists, tested
- `f0-4-context-injection`, `f1-1-safe-outputs` — partially addressed by existing modules

Three optimizer plan files are near-duplicates:

- `cursor-drive-automation-optimizer_67678b7d.plan.md` (11 TODOs, all pending)
- `cursor-drive-automation-optimizer_6713079d.plan.md` (10 TODOs, all pending)
- `code-optimizer-plan_8501efd7.plan.md` (10 TODOs, all pending)

One plan is 100% complete but not archived: `drive_ext_+_hooks_cleanup_181e41b7.plan.md`.

[plan-graph.yaml](.cursor/plans/plan-graph.yaml) defines 9 child "plans" that are not separate files — they are conceptual tracks within `cursor-drive.plan.md`. [registry.yaml](.cursor/plans/registry.yaml) shows stale counts (all `todo_count: 11`).

### Actual MVP gaps (P0 features not yet built)

- **promptOptimizer.ts** — referenced in walkthrough and PRD but file does not exist
- **Wake/submit word detection** — config keys exist, no runtime implementation
- **Tangent keyword wiring** — `agentRegistry.ts` supports spawn, but the input pipeline does not detect "tangent" and route to it
- **Mode switching confirmation** — config exists, enforcement logic missing
- **Tests for 10 untested modules** — extension, mcpServer, config, driveMode, statusBar, shareScreen, tts, agentRegistry, commsAgent, responseFormatter

### Docs status — 28 files, 2 stale, no index

- `docs/design/cursor-drive-walkthrough.md` line 123 references non-existent Python backend
- `docs/design/model-cost-tiers.md` lines 97-109 reference non-existent `ExecutionPolicy` / hh system
- No `docs/README.md` master index
- No `AGENTS.md` files for agent discoverability
- `plan-governance-quickstart.md` references old hh-project structure
- `docs/prompts/cursor-drive-plan-generation.md` likely references old structure

---

## Part 1: Plan Consolidation

### 1a. Archive completed plan

Delete or move `drive_ext_+_hooks_cleanup_181e41b7.plan.md` to an archive location (or just delete — git has history).

### 1b. Consolidate optimizer plans

Merge the three optimizer plans into a single `code-optimization.plan.md`:

- Keep the best content from `code-optimizer-plan_8501efd7.plan.md` (cleanest structure)
- Add the bootstrap automation tasks from `cursor-drive-automation-optimizer_67678b7d.plan.md`
- Delete the two duplicates

### 1c. Reconcile root plan with reality

Rewrite [cursor-drive.plan.md](.cursor/plans/cursor-drive.plan.md) with accurate TODO states:

**Mark completed:**

- `f0-3-sanitization`, `f1-2-approval-gates`, `f2-2-tool-allowlist`
- `f0-1-drive-mode-participant` (already marked)

**Add new TODOs for actual gaps:**

- `prompt-optimizer` — build promptOptimizer.ts
- `wake-submit-words` — implement wake/submit word detection
- `tangent-wiring` — wire tangent keyword into input pipeline
- `mode-confirm` — mode switching confirmation gate
- `test-coverage` — tests for untested modules

**Restructure as proper project with child plan IDs:**

```
cursor-drive (project)
├── mvp-gaps.plan.md (plan — remaining MVP features)
├── code-optimization.plan.md (plan — consolidated optimizer)
├── docs-overhaul.plan.md (plan — this work)
└── test-coverage.plan.md (plan — systematic test additions)
```

### 1d. Rebuild plan-graph.yaml and registry.yaml

Replace the current 9 virtual "tracks" with real plan file references. Each child plan is its own `.plan.md` file with its own TODOs.

---

## Part 2: Documentation Overhaul

### 2a. New docs/ directory structure

```
docs/
├── README.md                        # Master index: topic-to-file map
├── AGENTS.md                        # Agent routing: how to find docs by intent
├── architecture/
│   ├── README.md                    # (exists, keep)
│   └── adr/                         # (exists, keep)
├── prd/
│   ├── README.md                    # NEW: PRD index with completion status
│   └── prd-*.md                     # (5 existing PRDs)
├── design/
│   ├── README.md                    # NEW: design doc index
│   ├── plan-lifecycle-automation/   # (exists, keep)
│   └── *.md                         # (existing design docs)
├── guides/
│   ├── README.md                    # NEW: guides index
│   ├── getting-started.md           # NEW: setup, first run, dev loop
│   ├── live-testing.md              # MOVED from docs/dev/
│   └── handoff.md                   # MOVED from docs/handoff-prompt-new-chat.md
├── reference/
│   ├── README.md                    # NEW: reference index
│   ├── config-schema.md             # NEW: all cursorDrive.* settings
│   ├── mcp-tools.md                 # NEW: MCP tool catalog
│   └── commands-and-shortcuts.md    # NEW: all commands + keybindings
├── prompts/                         # (exists, keep)
└── research/                        # (exists, keep)
```

Key principles:

- **Every directory has a README.md** — agents read these first to route
- **docs/AGENTS.md** — tells agents which directory to search by intent category
- **guides/** — actionable how-to docs (vs. design/ which is rationale)
- **reference/** — generated-style lookup tables (config, MCP tools, commands)
- **dev/** removed — its only file moves to guides/

### 2b. Fix stale content

- `docs/design/cursor-drive-walkthrough.md` — remove Python backend reference (line ~123)
- `docs/design/model-cost-tiers.md` — remove hh/ExecutionPolicy references (lines ~97-109)
- `docs/handoff-prompt-new-chat.md` — update before moving to guides/
- `.cursor/plans/plan-governance-quickstart.md` — update hh-project references to cursor-drive

### 2c. Create index and routing files

- `docs/README.md` — master index as a topic-to-file table
- `docs/AGENTS.md` — intent-based routing instructions for AI agents
- `docs/prd/README.md` — PRD index with per-PRD completion percentage
- `docs/design/README.md` — design doc index with decision status
- `docs/guides/README.md` — guides index
- `docs/reference/README.md` — reference doc index

### 2d. Create reference docs

- `docs/reference/config-schema.md` — extract from `src/config.ts` and `package.json`
- `docs/reference/mcp-tools.md` — extract from `src/mcpServer.ts` tool definitions
- `docs/reference/commands-and-shortcuts.md` — extract from `package.json` contributes.commands

---

## Part 3: Automation for Doc Maintenance

### 3a. Commands

- `.cursor/commands/update-docs.md` — slash command that instructs the agent to: read changed src/ files, identify doc impacts, update affected docs, regenerate reference docs
- `.cursor/commands/doc-review.md` — slash command that runs a staleness check: scan docs/ for references to files/symbols that no longer exist

### 3b. Skills

- `.cursor/skills/doc-writer/SKILL.md` — instructions for writing docs in this repo's style: concise, no filler, README.md at every dir, reference docs auto-generated from source
- `.cursor/skills/doc-reviewer/SKILL.md` — instructions for reviewing docs: check staleness, verify cross-references, flag AI slop patterns

### 3c. Rules

- `.cursor/rules/doc-maintenance.mdc` — always-applied rule: when editing src/ files that change public API, module exports, config schema, or MCP tools, update the corresponding reference doc

### 3d. Hooks

- Add a `stop` hook entry that reminds the agent to check if docs need updating after code changes (lightweight, advisory — not blocking)

### 3e. AGENTS.md files

- `docs/AGENTS.md` — top-level agent routing file
- Consider `src/AGENTS.md` — brief note on module inventory and test expectations
