# MCP Apps — Technology Overview

## What Are MCP Apps?

MCP Apps are an official extension to the Model Context Protocol (MCP) that enables MCP servers to return **interactive UI components** — not just text — as part of tool responses. Announced January 2026 and stabilized on 2026-01-26, MCP Apps let a tool call produce a rich dashboard, form, or visualization that the host renders inside a sandboxed iframe.

Before MCP Apps, MCP tools could only return structured text (`content: [{ type: "text", text: "..." }]`). MCP Apps add a parallel UI channel: a tool response can include a `_meta.ui.resourceUri` pointing to an HTML resource that the host fetches and renders alongside (or instead of) the text response.

## Key Concepts

| Concept | Description |
|---------|-------------|
| **UI Resource** | An HTML document served by the MCP server under the `ui://` scheme. Registered via `server.resource()`. |
| **`_meta.ui.resourceUri`** | Field in a tool response that tells the host "render this UI resource." |
| **Sandboxed iframe** | Hosts render UI resources in a sandboxed `<iframe>` with restricted permissions (no top-level navigation, no plugins). |
| **Bidirectional messaging** | JSON-RPC messages flow between host and guest via `postMessage`. The guest can request data or trigger actions; the host can push updates. |
| **App lifecycle** | Create → Mount → Message → Unmount → Destroy. Host manages lifecycle; guest responds to lifecycle events. |

## Architecture

```
┌─────────────┐     HTTP POST      ┌──────────────────┐
│  AI Client   │ ─── tool call ───► │   MCP Server     │
│  (host)      │                    │  (e.g. Drive)    │
│              │ ◄── tool result ── │                  │
│              │   + _meta.ui       │  registers       │
│              │     .resourceUri   │  ui:// resources  │
└──────┬───────┘                    └──────────────────┘
       │
       │ fetches ui://server/resource
       ▼
┌──────────────┐    postMessage     ┌──────────────────┐
│  Host frame  │ ◄────────────────► │  Sandboxed       │
│  (renderer)  │    JSON-RPC        │  iframe (guest)  │
└──────────────┘                    └──────────────────┘
```

1. **Server** registers UI resources (`ui://server-name/resource-id`) alongside tools.
2. **Tool call** returns `_meta.ui.resourceUri` in its response metadata.
3. **Host** fetches the HTML resource from the server and mounts it in a sandboxed iframe.
4. **Guest** (iframe) communicates with the host via `postMessage`-based JSON-RPC for data fetching, state updates, and action triggers.

## App Lifecycle

| Phase | Trigger | What happens |
|-------|---------|-------------|
| **Create** | Host receives `_meta.ui.resourceUri` in tool result | Host fetches HTML from server |
| **Mount** | Host injects HTML into sandboxed iframe | Guest JS initializes; sends `ready` message |
| **Message** | User interaction or data push | Bidirectional JSON-RPC over `postMessage` |
| **Unmount** | User navigates away or host reclaims space | Host sends `unmount` event; guest saves state |
| **Destroy** | Session ends or resource deallocated | Cleanup; iframe removed from DOM |

## How MCP Apps Differ from MCP Servers and Connectors

| Aspect | MCP Server | MCP Connector | MCP App |
|--------|-----------|---------------|---------|
| **Purpose** | Expose tools, resources, prompts to AI | Client-side adapter to connect to servers | Return interactive UI from tool calls |
| **Output** | Structured text/JSON | N/A (transport layer) | HTML + JS rendered in sandboxed iframe |
| **User interaction** | None (AI-mediated) | None | Direct (forms, buttons, visualizations) |
| **Spec layer** | Core MCP | Core MCP | Extension (`@modelcontextprotocol/ext-apps`) |
| **Transport** | stdio, HTTP, SSE | Matches server transport | `postMessage` (host↔guest) |

MCP Apps **extend** MCP servers — they don't replace them. A server that serves Apps still serves regular tools and resources. The App UI is an additional output channel for tools that benefit from rich presentation.

## SDK Details

- **Package**: `@modelcontextprotocol/ext-apps` v1.0.1
- **Peer dependency**: `@modelcontextprotocol/sdk` ≥1.20.0
- **API surface**:
  - `server.resource(uri, handler)` — register a `ui://` resource
  - Tool result `_meta.ui.resourceUri` — point host to a UI resource
  - Guest-side: `McpAppGuest` class handles lifecycle and messaging
  - Host-side: `McpAppHost` class manages iframe creation and message routing
- **Bundle**: ESM + CJS, TypeScript declarations included
- **Size**: ~12 KB minified (guest runtime); host runtime varies by integration

## Ecosystem Maturity

| Date | Milestone |
|------|-----------|
| 2025-11 | MCP 1.0 spec finalized (tools, resources, prompts) |
| 2026-01-15 | MCP Apps extension announced (draft spec) |
| 2026-01-26 | MCP Apps spec stabilized; `ext-apps` v1.0.0 published |
| 2026-01-28 | `ext-apps` v1.0.1 (patch: CSP fix for Safari) |
| 2026-02 | Adoption in ChatGPT, Claude, Goose, VS Code Copilot Chat |

**Maturity assessment**: Early-stable. The spec is frozen but host implementations vary in completeness. ChatGPT and Claude have the most complete iframe rendering; VS Code support is functional but limited to webview-compatible contexts. Goose supports basic rendering.

## Supported Hosts

| Host | MCP Apps support | Notes |
|------|-----------------|-------|
| **Claude** (desktop + web) | Full | First-class iframe rendering with CSP enforcement |
| **ChatGPT** | Full | Supports bidirectional messaging; sandbox restrictions slightly stricter |
| **VS Code** (Copilot Chat) | Partial | Renders in webview panel; some CSS vars unavailable |
| **Goose** | Basic | Renders HTML; limited `postMessage` support |
| **Cursor** | Via VS Code | Inherits VS Code's MCP client; App rendering depends on Cursor's webview policy |

## Key Takeaway

MCP Apps are the first standardized way to ship interactive UI from an MCP tool call. For Cursor Drive, this means the Agent Screen — currently a VS Code-specific webview — could be served as an MCP App UI resource, making it portable to any MCP Apps-capable host.
