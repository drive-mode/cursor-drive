---
name: Docs Overhaul
overview: Restructure docs/ for AI discoverability, fix stale content, create index/routing files, generate reference docs from source, and set up commands/skills/rules for ongoing doc maintenance.
planType: task
planId: docs-overhaul
parentPlanId: cursor-drive
childPlanIds: []
dependsOn: []
todos:
  - id: restructure-dirs
    content: "Create docs/guides/ and docs/reference/ dirs. Move docs/dev/live-testing.md → docs/guides/live-testing.md. Move docs/handoff-prompt-new-chat.md → docs/guides/handoff.md."
    status: completed
  - id: fix-stale-docs
    content: "Fix cursor-drive-walkthrough.md (remove Python backend line ~123). Fix model-cost-tiers.md (remove hh/ExecutionPolicy section lines ~97-109). Update plan-governance-quickstart.md (hh-project → cursor-drive references). Update docs/guides/handoff.md to current module list."
    status: completed
  - id: create-index-files
    content: "Create docs/README.md (master index), docs/AGENTS.md (agent routing), docs/prd/README.md (PRD completion status), docs/design/README.md, docs/guides/README.md, docs/reference/README.md."
    status: completed
  - id: create-reference-docs
    content: "Create docs/reference/config-schema.md (from src/config.ts + package.json), docs/reference/mcp-tools.md (from src/mcpServer.ts), docs/reference/commands-and-shortcuts.md (from package.json)."
    status: completed
  - id: create-getting-started
    content: "Create docs/guides/getting-started.md: setup, first run, dev loop summary (complements live-testing.md which covers advanced testing)."
    status: completed
  - id: create-doc-commands
    content: "Create .cursor/commands/update-docs.md and .cursor/commands/doc-review.md."
    status: completed
  - id: create-doc-skills
    content: "Create .cursor/skills/doc-writer/SKILL.md and .cursor/skills/doc-reviewer/SKILL.md."
    status: completed
  - id: create-doc-rule-and-hook
    content: "Create .cursor/rules/doc-maintenance.mdc and add advisory stop hook entry for doc reminder."
    status: completed
  - id: cursor-cli-agent-entrypoint
    content: "Update Cursor CLI docs to reflect `cursor` entrypoint (incl. `serve-web`, `tunnel`, `agent` subcommand) and refresh examples."
    status: completed
isProject: false
---

# Docs Overhaul Plan

Restructure `docs/` for AI agent discoverability, eliminate stale content, generate reference docs from source, and build automation so docs stay current.

## Target directory structure

```
docs/
├── README.md                        # Master topic-to-file index
├── AGENTS.md                        # Intent-based routing for AI agents
├── architecture/
│   ├── README.md                    # (exists)
│   └── adr/                         # (exists: ADR-0001 through ADR-0004)
├── prd/
│   ├── README.md                    # NEW: PRD index with completion %
│   └── prd-*.md                     # (5 existing)
├── design/
│   ├── README.md                    # NEW: design doc index
│   ├── plan-lifecycle-automation/   # (exists)
│   └── *.md                         # (existing)
├── guides/
│   ├── README.md                    # NEW
│   ├── getting-started.md           # NEW
│   ├── live-testing.md              # MOVED from docs/dev/
│   └── handoff.md                   # MOVED from docs/handoff-prompt-new-chat.md
├── reference/
│   ├── README.md                    # NEW
│   ├── config-schema.md             # NEW: generated from src/config.ts
│   ├── mcp-tools.md                 # NEW: generated from src/mcpServer.ts
│   └── commands-and-shortcuts.md    # NEW: generated from package.json
├── prompts/                         # (exists)
└── research/                        # (exists)
```

## Staleness fixes (completed)

### cursor-drive-walkthrough.md
~~Line ~123 said: "The same logic runs in the Python backend (`src/hh/intent/mode_router.py`)"~~ — Fixed. The router is TS-only.

### model-cost-tiers.md
Lines ~97-109 reference `ExecutionPolicy` from a non-existent `hh` system.
Fix: Remove the "Relationship to hh execution policy" section.

### plan-governance-quickstart.md
References `hh-project_root.plan.md` and old plan IDs.
Fix: Update to reference `cursor-drive.plan.md` and current plan IDs.

### docs/guides/handoff.md (formerly handoff-prompt-new-chat.md)
References stale module list and mentions `agents/drive.md` (deleted), old paths.
Fix: Update Current State to match actual implemented modules.

## Design principles for new docs

- **Every directory has a README.md** — agents read these first to navigate
- **docs/AGENTS.md** — maps intent categories to subdirectories
- **No filler language** — every sentence must be actionable or informational
- **Reference docs are generated from source** — config-schema from config.ts, not hand-written
- **guides/ = how to do things; design/ = why things work this way; reference/ = lookup tables**

## Reconciliation

Updated Cursor CLI documentation to reflect `cursor` entrypoint (incl. `serve-web`, `tunnel`, `agent` subcommand) and refreshed examples. Verified: `npm run compile`, `npm test`.
