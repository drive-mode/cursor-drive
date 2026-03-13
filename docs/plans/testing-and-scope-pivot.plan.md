# Testing Plan & Scope Pivot Analysis

**Date:** 2026-03-09
**Sources:** Subagent discovery (VS Code extension docs, copilot-sdk changelog, Drive scope analysis)

---

## Part 1: Full Testing Plan (VS Code Extension Best Practices)

### Current State

| Layer | Tool | Status |
|-------|------|--------|
| Unit | Jest + `vscode` mock | ✅ 555 tests |
| Integration (Extension Host) | — | ❌ None |
| E2E | Playwright (`test:browser`) | ⚠️ Browser only; no Electron |

### Recommended Additions

#### 1. Integration Tests (@vscode/test-cli)

**Purpose:** Run tests inside Extension Host with full VS Code API.

```bash
npm install --save-dev @vscode/test-cli @vscode/test-electron
```

```json
// package.json
"scripts": {
  "test": "jest",
  "test:integration": "vscode-test"
}
```

```js
// .vscode-test.mjs
const { defineConfig } = require('@vscode/test-cli');
module.exports = defineConfig({
  files: 'out/test/**/*.test.js',
  workspaceFolder: './sampleWorkspace',
  version: 'stable',
  mocha: { ui: 'tdd', timeout: 20000 }
});
```

**Test scope:**
- Extension activates
- Commands registered and invokable (`cursorDrive.toggle`, `cursorDrive.showAgentScreen`)
- Config read correctly
- MCP server starts (if testable in Extension Host)

**Constraints:**
- Only one VS Code instance can run extension tests at a time
- Linux CI: use `xvfb-run -a npm run test:integration`

#### 2. E2E (Minimal Regression)

Per `drive-ui-surfaces-and-devtools.md`:
- Use Playwright/Electron for **minimal flows** only (e.g. toggle Drive → status bar text)
- Do not rely on full IDE chrome discovery; brittle across Cursor versions
- `drive-ui-test` skill: agent-browser + Electron for Drive status bar, Agent Screen, QuickPicks

#### 3. CI Flow

```yaml
# .github/workflows/ci.yml addition
- run: xvfb-run -a npm run test:integration
  if: runner.os == 'Linux'
- run: npm run test:integration
  if: runner.os != 'Linux'
```

### Testing AI/Chat Integration

| Approach | Applicability |
|----------|---------------|
| Mock `executeCommand`, `getConfiguration` | ✅ Already done |
| Test via commands and context keys | ✅ Use `workbench.action.inspectContextKeys` |
| Webview tests | ✅ `data-testid` in Agent Screen, Jest + DOM |
| Composer DOM injection | ❌ Not possible; extensions cannot modify chat input |

---

## Part 2: Copilot SDK vs Cursor Drive

### Key Finding: copilot-sdk Is Not for VS Code Extensions

| Package | Purpose | Target |
|---------|---------|--------|
| **@github/copilot-sdk** | Programmatic access to **GitHub Copilot CLI** agent | Apps, scripts, automation (JSON-RPC) |
| **@github/copilot-language-server** | LSP-based editor integration | VS Code, JetBrains, Vim, Xcode |

**copilot-sdk** features (v0.1.28–0.1.32):
- Custom tools, MCP server config, hooks, user input handlers
- `session.setModel()`, permission checks, agent selection
- **Not** an extension API; it talks to the Copilot CLI agent

### VS Code AI Extensibility (Separate from copilot-sdk)

| API | Purpose |
|-----|---------|
| Chat Participant | @-mention assistants in chat |
| Language Model Tools | Agent mode tools, #-mention |
| MCP tools | SSE, Streamable HTTP, stdio |
| Language Model API | Direct model access |

**Cursor does not support** Chat Participant API. Drive relies on Cursor-specific hooks.

---

## Part 3: Scope Pivot — GitHub Copilot in VS Code

### Overlap with Drive

| Drive Concept | copilot-sdk | VS Code Copilot Extensibility |
|---------------|-------------|-------------------------------|
| Voice-first UX | None | None |
| Multi-operator | Single-session; no hierarchy | Single Chat Participant |
| Agent Screen | No equivalent | No equivalent |
| MCP bridge | MCP config for sessions | MCP tools in agent mode |
| Prompt interception | Hooks (session lifecycle) | No `beforeSubmitPrompt` equivalent |

### Critical Blocker: No Prompt Interception

Cursor’s `beforeSubmitPrompt` hook is the **primary pipeline entry**. VS Code/Copilot does not expose an equivalent.

| Option | Feasibility |
|--------|-------------|
| Chat Participant API | Unknown; Copilot may use it; Drive could register a participant |
| MCP Prompts | Partial; slash commands, not every prompt |
| LM Tools API | Partial; semantics differ from global pre-submit |
| Extension middleware | TBD; depends on Copilot extension APIs |

### Portable vs Cursor-Only

**Portable (~60–70%):**
- MCP server and tools
- Config schema (namespace change)
- Glossary, filler, sanitizer, approval gates
- Model selector, router
- Agent Screen webview, status bar, TTS
- Operator semantics (spawn/switch/merge)

**Cursor-only (drop or replace):**
- `beforeSubmitPrompt` / `drive-preprocessor.py`
- Cursor CLI runner, Cloud Agents client
- `.cursor/` plugin layout, `plan-runner.py`
- `vscode.cursor.mcp.registerServer`, Cursor deep links

### Recommendation

| Path | Pros | Cons |
|------|-----|-----|
| **Stay on Cursor** | Full pipeline; prompt interception; voice, operators, Agent Screen | Cursor-only; no official extension testing docs |
| **Pivot to Copilot** | VS Code ecosystem; official testing; broader audience | Lose prompt interception; no multi-operator; different product |
| **Dual target** | Maximize reuse | High complexity; two entry points; divergent behavior |

**If pivoting:** Treat as a **new product**, not a fork. Entry point would be Chat Participant or LM Tools; ~60–70% of logic reusable. copilot-sdk would **not** be the extension API; use VS Code’s Chat Participant and MCP APIs instead.

---

## Part 4: Action Items

### Testing (Regardless of Scope)

1. Add `@vscode/test-cli` + `@vscode/test-electron` for integration suite
2. Create `sampleWorkspace/` and `.vscode-test.mjs`
3. Add 5–10 integration tests: activation, commands, config
4. Document CI flow for Linux (`xvfb-run`)
5. Keep Playwright for minimal E2E (drive-ui-test skill)

### Scope Decision

| If staying on Cursor | If pivoting to Copilot |
|---------------------|------------------------|
| Continue MVP; add integration tests | Spike: Chat Participant + MCP tools |
| Document Cursor-specific constraints | Abstract entry point; drop Cursor Cloud/CLI |
| Use drive-ui-test for manual/E2E | Same testing stack; different activation |

---

## References

- [VS Code Testing Extensions](https://code.visualstudio.com/api/working-with-extensions/testing-extension)
- [helloworld-test-cli-sample](https://github.com/microsoft/vscode-extension-samples/tree/main/helloworld-test-cli-sample)
- [drive-ui-surfaces-and-devtools.md](../design/ux/drive-ui-surfaces-and-devtools.md)
- [cursor-drive-master.plan.md](../../.cursor/plans/cursor-drive-master.plan.md)
