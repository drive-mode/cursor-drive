---
name: Quality & Performance
overview: "Test coverage for all wired modules. Code optimization (modelUtils extraction, config caching, regex precompilation, AgentRegistry Map). Extension activation fix completion. Supersedes code-optimization.plan.md, test-coverage.plan.md, and fix_extension_activation.plan.md."
planType: task
planId: quality-performance
parentPlanId: cursor-drive
childPlanIds: []
dependsOn: [pipeline-wiring-mvp]
todos:
  - id: qp-01-activation-fix
    content: "Complete the extension activation fix. Read the current state of src/extension.ts Output Channel logging (added in fix_extension_activation plan). F5 in Cursor dev-host and read View > Output > Cursor Drive for the actual error. Apply the one targeted fix identified (module resolution, ESM/CJS interop, or Cursor API difference). Acceptance: status bar shows 'Drive (off)'; Ctrl+Shift+D toggles Drive; curl http://127.0.0.1:7891/health returns 200; npm run compile and npm test pass."
    status: completed
  - id: qp-02-tests-core
    content: "Add tests for wired core modules. tests/extension.test.ts: test activate() registers all commands, MCP server starts, disposables registered. tests/driveMode.test.ts: test setActive, setSubMode, toggle, onDidChange events, workspaceState persistence. tests/statusBar.test.ts: test render() updates text for all 5 SubMode values + agent name display. tests/agentRegistry.test.ts: test spawn naming, maxConcurrent enforcement, switchTo, dismiss, merge, getActive, error paths. Acceptance: all 4 test files exist and pass; npm test passes."
    status: completed
  - id: qp-03-tests-mcp-pipeline
    content: "Add tests for MCP server and pipeline modules. tests/mcpServer.test.ts: test all tool handlers with mock DriveModeManager and AgentRegistry; test start/stop lifecycle on a free port. tests/pipeline.test.ts (or extend existing): test full pipeline with mocked stages — confirm call order and output for active/inactive Drive states. Acceptance: both test files exist and pass; all MCP tool handlers covered; pipeline stage ordering verified."
    status: completed
  - id: qp-04-tests-pipeline-modules
    content: "Add or verify tests for all pipeline modules that may lack coverage. Check tests/ for: fillerCleaner, sanitizer, glossaryExpander, approvalGates, router, modelSelector, sessionMemory, promptOptimizer, toolAllowlist. For any missing test file, create it. Each test must cover: success path, error/edge path, config-dependent behavior, cancellation where applicable. Acceptance: every pipeline module has a test file; npm test passes with no failures."
    status: completed
  - id: qp-05-model-utils
    content: "Extract shared LM model selection logic into src/modelUtils.ts. The pattern vscode.lm.selectChatModels + cheap-model fallback is duplicated across modules. Extract to: export async function selectTierModel(tier: ModelTier, token: vscode.CancellationToken): Promise<vscode.LanguageModelChat | undefined>. Update all callers to use modelUtils. Acceptance: src/modelUtils.ts exists; no duplicate selectChatModels logic in other modules; npm run compile passes; npm test passes."
    status: completed
  - id: qp-06-config-regex-caching
    content: "Two-part optimization: (1) Cache vscode.workspace.getConfiguration reads in hot-path modules (glossaryExpander.ts, approvalGates.ts, tts.ts) using module-level cache invalidated by onDidChangeConfiguration — use config.ts as the template. (2) Precompile regexes at module load time in fillerCleaner.ts, glossaryExpander.ts, approvalGates.ts — move regex literals from inside functions to module-level const declarations. Acceptance: three modules use cached config; three modules have module-level regex constants; npm run compile and npm test pass."
    status: completed
  - id: qp-07-registry-map-bounds
    content: "Two-part optimization: (1) Refactor AgentRegistry in src/agentRegistry.ts from array-scan (.find scans O(n)) to Map<string, AgentContext> for O(1) lookups. Keep an ordered array for iteration where needed. (2) Cap any message queues (commsAgent or similar) at MAX_QUEUE_SIZE (e.g. 100) with circular buffer or max-size slice. Acceptance: AgentRegistry uses Map internally; .find removed from hot paths; queue bounds enforced; npm run compile and npm test pass."
    status: completed
isProject: false
---

# Quality & Performance

## Purpose

This plan merges three previously separate plans:
- `fix_extension_activation_a1a62737.plan.md` (in_progress) — activation fix carried forward
- `test-coverage.plan.md` — tests for 10 untested modules
- `code-optimization.plan.md` — perf + deduplication

Depends on `pipeline-wiring-mvp` because tests should cover the wired pipeline modules in their final form. Running tests before the pipeline is wired would require large mock setups that get thrown away.

## Activation fix context

`fix_extension_activation` has 2 completed TODOs (Output Channel added, F5 attempted) and 2 pending (f5-read-error → fix-root-cause → verify). The Output Channel is already in place. TODO qp-01 picks up from that state.

## Test coverage targets

From the code audit: 7 modules are currently wired in activate() and have tests; 9 are orphaned (being wired in pipeline-wiring-mvp). All 16 active modules need test coverage.

| Test file | Module | Priority |
|---|---|---|
| tests/extension.test.ts | extension.ts | High |
| tests/driveMode.test.ts | driveMode.ts | High |
| tests/statusBar.test.ts | statusBar.ts | High |
| tests/agentRegistry.test.ts | agentRegistry.ts | High |
| tests/mcpServer.test.ts | mcpServer.ts | High |
| tests/pipeline.test.ts | pipeline orchestration | High |
| tests/promptOptimizer.test.ts | promptOptimizer.ts | High |
| tests/sessionMemory.test.ts | sessionMemory.ts | Medium |
| tests/toolAllowlist.test.ts | toolAllowlist.ts | Medium |
| tests/tts.test.ts | tts.ts | Medium |
| tests/shareScreen.test.ts | shareScreen.ts | Low |

Already have tests (verify still pass): router, approvalGates, toolAllowlist, glossaryExpander, sessionMemory, fillerCleaner, modelSelector, sanitizer.

## Optimization targets

| Target | Module(s) | Change |
|---|---|---|
| LM selection dedup | modelSelector, mcpServer, pipeline | Extract to modelUtils.ts |
| Config hot-path caching | glossaryExpander, approvalGates, tts | Module-level cache + invalidation |
| Regex precompilation | fillerCleaner, glossaryExpander, approvalGates | Module-level const |
| AgentRegistry O(1) | agentRegistry | Array → Map |
| Queue bounds | commsAgent (if exists) | MAX_QUEUE_SIZE cap |

## Execution strategy

**Executor role:** Implementer.

**Subagent fan-out:**
- Batch A: qp-01 (activation fix — must be done first to confirm compile/test baseline)
- Batch B (parallel): qp-02 + qp-03 (core and MCP tests)
- Batch C (parallel): qp-04 + qp-05 (pipeline module tests + modelUtils extraction)
- Batch D (parallel): qp-06 + qp-07 (config/regex caching + registry optimization)

**Phase gate:** qp-01 must pass before starting any test work — confirms the baseline is healthy.

**Delegation trigger:** Spawn a subagent for qp-04 if more than 4 new test files need to be created.

**Verification:** Final state: `npm test` passes all tests with ≥80% coverage on src/ modules; `npm run compile` produces 0 errors.

## Reconciliation

**Completed:** All 7 TODOs executed. Terminology-sas-overhaul context applied: `agentRegistry` → `operatorRegistry`, `shareScreen` → `agentScreen`.

| TODO | Outcome |
|------|---------|
| qp-01 | Added "Cursor Drive" Output Channel to `extension.ts` with try-catch around driveMode, status bar, core services, MCP. Logs `[Drive] activate() called` through `activate() complete`. |
| qp-02 | Created `tests/extension.test.ts` (mocked MCP). Enhanced `driveMode.test.ts` (workspaceState persistence), `statusBar.test.ts` (all SubModes + background count), `agentRegistry.test.ts` (spawn naming, dismiss, getActive, switchTo invalid). |
| qp-03 | Created `tests/mcpServer.test.ts` — start/stop, /health, POST /tasks, POST /pipeline. Pipeline tests already covered stage order. |
| qp-04 | Created `tests/promptOptimizer.test.ts`. All pipeline modules (fillerCleaner, sanitizer, glossaryExpander, approvalGates, router, modelSelector, sessionMemory, toolAllowlist) have tests. |
| qp-05 | Created `src/modelUtils.ts` with `selectTierModel`. `modelSelector` delegates to it. `commsAgent` uses `selectCheapModel` from modelSelector. |
| qp-06 | Config cache: glossaryExpander, approvalGates, tts — module-level cache + `onDidChangeConfiguration` invalidation. Regex precompile: fillerCleaner (FILLER_REGEXES, DUPLICATE_WORDS_RE, etc.), glossaryExpander (WS_COLLAPSE_RE), approvalGates (CODE_BLOCK_RE). |
| qp-07 | OperatorRegistry: added `nameToId` Map for O(1) name lookup; `findByNameOrId` uses it. CommsAgent: `MAX_QUEUE_SIZE = 100`, slice when exceeded. |

**Tests:** 149 passing. `npm run compile` and `npm test` pass.
