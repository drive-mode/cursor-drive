# Cursor "Computer Use": Technology Overview

**Prepared:** February 2026
**Topic:** Cursor Computer Use — Cloud Agents, local agents, screenshot/browser MCP tools, parallel execution, Agent Skills

---

## What it is

Cursor exposes agent-driven computer interaction through two complementary mechanisms:

1. **Cloud Agents** — autonomous background VMs with file editing, terminal execution, codebase search, and web browsing tools.
2. **MCP-based screenshot/browser tools** — community-driven Puppeteer/Playwright integrations that let agents capture screenshots, interact with web pages, and visually verify UI changes.

Cursor supports up to 8 parallel agents via git worktrees. Each agent has access to the full tool harness (file editing, search, terminal, browser). The harness is optimized per frontier model.

> **Cursor vs Anthropic "computer use":** Anthropic's computer-use API provides raw desktop interaction (mouse, keyboard, screenshots) through their model API. Cursor's implementation is purpose-built for coding: the tool harness is file/terminal/search-oriented, not generic desktop automation. Screenshot capabilities come via MCP tools, not Anthropic's vision-based mouse/keyboard loop.

---

## Cloud Agents architecture

Cloud Agents run in isolated background VMs. Each VM provides:

| Component | Detail |
|---|---|
| **Runtime** | Linux VM with full development toolchain |
| **Tool harness** | File editing, codebase search, terminal execution, web browsing |
| **Git isolation** | Separate worktree per agent; no merge conflicts during parallel work |
| **Lifecycle** | User prompt → agent spawns → iterates autonomously → completes or times out |
| **Coordination** | Webhooks (Zapier, n8n) for automated triggers; Background Agents API for programmatic control |
| **Model routing** | Multi-model attempts — if one model fails, another is tried |

Cloud Agents are fully autonomous: they inspect tool call results, decide next steps, and iterate without user intervention. They cannot access the user's local editor state — they operate on a snapshot of the repository.

### Limitations

- No real-time shared state with the local editor.
- No public API for programmatic Cloud Agent dispatch (as of February 2026).
- Cost scales linearly with agent count and execution time.
- VM startup latency (seconds to low tens of seconds).

---

## Local agent capabilities

Local agents run inside the Cursor editor process:

| Capability | Detail |
|---|---|
| **Plan Mode** | Multi-step reasoning with explicit plan output before execution |
| **Agent Mode** | Autonomous coding with file/terminal/search tools |
| **Dynamic context discovery** | Agent determines which files to read at runtime rather than loading all context upfront |
| **Agent Skills** | `.cursor/skills/` directory — task-specific instruction files that agents read and follow |
| **`beforeSubmitPrompt` hook** | Pipeline entry for prompt interception (Drive's primary integration point) |

Local agents have full access to the editor's workspace state, open files, and terminal sessions.

---

## Screenshot/browser tools via MCP

Screenshot and browser interaction are provided by community MCP servers, not built into Cursor core:

| MCP Server | Transport | Capabilities |
|---|---|---|
| **Webpage Screenshot MCP** | Puppeteer-based | Full-page screenshots, element screenshots, URL capture |
| **BrowserLoop** | Playwright-based | Screenshots, click, type, scroll, evaluate JS |
| **Browser Tools MCP** (AgentDeskAI) | Chrome DevTools Protocol | Screenshots, console logs, network monitoring, accessibility audit |

Cursor v0.49+ supports images in MCP tool responses, enabling agents to receive and reason over screenshots.

### How it works

1. MCP server runs as a local process (stdio or HTTP transport).
2. Agent calls screenshot tool via MCP protocol.
3. MCP server captures the screenshot and returns it as a base64-encoded image.
4. Agent receives the image and reasons over it (requires a vision-capable model).

### Maturity

Community MCP screenshot tools work today but are not officially supported by Cursor. Reliability varies across different browser states, viewport sizes, and dynamic content.

---

## Parallel execution model

Cursor supports up to 8 concurrent agents via git worktrees:

```
Repository
├── .git/                      (shared)
├── .git/worktrees/agent-1/    (agent 1 checkout)
├── .git/worktrees/agent-2/    (agent 2 checkout)
├── ...
└── main working tree           (user's editor)
```

Each agent operates on its own worktree branch. Merge happens after agents complete, either automatically or with user review.

### Self-driving codebases

Cursor has demonstrated research prototypes with thousands of coordinated agents working on a single repository. Production use is currently capped at 8 parallel agents.

---

## Agent Skills standard

Agent Skills (`.cursor/skills/`) are markdown files containing task-specific instructions:

```
.cursor/skills/
├── doc-writer/SKILL.md
├── drive-persona/SKILL.md
├── plan-system-maintainer/SKILL.md
└── ...
```

Each skill file declares:
- **When to use** — trigger conditions
- **Instructions** — step-by-step procedures for the agent to follow
- **Verification** — how to check the work

Skills are read by the agent at runtime when the task matches the trigger conditions. They are not executed — they are injected into the agent's context as instructions.

---

## Ecosystem maturity

**Emerging → Established.**

| Component | Maturity | Notes |
|---|---|---|
| Cloud Agents | Production | Stable, shipped in Cursor |
| Local agent tooling | Production | Stable, actively improved |
| Screenshot MCP tools | Community/Emerging | Works but not officially supported |
| Parallel agents (worktrees) | Production | Up to 8 agents |
| Agent Skills | Established | Standard pattern in Cursor ecosystem |
| Cloud Agents API | Not public | No programmatic dispatch API as of Feb 2026 |
| Self-driving codebases | Research | Demonstrated but not GA |

---

## Key technical details

### Tool harness per model

Cursor optimizes the tool harness for each frontier model. Tool descriptions, parameter schemas, and response formatting are tuned per model to maximize tool-use accuracy. This means switching models can change tool-calling behavior.

### Dynamic context discovery

Agents do not load the entire codebase into context. Instead, they:
1. Start with the user prompt and minimal context.
2. Use search tools to find relevant files.
3. Read only the files they need.
4. Iterate as they discover more context requirements.

This keeps token usage bounded even in large repositories.

### Webhook-based coordination

Cloud Agents can be triggered programmatically via webhooks:
- GitHub webhook → Zapier/n8n → Cursor Background Agent API
- Enables CI/CD integration, automated bug triage, PR-triggered code review agents

---

## Relevance to Drive

Drive's `operatorRegistry.ts` manages spawn/switch/merge/dismiss for operators. Cursor's computer use capabilities map to Drive's architecture:

| Cursor capability | Drive equivalent | Gap |
|---|---|---|
| Cloud Agent spawn | `operatorRegistry.spawn()` | No cloud dispatch — spawn is local/in-memory only |
| Agent tool harness | MCP tools via `mcpServer.ts` | No screenshot/browser tools registered |
| Parallel agents (worktrees) | Multi-operator model | Operators are logical, not git-worktree-isolated |
| Agent Skills | `.cursor/skills/` (already used) | Aligned |
| Webhook triggers | Not implemented | No external trigger mechanism for operators |

See [01_project-impact.md](01_project-impact.md) for detailed impact analysis.
