---
name: Wire and Fix Drive
overview: Wire up the OpenClaw capability scrape to the extension activation and MCP layer (persistent memory, operator-scoped memory, permission checks, depth/parent info). Simultaneously fix all .cursor/ assets (skills, hooks, agents) to match Cursor docs and use current terminology.
todos:
  - id: a1-persistent-memory
    content: Initialize PersistentMemory in extension.ts, pass to MCP server, register 4 new MCP tools, integrate into pipeline context injection
    status: completed
  - id: a2-operator-mcp-depth
    content: Expose depth/parentId/preset in operator_spawn and operator_list MCP tools
    status: completed
  - id: a3-operator-scoped-pipeline
    content: Add operator_id param to drive_run_pipeline and POST /pipeline, use forOperator() for scoped memory
    status: completed
  - id: a4-permission-checks
    content: Add getActiveOperatorPermissions() utility; include effective preset in operator_list response
    status: completed
  - id: a5-cli-health
    content: Add cursorCli availability to /health endpoint with cached check
    status: completed
  - id: b1-fix-skill-frontmatter
    content: Add YAML frontmatter to doc-writer, doc-reviewer, plan-system-maintainer SKILL.md files
    status: completed
  - id: b2-fix-terminology
    content: Change agent_spawn to operator_spawn in drive-preprocessor.py and drive-persona SKILL.md
    status: completed
  - id: b3-new-agents
    content: Create .cursor/agents/drive-operator.md and drive-reviewer.md agent definitions
    status: completed
  - id: b4-update-vision
    content: Update vision-invariants.mdc invariant 1 to reflect voice-first multi-operator description
    status: completed
  - id: b5-hierarchy-rule
    content: Create .cursor/rules/operator-hierarchy.mdc for depth and permission rules
    status: completed
isProject: false
---

# Wire Up Integration Gaps and Fix .cursor/ Assets

## Part A: Wire Up OpenClaw Capability Scrape

The capability scrape added new modules (persistentMemory, operator-scoped memory, permission checks, skill gating, checkpoints) but most are not yet connected to the extension activation or MCP tools. This part wires them in.

### A1. Initialize PersistentMemory in extension activation

In [src/extension.ts](src/extension.ts), after creating `sessionMemory`:

- Instantiate `PersistentMemory` using first workspace folder
- Pass it to `DriveMcpServer` options
- Register 4 new MCP tools: `persistent_memory_append`, `persistent_memory_search`, `persistent_memory_write_curated`, `persistent_memory_context`
- In the pipeline context injection stage, prepend `persistentMemory.buildPromptContext()` output before session memory

### A2. Expose operator depth/parent/preset in MCP tools

In [src/mcpServer.ts](src/mcpServer.ts):

- Update `operator_spawn` tool: add optional `parent_id` and `preset` params. Pass them as `SpawnOptions` to `operatorRegistry.spawn()`
- Update `operator_list` response: include `depth`, `parentId`, `permissionPreset` in each operator object
- Update `operator_delegate` tool: ensure child inherits depth+1 and readonly preset (already works in registry, just expose in response)

### A3. Wire operator-scoped memory to pipeline

In [src/mcpServer.ts](src/mcpServer.ts) `drive_run_pipeline` tool and `POST /pipeline`:

- Add optional `operator_id` param
- When provided, look up operator in registry and use `sessionMemory.forOperator(operatorId, operator.visibility)` instead of `sessionMemory` directly
- This makes the pipeline context-aware per-operator

### A4. Add permission checks to MCP tool handlers

In [src/mcpServer.ts](src/mcpServer.ts):

- Import `checkPermissionForOperator` from `toolAllowlist`
- For tools that modify files or execute commands (future use), check permissions using the current foreground operator's context
- For now, add a utility function `getActiveOperatorPermissions()` that returns the effective preset for the foreground operator and include it in the `operator_list` response

### A5. Add cursor CLI availability to health endpoint

In [src/mcpServer.ts](src/mcpServer.ts) `/health` handler:

- Call `isCursorCliAvailable()` and include `cursorCli: true/false` in the health response
- Non-blocking: run check in background and cache result for 60s

---

## Part B: Fix .cursor/ Assets

### B1. Fix skills missing frontmatter (3 files)

Add proper YAML frontmatter to:

- [.cursor/skills/doc-writer/SKILL.md](.cursor/skills/doc-writer/SKILL.md): add `name: doc-writer`, `description: ...`
- [.cursor/skills/doc-reviewer/SKILL.md](.cursor/skills/doc-reviewer/SKILL.md): add `name: doc-reviewer`, `description: ...`
- [.cursor/skills/plan-system-maintainer/SKILL.md](.cursor/skills/plan-system-maintainer/SKILL.md): add `name: plan-system-maintainer`, `description: ...`

### B2. Fix deprecated terminology in hooks and skills

- [.cursor/hooks/drive-preprocessor.py](.cursor/hooks/drive-preprocessor.py) lines 118-119: change `agent_spawn` to `operator_spawn`
- [.cursor/skills/drive-persona/SKILL.md](.cursor/skills/drive-persona/SKILL.md) tangent handling section: change `agent_spawn` to `operator_spawn` (only in the tangent section call example; the rest already uses correct terminology)

### B3. Create new agent definitions for Drive operators

Create new `.cursor/agents/` definitions that align with Drive's operator concept. Currently agents are only plan-governance focused. Add:

- `.cursor/agents/drive-operator.md`: Agent definition for when a user spawns an operator via Drive. Frontmatter: `name: drive-operator`, `model: inherit`, `description: ...`. Body instructs: follow drive-persona skill, use operator-scoped tools, respect permission preset, report via agent_screen_activity.
- `.cursor/agents/drive-reviewer.md`: Specialized operator for code review tasks. Frontmatter: `name: drive-reviewer`, `model: inherit`, `description: ...`. Body instructs: readonly mode, no file edits, report findings via agent_screen_decision.

### B4. Update vision-invariants rule

[.cursor/rules/vision-invariants.mdc](.cursor/rules/vision-invariants.mdc): update invariant 1 to reflect the user's preferred description:

- Current: "Drive is a behavioral toggle/wrapper around Cursor native modes"
- Updated: "Drive is a voice-first, multi-operator pair-programming layer for Cursor. Users steer operators via voice and chat; operators share their work on the Agent Screen (S-AS) and can spawn agents and subagents."

### B5. Add new rule for operator depth and permissions

Create `.cursor/rules/operator-hierarchy.mdc`:

- `description: Operator hierarchy and permission rules`
- `alwaysApply: true`
- Content: operators spawned by other operators default to readonly; children cannot exceed parent preset; cascade dismiss kills all children; use `checkPermissionForOperator()` for operator-aware permission checks

---

## Verification

After all changes:

- `npm run compile` must pass
- `npm test` must pass (183+ tests)
- New MCP tools should be testable via `POST /mcp` or curl to health endpoint

---

## Reconciliation

### Verified

- **Compile**: `npm run compile` passes.
- **Tests**: 183 tests pass across 17 suites.
- **Part A (wire-up)**:
  - A1: PersistentMemory instantiated in extension, passed to MCP; 4 tools registered (`persistent_memory_append`, `persistent_memory_search`, `persistent_memory_write_curated`, `persistent_memory_context`); pipeline prepends `buildPromptContext()` before session memory.
  - A2: `operator_spawn` accepts `parent_id` and `preset`; `operator_list` and `operator_delegate` return `depth`, `parentId`, `permissionPreset`.
  - A3: `drive_run_pipeline` and `POST /pipeline` accept `operator_id`; use `sessionMemory.forOperator()` when operator found.
  - A4: `getActiveOperatorPermissions()` added; `operator_list` includes `effectivePreset` per operator and `foregroundEffectivePreset` when foreground exists.
  - A5: `/health` returns `cursorCli: true|false|undefined`; background check cached 60s.
- **Part B (assets)**:
  - B1: YAML frontmatter added to doc-writer, doc-reviewer, plan-system-maintainer SKILL.md.
  - B2: drive-preprocessor.py and drive-persona tangent section use `operator_spawn`.
  - B3: drive-operator.md and drive-reviewer.md created.
  - B4: vision-invariants.mdc invariant 1 updated to voice-first multi-operator description.
  - B5: operator-hierarchy.mdc created with depth, preset, cascade rules.

### Residual risks

- Persistent memory tools only registered when `persistentMemory` exists (workspace root required).
- First `/health` request may return `cursorCli: undefined` until background check completes.
- `checkPermissionForOperator` not yet invoked in MCP tool handlers for file/terminal tools (future use per plan).

### Evidence

- `src/extension.ts`: PersistentMemory import and instantiation.
- `src/mcpServer.ts`: persistentMemory in opts, 4 tools, operator_spawn/list/delegate updates, drive_run_pipeline operator_id, POST /pipeline operator_id, getActiveOperatorPermissions, health cursorCli.
- `src/pipeline.ts`: persistentMemory in DriveContext, prepend before session.
- `.cursor/skills/`*, `.cursor/hooks/drive-preprocessor.py`, `.cursor/agents/drive-*.md`, `.cursor/rules/vision-invariants.mdc`, `.cursor/rules/operator-hierarchy.mdc`: edits as specified.
