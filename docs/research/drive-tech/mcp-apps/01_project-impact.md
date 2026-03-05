# MCP Apps — Project Impact on Cursor Drive

## Summary

MCP Apps enable Drive's Agent Screen (S-AS) and operator dashboards to be served as portable UI resources accessible from any MCP Apps-capable host — Claude, ChatGPT, Goose, and VS Code. This complements (not replaces) Drive's existing webview architecture and opens a cross-client portability path.

## Impact Areas

### 1. Agent Screen (S-AS) Portability

**Current state**: The Agent Screen is a VS Code webview panel (`src/agentScreen.ts`) rendered via `vscode.window.createWebviewPanel()`. It displays operator activity feeds, file touches, decisions, and plan progress. It is tightly coupled to VS Code APIs (`acquireVsCodeApi()`, `panel.webview.postMessage()`, CSP using `panel.webview.cspSource`).

**With MCP Apps**: The same activity feed HTML could be registered as a `ui://cursor-drive/agent-screen` resource on Drive's MCP server (`src/mcpServer.ts`). When a host like Claude or ChatGPT calls `agent_screen_activity`, the tool response includes `_meta.ui.resourceUri: "ui://cursor-drive/agent-screen"`, and the host renders the dashboard inline.

**What this enables**:
- Users of Claude Desktop, ChatGPT, or Goose can see Drive's Agent Screen without VS Code
- Drive becomes a **cross-client pair-programming layer**, not just a VS Code extension
- External agents (A2A tasks) that call Drive MCP tools can visualize operator activity in their own hosts

### 2. Operator Dashboards as MCP App UIs

Beyond the activity feed, MCP Apps could serve:

| Dashboard | Tool trigger | UI resource |
|-----------|-------------|-------------|
| Operator activity feed | `agent_screen_activity` | `ui://cursor-drive/agent-screen` |
| Plan progress | `agent_screen_plan_update` | `ui://cursor-drive/plan-progress` |
| Operator list + status | `operator_list` | `ui://cursor-drive/operators` |
| File diff viewer | `agent_screen_file` | `ui://cursor-drive/file-diff` |
| Decision log | `agent_screen_decision` | `ui://cursor-drive/decisions` |

Each dashboard would use bidirectional `postMessage` JSON-RPC for live updates, mirroring how the current webview uses `panel.webview.postMessage()`.

### 3. Current Webview Approach vs. MCP Apps

| Dimension | Webview (current, ADR-0003) | MCP Apps |
|-----------|---------------------------|----------|
| **Host requirement** | VS Code / Cursor only | Any MCP Apps-capable host |
| **Rendering** | `vscode.WebviewPanel` | Sandboxed iframe |
| **Communication** | `panel.webview.postMessage()` | `postMessage` JSON-RPC |
| **CSP** | `panel.webview.cspSource` | Host-managed CSP |
| **VS Code API access** | Full (`acquireVsCodeApi()`) | None (sandboxed) |
| **Styling** | VS Code CSS variables | Must bundle own styles or adapt per host |
| **Persistence** | `retainContextWhenHidden: true` | Host-dependent (no guarantee) |
| **File opening** | `vscode.workspace.openTextDocument()` | Not possible from iframe; must request via JSON-RPC |

**Key insight**: The webview path and MCP Apps path are **not mutually exclusive**. Drive can serve the same core HTML from both paths, using a thin adapter layer to bridge `acquireVsCodeApi()` (webview) vs. `McpAppGuest` (iframe).

### 4. What MCP Apps Enable

- **Cross-client portability**: Drive's UI works in Claude, ChatGPT, Goose, and VS Code without separate implementations per client.
- **Ecosystem reach**: Users who don't use Cursor can still benefit from Drive's multi-operator orchestration and see operator activity.
- **Standard contract**: UI resources use a documented spec (`ui://` scheme, JSON-RPC messaging). No proprietary APIs.
- **Composability**: Other MCP servers could embed Drive's UI components or reference Drive's `ui://` resources.

### 5. What MCP Apps Replace vs. Add

MCP Apps **do not replace** the VS Code webview. They **add** a portable rendering path.

| Stays the same | New with MCP Apps |
|---------------|------------------|
| VS Code webview as primary S-AS for Cursor users | Portable S-AS for non-VS Code hosts |
| `AgentScreenPanel.getInstance()` singleton pattern | `ui://` resource registration in `mcpServer.ts` |
| `postMessage` event-driven updates | Same pattern, different transport |
| Plan progress overlay | Plan progress as standalone MCP App UI |
| File click → open in editor | File click → JSON-RPC request to host (host-dependent behavior) |

### 6. Dependencies

| Dependency | Status | Notes |
|-----------|--------|-------|
| `@modelcontextprotocol/ext-apps` v1.0.1 | Available on npm | New dependency (~12 KB) |
| `@modelcontextprotocol/sdk` ≥1.20.0 | Already at ^1.26.0 | No upgrade needed |
| Host support for `ui://` scheme | Varies by host | Claude + ChatGPT: full; VS Code: partial; Goose: basic |
| Shared HTML component extraction | Not started | Required to avoid duplicating webview HTML |

### 7. Risks

| Risk | Severity | Notes |
|------|----------|-------|
| **Host rendering inconsistency** | Medium | CSS variables, iframe sizing, and CSP enforcement differ across hosts. S-AS may look different in Claude vs. ChatGPT vs. VS Code. |
| **Feature parity across clients** | Medium | VS Code webview supports `acquireVsCodeApi()` for file opening, clipboard, etc. MCP Apps iframe cannot do this — must degrade gracefully. |
| **iframe limitations** | Low-Medium | No top-level navigation, no local storage (host-dependent), limited DOM APIs. |
| **SDK churn** | Low | `ext-apps` is at v1.0.1. Breaking changes before v2 are unlikely but possible. |
| **Maintenance of dual rendering paths** | Medium | Supporting both webview and MCP App iframe increases surface area. Mitigated by shared HTML component extraction. |

## Conclusion

MCP Apps are a natural evolution for Drive's UI layer. They don't disrupt the existing ADR-0003 architecture — they extend it. The primary benefit is **portability**: Drive's Agent Screen becomes available to users of any MCP Apps-capable AI host. The primary cost is **dual rendering path maintenance**, which is manageable with a shared UI component strategy.
