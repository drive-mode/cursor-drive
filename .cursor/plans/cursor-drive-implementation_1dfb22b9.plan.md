---
name: cursor-drive-implementation
planId: cursor-drive-implementation
planType: project
parentPlanId: cursor-drive
overview: Implement Cursor Drive as a hybrid VS Code extension and MCP server, aligning with the "hh" core boundaries, the plan-graph lifecycle, and the three-tier model architecture.
todos:
  - id: ext-ui-chat-participant
    content: Refactor extension to use `@drive` ChatParticipant and Status Bar UI
    status: pending
  - id: ext-webview
    content: Implement `ShareScreenPanel` Webview bound to VS Code theme CSS variables
    status: pending
  - id: ext-pipeline
    content: Build the 3-tier Model Selector and Pipeline Coordinator in `src/extension.ts`
    status: pending
  - id: ext-optimizer
    content: Implement `PromptOptimizer` and `FillerCleaner` integration
    status: pending
  - id: mcp-adapter
    content: Build the Python MCP adapter (`src/hh/adapters/cursor/`) to interface with `hh` core
    status: pending
  - id: ext-multi-agent
    content: Implement `AgentRegistry` and Tangent spawning logic via MCP
    status: pending
  - id: ext-safety-gates
    content: Enforce Safety Configs & Approval Gates for file/terminal writes
    status: pending
isProject: false
---

# Cursor Drive Mode Implementation Plan (Updated)

Based on the deep-dive research into the new architecture and design docs, the implementation strategy has been refined to strictly adhere to the `hh` core boundaries, the three-tier model design, and the `.cursor/plans` orchestration system.

## 1. Architecture & Boundaries (ADR-0006)

We are building an **Extension-only strategy**. We will not fork Cursor.

- **VS Code Extension (`extension/src/`)**: Acts as a thin coordinator. It registers the `@drive` Chat Participant (or native Mode if available) and handles the UI (Webview ShareScreen, Status Bar).
- **MCP Server / Adapters (`src/hh/adapters/cursor/`)**: The extension communicates with the `hh` core via MCP tools. The core handles session state, intent routing, and execution. The extension never imports core directly.

## 2. The Request Pipeline & Model Tiers

Implementation must follow the defined per-message pipeline:

1. **Preprocessor & Optimizer**: Leverage `drive-preprocessor.py` (client-side) to strip fillers. Build the AI rewrite logic (using the cheapest *Routing tier* models like `gpt-4o-mini`).
2. **Intent Router**: Route the normalized intent to the correct sub-mode (Plan, Agent, Ask, Debug).
3. **Execution**: Use the *Execution tier* (user's selected model) for multi-file edits and code generation.

## 3. Multi-Agent & Tangents

- **Spawning**: When the `drive-preprocessor.py` detects the "tangent" keyword, the pipeline should invoke the `agent_spawn` MCP tool.
- **Orchestration**: The `AgentRegistry` tracks background tasks. The lightweight *Comms Agent* (routing tier) will batch status updates and present them at natural pauses to avoid interrupting the user.

## 4. UI Surfaces & Cursor Primitives

- **Status Bar**: Implement `Drive > [Mode] | [AgentName]`.
- **Webview Panel**: The ShareScreen tracks the active foreground agent's context and research trail.
- **Chat Participant**: Register `@drive` to handle slash commands (`/plan`, `/run`, `/switch`, `/agents`).

## 5. Adherence to Plan Lifecycle Automation

All work must map to `.cursor/plans/*.plan.md` files.

- We will use `plan-graph.yaml` and `registry.yaml` to track our progress.
- As we complete steps, we will ensure `plan-runner.py` syncs the registry upon subagent stops.
- We will ensure the `hh-policy-pack.mdc` rules (Approval Gates for destructive actions, Privacy Defaults) are explicitly coded into the extension's safety layer.

## Execution Strategy

To build this, we will spawn parallel subagents to tackle isolated modules (e.g., one subagent for the VS Code Webview, another for the Python MCP adapter layer) while ensuring all PRs pass the strict "reconciliation and test" governance gates defined in the plan orchestration spec.