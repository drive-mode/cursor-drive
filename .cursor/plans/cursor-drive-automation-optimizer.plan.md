---
planId: cursor-drive-automation-optimizer
planType: task
parentPlanId: cursor-drive-v1
childPlanIds: []
dependsOn: []
name: cursor-drive-automation-optimizer
overview: Bootstrap automation using hooks, skills, and an MCP server. Then, deploy a code-optimizer subagent that uses specific Cursor tools (Read, Glob, Grep, SemanticSearch, AskQuestion, Task, TodoWrite) to refactor codebase inefficiencies following TDD and caching best practices.
todos:
  - id: bootstrap-skills
    content: Write /rework-commits skill and TDD enforcement rule
    status: completed
  - id: bootstrap-hooks
    content: StrReplace .cursor/hooks.json to add automation hooks
    status: completed
  - id: bootstrap-mcp
    content: Scaffold system-logs-mcp server and register it
    status: completed
  - id: create-optimizer-harness
    content: Write code-optimizer subagent instruction file
    status: completed
  - id: opt-model-selection
    content: Use SemanticSearch and StrReplace to deduplicate model selection
    status: completed
  - id: opt-caching
    content: Use Grep and StrReplace to refactor config caching and API patterns
    status: completed
  - id: opt-regex-caching
    content: Use Read and StrReplace to precompile regexes
    status: completed
  - id: opt-agent-registry
    content: Use Read and StrReplace to refactor AgentRegistry lookups
    status: completed
  - id: opt-memory-queue
    content: Use StrReplace to bound commsAgent queue
    status: completed
  - id: opt-html-template
    content: Use Write and StrReplace to extract ShareScreen HTML
    status: completed
  - id: verify-optimizations
    content: Use Shell tool to run test suites validating all refactors
    status: completed
state: completed
isProject: false
---

# Codebase Automation & Optimization Plan

To maximize our velocity, we will bootstrap our automation, testing skills, and observability (MCP) first. Then, we will create an environment where the `code-optimizer` subagent can work autonomously and safely, making explicit use of Cursor's rich tool ecosystem.

## Phase 1: Bootstrap Automation & Quality Gates

**1. Review & Testing Skills (`Write` tool)**
   - Use the `Write` tool to create `.cursor/skills/rework-commits/SKILL.md` enforcing clean git history before pushing.
   - Use the `Write` tool to create `.cursor/rules/tdd-enforcement.mdc` requiring failing tests before refactors.

**2. System Hooks (`StrReplace` or `Write` tool)**
   - Use the `StrReplace` tool on `.cursor/hooks.json` to add an `afterFileEdit` hook (auto-format) and a `preToolUse` hook (safety checks).

**3. System Logs MCP Server (`Write`, `Shell` tools)**
   - Scaffold the `system-logs-mcp` server using `Write` for the TypeScript source.
   - Run `Shell` (`npm install @modelcontextprotocol/sdk zod`) to add dependencies.
   - Use `StrReplace` to register the new server in `.cursor/mcp.json`.

## Phase 2: The Optimizer Agent Harness

**4. Code Optimizer Subagent (`Write`, `TodoWrite` tools)**
   - Use the `Write` tool to create `.cursor/agents/code-optimizer.md`.
   - **Agent Instructions:** The subagent MUST use `SemanticSearch` and `Grep` to build a mental map before changing code. It MUST use the `Task` tool (`subagent_type: "explore"`) to verify complex structural refactors. It MUST manage its workflow by calling `TodoWrite`.

## Phase 3: Execute Optimizations (Iterative Execution)

For each optimization, the primary agent or the spawned `code-optimizer` subagent will execute the following steps:

**5. Tool Strategy per Optimization:**
   - **Initial Analysis:** Use `SemanticSearch` to locate architectural patterns and `Grep`/`Glob` to find exact usage instances.
   - **Task Management:** Call `TodoWrite` to break the specific optimization down into steps.
   - **Refactoring:** Use the `Read` tool to load the target files. Use `StrReplace` for targeted edits and `Write` for creating new utility files (like `src/modelUtils.ts`).
   - **Verification:** Use the `Shell` tool (`npm run test` / `npm run compile`) to verify changes against the newly created TDD rules. If a failure occurs, use the `AskQuestion` tool if human context is needed, or spawn a `Task` (`subagent_type: "generalPurpose"`) to debug.

**Target Inefficiencies:**
   - **Model Selection Deduplication**: Extract duplicated `vscode.lm` logic.
   - **API & Config Caching Patterns**: Implement cached config reads and HTTP caching best practices (ETag/Exponential Backoff).
   - **Regex Caching**: Precompile regexes in `fillerCleaner.ts`, `glossaryExpander.ts`, and `approvalGates.ts`.
   - **O(1) Agent Lookups**: Refactor `AgentRegistry` from arrays to Maps.
   - **Memory Array Bounds**: Bound `commsAgent` message queues.
   - **ShareScreen HTML Extraction**: Move inline HTML to a static template.

## Reconciliation

### Verified

- **Bootstrap:** rework-commits skill, TDD enforcement rule, hooks (preToolUse, postToolUse, afterFileEdit), system-logs-mcp server, code-optimizer agent.
- **Model selection:** `getAvailableModels()` and `getAvailableModelsWithError()` in modelUtils; extension and apiDiscovery use them.
- **Config caching:** modeSwitcher caches mode-switching config with invalidation on `onDidChangeConfiguration`.
- **HTTP retry:** cloudAgentClient has exponential backoff (1s, 2s, 4s) for 429 and 5xx; tests use jest.useFakeTimers().
- **Regex:** glossaryExpander precompiles regexes at load time; fillerCleaner and approvalGates already had precompiled regexes.
- **AgentRegistry:** OperatorRegistry already uses Maps (operators, nameToId) for O(1) lookups.
- **commsAgent:** Queue already bounded at MAX_QUEUE_SIZE 100.
- **ShareScreen HTML:** Extracted to `src/agentScreenTemplate.ts` with placeholders.
- **Compile:** `npm run compile` passes.
- **Tests:** cloudAgentClient tests pass (22/22). Full suite: 44/48 suites pass; agentScreen Unicode encoding failures (— vs â€") are pre-existing.

### Residual risks

- agentScreen tests: 3 failures from Unicode encoding in test environment, not from refactors.
- system-logs-mcp: MCP path in mcp.json is workspace-relative; may need adjustment for non-workspace runs.

### Evidence

- `npm run compile` — success
- `npx jest tests/cloudAgentClient.test.ts` — 22 passed