# Track 5: Cursor CLI Programmatic Integration Feasibility

**Plan:** sdk_and_protocol_research_6c42aa0c  
**Task:** cursor-cli-feasibility  
**Date:** 2026-03-04

---

## 1. Cursor CLI Capabilities Summary

### Two distinct CLIs

| CLI | Entrypoint | Purpose | Source |
|-----|------------|---------|--------|
| **Cursor IDE CLI** | `cursor` | IDE lifecycle: serve-web, tunnel, install extensions | Bundled with Cursor IDE |
| **Cursor Agent CLI** | `agent` | Standalone terminal AI agent (interactive, print, cloud) | [cursor.com/install](https://cursor.com/install) |

This assessment focuses on the **Cursor Agent CLI** (`agent`), which is the one with programmatic/server capabilities analogous to Copilot CLI's `--acp`.

### Cursor Agent CLI features

- **Modes:** Agent (default), Plan, Ask — aligned with Cursor editor modes
- **Interactive:** `agent` or `agent "prompt"` — conversational session
- **Non-interactive:** `agent -p "prompt"` — print mode for scripts/CI
- **Cloud handoff:** `agent -c` or `&` prefix — push to Cloud Agent
- **Session management:** `agent ls`, `agent resume`, `agent --resume=chatId`
- **MCP:** `agent mcp list|login|list-tools|enable|disable` — MCP server management
- **ACP:** `agent acp` — **hidden command**, starts ACP server mode

### Cursor IDE CLI (from docs/research/cursor-cli/)

- `cursor serve-web` — run Cursor UI in browser (extension testing)
- `cursor tunnel` — vscode.dev secure tunnel
- `cursor agent` — starts agent in terminal; no documented server mode, no stdin prompt piping

---

## 2. Server Mode / Programmatic API Availability

### Cursor Agent CLI: ACP server mode

**Yes.** Cursor Agent CLI exposes ACP server mode via `agent acp`:

- Documented in [Cursor CLI Parameters](https://cursor.com/docs/cli/reference/parameters) as a hidden command
- Intended for "custom ACP clients and advanced integrations"
- Same protocol as Copilot CLI `--acp` — ACP over NDJSON streams (stdio or TCP)

**Expected usage** (inferred from Copilot CLI pattern):

```bash
# stdio mode (typical for programmatic use)
agent acp

# TCP mode (if supported)
agent acp --port 3000
```

**Third-party adapter:** [roshan-c/cursor-acp](https://github.com/roshan-c/cursor-acp) bridges Cursor CLI agent to ACP for Zed, Neovim, Emacs, JetBrains — confirms ACP compatibility.

### Cursor IDE CLI: no server mode

The `cursor` binary (IDE CLI) has no `--acp` or equivalent. `cursor agent` runs interactively and does not expose a programmatic API.

---

## 3. Feasibility Assessment

### Integration path: **Feasible**

| Criterion | Assessment |
|-----------|------------|
| **Protocol** | ACP is shared with Copilot CLI; TypeScript SDK exists (`@agentclientprotocol/sdk`) |
| **Entrypoint** | `agent acp` is documented (hidden) and usable |
| **Transport** | stdio (spawn + pipe) or TCP — same pattern as Copilot |
| **Auth** | `--api-key` or `CURSOR_API_KEY`; `agent login` for interactive auth |

**Concrete integration path:**

1. **Spawn `agent acp`** as subprocess with piped stdio
2. **Use ACP TypeScript client** (`@agentclientprotocol/sdk`) for NDJSON stream
3. **Implement client callbacks:** `requestPermission`, `sessionUpdate` (streaming, tool calls)
4. **Drive integration:** Expose as MCP tool or internal service so operators can invoke Cursor Agent sessions programmatically

**Risks:**

- `agent acp` is hidden/advanced — may change or be removed without notice
- No official Cursor docs for ACP server options (stdio vs TCP, port, etc.)
- Copilot CLI `--acp` has known gaps (e.g. MCP servers not loaded in ACP mode per [issue #1040](https://github.com/github/copilot-cli/issues/1040)); Cursor may have similar limitations

**Recommendation:** Prototype with `agent acp` + ACP SDK. If it works, document options and limitations. If Cursor deprecates it, fall back to extension-only integration.

---

## 4. Comparison to Extension API (What Would We Gain?)

### Drive extension API today

| Capability | How Drive uses it |
|------------|-------------------|
| Prompt interception | `beforeSubmitPrompt` hook (primary pipeline) |
| Voice/chat | `workbench.action.chat.*`, `composer.*` commands |
| Mode sync | `composerMode.plan|agent|chat|debug` |
| UI | Status bar, WebviewPanel (Agent Screen), QuickPicks |
| Context | `vscode.lm`, `vscode.chat`, `vscode.cursor` (discovered via apiDiscovery) |

**Constraints (from drive-ui-surfaces-and-devtools.md):**

- Composer UI is not extensible — no DOM injection into chat input, send button, mic
- Extensions cannot globally intercept workbench UI clicks
- No supported way to target internal Cursor DOM

### What wrapping Cursor Agent CLI (ACP) would add

| Gain | Description |
|------|--------------|
| **Headless agent** | Run Cursor Agent without IDE window — CI, scripts, automation |
| **Parallel sessions** | Spawn multiple `agent acp` processes; Drive could orchestrate them |
| **Protocol parity** | Same ACP client code could talk to Copilot CLI or Cursor Agent |
| **Bypass extension limits** | Agent runs outside extension host; no dependency on `beforeSubmitPrompt` or Composer commands |
| **Cloud Agent integration** | `agent -c` / Cloud handoff — ACP may expose cloud session control |

### What we would NOT gain

| Gap | Reason |
|-----|--------|
| **Tight IDE integration** | ACP agent is a separate process; no direct access to open editors, selection, or Composer state |
| **Voice pipeline** | Drive's voice flow uses IDE commands; CLI has no voice input |
| **Shared context** | Extension sees workspace, open files, git; CLI agent has cwd and MCP only |
| **Single UX** | Users would have two surfaces: Drive-in-IDE vs Drive-via-CLI — potential confusion |

### Fit with Drive architecture

- **Vision invariant:** Drive is "voice-first, multi-operator pair-programming layer" — primary UX is in-IDE
- **beforeSubmitPrompt:** Remains the main pipeline entry when Drive is active
- **CLI as complement:** Use `agent acp` for headless/CI/automation, not as primary user-facing path

---

## Summary

| Question | Answer |
|----------|--------|
| Can Cursor CLI be driven in server mode like Copilot `--acp`? | **Yes** — Cursor Agent CLI has `agent acp` (hidden ACP server) |
| Would wrapping it give Drive capabilities beyond the extension API? | **Yes** — headless agent, parallel sessions, CI automation, protocol parity |
| Feasibility | **Feasible** — spawn `agent acp`, use ACP SDK, implement client callbacks |
| Recommendation | **Prototype** — validate `agent acp` behavior, document options, treat as complementary (not replacement) for extension-based Drive |
