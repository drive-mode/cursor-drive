# Plan Cross-Dependencies Extraction

Extracted from 6 plans in `.cursor/plans/`. Parent: `cursor-drive-v1`.

---

## 1. agent-screen-implementation

| Field | Value |
|-------|-------|
| **planId** | `agent-screen-implementation` |
| **parentPlanId** | `cursor-drive-v1` |
| **childPlanIds** | `[]` |
| **explicit dependsOn** | `[]` |
| **state** | `in_progress` |

### Inferred dependencies
- **mcp-apps-implementation** — Phase 3B (3b-02, 3b-03) edits `src/agentScreenApp.ts` (file chip handler, `callServerTool`, `updateModelContext`). MCP Apps creates that file and registers the resource. Agent-screen extends it.
- **terminology-sas-overhaul** — Uses `cursorDrive.agentScreen.*` config keys terminology defines. Terminology is archived/completed; config likely already present.

### Files touched
- `src/agentScreen.ts` — queue, flush, replay, debug bridge, sync normalize, config, operator colors, high-contrast
- `src/extension.ts` — sendTestEvent, optional sync poll
- `src/mcpServer.ts` — postSyncStatus/postQueueStatus, agent_screen_clear/chime, cursor_drive_open_file
- `src/agentScreenApp.ts` — callServerTool, updateModelContext (Phase 3B)
- `src/syncTypes.ts` — referenced for SyncStatusSnapshot shape
- `package.json` — command entry
- `tests/agentScreen.test.ts` — queue, flush, cap, sync tab, command registration, data-testids

### Blocks (plans that depend on this one)
- None explicitly; `s-as-execution-command-discovery` Sub-agent A also edits `agentScreen.ts` — coordination needed.

### Todo ordering hints
- Phase 1A (1a-01..1a-08) → 1B → 1C
- Phase 2 (2a..2h) after 1
- Phase 3 (3a verification, 3b, 3c) after 2; 3b-02/3b-03 require `agentScreenApp.ts` from mcp-apps
- Phase 4 (4a..4d) after 3
- Tests (test-01..test-07) after implementation

---

## 2. drive-mode-full-build

| Field | Value |
|-------|-------|
| **planId** | `drive-mode-full-build` |
| **parentPlanId** | `cursor-drive-v1` |
| **childPlanIds** | `[]` |
| **explicit dependsOn** | `[]` |
| **state** | (not in frontmatter; plan-graph: `pending`) |

### Inferred dependencies
- **agent-screen-implementation** — `audio-feedback` todo: "Create audioFeedback.ts with WebView chime player (playChime 1=ON, 2=OFF)". Agent-screen registers `agent_screen_chime` and wires `AgentScreenPanel.playChime(count)`. Overlap: both need chime; agent-screen owns it in AgentScreenPanel. drive-mode may add a separate `audioFeedback.ts` or reuse.
- **None** — promptOptimizer, modelSelector, fillerCleaner already exist in `src/`; plan references `extension/` (path drift).

### Files touched
- `src/promptOptimizer.ts` — exists
- `src/modelSelector.ts` — exists
- `src/participant.ts` — wire optimizer + modelSelector (plan says `extension/src/participant.ts`; actual: `src/pipeline.ts` does this)
- `src/fillerCleaner.ts` — (plan: extension/src)
- `package.json` — config
- `docs/design/cursor-drive-walkthrough.md`
- `docs/design/prompt-optimizer-design.md`
- `docs/design/model-cost-tiers.md`
- `extension/README.md` — (path may be `README.md` or `docs/`)

### Blocks (plans that depend on this one)
- **tangent-agent-ux-features** — Uses `modelSelector` (Tier-1), `approvalGates`, `operatorRegistry`; drive-mode adds `approvalGates`, `glossaryExpander`. Tangent builds on these.

### Todo ordering hints
- Wave 0 (promptOptimizer, modelSelector, fillerCleaner, participant) — mostly done
- Wave 1 (docs) — parallel
- Wave 2 (publishing) — after Wave 1
- `mode-switching`, `optimizer-quickpick`, `glossary-expander`, `approval-gates` — feature order not specified

---

## 3. terminology-sas-overhaul

| Field | Value |
|-------|-------|
| **planId** | `terminology-sas-overhaul` |
| **parentPlanId** | `cursor-drive-v1` |
| **childPlanIds** | `[]` |
| **explicit dependsOn** | `[]` |
| **state** | plan-graph: archived `completed`; also a pending copy in `.cursor/plans/` |

### Inferred dependencies
- **cursor-docs-cleanup** — Plan says "coordinate with cursor-docs-cleanup" (both touch docs). cursor-docs-cleanup is archived.

### Inferred blocks
- **agent-screen-implementation** — Uses `cursorDrive.agentScreen.*` config (showPlanProgress, displayMode, clickBehavior). Terminology defines these.
- **tangent-agent-ux-features** — Uses `cursorDrive.operators.namePool`; terminology adds it.
- **s-as-execution-command-discovery** — References `cursorDrive.showAgentScreen`, `cursorDrive.focusAgentView`; terminology renames commands.

### Files touched
- `src/agentRegistry.ts` → `src/operatorRegistry.ts` (rename; codebase already has operatorRegistry)
- `src/shareScreen.ts` → `src/agentScreen.ts` (rename; codebase already has agentScreen)
- `src/mcpServer.ts` — tool renames + deprecated aliases
- `src/extension.ts` — imports, commands, UI strings
- `src/statusBar.ts`, `src/toolAllowlist.ts`, `src/sessionMemory.ts`, `src/glossaryExpander.ts`
- `package.json` — config schema
- `docs/*`, `.cursor/` skills, rules, plans

### Blocks (plans that depend on this one)
- agent-screen-implementation, tangent-agent-ux-features, s-as-execution-command-discovery (for config/command names)

### Todo ordering hints
- Phase 1 (ADR, config, commands) → Phase 2 (source rename) → Phase 3 (S-AS features) → Phase 4 (MCP migration) → Phase 5 (docs)

---

## 4. s-as-execution-command-discovery

| Field | Value |
|-------|-------|
| **planId** | `s-as-execution-command-discovery` |
| **parentPlanId** | `cursor-drive-v1` |
| **childPlanIds** | `[]` |
| **explicit dependsOn** | `[]` |

### References to other plans
- **s_as_screen_capture_impl** — Sub-agent A executes Phase 1 (p1-01..p1-11). Plan file: `.cursor/plans/s_as_screen_capture_impl.plan.md` (or archive).

### Inferred dependencies
- **agent-screen-implementation** — Sub-agent A extends `src/agentScreen.ts` (cliStream case, ActivityEvent). Agent-screen also heavily edits agentScreen.ts. **Conflict risk**: both modify `buildHtml()` and agentScreen. Recommend: complete one before the other, or coordinate merge.
- **terminology-sas-overhaul** — Sub-agent C uses `cursorDrive.showAgentScreen`, `cursorDrive.focusAgentView`; terminology renames these commands.

### Files touched
- **Sub-agent A**: `src/ndjsonParser.ts` (new), `src/cursorCliRunner.ts`, `src/agentScreen.ts`, `src/mcpServer.ts`, `tests/ndjsonParser.test.ts`, `tests/cursorCliRunner.test.ts`, `tests/mcpServer.test.ts`
- **Sub-agent B**: `src/apiDiscovery.ts`, `docs/reference/cursor-native-commands.md`, `.cursor/cursor-commands-full.json`
- **Sub-agent C**: `tests/browser/drive-ui-integration.spec.ts`, `docs/design/ux/drive-layout-integration.md`, `scripts/serve-web-dev.ps1`
- **Sub-agent D**: `docs/design/ux/extension-compatibility.md`

### Blocks (plans that depend on this one)
- None

### Todo ordering hints
- sas-01 (Sub-agent A) → sas-02 (B) → sas-03 (C) → sas-04 (D) — or parallel (A,B,C,D)
- Within A: p1-01 → p1-02 → … → p1-11 (strict order per plan)

---

## 5. tangent-agent-ux-features

| Field | Value |
|-------|-------|
| **planId** | `tangent-agent-ux-features` |
| **parentPlanId** | `cursor-drive-v1` |
| **childPlanIds** | `[]` |
| **explicit dependsOn** | `[]` |

### Inferred dependencies
- **terminology-sas-overhaul** — Uses `cursorDrive.operators.namePool`; terminology adds it. Also `cursorDrive.agents.tangentConfirmationTimeout` etc. (plan uses `agents` key; terminology renames to `operators` — config key alignment needed).
- **drive-mode-full-build** — Uses `modelSelector` (Tier-1), `approvalGates`, `glossaryExpander`. drive-mode adds approvalGates, glossaryExpander. Tangent's confirmation flow reuses `requestCheckpoint()` pattern from pipeline.

### Files touched
- `src/pipeline.ts` — tangent name extraction, confirmTangentAgent, clarification handling, transcript logging
- `src/operatorRegistry.ts` — wire namePool config
- `src/approvalGates.ts` — referenced
- `src/tts.ts` — SpokenContentTracker
- `src/sessionMemory.ts` — updateTurn
- `src/persistentMemory.ts` — wire, prune, MCP tool
- `src/mcpServer.ts` — operator_search_history
- `package.json` — new settings
- `src/tangentFlow.ts` — (or inline in pipeline)
- `src/clarificationHandler.ts` — (or inline)

### Blocks (plans that depend on this one)
- None

### Todo ordering hints
- tangent-name-extraction → confirmation-flow → clarification-handling → transcript-history (Features 1–4 can be parallelized if no shared state)

---

## 6. mcp-apps-implementation

| Field | Value |
|-------|-------|
| **planId** | `mcp-apps-implementation` |
| **parentPlanId** | `cursor-drive-v1` |
| **childPlanIds** | `[]` |
| **explicit dependsOn** | `[]` |
| **state** | `in_progress` |

### Inferred dependencies
- None (creates new modules, registers resource)

### Inferred blocks
- **agent-screen-implementation** — Phase 3B edits `src/agentScreenApp.ts` (callServerTool, updateModelContext). MCP Apps creates agentScreenApp.ts and registers `ui://cursor-drive/agent-screen`. Agent-screen extends it for file-open.

### Files touched
- `src/agentScreenApp.ts` — created (completed)
- `src/mcpServer.ts` — registerAppResource, augment tool results with _meta.ui
- `src/extension.ts` — getEnableApps
- `package.json` — ext-apps dep, cursorDrive.mcp.enableApps
- `tests/agentScreenApp.test.ts`, `tests/mcpServer.test.ts`
- `docs/research/drive-tech/mcp-apps/04_risks-and-mitigations.md` — referenced

### Blocks (plans that depend on this one)
- agent-screen-implementation (Phase 3B)

### Todo ordering hints
- add-ext-apps-dep, create-agentScreenApp — completed
- register-resource → augment-tool-results → wire-extension → add-tests → verify-test-flow

---

## Summary: Dependency DAG

```
                    cursor-drive-v1
                           |
    +--------+--------+----+----+--------+--------+
    |        |        |         |        |        |
    v        v        v         v        v        v
terminology  mcp-apps agent-screen drive-mode tangent s-as-execution
    |             |         ^            |        |         |
    |             +---------+            |        |         |
    |             (agent-screen          |        |         |
    |              extends agentScreenApp)        |         |
    |             |         |            |        |         |
    +-------------+---------+------------+--------+         |
    (config/commands)       |            |                  |
                            |            |                  |
                            v            v                  v
                    agent-screen  drive-mode  s-as-execution
                    (conflicts with s-as on agentScreen.ts)
```

### Logical dependencies (A must complete before B)

| A | B | Reason |
|---|---|-------|
| mcp-apps-implementation | agent-screen-implementation | Agent-screen Phase 3B edits agentScreenApp.ts; MCP Apps creates it |
| terminology-sas-overhaul | agent-screen-implementation | Config keys (agentScreen.*) |
| terminology-sas-overhaul | tangent-agent-ux-features | operators.namePool config |
| terminology-sas-overhaul | s-as-execution-command-discovery | Command renames (showAgentScreen, focusAgentView) |
| drive-mode-full-build | tangent-agent-ux-features | approvalGates, glossaryExpander |
| (coordinate) | agent-screen-implementation, s-as-execution-command-discovery | Both edit agentScreen.ts |

### File overlap matrix

| File | Plans touching it |
|------|-------------------|
| `src/agentScreen.ts` | agent-screen-implementation, s-as-execution-command-discovery |
| `src/agentScreenApp.ts` | mcp-apps-implementation, agent-screen-implementation |
| `src/mcpServer.ts` | agent-screen-implementation, mcp-apps-implementation, s-as-execution-command-discovery, tangent-agent-ux-features, terminology-sas-overhaul |
| `src/extension.ts` | agent-screen-implementation, mcp-apps-implementation, terminology-sas-overhaul |
| `src/operatorRegistry.ts` | tangent-agent-ux-features, terminology-sas-overhaul |
| `package.json` | All 6 plans |
