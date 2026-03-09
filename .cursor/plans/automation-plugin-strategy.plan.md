---
planId: automation-plugin-strategy
planType: task
parentPlanId: cursor-drive-v1
childPlanIds: []
dependsOn: []
name: Automation and Plugin Strategy
overview: Identify work streams to automate via Cursor subagents, skills, and hooks, and package reusable components as Cursor plugins. The codebase already has strong foundations (hooks, skills, commands); the plan focuses on filling gaps and extracting distributable plugins.
todos:
  - id: subagents
    content: Create plan-orchestrator, verifier, plan-governor subagents in .cursor/agents/
    status: pending
  - id: reconciliation-generator
    content: Add reconciliation-generator skill for plan completion
    status: pending
  - id: plugin-manifest
    content: Complete cursor-drive plugin.json with rules, skills, commands, hooks paths
    status: pending
  - id: extract-plan-governance
    content: Extract plan-governance plugin (standalone repo or subfolder)
    status: pending
  - id: extract-doc-maintenance
    content: Extract doc-maintenance plugin if doc patterns are generic enough
    status: pending
isProject: false
---

# Automation and Plugin Strategy

## Current State


| Component | Location                                                   | Status                                                                      |
| --------- | ---------------------------------------------------------- | --------------------------------------------------------------------------- |
| Hooks     | `[.cursor/hooks.json](.cursor/hooks.json)`                 | 4 events: beforeSubmitPrompt, sessionStart, stop, subagentStop              |
| Skills    | `.cursor/skills/`                                          | 4 skills: drive-persona, plan-system-maintainer, doc-reviewer, doc-writer   |
| Commands  | `.cursor/commands/`                                        | 12 commands (plan-*, doc-*, tangent, switch, merge, execute-plans, handoff) |
| Rules     | `.cursor/rules/`                                           | 8 rules (vision, tiered routing, hh-policy, plan-governance, etc.)          |
| Subagents | `.cursor/agents/`                                          | **Empty** — no custom subagents defined                                     |
| Plugin    | `[.cursor-plugin/plugin.json](.cursor-plugin/plugin.json)` | Minimal manifest; no rules/skills/hooks/commands referenced                 |


---

## 1. Subagent Opportunities (`.cursor/agents/`)

Cursor subagents run in isolated context, ideal for long-running or specialized tasks. Create these:

### 1.1 Plan Orchestrator (high value)

**Purpose**: Automate the `/execute-plans` workflow. Currently the command is a markdown checklist; an agent can execute it.

**File**: `.cursor/agents/plan-orchestrator.md`

```markdown
---
name: plan-orchestrator
description: Execute multi-phase plan batches. Use when user says "run all plans", "execute phase 1", or invokes /execute-plans.
model: inherit
---

You orchestrate Cursor Drive plan execution. Read .cursor/commands/execute-plans.md for phase order, spawn patterns, and completion gates.

When invoked:
1. Validate Phase 1 deps
2. Spawn plan agents per phase (mcp_task, subagent_type: generalPurpose)
3. Run `python3 .cursor/hooks/plan-runner.py sync-all` after each phase
4. Enforce completion gate (Reconciliation, npm test, npm run compile) on final plan

Use todo tasks. Spawn plan agents with the Plan Agent Prompt Template from execute-plans.md.
```

**Invocation**: `/plan-orchestrator` or "run all plans"

### 1.2 Verifier (Cursor docs pattern)

**Purpose**: Independently validate completed work — catches "marked done but broken" cases.

**File**: `.cursor/agents/verifier.md`

```markdown
---
name: verifier
description: Validates completed work. Use after tasks are marked done to confirm implementations are functional.
model: fast
---

You are a skeptical validator. When invoked:
1. Identify what was claimed completed
2. Check implementation exists and is functional
3. Run relevant tests or verification steps
4. Report: verified/passed vs incomplete/broken
```

**Invocation**: `/verifier confirm the auth flow is complete`

### 1.3 Plan Governor (Alternative D revised)

**Purpose**: On-demand plan sync + dep audit. Hooks cannot spawn subagents; this is explicitly invoked.

**File**: `.cursor/agents/plan-governor.md`

```markdown
---
name: plan-governor
description: Plan lifecycle specialist. Use when plans changed, /plan-sync needed, or dep audit required.
model: fast
---

When invoked:
1. Run `python3 .cursor/hooks/plan-runner.py sync-all`
2. Check for gate errors (Reconciliation missing, test/compile failures)
3. If structural diff detected, run dep-auditor triage
4. Report: sync status, gate errors, suggested dep changes
```

**Invocation**: `/plan-governor` or "sync plans and check deps"

---

## 2. Skill Enhancements

### 2.1 Reconciliation Generator (new skill)

**Purpose**: Generate `## Reconciliation` section from plan TODOs — automates a manual step in plan completion.

**File**: `.cursor/skills/reconciliation-generator/SKILL.md`

- Input: plan file path
- Output: Markdown Reconciliation section (what was verified, residual risks, evidence)
- Use when: Plan has all TODOs completed but missing Reconciliation

### 2.2 Doc Sync Skill (enhance doc-writer)

**Purpose**: Map `src/` changes to affected docs per [update-docs.md](.cursor/commands/update-docs.md) table. Could add `disable-model-invocation: true` and explicit `/doc-sync` invocation for deterministic flows.

---

## 3. Hook Enhancements

### 3.1 afterFileEdit for plan files (optional)

Cursor hooks do **not** support matchers for `afterFileEdit` — it fires for all edits. Adding plan-sync on every edit would be noisy.

**Recommendation**: Keep current `stop`/`subagentStop` triggers. If needed later, a **prompt-based** rule could say: "After editing a `.plan.md` file, run `/plan-sync` before continuing."

### 3.2 subagentStart matcher for plan-orchestrator

If plan-orchestrator spawns subagents, `subagentStart` hook could validate. Current `subagentStart` is not registered; `plan-runner` only handles stop/subagentStop. No change needed unless governance requires it.

### 3.3 beforeReadFile for sensitive paths (future)

Could block reads of `.cursor/plans/.orchestrator-state.json` or other internal state from general context. Low priority.

---

## 4. Plugin Packaging

### 4.1 Complete cursor-drive plugin manifest

The existing `[.cursor-plugin/plugin.json](.cursor-plugin/plugin.json)` has no `rules`, `skills`, `commands`, or `hooks`. Add:

```json
{
  "name": "cursor-drive",
  "rules": "rules/",
  "skills": "skills/",
  "commands": "commands/",
  "hooks": "hooks/hooks.json"
}
```

Plugin structure requires components to live under plugin root. Current layout has `.cursor/` at project root. Per [Building Plugins](https://cursor.com/docs/plugins/building), either:

- **Option A**: Move/copy rules, skills, commands, hooks into `.cursor-plugin/` subdirs (e.g. `.cursor-plugin/rules/`, `.cursor-plugin/skills/`) and reference in manifest
- **Option B**: Use manifest paths that point to `.cursor/` — plugin parser may not support parent paths

**Recommendation**: Create `.cursor-plugin/rules/`, `skills/`, `commands/`, `hooks/` with symlinks or copies. Or document that cursor-drive is a "meta-plugin" (extension + Cursor config) and the plugin manifest is for distribution of the Cursor-specific parts only.

### 4.2 Standalone Plan Governance Plugin (extract)

**Value**: Reusable across projects. No Drive extension dependency.


| Component                    | Source              | Plugin path                      |
| ---------------------------- | ------------------- | -------------------------------- |
| plan-runner.py               | `.cursor/hooks/`    | `hooks/plan-runner.py`           |
| dep-auditor.py               | `.cursor/hooks/`    | `hooks/dep-auditor.py`           |
| plan-* commands              | `.cursor/commands/` | `commands/`                      |
| plan-system-maintainer skill | `.cursor/skills/`   | `skills/plan-system-maintainer/` |
| plan-governance rule         | `.cursor/rules/`    | `rules/plan-governance.mdc`      |
| plan-orchestrator agent      | (new)               | `agents/plan-orchestrator.md`    |
| plan-governor agent          | (new)               | `agents/plan-governor.md`        |


**Dependencies**: Python 3, PyYAML. Optional: ANTHROPIC_API_KEY for dep-auditor Tier 1.

**Manifest** (`.cursor-plugin/plugin.json`):

```json
{
  "name": "plan-governance",
  "description": "Plan lifecycle, registry sync, dependency audit, and orchestration",
  "hooks": "hooks/hooks.json",
  "commands": "commands/",
  "skills": "skills/",
  "agents": "agents/",
  "rules": "rules/"
}
```

### 4.3 Doc Maintenance Plugin (extract)


| Component            | Source              | Plugin path                 |
| -------------------- | ------------------- | --------------------------- |
| doc-reviewer skill   | `.cursor/skills/`   | `skills/doc-reviewer/`      |
| doc-writer skill     | `.cursor/skills/`   | `skills/doc-writer/`        |
| doc-review command   | `.cursor/commands/` | `commands/doc-review.md`    |
| update-docs command  | `.cursor/commands/` | `commands/update-docs.md`   |
| doc-maintenance rule | `.cursor/rules/`    | `rules/doc-maintenance.mdc` |


**Value**: Reusable doc sync and quality patterns. Config mapping (src → docs) would need to be parameterized or convention-based.

---

## 5. Work Stream → Automation Map


| Work stream                  | Current                  | Automation                                                       | Component       |
| ---------------------------- | ------------------------ | ---------------------------------------------------------------- | --------------- |
| Plan sync after edit         | Manual `/plan-sync`      | Keep stop/subagentStop; add plan-governor subagent for on-demand | Hook + subagent |
| Plan execution (phases)      | Manual mcp_task spawning | plan-orchestrator subagent                                       | Subagent        |
| Doc review                   | `/doc-review` command    | doc-reviewer skill (already exists)                              | Skill           |
| Doc update after code change | `/update-docs` command   | Rule: "After editing src/, run /update-docs"                     | Rule            |
| Dep audit on plan change     | `/plan-audit-deps`       | plan-governor subagent                                           | Subagent        |
| Reconciliation generation    | Manual write             | reconciliation-generator skill                                   | Skill           |
| Verify completed work        | None                     | verifier subagent                                                | Subagent        |
| Browser dev                  | Scripts                  | Out of scope (VS Code launch config)                             | —               |


---

## 6. Implementation Order

1. **Subagents** — Create plan-orchestrator, verifier, plan-governor (highest leverage)
2. **reconciliation-generator skill** — Small, high-value for plan completion
3. **Plugin manifest** — Complete cursor-drive plugin.json with component paths
4. **Extract plan-governance plugin** — Standalone repo or subfolder
5. **Extract doc-maintenance plugin** — If doc patterns are generic enough

---

## 7. Constraints and Notes

- **Hooks cannot spawn subagents** — Use explicit invocation (`/plan-governor`) or agent discipline (rule: "run X when Y")
- **afterFileEdit has no matcher** — Plan-sync on every edit is too noisy; stick with stop/subagentStop
- **Drive-specific** — drive-preprocessor, drive-persona, tangent/switch/merge stay in main project; not plugin candidates
- **Tiered routing** — dep-auditor uses Tier 1 (Haiku); plan-runner is Tier 0 (no model)
