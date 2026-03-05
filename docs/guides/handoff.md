# Handoff Prompt: Cursor Drive

Paste into a new chat to continue work on this codebase.

---

## What this project is

**Cursor Drive** is a standalone Cursor IDE extension that adds **Drive mode** — a voice-first AI pair-programming driver. Hybrid system:

- **VS Code extension** (`src/`) — TypeScript, runs in the extension host. Handles all UI: status bar, Agent Screen (S-AS) webview, TTS/audio feedback, multi-operator pool, MCP server.
- **Cursor plugin layer** (`.cursor/`) — Skills, rules, commands, and hooks that shape AI behavior in Drive mode.
- **Local MCP server** (`:7891`) — Bridge between Cursor AI and the extension. AI calls MCP tools to update Agent Screen, trigger TTS, switch modes, and manage operators.

No Discord bot, no Python backend, no shared core. Self-contained Cursor extension.

---

## Implemented modules (`src/`)

Current footprint: **27 files under `src/`** (**26 TypeScript modules + `src/README.md`**).

| File | What it does |
|---|---|
| `extension.ts` | Extension entrypoint; activates Drive services and commands |
| `mcpServer.ts` | MCP + HTTP endpoints, tool registration, SSE routes |
| `driveMode.ts` | Drive active/submode state + persistence |
| `statusBar.ts` | Drive status bar UX (mode + foreground operator) |
| `operatorRegistry.ts` | Multi-operator lifecycle and event bus |
| `agentScreen.ts` | Agent Screen (S-AS) webview/output channel surface |
| `commsAgent.ts` | Batches background operator updates for UX delivery |
| `pipeline.ts` | Prompt pipeline orchestration |
| `router.ts` | Intent/submode route selection |
| `fillerCleaner.ts` | Dictation filler cleanup |
| `glossaryExpander.ts` | Voice shorthand expansion |
| `sanitizer.ts` | Prompt sanitization and safety trimming |
| `promptOptimizer.ts` | Prompt optimization workflow |
| `approvalGates.ts` | Policy gating before/after model responses |
| `toolAllowlist.ts` | Operator permission capability checks |
| `modelSelector.ts` | Tiered model selection facade |
| `modelUtils.ts` | Shared model-tier selection primitives |
| `cursorCliRunner.ts` | Cursor CLI execution + streaming runner |
| `ndjsonParser.ts` | NDJSON parsing/mapping for stream-json events |
| `audioFeedback.ts` | Chime/audio feedback integration |
| `tts.ts` | Text-to-speech wrapper over `say` |
| `sessionMemory.ts` | Session-scoped memory context |
| `persistentMemory.ts` | Filesystem-backed long-term memory |
| `apiDiscovery.ts` | API/command discovery diagnostics |
| `pluginInstaller.ts` | Workspace plugin installation helpers |
| `index.ts` | Reserved placeholder module for sandbox/dev-loop entrypoint wiring |

**Tests:** **28 suites / 284 tests**, all passing on the latest run.

---

## Pending work

See `.cursor/plans/` for all active plans:

| Plan | State | Focus |
|---|---|---|
| `mvp-gaps.plan.md` | pending | promptOptimizer, wake/submit words, tangent wiring, mode confirm |
| `test-coverage.plan.md` | pending | Tests for 10 untested modules |
| `docs-overhaul.plan.md` | in_progress | Docs restructure, reference docs, automation |
| `code-optimization.plan.md` | pending | Perf improvements after test coverage complete |

---

## Key paths

| Purpose | Path |
|---|---|
| Extension source | `src/` |
| Extension manifest | `package.json` |
| Root plan | `.cursor/plans/cursor-drive.plan.md` |
| Plan dependency graph | `.cursor/plans/plan-graph.yaml` |
| MCP config | `.cursor/mcp.json` |
| Plugin manifest | `.cursor-plugin/plugin.json` |
| PRDs | `docs/prd/` |
| Architecture | `docs/architecture/README.md` |
| Getting started | `docs/guides/getting-started.md` |
| Live testing | `docs/guides/live-testing.md` |

---

## How to run

```bash
npm install
npm run compile
# Press F5 in Cursor → Extension Development Host
# Then in dev-host: ask agent to call a Drive MCP tool
```

See `docs/guides/live-testing.md` for full smoke test suite.

---

## Rules

Plan-before-implementation is enforced. Before writing code:
1. Read the relevant `.cursor/plans/*.plan.md`
2. Map work to a plan TODO
3. Mark TODO `in_progress` before starting
4. Mark `completed` when done

Privacy: no raw transcript/audio retention. No PII in logs. See `.cursor/rules/policy-pack.mdc`.
