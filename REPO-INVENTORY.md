# Cursor Drive — Full Repository Inventory

Generated inventory with exact paths, line numbers, and full content where relevant.

---

## 1. Full Directory Tree

**Note:** Full flat list (33,091 entries including node_modules) saved to agent-tools output. Hierarchical tree below excludes `node_modules` for readability. Run `Get-ChildItem -Recurse -Force -Name` in repo root for complete flat list.

### Project tree (excluding node_modules)

```
cursor-drive/
├── .agents/skills/
│   ├── agent-browser/ (SKILL.md, references/, templates/)
│   └── electron/ (SKILL.md)
├── .cursor/
│   ├── agents/ (drive-operator, drive-reviewer, plan-governor, plan-orchestrator, verifier)
│   ├── commands/drive-research/ (01-05_*.md)
│   ├── hooks/ (dep-auditor, drive-preprocessor, plan-frontmatter-changed, plan-runner)
│   ├── plans/ (registry, plan-graph, task-graph, *.plan.md, archive/, sdk_and_protocol_research_6c42aa0c/)
│   ├── rules/ (*.mdc)
│   ├── scripts/ (start-github-mcp.ps1)
│   ├── skills/ (agent-browser, compound-workflow, create-plan, doc-*, drive-*, electron, execute-plans, merge, plan-*, reconciliation-generator, switch, tangent, update-docs)
│   ├── BUGBOT.md, hooks.json, mcp.json, settings.json
├── .cursor-plugin/ (mirrors .cursor structure: agents, assets, commands, hooks, rules, skills)
├── .github/workflows/ (ci, cloudflare-token-test, develop-to-main, pr-checks, reinstall)
├── .local/git-sync/
├── .vscode/ (launch.json, tasks.json)
├── assets/ (logo.png, logo.svg)
├── docs/ (architecture, design, guides, plans, prd, prompts, reference, research, solutions)
├── node_modules/ (25,754+ entries)
├── sandbox/
├── scripts/
├── src/
├── tests/
├── .cursorignore, .env, .env.example, .gitignore, .vscodeignore
├── AGENTS.md, CHANGELOG.md, CONTRIBUTING.md, LICENSE
├── cursor-drive-0.3.0.vsix, cursor-drive-0.3.1.vsix
├── mcp.json, package.json, package-lock.json
├── playwright.config.ts, PLUGIN-README.md
├── README.md, skills-lock.json
├── tsconfig.json, tsconfig.test.json
```

**File counts:**
- Total (incl. node_modules): ~33,091
- Excluding node_modules: ~25,754

---

## 2. package.json — Full Extract

**Path:** `c:\Users\harri\Documents\Coding Projects\fun\cursor-drive\package.json`

### Dependencies

| Package | Version |
|---------|---------|
| @agentclientprotocol/sdk | ^0.14.1 |
| @modelcontextprotocol/ext-apps | ^1.1.2 |
| @modelcontextprotocol/sdk | ^1.26.0 |
| zod | ^4.3.6 |

### devDependencies

| Package | Version |
|---------|---------|
| @playwright/test | ^1.58.2 |
| @types/jest | ^30.0.0 |
| @types/node | ^20 |
| @types/vscode | ^1.85.0 |
| @vscode/vsce | ^3.7.1 |
| jest | ^30.2.0 |
| ts-jest | ^29.4.6 |
| typescript | ^5.3.0 |

### optionalDependencies

| Package | Version |
|---------|---------|
| say | ^0.16.0 |

### peerDependencies

*None defined.*

### Engine requirements

| Engine | Constraint |
|--------|------------|
| vscode | ^1.85.0 |

### Scripts

| Script | Command |
|--------|---------|
| build:plugin | node scripts/build-plugin.mjs |
| bundle:mcp-app | node scripts/bundle-mcp-app.mjs |
| vscode:prepublish | npm run bundle:mcp-app && npm run compile |
| compile | tsc -p ./ |
| watch | tsc -watch -p ./ |
| test | jest |
| dev-loop | node sandbox/dev-loop.mjs |
| dev-loop:serve | node sandbox/dev-loop.mjs --serve-web |
| reinstall | node scripts/reinstall-extension.mjs |
| reinstall:serve-web | node scripts/reinstall-extension.mjs --serve-web |
| reinstall:dev-sandbox | node scripts/reinstall-extension.mjs --dev-sandbox |
| test:browser | playwright test |
| cloudflare:create-token | node scripts/create-cloudflare-token.mjs |
| cloudflare:trigger | node scripts/trigger-cloudflare-test.mjs |
| cloudflare:verify | node scripts/verify-cloudflare-token.mjs |

### Jest config (package.json lines 386–404)

```json
"jest": {
  "preset": "ts-jest",
  "testEnvironment": "node",
  "testMatch": ["**/tests/**/*.test.ts"],
  "moduleNameMapper": {
    "^vscode$": "<rootDir>/tests/__mocks__/vscode.ts",
    "^(\\.\\.?/.*)\\.js$": "$1"
  },
  "transform": {
    "^.+\\.ts$": ["ts-jest", { "tsconfig": "tsconfig.test.json" }]
  }
}
```

---

## 3. TypeScript / JavaScript Compiler Settings

### tsconfig.json

**Path:** `c:\Users\harri\Documents\Coding Projects\fun\cursor-drive\tsconfig.json`  
**Lines:** 1–19

```json
{
  "compilerOptions": {
    "module": "Node16",
    "target": "ES2022",
    "lib": ["ES2022", "DOM"],
    "sourceMap": true,
    "rootDir": "src",
    "outDir": "out",
    "strict": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"]
}
```

| Option | Value |
|--------|-------|
| module | Node16 |
| target | ES2022 |
| lib | ES2022, DOM |
| sourceMap | true |
| rootDir | src |
| outDir | out |
| strict | true |
| skipLibCheck | true |
| include | src/**/* |

### tsconfig.test.json

**Path:** `c:\Users\harri\Documents\Coding Projects\fun\cursor-drive\tsconfig.test.json`  
**Lines:** 1–11

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "rootDir": ".",
    "isolatedModules": true
  },
  "include": ["src/**/*", "tests/**/*"]
}
```

| Override | Value |
|----------|-------|
| rootDir | . |
| isolatedModules | true |
| include | src/**/*, tests/**/* |

### jsconfig.json

**Not present.**

---

## 4. .cursorrules, .cursorignore, cursor-drive.config.*

### .cursorrules

**Not present.** No `.cursorrules` file in repo. Rules live in `.cursor/rules/*.mdc` and `.cursor-plugin/rules/*.mdc`.

### .cursorignore

**Path:** `c:\Users\harri\Documents\Coding Projects\fun\cursor-drive\.cursorignore`  
**Lines:** 1–39

```
# Dependencies / build
node_modules/
out/
*.tsbuildinfo
coverage/
.vscode-test/
playwright-report/
test-results/
*.vsix

# Runtime / generated
.cursor/drive-bridge.json
.cursor/debug-*.log
.cursor/plans/.plan-frontmatter-hash
.cursor/plans/archive/
.cursor/hooks/__pycache__/
sandbox/

# Secrets / env
.env
.env.*
secrets.json
secrets.*.json
private.*
identity.*
tokens.*
auth.*

# Logs / caches
*.log
.cache/
.logs
/.logs/

# IDE / OS
.DS_Store
Thumbs.db
.history/
```

### cursor-drive.config.*

**Not present.** No `cursor-drive.config.*` files found. Configuration is in VS Code settings (`cursorDrive.*`).

---

## 5. README.md — Full Content

**Path:** `c:\Users\harri\Documents\Coding Projects\fun\cursor-drive\README.md`  
**Lines:** 1–156

```markdown
# Cursor Drive

A voice-first, multi-operator pair-programming layer for Cursor IDE. Steer operators via voice and chat; they share the Agent Screen. No cloud, no accounts.

[![CI](https://github.com/drive-mode/cursor-drive/actions/workflows/ci.yml/badge.svg)](https://github.com/drive-mode/cursor-drive/actions/workflows/ci.yml)

---

## The idea in one interaction

\`\`\`
You (spoken):  "uhh maybe like refactor auth and also tangent — explore that
                new clerk integration in parallel"

Drive hears:   "Refactor auth module"
               + spawns Agent-2 on: "Research Clerk auth integration options"

Status bar:    Drive > Agent  [Agent-1: auth refactor]  [Agent-2: clerk research]

Agent-1 speaks: "Done — extracted AuthService, added tests. Summary in
                 docs/auth-refactor.md, want details?"

Agent-2 speaks: (different voice) "Found three integration paths. Sharing screen."
\`\`\`

**Operator Flow in Drive Mode**

\`\`\`mermaid
flowchart LR
  User --> WakeWord[Wake word]
  WakeWord --> DriveMode[Drive mode activated]
  DriveMode --> AgentPlans[Cursor agent plans work]
  AgentPlans --> Operators[Creates operators]
  Operators --> ShareScreen[Operator shares screen]
  ShareScreen --> User
\`\`\`

Drive mode transforms Cursor into a **senior engineer pair-programming partner**: concise, proactive, explains when helpful, challenges your choices once before deferring. You and your operators see the same screen in real time.

---

## Installation

**Prerequisites:** Node 20+, npm, Cursor IDE.

\`\`\`bash
git clone https://github.com/drive-mode/cursor-drive
cd cursor-drive
npm install
npm run compile
\`\`\`

Press **F5** in Cursor to launch an Extension Development Host.

**MCP one-click install:** [Install Drive MCP](cursor://anysphere.cursor-deeplink/mcp/install?name=drive&config=eyJkcml2ZSI6eyJ1cmwiOiJodHRwOi8vMTI3LjAuMC4xOjc4OTEvbWNwIn19) — click or paste into the browser. The extension must be running; if port 7891 is in use, the server uses 7892, 7893, etc. — check the Cursor Drive output channel.

**MCP Apps (Cursor 2.6+):** Enable `cursorDrive.mcp.enableApps` for inline Agent Screen UI. See [demo-mcp-apps](docs/guides/demo-mcp-apps.md).

---

## Quick Start

1. Clone and install (see above).
2. Run `npm run compile`.
3. Press **F5** in Cursor to open the Extension Development Host.
4. Toggle Drive or use the first-run prompt.

See [getting started](docs/guides/getting-started.md) for the full dev loop.

---

## Architecture

Extension (`src/`), plugin layer (`.cursor/`), and MCP server — bridged at `:7891`.

\`\`\`
┌─────────────────────────────────────────────────────────────────┐
│                        Cursor IDE                               │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Extension (src/)     MCP :7891     .cursor/ Plugin      │    │
│  │  Pipeline, S-AS, TTS  ←→ Bridge ←→  skills, rules, hooks│    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
\`\`\`

**Extension vs Cursor Plugin:** The VS Code extension provides UI (status bar, Drive sidebar, Agent Screen). The Cursor Plugin (`.cursor-plugin/`) adds AI behavior (skills, rules). MCP Apps (Cursor 2.6+) enable inline UI in chat when `cursorDrive.mcp.enableApps` is on.

**UI surfaces:** Status bar (click → mode QuickPick), Drive sidebar (Activity Bar icon), Agent Screen (tab/panel). `Ctrl+Shift+D` toggles Drive. Composer (chat, send button, mic) is not extensible — extensions run in the extension host. See [drive-ui-surfaces-and-devtools](docs/design/ux/drive-ui-surfaces-and-devtools.md).

See [docs/architecture/README.md](docs/architecture/README.md) for the component map and ADRs.

---

## Key design decisions

| Principle | What it means |
|-----------|---------------|
| No cloud | TTS, filler cleaning, MCP run locally. ElevenLabs optional. |
| Config-first | Every behavior is a setting. Privacy-strict defaults. See [config schema](docs/reference/config-schema.md). |
| Cursor-native | Wraps Agent/Plan/Ask/Debug; `beforeSubmitPrompt` is primary entry. See [ADR-0008](docs/architecture/adr/ADR-0008-drive-mode-wrapper-architecture.md). |
| Concise-first | Summarizes, tells you where things went, waits. Configurable verbosity. |

---

## Source modules

| Component | Purpose |
|-----------|---------|
| extension.ts | Entry point, commands, MCP server |
| driveMode.ts | Drive state, `active` + `subMode` |
| statusBar.ts | Status bar, mode QuickPick |
| router.ts | Intent routing: plan/run/direct/collab |
| modelSelector.ts | 3-tier cost selection |
| fillerCleaner.ts | Client-side filler removal |
| operatorRegistry.ts | Operator pool: spawn, switch, merge |
| agentScreen.ts | Agent Screen (S-AS) webview |
| tts.ts | OS-native speech via say.js |
| mcpServer.ts | Local HTTP server on :7891 |

Full [component map](docs/architecture/README.md#component-map) in `docs/architecture/README.md`.

---

## Multi-agent / Tangent flow

Spawn parallel operators, switch focus, merge context.

\`\`\`
You:       "/tangent — explore the Clerk integration"
Drive:     spawns operator Beta, background
           Alpha continues (auth refactor)

You:       "/switch clerk"
Drive:     Beta foreground, Alpha background

You:       "/merge Beta into Alpha"
Drive:     Beta context merged into Alpha, Beta retired
\`\`\`

See [prd-multi-agent](docs/prd/prd-multi-agent.md) for the full spec.

---

## Documentation

| Topic | Where |
|-------|-------|
| Architecture, ADRs | [docs/architecture/](docs/architecture/README.md) |
| Guides, dev setup | [docs/guides/](docs/guides/README.md) |
| Config, MCP tools | [docs/reference/](docs/reference/README.md) |
| PRDs | [docs/prd/](docs/prd/README.md) |
| Design rationale | [docs/design/](docs/design/README.md) |
| Contributing | [CONTRIBUTING.md](CONTRIBUTING.md) |

---

## Status

Core pipeline working: filler cleaner, router, model selector, status bar, TTS (say.js), operator registry, Share-AgentScreen (S-AS) webview, MCP server with tools. Prompt optimizer pending (tracked in `.cursor/plans/archive/mvp-gaps.plan.md`). Several modules have unit tests.

---

## Support / Contributing

- **Contributing:** See [CONTRIBUTING.md](CONTRIBUTING.md) for branch strategy, PR workflow, and code quality.
- **Issues:** [GitHub Issues](https://github.com/drive-mode/cursor-drive/issues) for bugs and feature requests.
- **Docs:** [docs/README.md](docs/README.md) for the full doc index.

---

## License

Proprietary — All Rights Reserved. See [LICENSE](LICENSE).
```

---

## Summary

| Item | Status |
|------|--------|
| .cursorrules | Not present (rules in .cursor/rules/*.mdc) |
| .cursorignore | Present, 39 lines |
| cursor-drive.config.* | Not present |
| jsconfig.json | Not present |
| tsconfig.json | Present |
| tsconfig.test.json | Present (extends tsconfig.json) |
| package.json | Present (deps, scripts, engines documented above) |
| README.md | Present, 156 lines |
