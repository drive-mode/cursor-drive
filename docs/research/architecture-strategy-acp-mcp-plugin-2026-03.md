# Architecture Strategy Research: ACP + MCP + Cursor Plugin
# For Cursor Drive Voice-First Multi-Operator Extension

**Date:** March 2026
**Scope:** Agent Client Protocol (ACP), Model Context Protocol (MCP), Cursor Plugin system, Claude integration patterns, multi-agent orchestration — and how they combine for Cursor Drive.

---

## Table of Contents

1. [Agent Client Protocol (ACP)](#1-agent-client-protocol-acp)
2. [Model Context Protocol (MCP)](#2-model-context-protocol-mcp)
3. [Cursor Plugin Architecture](#3-cursor-plugin-architecture)
4. [Anthropic Claude Integration Patterns](#4-anthropic-claude-integration-patterns)
5. [Multi-Agent Orchestration Patterns](#5-multi-agent-orchestration-patterns)
6. [Combined Architecture Analysis](#6-combined-architecture-analysis)
7. [Comparison: Combined vs Current Approach](#7-comparison-combined-vs-current-approach)
8. [Recommendations for Cursor Drive](#8-recommendations-for-cursor-drive)

---

## 1. Agent Client Protocol (ACP)

### 1.1 What It Is

**Important disambiguation:** Two protocols share the "ACP" acronym:

| Protocol | Full Name | Creator | Purpose |
|----------|-----------|---------|---------|
| **ACP (Editor)** | Agent Client Protocol | JetBrains + Zed (Oct 2025) | IDE ↔ AI coding agent communication |
| **ACP (IBM)** | Agent Communication Protocol | IBM Research | Agent-to-agent communication (merged into A2A under Linux Foundation) |

This report focuses on the **Agent Client Protocol** (editor-agent), which is the one relevant to Cursor Drive. IBM's Agent Communication Protocol has merged with Google's A2A protocol and is no longer independently developed.

### 1.2 How ACP Works

ACP is a standardized JSON-RPC 2.0 protocol for communication between code editors (clients) and AI coding agents. It mirrors the LSP (Language Server Protocol) approach: define a universal interface so any editor can talk to any agent.

**Transport:** NDJSON (newline-delimited JSON) over stdio. Agents run as subprocesses spawned by the editor.

**Session lifecycle:**

```
Client → Agent:  initialize        (version negotiation, capability exchange)
Client → Agent:  authenticate      (optional, method-specific)
Client → Agent:  session/new       (create conversation)
Client → Agent:  session/prompt    (send user message)
Agent  → Client: session/update*   (streaming progress: text chunks, tool calls, plans)
Agent  → Client: session/request_permission  (request tool approvals)
Client → Agent:  session/cancel    (interrupt)
```

**Key characteristics:**
- **Bidirectional JSON-RPC:** Both sides can initiate requests. The agent requests permissions from the editor; the editor sends prompts to the agent.
- **MCP-friendly:** Reuses MCP types for tool calls, content, and metadata. Integrators familiar with MCP need minimal additional work.
- **Multi-session:** A single connection supports concurrent sessions (multiple trains of thought).
- **Mode support:** Sessions support modes (`agent`, `plan`, `ask`) matching Cursor's native modes.
- **Capability negotiation:** Both sides declare capabilities at init (`fs.readTextFile`, `fs.writeTextFile`, `terminal`, `loadSession`, etc.).

**Client-side methods (editor exposes to agent):**

| Method | Purpose |
|--------|---------|
| `session/request_permission` | Agent asks editor for tool call approval |
| `fs/readTextFile` | Agent reads file via editor |
| `fs/writeTextFile` | Agent writes file via editor |
| `terminal/create` | Agent creates terminal |
| `terminal/wait` | Agent waits for command completion |
| `terminal/kill` | Agent terminates command |

**Agent-side methods (agent exposes to editor):**

| Method | Purpose |
|--------|---------|
| `initialize` | Capability negotiation |
| `authenticate` | Auth handshake |
| `session/new` | Create session |
| `session/load` | Resume session |
| `session/prompt` | Send user message |
| `session/setMode` | Switch operating mode |

### 1.3 Cursor's ACP Support

Cursor CLI has full ACP support via `agent acp`:

```bash
agent acp   # Start ACP server over stdio
```

Cursor also defines extension methods beyond the base ACP spec:

| Method | Purpose |
|--------|---------|
| `cursor/ask_question` | Multiple-choice questions to user |
| `cursor/create_plan` | Request plan approval |
| `cursor/update_todos` | Todo state notifications |
| `cursor/task` | Subagent task completion |
| `cursor/generate_image` | Image generation output |

ACP enables Cursor's agent to work in other editors (Neovim/avante.nvim, Zed, JetBrains, Emacs) through third-party ACP client implementations.

### 1.4 ACP Registry

The ACP registry (~20 registered agents) includes: Copilot CLI, Cline, Gemini, Claude-ACP, OpenCode, Goose, Junie. No editor is registered as an ACP client yet — client adoption is nascent.

### 1.5 Relationship to MCP

ACP and MCP are complementary protocols at different layers:

```
┌─────────────────────────────────────────────┐
│              Application Layer              │
│                                             │
│  ACP: Editor ←──JSON-RPC──→ Agent           │
│  (session management, permissions,          │
│   streaming output, mode switching)         │
│                                             │
├─────────────────────────────────────────────┤
│              Tool Layer                     │
│                                             │
│  MCP: Agent ←──JSON-RPC──→ Tool Servers     │
│  (tool discovery, execution, resources,     │
│   prompts, sampling, elicitation)           │
│                                             │
└─────────────────────────────────────────────┘
```

| Dimension | MCP | ACP |
|-----------|-----|-----|
| Who calls whom | LLM/Agent calls server's tools | Editor calls agent's methods |
| Where the LLM lives | Inside the host (e.g., Cursor) | Inside the agent subprocess |
| Session model | Stateless per call | Stateful, resumable sessions |
| Streaming | Optional SSE / Streamable HTTP | Required NDJSON |
| Permission model | Tool schema; host decides | Agent requests per-operation; client approves |
| Transport | HTTP+SSE, stdio, Streamable HTTP | stdio (primary), Streamable HTTP (draft) |

ACP explicitly passes MCP server configurations to agents during `session/new`, allowing agents to connect to user-configured MCP servers.

### 1.6 Reference Implementations

- **Cursor CLI:** `agent acp` command — full ACP server
- **`@agentclientprotocol/sdk`:** TypeScript SDK (v0.14.1, 1.5M weekly downloads, Apache 2.0)
- **`agentclientprotocol/python-sdk`:** Python SDK with `SessionAccumulator`, `ToolCallTracker`, `PermissionBroker` contrib modules
- **avante.nvim:** Neovim ACP client connecting to Cursor's agent
- **cursor-acp (community):** Node.js minimal client reference

---

## 2. Model Context Protocol (MCP)

### 2.1 What It Is

MCP is Anthropic's open protocol (November 2024, latest spec 2025-11-25) enabling LLM applications to connect to external data sources and tools through a standardized interface. It solves the N×M integration problem: instead of each LLM app building custom integrations for each tool, both sides implement MCP once.

### 2.2 Architecture

```
Host (LLM Application)
  ├── Client 1 ←──JSON-RPC──→ MCP Server A (filesystem)
  ├── Client 2 ←──JSON-RPC──→ MCP Server B (database)
  └── Client 3 ←──JSON-RPC──→ MCP Server C (API gateway)
```

**Roles:**
- **Host:** LLM application (Claude Desktop, Cursor, VS Code) managing client connections
- **Client:** Protocol connector maintaining 1:1 connection to a server
- **Server:** Lightweight program exposing capabilities (tools, resources, prompts)

### 2.3 Core Primitives

| Primitive | Direction | Purpose |
|-----------|-----------|---------|
| **Tools** | Server → Client | Functions the LLM can call (search, compute, API calls) |
| **Resources** | Server → Client | Contextual data for users or models (file contents, DB schemas) |
| **Prompts** | Server → Client | Templated messages and workflows |
| **Sampling** | Server → Client (request) | Server requests LLM completions from the host |
| **Elicitation** | Server → Client (request) | Server requests structured user input (forms, URLs) |
| **Roots** | Client → Server | Filesystem boundaries the server can operate within |

### 2.4 Transports

| Transport | Use Case | Status |
|-----------|----------|--------|
| **stdio** | Local servers as child processes | Stable |
| **HTTP + SSE** | Remote servers | Stable (being superseded) |
| **Streamable HTTP** | Modern remote transport | Stable (2025-11-25 spec) |

### 2.5 Recent Updates (2025-11-25 Spec)

- **OpenID Connect Discovery** for authentication
- **Icons metadata** for tools/resources/prompts
- **Incremental scope consent** for progressive permission grants
- **URL mode elicitation** for sensitive interactions (passwords, API keys)
- **Sampling tool calling** — servers can request tool use within sampling
- **OAuth Client ID metadata** documents
- **Experimental Tasks** support for long-running operations
- **MCP Registry** (September 2025 preview) — `.well-known` discovery of MCP servers

### 2.6 MCP Apps (January 2026)

MCP Apps (SEP-1865) are the first official MCP extension, enabling interactive UIs within AI conversations:

**How it works:**
1. MCP server registers a UI resource at a `ui://` URI (bundled HTML/JS)
2. Tool declares `_meta.ui.resourceUri` pointing to that resource
3. Host renders the UI in a sandboxed iframe when the tool is called
4. Bidirectional JSON-RPC over `postMessage` connects UI ↔ Host ↔ Server

**Supported interactions:**
- Data visualizations and dashboards
- Configuration wizards
- Document review interfaces
- Real-time monitoring displays
- Design canvases

**Host support:** ChatGPT, Claude, Goose, VS Code, Cursor (2.6+). Over 75 apps available within two weeks of launch.

**UI communication protocol:**

| Direction | Method | Purpose |
|-----------|--------|---------|
| Host → Guest | `ui/notifications/tool-input` | Deliver tool input to UI |
| Host → Guest | `ui/notifications/tool-result` | Deliver tool result to UI |
| Host → Guest | `ui/notifications/host-context-changed` | Context updates |
| Guest → Host | `tools/call` | UI calls MCP tools |
| Guest → Host | `ui/message` | UI sends messages to conversation |
| Guest → Host | `ui/open-link` | Open URLs in host browser |

### 2.7 MCP in Cursor

Cursor supports MCP through:
- **`.cursor/mcp.json`** — Project-level MCP server configuration
- **`~/.cursor/mcp.json`** — User-level configuration
- **`vscode.cursor.mcp.registerServer()`** — Programmatic registration from extensions
- **MCP Apps** (Cursor 2.6+) — Interactive UIs inline in agent chat
- **ACP pass-through** — MCP servers are forwarded to ACP agents during session creation

---

## 3. Cursor Plugin Architecture

### 3.1 Plugin System Overview

Cursor's plugin system (distinct from VS Code extensions) packages AI behavior configuration into distributable bundles in a `.cursor-plugin/` directory structure.

**Plugin components:**

| Component | Format | Purpose |
|-----------|--------|---------|
| **Rules** | `.mdc` files | Persistent AI guidance (coding standards, invariants) |
| **Skills** | `SKILL.md` in subdirectories | Specialized agent capabilities with instructions |
| **Agents** | `.md` files | Custom agent configurations with personas |
| **Commands** | `.md`/`.txt` files | Agent-executable action definitions |
| **Hooks** | `hooks.json` + scripts | Event-triggered automation (Python/shell) |
| **MCP Servers** | `mcp.json` | MCP server definitions |

**Plugin manifest** (`plugin.json`): Required `name` field, optional metadata (version, author, logo, component paths). Auto-discovery from default directory locations when paths not specified.

### 3.2 Hook System

Hooks are the primary extension point for the agent loop. Available events:

**Agent hooks:** `sessionStart`, `sessionEnd`, `preToolUse`, `postToolUse`, `postToolUseFailure`, `subagentStart`, `subagentStop`, `beforeShellExecution`, `afterShellExecution`, `beforeMCPExecution`, `afterMCPExecution`, `beforeReadFile`, `afterFileEdit`, `beforeSubmitPrompt`, `preCompact`, `stop`, `afterAgentResponse`, `afterAgentThought`

**Tab hooks:** `beforeTabFileRead`, `afterTabFileEdit`

Hooks receive JSON input via stdin and return JSON responses. The `beforeSubmitPrompt` hook is the primary pipeline entry point for Drive — it intercepts every prompt before submission to the model.

**`beforeSubmitPrompt` payload includes:**
- Prompt text
- Attachments (context files)
- Conversation and generation IDs
- Workspace roots
- Hook event metadata

### 3.3 Plugin Distribution

Plugins are distributed via the Cursor Marketplace. Multi-plugin repositories are supported via marketplace manifests. Plugin discovery, installation, and updates are managed through the Cursor UI.

### 3.4 Cursor-Specific Extension API

Beyond standard VS Code extension API, Cursor provides:

| API | Purpose |
|-----|---------|
| `vscode.cursor.mcp.registerServer()` | Programmatic MCP server registration |
| `vscode.cursor.mcp.unregisterServer()` | MCP server removal |

**Notable gaps vs VS Code:**
- No `registerMcpServerDefinitionProvider()` (dynamic MCP registration)
- No Chat Participant API (`@`-mentionable assistants)
- No Language Model Tool API (`vscode.lm.registerTool`)
- No Language Model API (direct LLM access from extensions)
- Based on older VS Code version; some newer APIs missing

### 3.5 Extension vs Plugin vs MCP App

| Surface | Runtime | What it controls | Portability |
|---------|---------|------------------|-------------|
| **VS Code Extension** (VSIX) | Extension host process | VS Code APIs: webviews, status bar, commands, terminals, file system | Cursor + VS Code only |
| **Cursor Plugin** (`.cursor-plugin/`) | Agent loop | AI behavior: rules, skills, hooks, prompt interception | Cursor only |
| **MCP Server** | Separate process | Tool execution, data access | Any MCP-compatible host |
| **MCP App** | Sandboxed iframe in host | Interactive UI within conversations | Any MCP Apps-compatible host |

---

## 4. Anthropic Claude Integration Patterns

### 4.1 Claude Desktop MCP Architecture

Claude Desktop acts as an MCP host managing MCP servers as child processes:

```
Claude Desktop (Host)
  ├── MCP Client ←──stdio──→ Filesystem MCP Server
  ├── MCP Client ←──stdio──→ GitHub MCP Server
  └── MCP Client ←──HTTP──→ Remote API MCP Server
```

Configuration via `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "server-name": {
      "command": "executable",
      "args": ["arg1"],
      "env": { "API_KEY": "value" }
    }
  }
}
```

**Performance:**
- Local (stdio): ~1-5ms latency per call
- Remote (SSE/HTTP): 50-200ms per call

Claude Desktop does not hot-reload MCP config — requires full restart.

### 4.2 Claude Code MCP Integration

Claude Code (terminal agent) supports MCP servers via:
- `claude mcp add --transport http <name> <url>` (HTTP servers)
- `claude mcp add --transport stdio <name> -- <command>` (local processes)
- `claude mcp add-from-claude-desktop` (import from Desktop config)
- Manual `~/.claude.json` or `.claude/settings.json` editing

Claude Code uses `CLAUDE.md` files for persistent project memory and supports multiple concurrent MCP servers.

### 4.3 Claude Cowork

Claude Cowork is an agentic mode within Claude Desktop that inherits all MCP tools and can execute multi-step tasks autonomously. It demonstrates the pattern of a high-autonomy agent consuming MCP tools without per-step human approval.

### 4.4 MCP Apps in Claude

Claude supports MCP Apps (January 2026), rendering interactive UIs from MCP tools inline in conversations. This enables the same MCP App to work in both Claude and Cursor without host-specific code.

### 4.5 Integration Patterns Summary

| Pattern | Description | Relevance to Drive |
|---------|-------------|--------------------|
| **Tool consumption** | Host connects to MCP servers, LLM calls tools | Drive already does this (server side) |
| **Multi-server** | Multiple MCP servers simultaneously | Drive could consume external MCP servers |
| **Persistent memory** | `CLAUDE.md` for project context | Analogous to Drive's rules/skills system |
| **Autonomous execution** | Cowork mode with full tool access | Maps to Drive's `full` permission preset |
| **Cross-host portability** | Same MCP server works in Desktop, Code, web | MCP Apps enable portable Drive UI |

---

## 5. Multi-Agent Orchestration Patterns

### 5.1 Core Orchestration Patterns

Three dominant patterns for coordinating multiple AI agents:

**1. Sequential Chain (Linear Pipeline)**
```
Agent A → Agent B → Agent C → Result
```
Simple, deterministic, easy to debug. Limited flexibility. Suitable for well-defined workflows.

**2. Router (Conditional Branching)**
```
         ┌→ Specialist A
Input → Router
         └→ Specialist B
```
A coordinator examines input and routes to specialized sub-agents. Good for triage/dispatch scenarios.

**3. Supervisor (Hierarchical Delegation)**
```
           Supervisor
          /    |     \
     Worker  Worker  Worker
```
Supervisor decomposes tasks, delegates to workers, aggregates results. Most flexible but most complex.

### 5.2 Coding Agent Orchestration

For coding agents specifically, production setups use three core roles:

| Role | Responsibility | Drive Equivalent |
|------|---------------|------------------|
| **Planner (Orchestrator)** | Reads requests, proposes task graphs, tracks progress | Lead operator in `plan` sub-mode |
| **Implementer** | Produces diffs within constrained contexts | Operator in `agent` sub-mode |
| **Reviewer** | QA agent flagging risky changes and running tests | Operator in `ask`/`debug` sub-mode |

The unit of work shifts from prompts to **task graphs** with metadata, dependencies, and concrete steps.

### 5.3 Key Production Requirements

**Centralized tool registry:** Use centralized registries for observability, error tracking, rate limiting, and schema validation — rather than direct tool calls.

**Distributed systems principles:**
- Lease-based task claiming with time limits
- Heartbeat mechanisms to detect stale agents
- Verification gates to prevent race conditions
- Transactional state management

**Communication patterns:**
- **Mailbox pattern:** Workers post results; lead consumes at natural boundaries
- **Handoff with context filtering:** Trim/summarize context before delegating
- **Escalation severity tiers:** Stall/progress/blocked triggers re-routing

### 5.4 Protocol Standards for Multi-Agent

| Protocol | Scope | Transport | Key Feature |
|----------|-------|-----------|-------------|
| **MCP** | Agent ↔ Tools | HTTP/stdio | Tool discovery and execution |
| **ACP** | Editor ↔ Agent | stdio | Session management, permissions |
| **A2A** | Agent ↔ Agent | HTTP + JSON-RPC | Agent Cards, async tasks, discovery |
| **IBM ACP** (→ A2A) | Agent ↔ Agent | REST | Lightweight messaging (merged into A2A) |

### 5.5 Relevant Framework Patterns (Without Dependencies)

| Pattern | Source Framework | Description |
|---------|-----------------|-------------|
| Role → sub-mode routing | CrewAI + LangGraph | Operator role determines operating mode |
| Handoff input filter | OpenAI Agents SDK | Trim context before injecting into child |
| Named guardrail stages | OpenAI Agents SDK | Explicit input/output guardrail pipeline stages |
| Escalation severity | AutoGen Magentic-One | Severity-based re-routing |
| Lightweight checkpoints | LangGraph | Operator+stage keyed state persistence |

---

## 6. Combined Architecture Analysis

### 6.1 The Three-Layer Stack

ACP, MCP, and Cursor Plugins form a complementary three-layer stack:

```
┌──────────────────────────────────────────────────────────────┐
│  Layer 3: Cursor Plugin (.cursor-plugin/)                    │
│  ─────────────────────────────────────────                   │
│  AI Behavior: rules, skills, hooks, commands, agents         │
│  Pipeline: beforeSubmitPrompt → sanitize → route → optimize │
│  Distribution: Marketplace, per-project, user-level          │
│                                                              │
│  Controls WHAT the AI does and HOW it behaves                │
├──────────────────────────────────────────────────────────────┤
│  Layer 2: ACP (Agent Client Protocol)                        │
│  ─────────────────────────────────────                       │
│  Session: create, resume, prompt, mode switch                │
│  Permissions: per-operation approval flow                    │
│  Streaming: real-time output via session/update              │
│  Multi-agent: multiple concurrent sessions                   │
│                                                              │
│  Controls WHO runs and WHERE execution happens               │
├──────────────────────────────────────────────────────────────┤
│  Layer 1: MCP (Model Context Protocol)                       │
│  ─────────────────────────────────────                       │
│  Tools: functions agents can call                            │
│  Resources: data and context                                 │
│  Prompts: templated workflows                                │
│  Apps: interactive UI in conversations                       │
│                                                              │
│  Controls WHAT capabilities are available                    │
└──────────────────────────────────────────────────────────────┘
```

### 6.2 Data Flow in Combined Architecture

```
User (voice/text)
  │
  ▼
┌────────────────────────────────────────────────────────────┐
│ Cursor Plugin Layer                                        │
│  beforeSubmitPrompt hook intercepts                        │
│  → fillerCleaner → sanitizer → glossaryExpander            │
│  → router (intent classification)                          │
│  → promptOptimizer                                         │
│  → selects sub-mode (plan/agent/ask/debug)                 │
└──────────────────────┬─────────────────────────────────────┘
                       │
                       ▼
┌────────────────────────────────────────────────────────────┐
│ ACP Layer (Cursor Native or External Agent)                │
│  session/prompt → agent processes with streaming updates    │
│  session/request_permission → approval gates               │
│  session/update → real-time progress to UI                 │
│  MCP servers forwarded to agent for tool access             │
└──────────────────────┬─────────────────────────────────────┘
                       │
                       ▼
┌────────────────────────────────────────────────────────────┐
│ MCP Layer (Drive MCP Server :7891)                         │
│  Agent calls MCP tools:                                    │
│  → tts_speak (voice output)                                │
│  → share_screen_* (Agent Screen updates)                   │
│  → agent_spawn/switch/dismiss (operator lifecycle)         │
│  → drive_set_mode (mode changes)                           │
│                                                            │
│  MCP Apps:                                                 │
│  → Agent Screen as portable MCP App                        │
│  → Activity feed rendered in any MCP host                  │
└────────────────────────────────────────────────────────────┘
```

### 6.3 Specific Capabilities Enabled by Each Layer

**MCP alone provides:**
- Tool exposure to any MCP-compatible host (Claude, Cursor, VS Code, ChatGPT)
- Portable UI via MCP Apps (Agent Screen works beyond Cursor)
- Sampling (server requests LLM completions)
- Elicitation (server requests structured user input)
- Resource discovery (auto-discovery of available servers)

**ACP adds on top of MCP:**
- Stateful, resumable sessions across agent restarts
- Standardized permission flow (per-operation, not global)
- Mode switching (`plan`/`agent`/`ask`) as protocol-level concept
- Multi-agent session management (multiple concurrent trains of thought)
- Cross-IDE agent portability (same agent runs in Cursor, Neovim, Zed, JetBrains)
- Streaming output protocol (not just tool results, but text chunks, plans, todos)

**Cursor Plugin adds on top of ACP + MCP:**
- Prompt interception and transformation (`beforeSubmitPrompt`)
- Declarative AI behavior rules (`.mdc` files)
- Agent skills with detailed instructions
- Hook-based pipeline stages at every agent lifecycle point
- Custom agent personas and configurations
- Marketplace distribution

### 6.4 How They Work Together in Practice

**Scenario: Voice command "refactor the auth module"**

1. **Voice input** → STT → text prompt
2. **Plugin Layer:** `beforeSubmitPrompt` hook fires
   - `fillerCleaner` removes "um", "uh"
   - `sanitizer` strips PII
   - `glossaryExpander` expands "auth" → "authentication"
   - `router` classifies intent → `agent` sub-mode
   - `promptOptimizer` adds context (file references, operator role)
3. **ACP Layer:** Prompt submitted to Cursor's agent via native mode
   - Agent processes with access to MCP servers
   - Streams `session/update` notifications (text, tool calls, plan)
   - Requests `session/request_permission` for file writes → approval gates
4. **MCP Layer:** Agent calls Drive's MCP tools
   - `share_screen_activity` → Agent Screen shows "Refactoring auth module..."
   - `tts_speak` → TTS announces "Starting auth refactoring"
   - `agent_spawn` → Creates sub-operator for test writing
   - Sub-operator calls `drive_set_mode` to switch to `debug` for testing

**Scenario: External agent collaboration (ACP Option A)**

1. User says "let Goose review the PR"
2. **Plugin Layer:** Router identifies `/tangent goose` intent
3. **ACP Layer:** Drive spawns Goose as ACP agent subprocess
   - `@agentclientprotocol/sdk` handles `initialize` → `session/new` → `session/prompt`
   - Drive forwards MCP server configs so Goose can use Drive's tools
   - `session/update` stream routed to Agent Screen
   - `session/request_permission` routed to Drive's `approvalGates.ts`
4. **MCP Layer:** Goose calls `share_screen_activity` to post its review findings

---

## 7. Comparison: Combined vs Current Approach

### 7.1 Current Architecture

Drive currently uses:
- **VS Code Extension** (VSIX) for runtime (MCP server, webview, status bar, TTS)
- **Cursor Plugin** (`.cursor/`) for AI behavior (hooks, rules, skills)
- **MCP Server** on `:7891` for AI-to-extension bridge
- No ACP integration

### 7.2 Feature Comparison

| Capability | Current (Extension + MCP) | Combined (Extension + MCP + ACP + Plugin) |
|------------|---------------------------|-------------------------------------------|
| AI ↔ Extension bridge | ✅ MCP tools on :7891 | ✅ Same MCP tools |
| Prompt interception | ✅ `beforeSubmitPrompt` hook | ✅ Same hook |
| Agent Screen UI | ✅ VS Code webview only | ✅ Webview + portable MCP App |
| Voice I/O | ✅ `say.js` / Edge-TTS | ✅ Same + potential Realtime API |
| Multi-operator registry | ✅ In-memory, Cursor-native only | ✅ + external ACP agents as operators |
| Cross-IDE portability | ❌ Cursor/VS Code only | ✅ ACP agents work in any ACP client |
| External agent integration | ❌ Manual CLI invocation | ✅ Standardized ACP spawn/session |
| Agent Screen portability | ❌ VS Code webview only | ✅ MCP App renders in Claude, ChatGPT, etc. |
| Session persistence | ❌ In-memory only | ✅ ACP session/load + structured checkpoints |
| Permission standardization | ⚠️ String-based capabilities | ✅ Typed `PermissionRequest` union + ACP `request_permission` |
| Mode as protocol concept | ⚠️ Internal state only | ✅ Protocol-level `session/setMode` |
| Marketplace distribution | ⚠️ VSIX + manual .cursor/ setup | ✅ Plugin Marketplace + VSIX |

### 7.3 Pros of Combined Architecture

1. **External agent onboarding:** Any ACP-compatible agent (Copilot CLI, Goose, Gemini, Claude-ACP) becomes a Drive operator through a standardized adapter — no per-agent integration work.

2. **Portable Agent Screen:** MCP Apps make the Agent Screen render in Claude Desktop, ChatGPT, VS Code — not just Cursor's webview. One UI codebase, multiple hosts.

3. **Cross-IDE future:** ACP separates agent logic from editor UI. If Drive's orchestration logic were exposed as an ACP agent, it could theoretically work in JetBrains, Zed, or Neovim.

4. **Standardized session management:** ACP provides session persistence, resumption, and multi-session support at the protocol level, eliminating custom session management code.

5. **Protocol-level permissions:** ACP's `request_permission` flow + MCP's tool schemas provide defense in depth — permissions enforced at both protocol and application layers.

6. **Ecosystem alignment:** Both protocols are gaining traction (MCP: Anthropic + broad adoption; ACP: JetBrains, Zed, community). Building on standards reduces lock-in risk.

### 7.4 Cons of Combined Architecture

1. **Complexity budget:** Three protocol layers (MCP + ACP + Plugin hooks) increases the system's conceptual weight. Debug paths span multiple protocol boundaries.

2. **ACP maturity:** ACP is nascent — no editor has registered as an ACP client. Breaking changes are likely. The TypeScript SDK is functional but early.

3. **MCP Apps immaturity:** MCP Apps SDK is pre-1.0. Host rendering inconsistencies require per-host CSS workarounds. Iframe sandboxing limits may prevent some UI patterns.

4. **Bundle size:** `@agentclientprotocol/sdk` adds dependency weight to the VSIX. Extension host environments are bundle-size sensitive.

5. **Double session management:** Drive already manages operator sessions. Adding ACP sessions creates two session models that must stay synchronized.

6. **Testing surface:** Each protocol boundary is a testing boundary. Integration tests must cover MCP tool calls, ACP session lifecycle, plugin hook execution, and their interactions.

7. **Latency stacking:** Voice → Plugin hook → ACP session → MCP tool call → VS Code API. Each layer adds latency, critical for voice-first UX.

### 7.5 Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| ACP spec breaking changes | High | Medium | Defer adoption until trigger fires; adapter pattern isolates changes |
| MCP Apps rendering inconsistency | Medium | Low | Feature-flag; webview remains primary |
| Bundle size exceeds limits | Low | Medium | Tree-shake SDK; lazy-load ACP adapter |
| Latency regression for voice | Medium | High | Benchmark each layer; set latency budget per stage |
| Protocol conflict (ACP modes vs Drive modes) | Low | Medium | Drive modes map 1:1 to ACP modes already |

---

## 8. Recommendations for Cursor Drive

### 8.1 Strategic Posture

**Incremental adoption, not big-bang migration.** Drive's current Extension + MCP + Plugin architecture is sound and working. The combined architecture should be adopted layer by layer, triggered by concrete needs rather than speculative capability.

### 8.2 Prioritized Recommendations

#### Tier 1: Adopt Now (Immediate Value)

**R1. MCP Apps Prototype for Agent Screen**
- Build a read-only MCP App version of the Agent Screen activity feed
- Feature-flag behind `cursorDrive.mcp.enableApps`
- Validates portability with minimal risk
- Already approved in ADR-0017

**R2. Port ACP SDK Contrib Patterns**
- `SessionAccumulator` → `src/cursor-sdk/sessionAccumulator.ts` — useful for Agent Screen state management regardless of ACP
- `ToolCallTracker` → `src/cursor-sdk/toolCallTracker.ts` — replaces ad-hoc tool-call maps
- Zero ACP dependency required; these are data structure patterns

**R3. Typed Permission System**
- Port Copilot SDK's `PermissionRequest` union to `approvalGates.ts`
- Aligns with ACP's `request_permission` schema for future compatibility
- Already prioritized in ADR-0023

#### Tier 2: Adopt When Triggered (Clear Path, Deferred Execution)

**R4. ACP Option A — Drive as ACP Client**
- Trigger: user workflow needs external ACP agent as Drive operator
- Implementation: `AcpOperatorAdapter` (~300-500 LOC) using `@agentclientprotocol/sdk`
- Registers external agents in `OperatorRegistry` with `type: "acp"`
- Routes `session/update` → Agent Screen, `request_permission` → approval gates

**R5. A2A Agent Cards for Drive Operators**
- Trigger: external agents need to discover and collaborate with Drive operators
- Implementation: expose Agent Card JSON at `/.well-known/agent.json` on `:7891`
- Enables CI bots, design reviewers, test runners to interact with Drive

**R6. Dynamic MCP Registration**
- Trigger: Cursor ships `registerMcpServerDefinitionProvider()` support
- Implementation: conditional registration in `extension.ts`
- Eliminates manual `.cursor/mcp.json` setup

#### Tier 3: Monitor and Evaluate

**R7. ACP as Primary Session Protocol**
- Wait for ACP client ecosystem maturity (multiple editors implementing ACP client)
- Evaluate whether Drive's session management should migrate to ACP protocol primitives
- Risk: premature migration to unstable protocol

**R8. MCP Apps for Interactive Controls**
- Wait for MCP Apps SDK stability and cross-host rendering consistency
- Evaluate extending Agent Screen MCP App beyond read-only to interactive controls
- Risk: iframe sandbox limitations may prevent required interactions

**R9. Cross-IDE Drive via ACP Agent Export**
- Evaluate exposing Drive as an ACP agent (Option B from ADR-0023)
- Only if there is demand for Drive in JetBrains/Neovim/Zed
- High effort, no identified client today

### 8.3 Architecture Principles

1. **MCP Server remains the primary bridge.** The `:7891` HTTP MCP server is the correct pattern for AI-to-extension communication. ACP does not replace it.

2. **ACP is additive, not transformative.** ACP extends Drive's capabilities (external agents, standardized sessions) but does not change the core architecture.

3. **Plugin layer owns prompt intelligence.** The `beforeSubmitPrompt` hook pipeline (filler cleaning, sanitization, routing, optimization) stays in the plugin layer. ACP and MCP do not influence this.

4. **Feature flags for all new protocol surfaces.** MCP Apps, ACP adapter, A2A endpoints — all behind configuration flags with graceful fallback.

5. **Latency budget for voice-first.** Total pipeline latency (voice input → visible response) must stay under 2 seconds. Each protocol layer gets an explicit latency budget.

### 8.4 Implementation Roadmap

```
Phase 1 (Current): Extension + MCP + Plugin
├── MCP server on :7891 (tools, resources)
├── Plugin hooks (beforeSubmitPrompt pipeline)
├── VS Code webview (Agent Screen)
└── In-memory operator registry

Phase 2 (Near-term): + MCP Apps + SDK Patterns
├── MCP App prototype for Agent Screen (ADR-0017)
├── SessionAccumulator/ToolCallTracker (ADR-0023)
├── Typed PermissionRequest union (ADR-0023)
└── Protocol version field in MCP responses

Phase 3 (Triggered): + ACP Client Adapter
├── AcpOperatorAdapter for external agents
├── ACP session routing to Agent Screen
├── Permission bridging (ACP → approvalGates)
└── External agent spawn via operator_spawn MCP tool

Phase 4 (Future): + A2A + Full Portability
├── A2A Agent Cards for Drive operators
├── Interactive MCP Apps for Agent Screen
├── Cross-host portable UI
└── Multi-IDE support evaluation
```

---

## Appendix A: Protocol Comparison Matrix

| Dimension | MCP | ACP (Editor) | A2A | IBM ACP (→A2A) |
|-----------|-----|-------------|-----|----------------|
| **Creator** | Anthropic | JetBrains + Zed | Google | IBM Research |
| **Purpose** | Agent ↔ Tools | Editor ↔ Agent | Agent ↔ Agent | Agent ↔ Agent |
| **Transport** | stdio, HTTP, Streamable HTTP | stdio, Streamable HTTP (draft) | HTTP, SSE | REST |
| **Protocol** | JSON-RPC 2.0 | JSON-RPC 2.0 | JSON-RPC 2.0 | REST |
| **Session** | Stateless/Stateful | Stateful, resumable | Stateful (Tasks) | Stateless |
| **Discovery** | MCP Registry (`.well-known`) | Agent registry | Agent Cards | Metadata-based |
| **UI** | MCP Apps (iframes) | Editor-native | None | None |
| **Maturity** | Established | Nascent | Emerging (v1.0.0) | Merged into A2A |
| **Spec version** | 2025-11-25 | Draft | v1.0.0 (Mar 2026) | N/A |

## Appendix B: Key Sources

### ACP
- [ACP Specification](https://agentclientprotocol.com/protocol/overview)
- [ACP Architecture](https://agentclientprotocol.com/overview/architecture)
- [Cursor ACP Docs](https://cursor.com/docs/cli/acp)
- [ACP TypeScript SDK](https://github.com/agentclientprotocol) (`@agentclientprotocol/sdk`)

### MCP
- [MCP Specification (2025-11-25)](https://modelcontextprotocol.io/specification/2025-11-25)
- [MCP Apps SEP-1865](https://mcp.mintlify.app/seps/1865-mcp-apps-interactive-user-interfaces-for-mcp)
- [MCP Apps Blog](https://blog.modelcontextprotocol.io/posts/2026-01-26-mcp-apps)
- [Cursor MCP Docs](https://cursor.com/docs/mcp)
- [Cursor MCP Extension API](https://cursor.com/docs/context/mcp-extension-api)

### Cursor Plugin
- [Cursor Plugins Reference](https://cursor.com/docs/reference/plugins)
- [Cursor Hooks](https://cursor.com/docs/hooks)
- [Cursor Skills](https://cursor.com/docs/context/skills)
- [Plugin Template](https://github.com/cursor/plugin-template)

### Claude Integration
- [Claude Code MCP Docs](https://docs.claude.com/en/docs/claude-code/mcp)
- [Claude MCP Apps](https://claude.com/docs/connectors/building/mcp-apps/getting-started)

### Multi-Agent
- [A2A Protocol Specification](https://google.github.io/A2A/specification/)
- [Agent Orchestration Patterns](https://dev.to/hezeclark/agent-orchestration-patterns-for-production-ai-systems-devkits-41dc)

### Internal ADRs
- ADR-0003: MCP Bridge Pattern
- ADR-0014: Agent Orchestration Strategy
- ADR-0017: MCP Apps Adoption Strategy
- ADR-0019: Plugin and Extension Strategy
- ADR-0023: SDK, Protocol, and Framework Adoption Strategy
