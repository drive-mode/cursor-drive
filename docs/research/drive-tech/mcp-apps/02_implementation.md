# MCP Apps — Implementation Plan

## Current State

### Agent Screen (`src/agentScreen.ts`)

The Agent Screen is a VS Code webview panel implemented as a singleton (`AgentScreenPanel`). Key characteristics:

- **Rendering**: Inline HTML string built by `buildHtml()`, injected into a `vscode.WebviewPanel`.
- **Communication**: `panel.webview.postMessage()` pushes `ActivityEvent` objects (activity, file, decision, agentSwitch, clear, planProgress). The webview JS receives them via `window.addEventListener('message', ...)`.
- **Interactivity**: File clicks send `openFile` messages back to the extension. Ctrl+click opens an "ask about" overlay. Plan progress TODOs link to plan files.
- **Styling**: Uses VS Code CSS variables (`--vscode-editor-foreground`, etc.) for native theme integration.
- **CSP**: Enforced via `panel.webview.cspSource` nonce-based policy.
- **Display modes**: Tab (webview panel), bottomLog (OutputChannel fallback).

### MCP Server (`src/mcpServer.ts`)

- HTTP server on `:7891` using `@modelcontextprotocol/sdk` with `StreamableHTTPServerTransport`.
- 30+ tools registered, including `agent_screen_activity`, `agent_screen_file`, `agent_screen_decision`, `agent_screen_plan_update`.
- Agent Screen tools call `AgentScreenPanel.getInstance()?.logActivity(...)` etc.
- No `ui://` resources registered today.

## Integration Points

### `mcpServer.ts` — Add UI Resources

Register `ui://cursor-drive/agent-screen` (and other UI resources) alongside existing tools. When `agent_screen_activity` is called, include `_meta.ui.resourceUri` in the tool result.

### `agentScreen.ts` — Dual Rendering Path

Extract the core HTML/JS from `buildHtml()` into a shared module that can be rendered in both:
1. VS Code webview (current path — uses `acquireVsCodeApi()`, VS Code CSP)
2. MCP App iframe (new path — uses `McpAppGuest`, standalone CSP)

## Option A: Swap-First (Recommended for Prototype)

Add MCP App UI resources to the existing MCP server tools with minimal refactoring. Keep the webview as the primary path; MCP App is an additive output channel.

### Changes

**`src/mcpServer.ts`** (~100 lines new):

```typescript
import { McpAppResource } from "@modelcontextprotocol/ext-apps";

// Register UI resource
this.mcpServer.resource(
  "ui://cursor-drive/agent-screen",
  "Interactive Agent Screen showing operator activity, files, and decisions",
  async () => ({
    contents: [{
      uri: "ui://cursor-drive/agent-screen",
      mimeType: "text/html",
      text: buildAppHtml(), // shared HTML builder
    }],
  })
);
```

**Tool result augmentation** (~20 lines per tool):

```typescript
this.mcpServer.tool(
  "agent_screen_activity",
  // ... existing schema ...
  async ({ operator_name, text }) => {
    agentScreenActivity(operator_name, text);
    return {
      content: [{ type: "text" as const, text: "ok" }],
      _meta: {
        ui: { resourceUri: "ui://cursor-drive/agent-screen" },
      },
    };
  }
);
```

**`src/agentScreenApp.ts`** (~80 lines, new file):

Shared HTML builder that produces standalone HTML (no `acquireVsCodeApi()` dependency). Uses `McpAppGuest` for communication when running in an MCP App iframe:

```typescript
export function buildAppHtml(): string {
  return `<!DOCTYPE html>
<html>
<head>
  <style>/* bundled styles, no VS Code CSS vars */</style>
</head>
<body>
  <div id="app"><!-- activity feed, files, decisions tabs --></div>
  <script>
    // Detect environment
    const isVsCode = typeof acquireVsCodeApi === 'function';
    const messenger = isVsCode
      ? acquireVsCodeApi()
      : new McpAppGuest(window.parent);

    window.addEventListener('message', (e) => {
      // Same event handling as current webview
    });
  </script>
</body>
</html>`;
}
```

### Estimated Effort

| Component | Lines | Risk |
|-----------|-------|------|
| UI resource registration | ~30 | Low |
| Tool result `_meta.ui` augmentation | ~60 | Low |
| Shared HTML builder | ~80 | Medium (CSS adaptation) |
| Guest-side messaging adapter | ~30 | Medium (host compatibility) |
| **Total** | **~200** | **Low-Medium** |

## Option B: Clean Refactor

Extract Agent Screen rendering into a framework-agnostic UI component that targets multiple renderers.

### Architecture

```
src/agentScreenCore.ts    — Event model, state management, no DOM
src/agentScreenWebview.ts — VS Code webview renderer (current buildHtml)
src/agentScreenApp.ts     — MCP App renderer (standalone HTML, McpAppGuest)
src/agentScreen.ts        — Orchestrator: picks renderer based on context
```

### Changes

- **`agentScreenCore.ts`** (~150 lines): Pure TypeScript event model. Holds activity list, file set, decision log, plan progress state. Emits typed events.
- **`agentScreenWebview.ts`** (~200 lines): Adapts core to VS Code webview. Uses `acquireVsCodeApi()`, VS Code CSS variables, and `panel.webview.cspSource`.
- **`agentScreenApp.ts`** (~150 lines): Adapts core to MCP App iframe. Uses `McpAppGuest`, bundled CSS, standalone CSP.
- **`agentScreen.ts`** (~50 lines modified): Delegates to webview or App renderer based on `cursorDrive.mcp.enableApps` config flag.

### Estimated Effort

| Component | Lines | Risk |
|-----------|-------|------|
| Core extraction | ~150 | Medium (refactor risk) |
| Webview renderer | ~200 | Low (mostly moving existing code) |
| App renderer | ~150 | Medium (host compatibility) |
| Orchestrator changes | ~50 | Low |
| **Total** | **~550** | **Medium** |

### Trade-offs

| Dimension | Option A | Option B |
|-----------|----------|----------|
| Time to first value | ~1 day | ~3 days |
| Code duplication | Some (two HTML builders) | Minimal (shared core) |
| Testability | Moderate | High (core is pure TS) |
| Future extensibility | Limited | Clean abstraction layer |
| Risk of breaking existing webview | Very low | Low (refactor, but well-scoped) |

**Recommendation**: Start with **Option A** for the prototype. If the prototype succeeds and MCP Apps are adopted, follow up with **Option B** refactor before expanding to more UI resources.

## Tests and Evaluations

### Unit Tests

| Test | What it validates |
|------|------------------|
| `mcpServer.test.ts` — UI resource serving | `ui://cursor-drive/agent-screen` returns valid HTML with correct MIME type |
| `agentScreenApp.test.ts` — shared HTML builder | Output is valid HTML, contains required DOM elements, no `acquireVsCodeApi` call |
| Tool result `_meta.ui` | `agent_screen_activity` response includes `_meta.ui.resourceUri` |

### Integration Tests

| Test | What it validates |
|------|------------------|
| MCP client → UI resource fetch | Connect to Drive MCP server, call `agent_screen_activity`, verify `_meta.ui` in response, fetch `ui://` resource |
| Bidirectional messaging | Guest sends `getState` request via `postMessage`, host responds with current activity list |
| Lifecycle | Mount → receive events → unmount cycle completes without errors |

### Host Rendering Tests (Manual)

| Host | Test |
|------|------|
| **Claude Desktop** | Call `agent_screen_activity` via MCP, verify iframe renders activity feed |
| **VS Code** | Same test; verify webview path still works when `enableApps` is false |
| **ChatGPT** | Same test; note any CSS/rendering differences |

### Evaluation Criteria

| Criterion | Pass condition |
|-----------|---------------|
| Rendering consistency | Activity feed looks usable (not necessarily identical) in ≥2 hosts |
| Latency | UI resource fetch < 50ms (localhost) |
| No regression | Existing webview tests pass; Agent Screen works as before when `enableApps` is false |
| Message round-trip | Guest→Host→Guest message completes in < 100ms |

## Rollout Plan

### Phase 1: Feature-Flagged Prototype

1. Add `cursorDrive.mcp.enableApps` boolean config (default: `false`).
2. Implement Option A (swap-first): register `ui://cursor-drive/agent-screen`, augment tool results with `_meta.ui`.
3. Prototype uses a simplified activity feed (no plan progress, no file click-to-open).
4. Test in Claude Desktop and VS Code.

### Phase 2: Validation

5. Gather feedback on rendering quality across hosts.
6. Measure adoption: how many users enable the flag.
7. Identify host-specific issues (CSS, CSP, messaging).

### Phase 3: Expansion (If Prototype Succeeds)

8. Implement Option B refactor (shared core).
9. Add remaining UI resources: plan progress, operator list, file diff.
10. Enable by default when ≥2 hosts render consistently.

### Phase 4: Full Integration

11. MCP App UI becomes the default rendering path for non-VS Code hosts.
12. VS Code webview remains primary for Cursor/VS Code users.
13. Document cross-host UI differences in `docs/reference/mcp-apps-host-compat.md`.
