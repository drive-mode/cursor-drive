# Technology Landscape Summary — Cursor Drive

**Prepared:** February 2026  
**Scope:** 7 required topics + additional relevant developments for a voice-first, multi-operator pair-programming IDE extension.

---

## 1. MCP Apps (Model Context Protocol Apps)

### What it is
MCP Apps are an official extension to the Model Context Protocol (launched January 2026) that enable MCP tools to return interactive UI components — dashboards, forms, visualizations, workflows — rendered directly inside AI conversations instead of plain text. They add a UI layer on top of existing MCP servers: a server exposes tools, and those tools can now include a `_meta.ui.resourceUri` field pointing to a bundled HTML/JS resource served via the `ui://` scheme. The host renders this resource in a sandboxed iframe with bidirectional JSON-RPC over `postMessage`.

### How they differ from MCP servers / connectors

| Concept | Role |
|---------|------|
| **MCP Server** | Backend program exposing capabilities (filesystem, DB, APIs) to AI clients via standardized JSON-RPC. Data and logic only. |
| **MCP App** | A tool within an MCP server that also declares an interactive UI resource. Extends servers with visual, interactive experiences. |
| **Connector** | Data-only integration (e.g., ChatGPT "apps" as of Dec 2025). No custom UI, focused on connecting models to external data sources. |

### Ecosystem maturity
**Emerging.** Spec stable as of 2026-01-26. Supported in ChatGPT, Claude, Goose, VS Code. SDK published as `@modelcontextprotocol/ext-apps` v1.0.1.

### Key primitives / APIs
- `ui://` resource scheme — bundled HTML/JS content served by the MCP server
- `_meta.ui.resourceUri` — tool metadata linking a tool to its UI resource
- MIME types: `text/html`, `text/uri-list`, `application/vnd.mcp-ui.remote-dom`, `text/html;profile=mcp-app`
- **Host → Guest notifications:** `ui/notifications/tool-input`, `tool-input-partial`, `tool-result`, `host-context-changed`, `size-changed`, `tool-cancelled`, `ui/resource-teardown`
- **Guest → Host methods:** `tools/call`, `ui/message`, `ui/open-link`, `notifications/message`, `ui/notifications/size-changed`

### App lifecycle
1. Server registers a UI resource (bundled HTML/JS) at a `ui://` URI
2. Tool declares `_meta.ui.resourceUri` pointing to that resource
3. When the tool is called, the host fetches the UI resource
4. Host renders it in a sandboxed iframe
5. Bidirectional data flows via JSON-RPC over `postMessage`
6. On teardown, host sends `ui/resource-teardown`

### Why it matters to Drive
Drive's Agent Screen (S-AS) is currently a custom webview. MCP Apps could provide a standardised way to surface rich operator dashboards, plan progress, file diffs, and activity feeds directly within any MCP-aware client — not just Cursor's webview API. This would make Drive's visual layer portable across Claude, ChatGPT, Goose, and future MCP clients without rebuilding UI per host.

### Key sources
- [MCP Apps blog post](https://blog.modelcontextprotocol.io/posts/2026-01-26-mcp-apps/) (Jan 26, 2026)
- [MCP Apps spec](https://modelcontextprotocol.io/docs/extensions/apps) (Jan 2026)
- [`@modelcontextprotocol/ext-apps` API docs](https://modelcontextprotocol.github.io/ext-apps/api/) (v1.0.1)
- [MCP-UI protocol details](https://mcpui.dev/guide/protocol-details)

---

## 2. Cursor "Computer Use"

### What it is
Cursor exposes agent-driven computer interaction through two complementary mechanisms: (1) **Cloud Agents** that run autonomously in background VMs with file editing, terminal execution, and codebase search tools; and (2) **MCP-based screenshot/browser tools** that let agents capture screenshots, interact with web pages, and visually verify UI changes. Cursor supports up to 8 parallel agents via git worktrees, with each agent having access to the full harness of tools (file editing, search, terminal). The agent harness is optimized individually for each frontier model.

### Ecosystem maturity
**Emerging → Established.** Cloud agents are production-ready. Screenshot/browser MCP tools are community-driven and rapidly maturing (Cursor v0.49+ supports images in MCP tools).

### Key capabilities
- **Local agents:** Long-running autonomous coding, Plan Mode, dynamic context discovery, Agent Skills standard
- **Cloud agents:** Background execution, multi-model attempts, bug fixing, feature implementation
- **Screenshot tools via MCP:** Webpage Screenshot MCP (Puppeteer), BrowserLoop (Playwright), Browser Tools MCP (AgentDeskAI)
- **Parallel execution:** Up to 8 agents using git worktrees
- **Self-driving codebases:** Research demo of thousands of coordinated agents

### Agent interaction model
1. User provides prompt (manual or automated via webhooks)
2. Agent harness inspects response, executes tool calls
3. Tools include: file editing, codebase search, terminal execution, screenshot capture
4. Agent iterates autonomously until task completes
5. Optional: automated coordination via Cursor Background Agents API + webhooks (Zapier, n8n)

### Why it matters to Drive
Drive already orchestrates multiple operators via its registry. Cursor's expanding computer use capabilities — especially Cloud Agents and visual verification via MCP screenshot tools — could let Drive operators verify their own UI changes, run browser-based tests, and work completely asynchronously. The parallel agent support maps directly to Drive's multi-operator model.

### Key sources
- [Cursor Cloud Agents blog](https://cursor.com/blog/cloud-agents) (2025)
- [Dynamic context discovery](https://cursor.com/blog/dynamic-context-discovery) (2025)
- [Self-driving codebases](https://cursor.com/blog/self-driving-codebases) (2025)
- [Agent best practices](https://myapp-cursor.com/blog/agent-best-practices) (2025)
- [Cursor forum: screenshot MCP](https://forum.cursor.com/t/let-cursor-agent-take-screenshots-of-your-screen/82891) (2025)

---

## 3. Agent Steering

### What it is
Agent steering encompasses the policies, guardrails, control planes, routing mechanisms, and safety gates that govern AI agent behavior at runtime. The field has converged on a layered pipeline model: input rails → retrieval rails → dialog/execution rails → output rails, with each stage applying content safety, topic control, PII detection, tool validation, and fact-checking. Key frameworks include NVIDIA NeMo Guardrails (open-source control plane), Guardrails AI (managed validation), Anthropic's Constitutional AI/Constitutional Classifiers, and emerging academic work on runtime governance.

### Ecosystem maturity
**Emerging → Established.** NeMo Guardrails is production-deployed. Constitutional Classifiers passed adversarial red-team testing (3,000+ hours). Multiple frameworks available but no single standard.

### Key primitives / APIs

| Framework | Key primitive | Approach |
|-----------|--------------|----------|
| **NeMo Guardrails** | Colang rail definitions | Input/retrieval/dialog/execution/output rails; GPU-accelerated NIM microservices |
| **Guardrails AI** | `Guard` validators | AI-powered validation chains for agent reliability |
| **Constitutional AI** | Constitution (principles list) | Self-critique → revision → RLAIF training loop |
| **Constitutional Classifiers** | Safety classifier | Jailbreak defense with 0.38% false-refusal rate |
| **MI9** | Runtime governance FSM | Agency-risk indexing, semantic telemetry, drift detection, graduated containment |
| **AgentGuardian** | Context-aware ACL | Monitors execution traces to learn and enforce legitimate behaviors |

### Emerging patterns
1. **Pipeline-stage guardrails** — Apply different checks at each pipeline stage rather than a single catch-all
2. **Programmable policies** — Declarative YAML/Colang configs that non-developers can modify
3. **Runtime governance** — Continuous monitoring during execution, not just pre/post
4. **Least-privilege tool access** — MiniScope: auto-reconstruct permission hierarchies, 1-6% overhead
5. **Fault-tolerant sandboxing** — Policy-based interception + transactional filesystem snapshots

### Why it matters to Drive
Drive already has `approvalGates.ts`, `toolAllowlist.ts`, and operator permission presets (readonly/standard/full). The steering landscape validates this architecture and points toward pipeline-stage guardrails (Drive's `fillerCleaner → sanitizer → router → modelSelector` already follows this pattern), runtime monitoring of operator behavior, and declarative policy configs that users could customize.

### Key sources
- [NVIDIA NeMo Guardrails docs](https://docs.nvidia.com/nemo/guardrails/) (2025-2026)
- [Guardrails AI](https://guardrailsai.com/) (2025)
- [Anthropic Constitutional Classifiers](https://anthropic.com/research/constitutional-classifiers) (Feb 2025)
- [AgentGuardian](https://arxiv.org/abs/2601.10440) (Jan 2026)
- [AgentBound (MCP ACL)](https://arxiv.org/abs/2510.21236) (Oct 2025)
- [MiniScope](https://arxiv.org/abs/2512.11147) (Dec 2025)
- [MI9 runtime governance](https://arxiv.org/abs/2508.03858) (Aug 2025)
- [Petri auditing tool](https://anthropic.com/research/petri-open-source-auditing) (Oct 2025)

---

## 4. Agent Teams

### What it is
Multi-agent orchestration frameworks enable teams of AI agents with distinct roles to collaborate on complex tasks. The three dominant frameworks — LangGraph, CrewAI, and AutoGen — each take different architectural approaches: LangGraph uses stateful directed graphs with explicit control flow; CrewAI organizes agents into role-based teams with collaborative delegation; AutoGen uses event-driven async message passing. OpenAI's Agents SDK adds handoff-based coordination where agents delegate to specialists via tool-like interfaces. The A2A protocol from Google provides cross-framework agent interoperability.

### Ecosystem maturity
**Established.** 67% of large enterprises run autonomous agents in production (2026). Market at $10.86B in 2026. However, Gartner predicts 40% cancellation rate by 2027 due to cost/risk issues.

### Key frameworks comparison

| Framework | Architecture | Strengths | Best for |
|-----------|-------------|-----------|----------|
| **LangGraph** | Stateful graph, explicit control flow | Checkpointing, retry, distributed tracing, enterprise governance | Complex stateful workflows |
| **CrewAI** | Role-based teams | Abstracted orchestration, collaborative delegation | Quick team composition |
| **AutoGen** | Event-driven async, message passing | Conversation-centric, async | Multi-ChatGPT-like agent coordination |
| **OpenAI Agents SDK** | Handoff-based delegation | Simple `transfer_to_[agent]` pattern, input filtering | Specialized routing (triage → specialist) |
| **A2A Protocol** | HTTP + JSON-RPC 2.0, Agent Cards | Cross-framework interop, async-first, enterprise auth | Multi-vendor agent collaboration |

### Key patterns
- **Role separation:** Triage agent → specialist agents (billing, refunds, FAQ)
- **Handoff with context filtering:** `inputFilter` controls what history the next agent sees
- **Escalation:** Child agents escalate to parent when confidence is low
- **Conflict resolution:** Stateful graph nodes with conditional routing (LangGraph)
- **Monitoring:** Distributed tracing, checkpointing, human-in-the-loop gates
- **Agent Cards (A2A):** JSON metadata describing capabilities, auth, and supported modalities

### Why it matters to Drive
Drive's `operatorRegistry.ts` already implements spawn/switch/merge/dismiss for operators. The industry is converging on patterns Drive uses: role-based teams, handoff-based delegation, depth-limited permission cascading. The A2A protocol could enable Drive operators to communicate with external agents (e.g., a CI/CD agent, a design review agent) using a standard protocol. OpenAI's handoff pattern maps directly to Drive's `/tangent` and `/switch` commands.

### Key sources
- [Agent Orchestration 2026 guide](https://iterathon.tech/blog/ai-agent-orchestration-frameworks-2026) (2026)
- [Production agentic AI systems guide](https://brlikhon.engineer/blog/building-production-agentic-ai-systems-in-2026-langgraph-vs-autogen-vs-crewai-complete-architecture-guide) (2026)
- [OpenAI Agents SDK handoffs](https://openai.github.io/openai-agents-js/guides/handoffs/) (2025)
- [Google A2A Protocol spec](https://google.github.io/A2A/specification/) (Apr 2025)
- [A2A announcement](https://developers.googleblog.com/en/a2a-a-new-era-of-agent-interoperability) (Apr 2025)

---

## 5. Building Plugins for Cursor Drive

### What it is
Cursor is a VS Code fork with additional AI features. Plugin development involves the standard VS Code Extension API, the Cursor-specific `.cursor/` plugin layer (rules, skills, hooks, commands), MCP server integration, and VSIX packaging. Cursor adds some proprietary APIs (e.g., `vscode.cursor.mcp.registerServer()`) but lags behind upstream VS Code on newer APIs like `registerMcpServerDefinitionProvider()`.

### Ecosystem maturity
**Established** (VS Code extension ecosystem) / **Emerging** (Cursor-specific additions).

### Key differences: Cursor vs VS Code

| Aspect | VS Code | Cursor |
|--------|---------|--------|
| MCP registration | `registerMcpServerDefinitionProvider()` (dynamic) | `vscode.cursor.mcp.registerServer()` (limited, no headers) |
| MCP config | `.vscode/mcp.json` or programmatic | `.cursor/mcp.json` (project) or `~/.cursor/mcp.json` (global) |
| Plugin layer | None | `.cursor/rules/`, `.cursor/skills/`, `.cursor/hooks/`, `.cursor/commands/` |
| Chat extensibility | Chat Participant API, LM Tools API | Not exposed; uses MCP bridge pattern instead |
| AI integration | GitHub Copilot extensibility | Native agent with `beforeSubmitPrompt` hook |

### MCP server self-hosting patterns
1. **Stdio transport** — MCP server runs as child process of the client (Node.js/Python)
2. **HTTP transport** — MCP server on localhost (e.g., Drive's `:7891`), registered via `mcp.json`
3. **Remote HTTP** — Server hosted externally with custom headers and OAuth
4. **Extension-bundled** — Server code bundled in VSIX, started on extension activation

### Extension packaging
- **VSIX format** — Standard `.vsix` package via `vsce package`
- **Marketplace** — VS Code Marketplace; Cursor shares compatibility
- **Sideloading** — `code --install-extension <path>.vsix` for Cursor

### Why it matters to Drive
Drive uses the hybrid extension + plugin architecture (ADR-0002). Understanding the API gap between Cursor and VS Code is critical: Drive's MCP bridge pattern (ADR-0003) is the correct strategy given Cursor's lack of Chat Participant API. As VS Code adds `registerMcpServerDefinitionProvider()`, Drive should plan for eventual migration when Cursor catches up.

### Key sources
- [VS Code LM Tools vs MCP Server Tools](https://medium.com/@anandnair/vs-code-language-model-tools-vs-mcp-server-tools) (2025)
- [Cursor MCP setup guide](https://claudefa.st/blog/tools/mcp-extensions/cursor-mcp-setup) (2026)
- [Cursor GitHub issue: MCP server API gaps](https://github.com/cursor/cursor/issues/3549) (2025)
- [Cursor GitHub issue: header support](https://github.com/cursor/cursor/issues/3536) (2025)

---

## 6. VSCode Extension Development

### What it is
VS Code's Extension API (v1.85+ targeted by Drive) provides the foundation: extension host process, contribution points (commands, settings, keybindings), webview panels for custom UI, and a growing set of AI extensibility APIs. The API surface has expanded significantly in 2025-2026 with Chat Participant API, Language Model API, Language Model Tool API, and Language Model Chat Provider API — though many remain "proposed" (unstable).

### Ecosystem maturity
**Mature.** Extension API is stable and well-documented. AI extensibility APIs are emerging but rapidly stabilizing.

### Key primitives / APIs (2025-2026)

| API | Status | Purpose |
|-----|--------|---------|
| Extension API (commands, settings, webviews) | Stable | Core extension capabilities |
| Webview Panels | Stable | Custom UI via sandboxed HTML/CSS/JS iframes |
| Chat Participant API | Stable | Custom @-mentionable assistants in Copilot Chat |
| Language Model API | Stable | LLM integration in extensions |
| Language Model Tool API | Stable | Tools for agent mode invocation |
| Language Model Chat Provider API | Stable | Contribute custom LLMs to VS Code chat |
| `registerMcpServerDefinitionProvider()` | Proposed/New | Dynamic MCP server registration |

### Webview best practices
- Use sparingly — webviews are resource-heavy and run in separate context
- Ensure accessibility (ARIA labels, keyboard nav, color contrast)
- Theme all elements; open only for active window
- Communicate via `postMessage` between extension host and webview
- Content Security Policy with nonces

### Proposed APIs process
1. Proposed APIs live in `vscode.proposed.*.d.ts` files
2. Only usable in VS Code Insiders; cannot ship in published extensions
3. Require `"enabledApiProposals"` in `package.json`
4. Graduate to stable after feedback iteration

### Why it matters to Drive
Drive targets `vscode: ^1.85.0`. The emerging Chat Participant and LM Tools APIs provide a potential alternative path to Drive's MCP bridge (if Cursor adopts them). The webview best practices directly apply to Drive's Agent Screen (S-AS). Drive should monitor proposed API graduation timelines to plan feature migration.

### Key sources
- [VS Code Webview API guide](https://code.visualstudio.com/api/extension-guides/webview) (2025)
- [VS Code AI extensibility overview](https://code.visualstudio.com/docs/copilot/copilot-extensibility-overview) (2025)
- [Chat Participant API](https://code.visualstudio.com/api/extension-guides/ai/chat) (2025)
- [Language Model Tool API](https://code.visualstudio.com/api/extension-guides/tools) (2025)
- [Proposed APIs guide](https://code.visualstudio.com/api/advanced-topics/using-proposed-api) (2025)

---

## 7. Other Relevant Technologies

### 7.1 OpenAI Realtime API + gpt-realtime model

| Field | Detail |
|-------|--------|
| **Date** | August 2025 (GA) |
| **What** | Speech-to-speech model processing audio directly (no STT→LLM→TTS chain). Supports WebRTC, WebSocket, and SIP transports. New voices (Cedar, Marin), enhanced function calling, image inputs. |
| **Why it matters** | Drive's current TTS uses `say.js` (OS-native). The Realtime API could provide a single-model voice pipeline with sub-second latency, emotion preservation, and mid-sentence language switching — dramatically improving the voice-first experience. MCP server support means Drive's MCP bridge could integrate directly. |

**Source:** [OpenAI Realtime API announcement](https://openai.com/index/introducing-gpt-realtime) (Aug 2025)

### 7.2 WhisperKit / WhisperLiveKit — On-device real-time STT

| Field | Detail |
|-------|--------|
| **Date** | July 2025 (WhisperKit paper) |
| **What** | On-device real-time ASR achieving 0.46s latency at 2.2% WER — outperforming cloud-based systems including GPT-4o-transcribe. WhisperLiveKit adds streaming with intelligent buffering and voice activity detection. |
| **Why it matters** | Drive's voice input currently depends on browser/OS STT or external services. WhisperKit enables privacy-first, zero-cloud-cost, sub-500ms STT on the developer's machine, aligning with Drive's "no cloud dependency" principle. |

**Source:** [WhisperKit paper (arXiv:2507.10860)](https://arxiv.org/abs/2507.10860) (Jul 2025)

### 7.3 Google Agent2Agent (A2A) Protocol

| Field | Detail |
|-------|--------|
| **Date** | April 2025 |
| **What** | Open standard for cross-framework agent interoperability using HTTP + JSON-RPC 2.0. Agent Cards describe capabilities; Tasks track stateful work units. Async-first with SSE streaming. Backed by 50+ enterprise partners. |
| **Why it matters** | Drive operators could expose A2A Agent Cards, enabling external agents (CI bots, design reviewers, test runners) to discover and collaborate with Drive operators through a standard protocol — extending multi-agent beyond the IDE. |

**Source:** [A2A specification](https://google.github.io/A2A/specification/) (Apr 2025)

### 7.4 MCP Stateless Transport & Registry

| Field | Detail |
|-------|--------|
| **Date** | Dec 2025 (transport future blog); Sep 2025 (registry preview) |
| **What** | MCP Transport Working Group is moving toward stateless protocol design while maintaining stateful sessions. The MCP Registry (`.well-known` URLs, `server.json` format) enables automatic server discovery. New spec features include OAuth Client ID metadata, incremental scope consent, OpenID Connect Discovery, and experimental task support for long-running operations. |
| **Why it matters** | Drive's MCP server at `:7891` uses the current stateful HTTP transport. Stateless transport would simplify load balancing if Drive ever runs MCP remotely. The Registry could let Drive auto-discover available MCP tools in the user's environment. Task support enables long-running operator work without blocking. |

**Source:** [MCP Transport Future](https://blog.modelcontextprotocol.io/posts/2025-12-19-mcp-transport-future/) (Dec 2025); [MCP Roadmap](https://modelcontextprotocol.io/development/roadmap)

### 7.5 AgentBound — MCP Access Control for Agents

| Field | Detail |
|-------|--------|
| **Date** | October 2025 |
| **What** | First access control framework specifically for MCP servers. Uses a declarative Android-style permission model. Can auto-generate policies from source code with 80.9% accuracy, blocking security threats with negligible overhead. |
| **Why it matters** | Drive's `toolAllowlist.ts` implements per-operator capability enforcement. AgentBound provides a standardized approach to MCP-level access control that could complement Drive's extension-level allowlist, enforcing security at the protocol layer. |

**Source:** [AgentBound (arXiv:2510.21236)](https://arxiv.org/abs/2510.21236) (Oct 2025)

### 7.6 JetBrains + Zed Agent Client Protocol (ACP)

| Field | Detail |
|-------|--------|
| **Date** | October 2025 |
| **What** | Open protocol for IDE-agent interoperability, allowing AI coding agents to work across JetBrains, Zed, and other IDEs without vendor lock-in. Agents expose diffs and approvals; developers choose agent + IDE independently. |
| **Why it matters** | If ACP gains adoption, Drive operators could potentially work across IDEs — not just Cursor. This aligns with Drive's existing MCP-based architecture where the protocol layer is IDE-agnostic. |

**Source:** [JetBrains × Zed ACP announcement](https://blog.jetbrains.com/ai/2025/10/jetbrains-zed-open-interoperability-for-ai-coding-agents-in-your-ide) (Oct 2025)

### 7.7 Langfuse — Open-source Agent Observability

| Field | Detail |
|-------|--------|
| **Date** | 2025-2026 (active development) |
| **What** | Open-source LLM observability platform with self-hosting (Docker), step-level tracing, prompt versioning, evaluation datasets, and user feedback collection. ~15% overhead but full control over data. |
| **Why it matters** | Drive operators make many LLM calls via `modelSelector.ts`. Langfuse could provide observability into operator decision quality, model costs, and response times — especially important as Drive scales to multiple concurrent operators. Self-hosting aligns with Drive's privacy-strict default. |

**Source:** [Langfuse docs](https://langfuse.com/docs/tracing) (2025-2026)

### 7.8 Anthropic Petri — Automated Safety Auditing

| Field | Detail |
|-------|--------|
| **Date** | October 2025 |
| **What** | Open-source automated auditing agent that deploys multi-turn conversations with simulated users and tool use to test model behavior across safety dimensions: reward hacking, power-seeking, self-preservation, harmful cooperation. Tests hypotheses in minutes vs. manual review. |
| **Why it matters** | Drive's `approvalGates.ts` enforces safety at the action level. Petri's multi-turn simulation approach could be adapted to automatically test Drive operator behavior — verifying operators don't escalate beyond their permission preset, bypass approval gates, or exhibit unsafe patterns. |

**Source:** [Anthropic Petri announcement](https://anthropic.com/research/petri-open-source-auditing) (Oct 2025)

### 7.9 Web Speech API — On-device `processLocally`

| Field | Detail |
|-------|--------|
| **Date** | April 2025 (standardization discussion) |
| **What** | New `processLocally` property for `SpeechRecognition` interface enforcing on-device speech processing in Chrome. Currently in standardization; enables STT without cloud transmission. |
| **Why it matters** | Drive's voice input could use browser-native STT with guaranteed local processing, eliminating privacy concerns about audio being sent to Google/Apple servers. This aligns perfectly with Drive's privacy-strict default (ADR-0005). |

**Source:** [MDN: SpeechRecognition.processLocally](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition/processLocally) (2025)

### 7.10 Parallel Tool Calling + LLM-Tool Compiler

| Field | Detail |
|-------|--------|
| **Date** | 2025-2026 |
| **What** | Frontier models now support parallel tool execution. An LLM-Tool Compiler (inspired by hardware design) fuses similar operations, achieving 4x more parallel calls with 40% token reduction and 12% latency reduction. |
| **Why it matters** | Drive operators performing multi-file operations (read 5 files, run 3 commands) benefit directly from parallel tool calling. The compiler pattern could optimize Drive's pipeline stages — fusing multiple filler-clean + sanitize operations into batched calls. |

**Source:** [Parallel Tool Calling guide](https://blog.continue.dev/parallel-tool-calling) (2025); [LLM-Tool Compiler (arXiv:2405.17438)](https://arxiv.org/abs/2405.17438)

### 7.11 Agent Eval Infrastructure (HAL + WebArena Verified)

| Field | Detail |
|-------|--------|
| **Date** | 2025-2026 |
| **What** | Holistic Agent Leaderboard (HAL) provides standardized eval harness reducing evaluation from weeks to hours via parallel VM execution. WebArena Verified addresses benchmark quality with type-aware matching, backend state verification, and structured JSON scoring. Research shows 95% of evals focus on deterministic components; <5% test LLM planning. |
| **Why it matters** | Drive's test suite (`tests/*.test.ts`) covers deterministic components well but doesn't evaluate operator decision quality (routing, model selection, tangent spawning). HAL-style evaluation could test whether operators correctly interpret voice commands, choose appropriate sub-modes, and respect permission boundaries. |

**Source:** [HAL (arXiv:2510.11977)](https://arxiv.org/abs/2510.11977) (Oct 2025); [Agent testing practices study (arXiv:2509.19185)](https://arxiv.org/html/2509.19185v1)

---

## Summary Matrix

| # | Topic | Maturity | Primary Impact on Drive |
|---|-------|----------|------------------------|
| 1 | MCP Apps | Emerging | Portable Agent Screen UI via standard protocol |
| 2 | Cursor Computer Use | Emerging→Established | Visual verification for operators; async cloud agents |
| 3 | Agent Steering | Emerging→Established | Validates pipeline-stage guardrails; points to runtime governance |
| 4 | Agent Teams | Established | Industry convergence on patterns Drive already uses |
| 5 | Cursor Plugins | Emerging | MCP bridge is correct strategy; plan for API migration |
| 6 | VSCode Extension Dev | Mature | AI extensibility APIs expanding; webview best practices apply |
| 7.1 | OpenAI Realtime API | Established | Single-model voice pipeline replacing STT+TTS chain |
| 7.2 | WhisperKit | Emerging | Privacy-first on-device STT at 0.46s latency |
| 7.3 | A2A Protocol | Emerging | Cross-framework operator interop |
| 7.4 | MCP Stateless + Registry | Emerging | Auto-discovery, long-running tasks, simpler deployment |
| 7.5 | AgentBound | Nascent | Protocol-level access control for MCP |
| 7.6 | ACP (JetBrains+Zed) | Nascent | Cross-IDE agent portability |
| 7.7 | Langfuse | Established | Self-hosted operator observability |
| 7.8 | Petri | Emerging | Automated safety testing for operators |
| 7.9 | Web Speech `processLocally` | Nascent | Privacy-first browser STT |
| 7.10 | Parallel Tool Calling | Established | Operator efficiency via batched operations |
| 7.11 | Agent Eval (HAL) | Emerging | Standardized operator quality evaluation |
