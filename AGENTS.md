# AGENTS.md

## Cursor Cloud specific instructions

### Overview

Cursor Drive is a VS Code/Cursor extension (TypeScript). Single package, no monorepo. No databases, no Docker, no external services required.

### Cursor-specific constraints

- **Composer UI is not extensible.** Extensions run in the extension host; they cannot modify the chat input, send button, or mic. Do not attempt DOM injection into Cursor/VS Code chrome.
- **Extension vs Plugin:** VS Code extension (`src/`) for UI; Cursor Plugin (`.cursor-plugin/`) for AI behavior; MCP Apps for inline chat UI (Cursor 2.6+).
- **Key docs:** [drive-ui-surfaces-and-devtools](docs/design/ux/drive-ui-surfaces-and-devtools.md), [composer-mode-dropdown-integration](docs/design/ux/composer-mode-dropdown-integration.md), [drive-tech research](docs/research/drive-tech/).

### Build, test, lint

Standard commands are in `package.json` scripts and `CONTRIBUTING.md`:

| Task | Command |
|------|---------|
| Install deps | `npm ci` |
| Compile (also serves as type-check/lint) | `npm run compile` |
| Run tests | `npm test` |
| Package VSIX | `npx vsce package --allow-missing-repository` |

No ESLint is configured. `npm run compile` (`tsc`) is the sole lint/type-check gate.

### Node version

CI pins Node 20 (see `.github/workflows/ci.yml`). Use `nvm use 20` if a different version is active.

### Python hooks

Four Cursor hooks in `.cursor/hooks/` are Python 3 scripts. They read JSON from stdin and are invoked by the Cursor plugin system — not run standalone. They only need stdlib (no pip dependencies). Verify with `python3 -c "import py_compile; py_compile.compile('.cursor/hooks/<name>.py', doraise=True)"`.

### Gotchas

- The extension's `main` entry is `out/extension.js` — always run `npm run compile` after source changes before testing.
- Tests mock `vscode` via `tests/__mocks__/vscode.ts`; never import real vscode in tests.
- `npm run watch` provides incremental recompilation during development.
- VSIX packaging runs `npm run compile` automatically via the `vscode:prepublish` script.

### Sync with claude-drive

Shared types and logic are kept in sync with the sibling CLI port [`claude-drive`](https://github.com/hhalperin/claude-drive). When changing business logic here, mirror these files manually:

- `src/syncTypes.ts` — copy to `claude-drive/src/syncTypes.ts` with minor import fixes
- `src/operatorRegistry.ts`, `src/router.ts` — keep in sync
- `src/tts.ts`, `src/edgeTts.ts`, `src/piper.ts` — keep in sync

## Maintainers

- [@hhalperin](https://github.com/hhalperin) — lead
- [@ai-secretagent](https://github.com/ai-secretagent) — co-maintainer
