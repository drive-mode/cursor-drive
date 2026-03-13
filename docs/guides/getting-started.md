# Getting Started with Cursor Drive Development

Setup guide for new contributors. For full smoke testing, see [live-testing.md](live-testing.md).

---

## Prerequisites

- Node.js ≥ 20
- Python 3.x in PATH (`pip install pyyaml`)
- Cursor IDE installed

---

## Get Cursor Drive Working (GCD)

1. **Build** — `npm ci && npm run compile`
2. **MCP** — Extension starts MCP server on port 7891; register in `.cursor/mcp.json` with the URL shown in the Drive output channel
3. **Plugin** — Run `Drive: Install Drive Plugin to Workspace` to copy plugin assets and hooks
4. **Sandbox** — (Optional) `.\sandbox\setup-drive-dev.ps1` for isolated dev testing
5. **Smoke** — Press F5, select "Dev: Drive in sandbox" or "Dev: Drive in repo root", toggle Drive with `Ctrl+Shift+D`

---

## Setup

```powershell
# 1. Install dependencies
npm install

# 2. (Optional) Create sandbox for isolated dev testing
.\sandbox\setup-drive-dev.ps1
```

---

## Build and run

```powershell
# Compile once
npm run compile

# Watch mode (recompile on save)
npm run watch

# Run tests
npm test

# Package extension
npx vsce package
```

**Launch dev host:** Press **F5** in Cursor. Select "Dev: Drive in sandbox" or "Dev: Drive in repo root".

---

## Project layout

```
cursor-drive/
├── src/                    # TypeScript extension source (18 modules)
├── out/                    # Compiled JS output (gitignored)
├── tests/                  # Jest test suite
│   └── __mocks__/vscode.ts # VS Code API mock
├── .cursor/                # Cursor plugin layer
│   ├── commands/           # Slash commands (/tangent, /switch, etc.)
│   ├── hooks/              # Python hooks (drive-preprocessor, plan-runner)
│   ├── plans/              # Executable plans
│   ├── rules/              # Always-applied MDC rules
│   └── skills/             # Agent skills (drive-persona, etc.)
├── .cursor-plugin/         # Plugin manifest
├── docs/                   # Documentation
│   ├── architecture/       # ADRs and system architecture
│   ├── design/             # Design rationale docs
│   ├── guides/             # How-to guides (you are here)
│   ├── prd/                # Product requirements docs
│   └── reference/          # Auto-generated reference (config, MCP tools, commands)
├── package.json            # Extension manifest + npm config
└── sandbox/                # Dev-host workspace (not committed)
```

---

## Key concepts

**Drive mode** is activated with `Ctrl+Shift+D` or by saying the wake word (`"hey drive"` by default). Status bar shows `Drive > [Mode] | [AgentName]`.

**MCP bridge** — The extension starts a local HTTP server at `http://127.0.0.1:7891/mcp`. Cursor AI calls this server to update the ShareScreen, trigger TTS, and manage agents. Registered in `.cursor/mcp.json`.

**Input pipeline** — Every message passes through: wake word → filler cleaner → glossary expander → sanitizer → approval gate → router → model selector.

**Multi-agent** — Say `/tangent [task]` to spawn a parallel agent. Use `/switch [name]` and `/merge [source] into [target]` to manage them.

---

## Making changes

Before writing code, read the relevant plan:

```
.cursor/plans/cursor-drive.plan.md     ← root plan
.cursor/plans/mvp-gaps.plan.md         ← next MVP features
.cursor/plans/test-coverage.plan.md    ← test gaps
.cursor/plans/code-optimization.plan.md ← perf work
```

Map your work to a TODO, mark it `in_progress`, then implement. See `.cursor/rules/plan-governance.mdc`.
