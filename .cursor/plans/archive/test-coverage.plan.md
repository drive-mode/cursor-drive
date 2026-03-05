---
name: Test Coverage
overview: "SUPERSEDED by quality-performance.plan.md (merged with code optimization). All test coverage work tracked in quality-performance."
planType: task
planId: test-coverage
parentPlanId: cursor-drive
childPlanIds: []
dependsOn: []
todos:
  - id: test-extension
    content: "SUPERSEDED — see quality-performance TODO qp-02."
    status: cancelled
  - id: test-mcp-server
    content: "SUPERSEDED — see quality-performance TODO qp-03."
    status: cancelled
  - id: test-config
    content: "SUPERSEDED — see quality-performance TODO qp-04."
    status: cancelled
  - id: test-drive-mode
    content: "SUPERSEDED — see quality-performance TODO qp-02."
    status: cancelled
  - id: test-status-bar
    content: "SUPERSEDED — see quality-performance TODO qp-02."
    status: cancelled
  - id: test-agent-registry
    content: "SUPERSEDED — see quality-performance TODO qp-02."
    status: cancelled
  - id: test-comms-agent
    content: "SUPERSEDED — see quality-performance TODO qp-04."
    status: cancelled
  - id: test-response-formatter
    content: "SUPERSEDED — see quality-performance TODO qp-04."
    status: cancelled
  - id: test-tts
    content: "SUPERSEDED — see quality-performance TODO qp-04."
    status: cancelled
  - id: test-share-screen
    content: "SUPERSEDED — see quality-performance TODO qp-04."
    status: cancelled
isProject: false
---

# Test Coverage Plan

Add tests for the 10 modules that have no tests. The 8 already-tested modules (router, approvalGates, toolAllowlist, glossaryExpander, sessionMemory, fillerCleaner, modelSelector, sanitizer) set the pattern to follow.

## Testing conventions in this codebase

- Test files: `tests/<module>.test.ts`
- VS Code mock: `tests/__mocks__/vscode.ts`
- Run: `npm test` (Jest + ts-jest)
- Each test must cover: success path, edge cases, failure/error paths
- Modules using `vscode.lm`: mock `vscode.lm.selectChatModels` to return a fake model

## Coverage target

Every new test file must cover:
1. Happy path
2. At least one error/exception path
3. Config-dependent behavior (enabled/disabled)
4. Cancellation or timeout where applicable

## Notes per module

**extension.ts** — Can only test that `activate()` runs without throwing and registers expected commands. Use `vscode.commands.getCommands()` after activate.

**mcpServer.ts** — Start server on a free port, call each tool handler with mock objects, verify return values. Stop server in `afterAll`.

**shareScreen.ts** — ShareScreenPanel uses a webview; test only the internal state machine (activity/file/decision arrays) by exporting the data model separately, or by calling public methods and inspecting via a test accessor.

**tts.ts** — `say.js` is a native dep; mock it via `jest.mock('say')` and verify it is called with correct args.
