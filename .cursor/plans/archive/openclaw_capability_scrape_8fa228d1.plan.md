---
name: OpenClaw Capability Scrape
overview: A gap analysis of OpenClaw's infrastructure vs Drive's existing codebase, with a prioritized list of capabilities to adopt (patterns only, no OpenClaw dependency) to make Drive mode a complete multi-operator pair-programming system for Cursor.
todos:
  - id: depth-tool-policy
    content: "Per-operator tool policy with depth-based restriction: operators spawned by other operators get restricted preset; cascade dismiss on parent dismiss. Modify toolAllowlist.ts + operatorRegistry.ts."
    status: completed
  - id: operator-memory-isolation
    content: "Per-operator memory isolation in sessionMemory.ts: forOperator(id) method that filters entries by operator; respect visibility setting (isolated/shared/collaborative)."
    status: completed
  - id: session-compaction
    content: "Session compaction: when entries exceed budget, summarize oldest N into a single context-summary entry. Add pre-compaction step that extracts key decisions. Prune old tool results."
    status: completed
  - id: pipeline-checkpoints
    content: "Pipeline approval checkpoints: a stage can emit checkpoint to pause and wait for user confirmation. Useful for destructive ops and multi-file changes."
    status: completed
  - id: layered-policy-cascade
    content: "Layered tool policy cascade: operator preset > parent operator restriction > global default. deny always wins."
    status: completed
  - id: subagent-context-reduction
    content: "Sub-agent context reduction: update drive-persona SKILL.md to instruct operators to use minimal context when spawning subagents (task + files only, no full persona)."
    status: completed
  - id: skill-gating
    content: "Skill gating: add optional requires section to SKILL.md frontmatter (bins, env, os checks); skip unmatched skills at activation."
    status: completed
  - id: persistent-memory
    content: "Persistent Markdown memory (deferred): workspace memory/ folder with daily logs and curated MEMORY.md; keyword search."
    status: completed
isProject: false
---

# OpenClaw Capability Scrape: What Drive Needs

## Context

OpenClaw is a full personal AI stack (gateway, channels, voice, agents, memory, skills, workflows, sandboxing). Drive mode is a Cursor extension for multi-operator pair-programming. After deep research on both codebases, the goal is to identify which OpenClaw capabilities fill real gaps in Drive and should be adopted as **patterns** (no OpenClaw dependency).

Drive is ~70% complete on core operator infrastructure, ~40% on orchestration, ~60% on safety, ~20% on advanced features.

---

## Gap Analysis: OpenClaw Has, Drive Doesn't

### Tier 1 — High value, directly maps to Drive needs

- **Sub-agent orchestration with depth-based tool policy**
  - OpenClaw: orchestrator (depth-1) spawns leaf workers (depth-2); workers get restricted tools (no further spawning). Cascade stop kills all children.
  - Drive has: `operatorRegistry.spawn()` and `delegate()` but **all operators get the same tool access**. No depth-based restriction. No cascade stop.
  - **What to build:** Per-operator tool policy (operators spawned by other operators get a restricted preset). Cascade dismiss when parent operator is dismissed. This is the most impactful gap.
- **Session compaction and pre-compaction memory flush**
  - OpenClaw: when context window is near-full, older messages are summarized into a compact entry. Before compaction, a silent agentic turn reminds the model to persist important state. Also: in-memory pruning of old tool results.
  - Drive has: `sessionMemory.ts` with `maxEntries: 50` and `tokenBudget: 500` — simple cap, no summarization, no compaction, no flush.
  - **What to build:** Compaction logic in `sessionMemory.ts`: when entries exceed budget, summarize oldest N into a single "context summary" entry. Add a pre-compaction step that extracts key decisions/state before discarding. Prune old tool call results from entries.
- **Per-operator memory isolation**
  - OpenClaw: each agent has its own session store, memory files, and workspace.
  - Drive has: shared `SessionMemory` with optional `agent` field on entries but **no isolation or filtering by operator**.
  - **What to build:** `SessionMemory.forOperator(operatorId)` that filters entries and builds context only for that operator. When `visibility: "isolated"`, operators see only their own entries. When `visibility: "shared"`, they see all. When `visibility: "collaborative"`, they see all + other operators' decisions.
- **Layered tool policy cascade**
  - OpenClaw: 8-level cascade (subagent → sandbox → agent-provider → agent → global-provider → global → provider-profile → tool-profile). `deny` always wins; no level can grant back.
  - Drive has: `toolAllowlist.ts` with 3 presets (readonly/standard/full) and per-agent overrides. Simple but flat.
  - **What to build:** Add `operatorRegistry` integration to `toolAllowlist.ts`: operator permission preset from registry takes priority; parent operator can further restrict children. Keep the existing presets but wire them to operators not just "agent names."

### Tier 2 — Medium value, worth adopting the pattern

- **Persistent Markdown memory with hybrid search**
  - OpenClaw: `MEMORY.md` (curated) + `memory/YYYY-MM-DD.md` (daily log) + vector/BM25 hybrid search with temporal decay.
  - Drive has: in-memory `SessionMemory` persisted to `workspaceState` (VS Code Memento). No file-based persistence. No search.
  - **What to build (later):** A `memory/` folder in the workspace with Markdown files. Drive writes decisions and key context to daily logs. For search, start with simple keyword matching (BM25-lite); defer vector indexing. The two-layer model (curated + daily) is the key pattern.
- **Skill gating and hot-reload**
  - OpenClaw: `metadata.openclaw.requires` in SKILL.md frontmatter (bin checks, env checks, OS filters). Skills auto-refresh on file change.
  - Drive has: `.cursor/skills/` with SKILL.md but **no gating or hot-reload**.
  - **What to build:** Add optional `requires` section to Drive's SKILL.md frontmatter. When the extension activates (or plugin installs), check `requires.bins`, `requires.env`, `requires.os` and skip skills that don't match. Cursor already watches `.cursor/` files, so hot-reload may come for free.
- **Structured pipeline with approval checkpoints (Lobster-inspired)**
  - OpenClaw: Lobster provides deterministic pipelines with `approve` steps that pause and resume with tokens.
  - Drive has: `pipeline.ts` with a fixed 11-stage pipeline and `approvalGates.ts` for regex-based warn/block.
  - **What to build:** Add checkpoint support to the pipeline: a step can emit `{ checkpoint: true, reason: "..." }` to pause and wait for user confirmation before continuing. Useful for multi-file changes, destructive operations, or operator delegation approval. No need for a full workflow runtime — just add checkpoints to the existing pipeline.
- **Sub-agent context reduction**
  - OpenClaw: sub-agents get `minimal` prompt mode (only `AGENTS.md` + `TOOLS.md`, no skills, no memory recall, no identity).
  - Drive has: all operators get the same system context via `beforeSubmitPrompt`.
  - **What to build:** When an operator spawns a subagent (Cursor Task tool), the context injected should be minimal: just the task description + relevant files. The Drive persona and full skill set should be omitted. This is mostly a skill/rule change, not code — update `.cursor/skills/drive-persona/SKILL.md` to instruct operators to use minimal context when spawning subagents.

### Tier 3 — Low priority, nice-to-have

- **ClawHub-style skill registry:** Not needed now; Drive's skills are workspace-local and installed via `pluginInstaller`.
- **Agent workspace files (SOUL.md, IDENTITY.md, etc.):** Drive's `.cursor/skills/drive-persona/SKILL.md` already serves this purpose. Could formalize later.
- **LLM Task (structured sub-call):** Drive's `modelSelector.ts` with Tier 1 already does cheap classification. Could add JSON Schema validation on output later.
- **Channels (WhatsApp, Telegram, etc.):** External OpenClaw responsibility. Not in Drive.
- **Voice Wake / Talk Mode:** External OpenClaw or future; Cursor provides mic input.

---

## What We Do NOT Take From OpenClaw


| Capability                     | Reason to skip                                                  |
| ------------------------------ | --------------------------------------------------------------- |
| Gateway daemon                 | Drive has MCP server on :7891; no need for second daemon        |
| Channel adapters               | External OpenClaw or not needed                                 |
| Model provider config          | Cursor subscription is the LLM; no API key management           |
| Docker sandboxing              | VS Code extension host is the sandbox; Cursor manages execution |
| WebSocket protocol             | MCP + HTTP is sufficient for Drive                              |
| Full Lobster runtime           | Too heavy; checkpoint pattern in pipeline is sufficient         |
| Vector embeddings / sqlite-vec | Too heavy for extension; defer to later or external             |


---

## Implementation Priority

Ordered by impact on making Drive a better multi-operator pair-programming system:

1. **Per-operator tool policy with depth restriction** — `toolAllowlist.ts` + `operatorRegistry.ts`
2. **Per-operator memory isolation** — `sessionMemory.ts`
3. **Session compaction with pre-compaction flush** — `sessionMemory.ts`
4. **Pipeline checkpoints (approval pause/resume)** — `pipeline.ts`
5. **Layered tool policy cascade** — `toolAllowlist.ts`
6. **Sub-agent context reduction** — `.cursor/skills/drive-persona/SKILL.md`
7. **Skill gating (requires)** — `pluginInstaller.ts` or activation-time check
8. **Persistent Markdown memory** — new module, deferred

---

## Reconciliation

### What was completed

| TODO | Outcome | Evidence |
|------|---------|----------|
| depth-tool-policy | Per-operator tool policy with depth-based restriction; cascade dismiss on parent | `operatorRegistry.ts` depth > 0 → readonly preset; `dismiss()` cascades to children; `toolAllowlist.ts` uses registry preset |
| operator-memory-isolation | Per-operator memory isolation with visibility filtering | `sessionMemory.ts` `forOperator(id, visibility)` with isolated/shared/collaborative |
| session-compaction | Compaction when entries exceed budget; pre-compaction decision extraction | `sessionMemory.ts` `compact()`, `compaction-summary` type, pre-compaction flush |
| pipeline-checkpoints | Stage can emit checkpoint to pause for user confirmation | `pipeline.ts` `requestCheckpoint()`, returns `{ ok: "checkpoint", reason }` |
| layered-policy-cascade | Operator preset > parent restriction > global; deny wins | `toolAllowlist.ts` `getEffectivePresetForOperator()`, name override can only restrict |
| subagent-context-reduction | Minimal context when spawning subagents | `.cursor/skills/drive-persona/SKILL.md` "Spawning Cursor subagents" section |
| skill-gating | Optional `requires` in SKILL.md frontmatter; skip unmatched skills | `pluginInstaller.ts` `parseSkillRequires`, `checkSkillRequires`, bins/env/os |
| persistent-memory | Skeleton module (deferred wiring) | `src/persistentMemory.ts` with `.drive/MEMORY.md` + daily logs, keyword search |

### What was verified

- `npm run compile`: pass
- `npm test`: 183/183 tests passing
- `sessionMemory.test.ts`: compaction and forOperator covered
- `pluginInstaller.test.ts`: requires parsing and skill gating covered
- `toolAllowlist.test.ts`: operator preset and depth cascade covered
- `pipeline.test.ts`: checkpoint flow covered

### Residual risks

- **Persistent memory not wired**: `persistentMemory.ts` is a skeleton; not called at activation or in pipeline. Deferred per plan.
- **Checkpoint UX**: `requestCheckpoint` shows modal; no MCP tool to trigger checkpoint from operator context — acceptable for Wave 1.

### Notes

- Persistent memory marked deferred in plan; skeleton exists for future wiring.
