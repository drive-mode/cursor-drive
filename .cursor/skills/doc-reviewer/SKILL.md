---
name: doc-reviewer
description: Use when reviewing documentation for accuracy, staleness, and quality. Review protocol, file inventory, anti-patterns.
---

# SKILL: doc-reviewer

Use this skill when reviewing documentation for accuracy, staleness, and quality.

## When to use

- User runs `/doc-review`
- You've completed a feature and want to verify docs are current
- Preparing a PR — ensure docs reflect the code

## Trigger

Read this skill when:
- User asks to "review", "check", or "audit" the docs
- User mentions "stale", "outdated", or "wrong docs"

---

## Review protocol

### Step 1: Build a file inventory

```
docs/
├── README.md           — master index
├── AGENTS.md           — agent routing
├── architecture/       — ADRs, system design
├── design/             — rationale docs
├── guides/             — how-to docs
├── prd/                — product requirements
├── reference/          — generated from source
├── prompts/            — prompt templates
└── research/           — background reading
```

### Step 2: Check each category

**Reference docs** (highest priority — most likely to drift):
- `reference/config-schema.md`: Read `src/config.ts`. Every field in `DriveConfig` must appear in the doc. Flag missing entries.
- `reference/mcp-tools.md`: Read `src/mcpServer.ts`. Every `this.mcpServer.tool(...)` call must appear. Flag missing tools.
- `reference/commands-and-shortcuts.md`: Read `package.json`. Every `contributes.commands` entry must appear. Flag missing commands.

**Design docs** (check for stale references):
- Design docs now live in subfolders: `design/architecture/`, `design/ux/`, `design/ai/`, `design/naming/`, `design/automation/`
- Search for old flat paths like `design/cursor-native-system-design.md` — these should now be `design/architecture/cursor-native-system-design.md`
- Search for: `src/hh/`, `agents/drive.md` (deleted), `extension/src/` (old path), `participant.ts` (removed)
- Search for: Python backend references, Discord references, `hh-core` references

**Guides** (check for accuracy):
- `guides/getting-started.md`: verify setup steps still work
- `guides/live-testing.md`: verify MCP endpoint, port, commands still match
- `guides/handoff.md`: verify module list matches actual `src/` files

**Architecture** (usually stable):
- ADRs start at ADR-0001 (not ADR-0006). Any reference to ADR-0006..0009 is stale.
- `architecture/README.md`: check component map matches current code

### Step 3: Classify issues

```
CRITICAL  — Doc says something that is factually wrong (wrong config key, deleted file path)
STALE     — Doc references something that no longer exists (module, command, setting)
MISSING   — Source has something not documented (new config key, new command)
SLOP      — Filler language, redundant sentences, AI-generated verbosity
MINOR     — Formatting inconsistency, broken link
```

### Step 4: Report

Output issues grouped by severity:

```
CRITICAL (fix now):
  docs/reference/config-schema.md: cursorDrive.tts.backend default is "webSpeech" but doc says "os"

STALE (fix soon):
  docs/design/architecture/cursor-drive-walkthrough.md:45: references participant.ts (removed)

MISSING (add to docs):
  src/config.ts: cursorDrive.blame.enabled not in config-schema.md

SLOP (optional cleanup):
  docs/prd/prd-voice-io.md:45: "It is important to note that..."
```

### Step 5: Fix

For each issue the user approves:
1. Read the affected file
2. Make the minimal edit to fix the issue
3. Verify the fix is accurate against the source

---

## Anti-patterns to flag

| Pattern | Location to check |
|---|---|
| "hh", "hh-core", "hh system" | Any doc — this was the old project name |
| `src/hh/` paths | Design docs, architecture docs |
| `extension/src/` prefix | Old path; now just `src/` |
| `participant.ts` | Removed module; don't reference |
| `agents/drive.md` | Moved to `.cursor/skills/drive-persona/SKILL.md` |
| `commands/`, `rules/` root dirs | Moved to `.cursor/commands/`, `.cursor/rules/` |
| Discord, voice gateway | Not part of this project |
| `ADR-0006`, `ADR-0007`, `ADR-0008`, `ADR-0009` | Renumbered to ADR-0001..0004 |
| `docs/design/cursor-native-system-design.md` | Moved to `docs/design/architecture/` |
| `docs/design/cursor-drive-walkthrough.md` | Moved to `docs/design/architecture/` |
| `docs/design/drive-mode-*.md` | Moved to `docs/design/ux/` |
| `docs/design/prompt-optimizer-design.md` | Moved to `docs/design/ai/` |
| `docs/design/model-cost-tiers.md` | Moved to `docs/design/ai/` |
| `docs/design/cursor-aligned-naming.md` | Moved to `docs/design/naming/` |
| `docs/design/plan-lifecycle-automation/` | Moved to `docs/design/automation/plan-lifecycle-automation/` |
