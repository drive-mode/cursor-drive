---
name: cursor-drive-automation-optimizer
overview: Bootstrap the codebase with automation (hooks, review skills, system logs MCP) to create a compounding effect. Then, deploy a sophisticated `code-optimizer` subagent to systematically resolve codebase inefficiencies using TDD and API caching best practices.
todos:
  - id: bootstrap-review-skills
    content: Create Review & TDD Skills (e.g., /rework-commits)
    status: pending
  - id: bootstrap-hooks
    content: Configure automation hooks in .cursor/hooks.json
    status: pending
  - id: bootstrap-logs-mcp
    content: Scaffold the system-logs-mcp server over stdio
    status: pending
  - id: bootstrap-optimizer-agent
    content: Create the code-optimizer subagent harness & skill
    status: pending
  - id: opt-caching-patterns
    content: Refactor Config reads & implement API caching patterns
    status: pending
  - id: opt-model-selection
    content: Extract and deduplicate model selection logic
    status: pending
  - id: opt-regex-caching
    content: Precompile and cache regular expressions in hot paths
    status: pending
  - id: opt-agent-registry
    content: Refactor AgentRegistry to use Map for O(1) lookups
    status: pending
  - id: opt-memory-arrays
    content: Bound queues and optimize memory array growth
    status: pending
  - id: opt-html-template
    content: Extract ShareScreen inline HTML to a static template
    status: pending
isProject: false
---

# Codebase Automation & Optimization Plan

To maximize our velocity, we will structure this plan to **bootstrap** our development. By setting up our automation, testing skills, and observability (MCP) *first*, we create an environment where the `code-optimizer` agent can work autonomously and safely. 

*(Note on "OpenClaw" / Automation: Cursor's native **Cloud Agents**, **Composer**, and **Parallel Agents (Worktrees)** already natively utilize your Cursor license and provide the exact autonomous, parallelized development experience you're looking for. By building out our `.cursor/rules`, `skills/`, and `hooks/`, we are directly arming Cursor's built-in engine to act as your ultimate automation tool.)*

## Phase 1: Bootstrap Automation & Quality Gates (High Priority)
Before optimizing code, we need guardrails so agents can verify their own work.

1. **Review & Testing Skills**: 
   - Create a `/rework-commits` skill to enforce clean git history.
   - Create a TDD enforcement rule/skill so agents write failing tests before implementing optimizations.
2. **System Hooks**:
   - Update `.cursor/hooks.json` to include an `afterFileEdit` hook for auto-formatting and a `preToolUse` hook to enforce safety during agent runs.
3. **System Logs MCP Server**:
   - Scaffold a local MCP server (`system-logs-mcp`) over `stdio`. This server will expose the extension's runtime logs and telemetry to the agents.
   - This allows our optimizer agent to perform "evidence-first" debugging (as outlined in the Finding & Fixing Bugs guide).

## Phase 2: The Optimizer Agent Harness
With guardrails in place, we define the intelligence layer.

4. **Code Optimizer Subagent** (`.cursor/agents/code-optimizer.md`):
   - Instruct the agent to explicitly use Cursor's native **semantic search** and **grep** to build a mental map before changing code.
   - Instruct the agent to utilize the new `system-logs-mcp` to verify performance bottlenecks.
   - Teach the agent to respect context limits by isolating complex refactors.

## Phase 3: Execute Optimizations (Iterative)
The optimizer agent will systematically tackle the identified inefficiencies using the TDD workflow.

5. **API & Config Caching Patterns**:
   - Implement cached config reads (`vscode.workspace.getConfiguration`) using `onDidChangeConfiguration` invalidation.
   - Where the extension talks to external APIs, implement the Cursor API best practices (ETag/`If-None-Match`, Exponential Backoff).
6. **Model Selection Deduplication**: Extract duplicated `vscode.lm` logic into a shared `modelUtils.ts`.
7. **Regex Caching**: Precompile regexes in `fillerCleaner.ts`, `glossaryExpander.ts`, and `approvalGates.ts`.
8. **O(1) Agent Lookups**: Refactor `AgentRegistry` to use a `Map<string, Agent>` instead of linear array scans.
9. **Memory Array Bounds**: Bound the `commsAgent` message queue and eliminate temporary `.slice()` array allocations.
10. **ShareScreen HTML Extraction**: Move the 360-line inline HTML into a static template file to reduce memory overhead per Webview instance.