# Cursor Drive — Architecture

Cursor Drive is a **standalone** Cursor IDE extension. There is no external backend. All logic runs in the VS Code extension host or in the `.cursor/` Cursor plugin layer. No hh backend, no Discord, no shared core.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Cursor IDE                               │
│                                                                 │
│  ┌────────────────────────────────────────────────────────┐     │
│  │              VS Code Extension Host                    │     │
│  │                                                        │     │
│  │  beforeSubmitPrompt hook ──► Pipeline (when Drive active): │     │
│  │    fillerCleaner → promptOptimizer → router            │     │
│  │    → modelSelector → main model call                   │     │
│  │                                                        │     │
│  │  Status Bar   Agent Screen (S-AS) Webview   TTS Engine      │     │
│  │        ↑               ↑                        ↑           │     │
│  │        └───────── MCP Server :7891 ─────────────┘            │     │
│  │                         ↑                             │     │
│  │              (AI calls MCP tools)                     │     │
│  └────────────────────────────────────────────────────────┘     │
│                                                                 │
│  ┌────────────────────────────────────────────────────────┐     │
│  │              .cursor/ Plugin Layer                     │     │
│  │                                                        │     │
│  │  skills/drive-persona/SKILL.md  (AI reads at runtime)  │     │
│  │  rules/*.mdc                    (always applied)       │     │
│  │  commands/*.md                  (slash commands)       │     │
│  │  hooks/*.py                     (pre/post submit)      │     │
│  └────────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────┘
```

## Component Map

| Component | File(s) | Purpose |
|-----------|---------|---------|
| Entry point | `src/extension.ts` | Activates extension, registers commands, starts MCP server |
| Drive state | `src/driveMode.ts` | `active` + `subMode`, persisted to `workspaceState` |
| Status bar | `src/statusBar.ts` | `Drive > [Mode] \| [OperatorName]` live indicator |
| Drive toggle | `src/statusBar.ts`, `src/driveMode.ts` | Status bar + Ctrl+Shift+D; beforeSubmitPrompt routes when active |
| Intent router | `src/router.ts` | Maps prompt + subMode → `plan/run/direct/collab` |
| Model selector | `src/modelSelector.ts` | 3-tier cost selection: routing → planning → execution |
| Filler cleaner | `src/fillerCleaner.ts` | Client-side filler word removal, free |
| Operator registry | `src/operatorRegistry.ts` | Operator pool: spawn, switch, merge, dismiss |
| Agent Screen (S-AS) | `src/agentScreen.ts` | WebviewPanel with activity feed, files, decisions |
| TTS engine | `src/tts.ts` | OS-native speech via `say.js` |
| MCP server | `src/mcpServer.ts` | Local HTTP server on `:7891`; AI calls tools here |
| Approval gates | `src/approvalGates.ts` | Pre/post scan for dangerous operations |
| Tool allowlist | `src/toolAllowlist.ts` | Per-operator permission enforcement |
| Session memory | `src/sessionMemory.ts` | Per-workspace context tracking |
| Glossary expander | `src/glossaryExpander.ts` | Voice shortcut → intent mapping |
| Sanitizer | `src/sanitizer.ts` | Prompt truncation + injection stripping |
| Plugin installer | `src/pluginInstaller.ts` | Install plugin assets into `.cursor/` |
| API discovery | `src/apiDiscovery.ts` | Cursor API surface discovery |
| Index (sandbox) | `src/index.ts` | Sandbox/entry for experiments |

## Request Pipeline

```
User submits prompt (Drive active; beforeSubmitPrompt intercepts)
       │
       ▼
  /cancel guard ──────────────────────────────────► exit Drive
       │
       ▼
  Activation word parse ("drive", sub-mode)
       │
       ▼
  fillerCleaner.ts  (free, client-side)
       │
       ▼
  promptOptimizer.ts  (routing-tier model, conditional)
  ├── looksLikeDictation OR wasModified OR len > 120
  └── user approves via QuickPick
       │
       ▼
  approvalGates.ts  (pre-routing scan)
       │
       ▼
  router.ts  → RouteMode: plan | run | direct | collab
       │
       ▼
  modelSelector.ts  → routing | planning | execution tier
       │
       ▼
  Main model call with Drive persona system prompt
       │
       ▼
  responseFormatter.ts  (terse / normal / verbose)
       │
       ├── stream.markdown() → chat panel
       └── tts_speak() via MCP → TTS engine
```

## MCP Bridge

The local MCP server is the contract between "AI wants to update the UI" and "extension updates VS Code APIs." The AI does not call VS Code APIs directly.

```
AI calls MCP tool → mcpServer.ts handles → emits event → extension updates UI
```

MCP tools: `tts_speak`, `tts_stop`, `agent_screen_activity`, `agent_screen_file`, `agent_screen_decision`, `drive_set_mode`, `operator_spawn`, `operator_switch`, `operator_list`, `operator_pause`, `operator_resume`, `operator_dismiss`, `operator_merge`. Deprecated aliases: `share_screen_*`, `agent_*` (spawn/switch/list/dismiss/merge).

The MCP server URL is registered in `.cursor/mcp.json`:
```json
{ "mcpServers": { "drive": { "url": "http://127.0.0.1:7891/mcp" } } }
```

## Multi-Agent System

```
User: "tangent: research rate limiting"
  → AI calls operator_spawn({ task: "research rate limiting" })
  → OperatorRegistry creates Beta (background)
  → Alpha continues as foreground operator
  → Beta works asynchronously
  → Completion updates batched and delivered at natural pause
User: "show me beta" → operator_switch → Beta becomes foreground
User: "merge beta into alpha" → operator_merge → Alpha receives Beta's context
```

## Plugin Layer

The `.cursor/` directory is auto-discovered by Cursor and shapes AI behavior without extension code:

| Path | Purpose |
|------|---------|
| `.cursor/skills/drive-persona/SKILL.md` | Drive persona, MCP tool usage, mode behaviors |
| `.cursor/rules/drive-modes.mdc` | Mode detection signals and behaviors |
| `.cursor/rules/drive-concise.mdc` | Concise-first response pattern |
| `.cursor/rules/policy-pack.mdc` | Privacy, approval gates, testing, minimal-diff |
| `.cursor/skills/switch/SKILL.md` | `/switch <agent>` slash command |
| `.cursor/skills/tangent/SKILL.md` | `/tangent <task>` slash command |
| `.cursor/skills/merge/SKILL.md` | `/merge <source> into <target>` slash command |
| `.cursor/hooks/drive-preprocessor.py` | Pre-submit: filler detection, mode hints |
| `.cursor/hooks/plan-runner.py` | Pre-submit: plan TODO reminders, registry sync |

## Architecture Decision Records

| ADR | Decision |
|-----|---------|
| [ADR-0001](adr/ADR-0001-cursor-native-ingress-strategy.md) | Hybrid extension + plugin strategy (superseded by ADR-0009) |
| [ADR-0002](adr/ADR-0002-hybrid-extension-plugin.md) | Why VS Code extension + `.cursor/` plugin layer (not one or the other) |
| [ADR-0003](adr/ADR-0003-mcp-bridge-pattern.md) | Why local MCP server as the AI-to-extension bridge |
| [ADR-0004](adr/ADR-0004-multi-agent-registry.md) | In-memory AgentRegistry with tangent keyword spawning |
| [ADR-0005](adr/ADR-0005-privacy-strict-default.md) | Privacy strict mode as default; debug opt-in only |
| [ADR-0006](adr/ADR-0006-plan-file-placement-and-governance.md) | Executable plans in `.cursor/plans/` only |
| [ADR-0007](adr/ADR-0007-drive-mode-installable-distribution.md) | Drive mode installable distribution |
| [ADR-0008](adr/ADR-0008-drive-mode-wrapper-architecture.md) | Drive wraps Cursor native modes; beforeSubmitPrompt primary |
| [ADR-0009](adr/ADR-0009-hook-based-prompt-interception.md) | Hook-based prompt interception |
| [ADR-0010](adr/ADR-0010-tiered-model-routing.md) | Tiered model routing |
| [ADR-0011](adr/ADR-0011-native-mode-compatibility.md) | Native mode compatibility (1:1 mapping) |
| [ADR-0012](adr/ADR-0012-voice-input-integration.md) | Voice input integration |
| [ADR-0013](adr/ADR-0013-mode-state-management.md) | Mode state management |
| [ADR-0014](adr/ADR-0014-agent-orchestration-strategy.md) | Agent orchestration strategy |
| [ADR-0015](adr/ADR-0015-senior-engineer-interaction-model.md) | Senior engineer interaction model |
| [ADR-0016](adr/ADR-0016-drive-terminology-and-hierarchy.md) | Drive terminology: operators, Agent Screen (S-AS) |
| [ADR-0017](adr/ADR-0017-mcp-apps-adoption-strategy.md) | MCP Apps adoption strategy (proposed) |
| [ADR-0018](adr/ADR-0018-cursor-computer-use-posture.md) | Cursor computer use posture (proposed) |
| [ADR-0019](adr/ADR-0019-plugin-extension-strategy.md) | Plugin and extension strategy (proposed) |
| [ADR-0020](adr/ADR-0020-agent-steering-control-plane.md) | Agent steering control plane (proposed) |
| [ADR-0021](adr/ADR-0021-agent-orchestration-enhancement.md) | Agent orchestration enhancement (proposed) |
| [ADR-0022](adr/ADR-0022-mob-programming-cockpit.md) | Mob programming cockpit — worktree isolation |
| [ADR-0023](adr/ADR-0023-sdk-protocol-framework-adoption.md) | SDK, protocol, framework adoption |
| [ADR-0024](adr/ADR-0024-fork-merge-drive-mode-canonical.md) | Fork merge — drive-mode canonical |

## Security & Privacy

- No raw audio retained
- No transcript persistence unless debug mode enabled
- Dangerous operations blocked/warned via approvalGates before execution
- API keys stored in `vscode.SecretStorage`, never logged
- Tool allowlist enforces per-agent permissions (readonly / standard / full)

## Configuration

All settings are under `cursorDrive.*`. See [PRD 4: Safety + Config](../prd/prd-safety-config.md) for the canonical master config schema.
