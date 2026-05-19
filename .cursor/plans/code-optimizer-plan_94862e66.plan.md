---
name: code-optimizer-plan
overview: Create a specialized `code-optimizer` subagent with supporting commands, skills, and hooks. Then, systematically refactor the identified memory and performance inefficiencies across the codebase.
todos:
  - id: create-agent
    content: Create .cursor/agents/code-optimizer.md
    status: pending
  - id: create-skill
    content: Create .cursor/skills/code-optimization/SKILL.md
    status: pending
  - id: create-command
    content: Create .cursor/commands/optimize.md
    status: pending
  - id: create-hook
    content: Update .cursor/hooks.json to support the optimizer
    status: pending
  - id: opt-model-selection
    content: Extract and deduplicate model selection logic across the codebase
    status: pending
  - id: opt-config-caching
    content: Implement a cached config system in config.ts to prevent hot-path I/O reads
    status: pending
  - id: opt-regex-caching
    content: Precompile and cache regexes in fillerCleaner, glossaryExpander, and approvalGates
    status: pending
  - id: opt-agent-registry
    content: Refactor AgentRegistry to use a Map for O(1) lookups
    status: pending
  - id: opt-memory-arrays
    content: Bound the message queue in commsAgent.ts and optimize memory array growth
    status: pending
  - id: opt-html-template
    content: Extract shareScreen.ts inline HTML to a static template file
    status: pending
isProject: false
---

# Code Optimizer Subagent & Refactoring Plan

We will build a `code-optimizer` subagent ecosystem that continuously monitors and suggests improvements. Then, we will address a series of specific inefficiencies found in the current extension code.

## 1. Subagent Ecosystem

- **Subagent (`.cursor/agents/code-optimizer.md`)**: A specialized agent that looks for duplicated logic, un-cached config reads, O(n) lookups in hot paths, and unbounded memory growth.
- **Skill (`.cursor/skills/code-optimization/SKILL.md`)**: Instructions for the agent on how to apply Cursor-specific optimization patterns.
- **Command (`.cursor/commands/optimize.md`)**: A slash command (`/optimize`) to explicitly invoke the optimizer on the current file.
- **Hook (`.cursor/hooks.json`)**: We will add an `afterFileEdit` hook to optionally trigger lightweight optimization checks.

## 2. Inefficiencies to Optimize

Based on our analysis, we will tackle the following inefficiencies (tracked via TODOs):

- **Model Selection Duplication**: `vscode.lm.selectChatModels` and the "cheap model" fallback logic is duplicated across `responseFormatter.ts`, `commsAgent.ts`, and `modelSelector.ts`. We will extract this into a shared utility.
- **Config Hot-Path Reads**: Files like `glossaryExpander.ts`, `approvalGates.ts`, and `tts.ts` call `vscode.workspace.getConfiguration` on every execution. We will cache the config and invalidate it via the `onDidChangeConfiguration` listener.
- **Regex Re-compilation**: `fillerCleaner.ts`, `glossaryExpander.ts`, and `approvalGates.ts` compile regular expressions inside hot loops. We will precompile and cache these.
- **O(N) AgentRegistry Lookups**: `agentRegistry.ts` uses array scans (`.find`) to locate agents. We will maintain a `Map<string, Agent>` for O(1) lookups.
- **Unbounded Queues & Memory Arrays**: `commsAgent.ts` has an unbounded queue that could grow if delivery fails. `agentRegistry.ts` memory arrays use `.slice()` creating temporary arrays. We will introduce bounds and circular buffers.
- **ShareScreen HTML Memory**: The ~360-line inline HTML string in `shareScreen.ts` increases memory per WebviewPanel instance. We will extract this into a static template file.