# Architecture Decision Records

ADRs capture significant architectural choices, the context that motivated them, and the trade-offs accepted.

## Index

| ADR | Title | Status |
|-----|-------|--------|
| [ADR-0001](ADR-0001-cursor-native-ingress-strategy.md) | Cursor-Native Extension Strategy (Standalone) | Superseded by ADR-0009 |
| [ADR-0002](ADR-0002-hybrid-extension-plugin.md) | Hybrid Extension + Plugin Strategy | Accepted |
| [ADR-0003](ADR-0003-mcp-bridge-pattern.md) | Local MCP Server as AI-to-Extension Bridge | Accepted |
| [ADR-0004](ADR-0004-multi-agent-registry.md) | In-Memory AgentRegistry with Tangent Keyword Spawning | Accepted |
| [ADR-0005](ADR-0005-privacy-strict-default.md) | Privacy Strict Mode as Default | Accepted |
| [ADR-0006](ADR-0006-plan-file-placement-and-governance.md) | Plan File Placement and Governance | Accepted |
| [ADR-0007](ADR-0007-drive-mode-installable-distribution.md) | Drive Mode Installable Distribution | Accepted |
| [ADR-0008](ADR-0008-drive-mode-wrapper-architecture.md) | Drive Mode Wrapper Architecture | Accepted |
| [ADR-0009](ADR-0009-hook-based-prompt-interception.md) | Hook-Based Prompt Interception | Accepted |
| [ADR-0010](ADR-0010-tiered-model-routing.md) | Tiered Model Routing | Accepted |
| [ADR-0011](ADR-0011-native-mode-compatibility.md) | Native Mode Compatibility | Accepted |
| [ADR-0012](ADR-0012-voice-input-integration.md) | Voice Input Integration | Accepted |
| [ADR-0013](ADR-0013-mode-state-management.md) | Mode State Management | Accepted |
| [ADR-0014](ADR-0014-agent-orchestration-strategy.md) | Agent Orchestration Strategy | Accepted |
| [ADR-0015](ADR-0015-senior-engineer-interaction-model.md) | Senior Engineer Interaction Model | Accepted |
| [ADR-0016](ADR-0016-drive-terminology-and-hierarchy.md) | Drive Terminology and Hierarchy | Accepted |
| [ADR-0024](ADR-0024-fork-merge-drive-mode-canonical.md) | Fork Merge — Drive-Mode Canonical | Accepted |

## Summaries

**ADR-0001** — The extension uses a hybrid integration: VS Code Extension for UI (WebviewPanel, StatusBarItem, keybindings) + Cursor Plugin layer (`.cursor/`) for AI behavior. An MCP server bridges them.

**ADR-0002** — Neither a VS Code extension alone nor a Cursor plugin alone can satisfy all requirements. Both are used together, each owning a distinct concern: UI vs. AI behavior.

**ADR-0003** — The local HTTP MCP server on `:7891` is the contract between the Cursor AI and the VS Code extension. The AI calls MCP tools; the extension handles them via VS Code APIs.

**ADR-0004** — Agent state is stored in an in-memory `AgentRegistry`. Spawning is triggered by the "tangent" keyword or the `agent_spawn` MCP tool. Background agents notify via a batching comms agent.

**ADR-0005** — Strict privacy mode is default: no raw audio retention, no transcript persistence, redacted logs. Debug retention requires explicit opt-in with scoped policy and TTL.

**ADR-0006** — Executable plans (`*.plan.md`) live in `.cursor/plans/` only. Non-executable planning references stay in `docs/plans/`. Plan lifecycle automation targets `.cursor/plans/` exclusively.

**ADR-0007** — Extension in VSIX; plugin assets installed via extension command into `.cursor/`.

**ADR-0008** — Drive wraps Cursor native modes (Agent/Plan/Ask/Debug) as a behavioral layer; `beforeSubmitPrompt` is primary pipeline entry.

**ADR-0009** — `beforeSubmitPrompt` hook intercepts every prompt when Drive is active; hook can modify prompt or add context.

**ADR-0010** — Tiered model routing: Tier 0 (deterministic), Tier 1 (cheap), Tier 2 (user's model), Tier 3 (reasoning).

**ADR-0011** — Drive sub-modes map 1:1 to Cursor modes (plan→Plan, agent→Agent, ask→Ask, debug→Debug); direct retired.

**ADR-0012** — Mic is mute/unmute; wake word optional; TTS speaks responses; pipeline: filler-clean → sanitize → optimize.

**ADR-0013** — Drive state (active + subMode) persisted to workspaceState; status bar reflects actual Drive+native mode.

**ADR-0014** — A2A + MCP layering; AgentRegistry v2 lead+worker; Strands eval; LangGraph deferred; OpenClaw N/A.

**ADR-0015** — Drive embodies senior engineer in live pair session: concise-first, steers without being asked, teaches when valuable, challenges once then defers; invariants for response structure and confirmation.

**ADR-0016** — Drive workers renamed to "operators"; ShareScreen → Agent Screen (S-AS); MCP tools use operator_* and agent_screen_* with deprecated aliases.

**ADR-0024** — Fork merge from `cursor-agentic-framework-review-288f` resolved with drive-mode as canonical for `src/extension.ts` and core stack; unrelated histories merged with `--allow-unrelated-histories`, conflicts resolved by keeping origin/main.

### Terminology

- **Drive operators** = Drive's workers (`operatorRegistry`); you spawn, switch, merge, dismiss them.
- **Cursor agents** = Cursor native Agent mode or subagents (Cursor's own concept).
- **Agent Screen (S-AS)** = the panel showing operator/agent activity (activity feed, files, decisions).

See [ADR-0016](ADR-0016-drive-terminology-and-hierarchy.md).

## Contributing

To propose a new ADR:
1. Copy any existing ADR as a template.
2. Number it sequentially (next is `ADR-0017`).
3. Fill in Status as `Proposed`.
4. Add it to the index table above.
5. Update `docs/architecture/README.md` ADR table.

ADR status lifecycle: `Proposed` → `Accepted` → `Superseded` (or `Rejected`).
