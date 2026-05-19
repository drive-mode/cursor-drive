---
name: Optimal Execution Todos
overview: Add a structured todos section to OPTIMAL_EXECUTION_ORDER.md that explicitly instructs use of foreground and background subagents (via mcp_task) for implementing the optimal plan execution order.
todos: []
isProject: false
---

# Optimal Execution Order — Subagent Todos

## Goal

Add a new section to [`.cursor/plans/OPTIMAL_EXECUTION_ORDER.md`](.cursor/plans/OPTIMAL_EXECUTION_ORDER.md) with implementation todos that **explicitly mention** foreground vs background subagent usage, aligned with the existing Phase 0–4 structure and the Subagent Execution Playbook (Section 9).

---

## Approach

Insert **Section 10: Implementation Todos** after Section 9 (Subagent Execution Playbook). Todos will:

- Use explicit phrasing: "Use **foreground subagent**" or "Use **background subagent**"
- Reference `mcp_task` with `run_in_background: true` for background work
- Preserve phase gates and dependency order
- Be actionable for an orchestrating agent

---

## Proposed Todos Structure

### Phase 0 — Foundation (parallel)

| Todo ID | Content | Subagent type |
|---------|---------|---------------|
| `opt-0-fg-1` | Use **foreground subagent** to run terminology-sas-overhaul (blocks agent-screen, tangent, s-as) | Foreground |
| `opt-0-fg-2` | Use **foreground subagent** to run mcp-apps-implementation (blocks agent-screen Phase 3B) | Foreground |
| `opt-0-fg-3` | Use **foreground subagent** to run drive-mode-full-build (blocks tangent) | Foreground |
| `opt-0-fg-4` | Use **foreground subagent** to run cursor-drive-implementation (blocks optimizer, using-cursor-drive) | Foreground |
| `opt-0-fg-5` | Use **foreground subagent** to run push-repo-and-develop-branch (blocks pr-merge) | Foreground |
| `opt-0-bg-1` | Use **background subagent** (`mcp_task` with `run_in_background: true`) to run repo-health-and-cleanup | Background |
| `opt-0-bg-2` | Use **background subagent** (`mcp_task` with `run_in_background: true`) to run plan-governance (child: plans-audit-and-cleanup) | Background |
| `opt-0-bg-3` | Use **background subagent** (`mcp_task` with `run_in_background: true`) to run voice-wake-word (child: voice-features) | Background |
| `opt-0-bg-4` | Use **background subagent** (`mcp_task` with `run_in_background: true`) to run orchestration (child: orchestration-and-hooks) | Background |
| `opt-0-bg-5` | Use **background subagent** (`mcp_task` with `run_in_background: true`) to run adr-prd-audit-and-graph | Background |
| `opt-0-bg-6` | Use **background subagent** (`mcp_task` with `run_in_background: true`) to run readme-redesign | Background |
| `opt-0-bg-7` | Use **background subagent** (`mcp_task` with `run_in_background: true`) to run cloudflare-setup-phases | Background |
| `opt-0-bg-8` | Use **background subagent** (`mcp_task` with `run_in_background: true`) to run remove-github-push-code | Background |
| `opt-0-bg-9` | Use **background subagent** (`mcp_task` with `run_in_background: true`) to run security-review-structure | Background |
| `opt-0-bg-10` | Use **background subagent** (`mcp_task` with `run_in_background: true`) to run automation-plugin-strategy | Background |
| `opt-0-bg-11` | Use **background subagent** (`mcp_task` with `run_in_background: true`) to run agent-skills-review | Background |
| `opt-0-bg-12` | Use **background subagent** (`mcp_task` with `run_in_background: true`) to run extension-reinstall-automation | Background |
| `opt-0-bg-13` | Use **background subagent** (`mcp_task` with `run_in_background: true`) to run cursor-primitives-complete-bootstrap | Background |
| `opt-0-bg-14` | Use **background subagent** (`mcp_task` with `run_in_background: true`) to run chat-memory-proceed | Background |

**Gate:** All Phase 0 plans complete before Phase 1.

---

### Phase 1 — After terminology + mcp-apps

| Todo ID | Content | Subagent type |
|---------|---------|---------------|
| `opt-1-fg-1` | Use **foreground subagent** to run agent-screen-implementation (after terminology, mcp-apps; unblocks s-as) | Foreground |
| `opt-1-fg-2` | Use **foreground subagent** to run s-as-execution-command-discovery (after agent-screen; avoids agentScreen.ts conflict) | Foreground |

---

### Phase 2 — After drive-mode-full-build

| Todo ID | Content | Subagent type |
|---------|---------|---------------|
| `opt-2-fg-1` | Use **foreground subagent** to run tangent-agent-ux-features (after drive-mode; uses approvalGates, glossaryExpander) | Foreground |

---

### Phase 3 — After cursor-drive-implementation

| Todo ID | Content | Subagent type |
|---------|---------|---------------|
| `opt-3-fg-1` | Use **foreground subagent** to run cursor-drive-automation-optimizer (after cursor-drive-implementation) | Foreground |
| `opt-3-fg-2` | Use **foreground subagent** to run using-cursor-drive (docs/guide; after cursor-drive-implementation) | Foreground |

---

### Phase 4 — After push-repo-and-develop-branch

| Todo ID | Content | Subagent type |
|---------|---------|---------------|
| `opt-4-fg-1` | Use **foreground subagent** to run pr-merge-workflow-primitives (after push-repo; develop branch must exist) | Foreground |

---

## Implementation

1. Add **Section 10: Implementation Todos** to [`.cursor/plans/OPTIMAL_EXECUTION_ORDER.md`](.cursor/plans/OPTIMAL_EXECUTION_ORDER.md) after line 266.
2. Include:
   - A short intro: "Orchestrating agent: use these todos to spawn subagents per phase. Foreground = user waits; background = `mcp_task` with `run_in_background: true`."
   - The tables above (or equivalent markdown list format).
   - Optional: Cursor frontmatter-style `todos:` block if this file is ever promoted to a `.plan.md` (not required for a reference doc).

3. Keep the existing Section 9 (Subagent Execution Playbook) unchanged — it remains the narrative; Section 10 is the actionable checklist.

---

## Notes

- **Foreground** = `mcp_task` without `run_in_background`, or explicit sequential execution; user sees progress.
- **Background** = `mcp_task` with `run_in_background: true`; runs in parallel, no user wait.
- Phase 0 foreground items (terminology, mcp-apps, drive-mode, cursor-impl, push-repo) can be run in parallel with each other and with background items, but they block downstream phases.
- The `agentScreen.ts` conflict (agent-screen vs s-as) is resolved by running agent-screen first, then s-as (Strategy A).
