# Building Plugins for Cursor Drive — Project Impact

**Topic:** How the plugin and MCP server landscape affects Drive's existing architecture and roadmap.

**Date:** February 2026

---

## 1. Drive's Hybrid Architecture Is Validated by the Ecosystem

The decision to use both a VS Code extension and a Cursor plugin layer (ADR-0002) was made before the broader ecosystem converged on a similar pattern. In 2026, the industry consensus is clear: AI coding tools need both a runtime layer (extension host, process, container) and an AI behavior layer (skills, prompts, rules). Neither alone is sufficient.

### Ecosystem validation

| Tool | Runtime layer | AI behavior layer | Parallel to Drive |
|---|---|---|---|
| **Cursor** (platform) | VS Code extension host | `.cursor/` (skills, rules, hooks) | Drive's hybrid is Cursor-native |
| **Claude Code** | CLI process | `/mcp` config + CLAUDE.md | Runtime + config |
| **VS Code Copilot** | Extension host | Language Model API + Chat Participants | Extension + API |
| **Windsurf** | Extension host + flows engine | Proprietary flows | Extension + proprietary |

Drive's split — TypeScript extension for UI/runtime, `.cursor/` files for AI behavior — maps 1:1 to the platform's own architecture. This is not a coincidence: Drive was designed to be Cursor-native, and the platform's architecture rewards this alignment.

### What this means

Drive does not need to migrate to a different architecture. The hybrid approach is the correct strategy for the current platform. Investment should go toward enhancing the existing layers, not replacing them.

---

## 2. MCP Bridge Pattern Is the Correct Strategy

The MCP bridge pattern (ADR-0003) was adopted because Cursor does not expose a Chat Participant API. The AI cannot call VS Code APIs directly — it can only invoke MCP tools. The extension's MCP server bridges this gap.

### Why the bridge is still correct

1. **Chat Participant API remains unavailable in Cursor.** VS Code has `createChatParticipant()`, but Cursor does not expose it. There is no indication this will change. Drive's MCP bridge is the only reliable path for AI-to-extension communication.

2. **MCP is the industry standard.** Every major AI coding tool supports MCP. The protocol is stable (v1.0), the SDK is mature (`@modelcontextprotocol/sdk` v1.26.0), and the transport is evolving in the direction Drive already uses (StreamableHTTP).

3. **The bridge is self-documenting.** MCP tools have typed schemas (via Zod). Cursor's MCP panel shows available tools, their parameters, and descriptions. This reduces the burden of teaching the AI what Drive can do — the tool list is the documentation.

4. **The bridge is testable.** MCP tools can be called from tests without the AI. Drive's existing test suite (`tests/src/mcpServer.ts`) validates tool behavior directly via HTTP calls.

### Alternative evaluated: `vscode.cursor.mcp.registerServer()`

Cursor exposes a programmatic `registerServer()` API for MCP servers. Drive could use this instead of `.cursor/mcp.json`. Current limitations:

| Limitation | Impact |
|---|---|
| No custom headers support | Cannot add auth headers for remote MCP servers |
| Does not survive extension reload | Server registration lost on `Developer: Reload Window` |
| Limited documentation | API surface may change without notice |

**Verdict:** `.cursor/mcp.json` is more reliable. The `registerServer()` API is worth monitoring but not adopting yet.

---

## 3. Self-Hosting MCP Server — Localhost Is Correct for Now

Drive's MCP server binds to `127.0.0.1:7891`. This is the right choice for the current architecture because:

| Requirement | Localhost satisfies? |
|---|---|
| Call VS Code APIs (webview, status bar) | Yes — runs in extension host process |
| No authentication needed | Yes — loopback only |
| Minimal latency | Yes — ~1ms per tool call |
| Works without internet | Yes |
| Accessible from other machines | No |

### When remote deployment would matter

Remote MCP server deployment would become relevant if:

1. **Drive's MCP tools are useful outside Cursor.** If other AI clients (Claude Desktop, ChatGPT) want to call Drive's operator management or Agent Screen tools. MCP Apps research (see `../mcp-apps/`) explores this angle.

2. **Team-shared Drive instances.** Multiple developers sharing a single Drive MCP server for coordinated multi-operator workflows. Not a current use case.

3. **Cloud-hosted Cursor.** If Cursor moves to a cloud-hosted model (like GitHub Codespaces), the MCP server would need to be accessible over the network.

**Verdict:** Self-hosted localhost is correct. Remote deployment is a future consideration with no current urgency.

---

## 4. Plugin Installer as Distribution Mechanism

Drive's `pluginInstaller.ts` is a pragmatic solution to the two-artifact problem: the VSIX contains both compiled extension code and `.cursor/` plugin files, but plugin files must live in the workspace for Cursor to discover them.

### Current installer capabilities

| Capability | Implementation |
|---|---|
| Copy plugin directories | `agents/`, `commands/`, `rules/` → `.cursor/` |
| Merge MCP config | `mcp.json` merged into `.cursor/mcp.json` (preserves existing servers) |
| Install hook script | `drive-preprocessor.py` → `.cursor/hooks/` |
| Register hooks | `hooks.json` updated with `beforeSubmitPrompt` entry (idempotent) |
| Skill gating | Skills with unmet `requires:` (bins, env, OS) are skipped |
| Idempotent | Safe to run multiple times — updates without duplication |

### What the installer validates

The installer addresses the key distribution challenge: **keeping plugin files version-aligned with the extension**. When a user updates the VSIX, running the installer command updates the workspace's `.cursor/` files to match.

### Enhancement opportunities

| Enhancement | Value | Complexity |
|---|---|---|
| **Version checking** | Skip copy if workspace files already match extension version | Low — compare hash or version marker |
| **Selective updates** | Only update files that changed (preserve user customizations) | Medium — requires diffing |
| **Auto-install on activation** | Run installer automatically when extension activates in a new workspace | Low — `onDidChangeWorkspaceFolders` event |
| **Uninstall command** | Remove Drive plugin files from workspace | Low — delete known paths |
| **Backup before update** | Save previous `.cursor/` state before overwriting | Low — copy to `.cursor/.drive-backup/` |

---

## 5. What to Enhance: Dynamic MCP Server Registration

When Cursor improves its `registerServer()` API (or adopts VS Code's `registerMcpServerDefinitionProvider()`), Drive should switch from static `.cursor/mcp.json` to dynamic registration.

### Benefits of dynamic registration

| Benefit | How |
|---|---|
| **No installer step for MCP** | Server registers itself on extension activation; no `.cursor/mcp.json` needed |
| **Dynamic port assignment** | Extension picks a free port and registers it; no port conflict risk |
| **Lifecycle management** | Server de-registers on extension deactivation; clean shutdown |
| **Conditional tools** | Register different tool sets based on configuration or context |

### What to watch for

| Signal | Action |
|---|---|
| Cursor exposes `registerMcpServerDefinitionProvider()` | Evaluate for Drive adoption |
| Cursor fixes `registerServer()` header support | Consider for remote MCP scenarios |
| Cursor adds stable programmatic MCP registration | Migrate from `.cursor/mcp.json` to dynamic registration |

### Migration path

1. **Phase 1 (now):** Keep `.cursor/mcp.json` via plugin installer. Reliable, tested, works.
2. **Phase 2 (when API available):** Add dynamic registration behind a feature flag. Fall back to `.cursor/mcp.json` if registration fails.
3. **Phase 3 (when API stable):** Default to dynamic registration. Remove `.cursor/mcp.json` from installer. Keep manual fallback documented.

---

## 6. Dependencies

| Dependency | Status | Risk |
|---|---|---|
| `@modelcontextprotocol/sdk` v1.26.0 | Stable, mature | Low — core protocol |
| `StreamableHTTPServerTransport` | Current recommended transport | Low — aligned with MCP transport direction |
| Cursor `.cursor/` plugin layer | Stable, Cursor-native | Low — this is Cursor's own mechanism |
| Cursor hooks system (`hooks.json`) | Stable | Low — used in production |
| `@vscode/vsce` packaging | Stable, industry standard | Low — VS Code's official tool |
| Cursor `registerServer()` API | Limited, undocumented | Medium — not yet suitable for production |
| Chat Participant API in Cursor | Not available | High — if Cursor exposes it, Drive architecture could shift |

---

## 7. Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| **Cursor–VS Code API divergence** | Medium | High | Drive uses only stable, shared APIs. Cursor-specific features (hooks, skills) are in the plugin layer, not the extension. If APIs diverge, only the extension code needs updating. |
| **Marketplace restrictions** | Low | Medium | Cursor's marketplace may restrict certain extension capabilities (network access, process spawning). Drive's MCP server runs locally and uses only standard `http` module — low restriction risk. |
| **`.cursor/` format changes** | Low | Medium | If Cursor changes the plugin layer format (e.g., new `hooks.json` schema), the installer must update. Version checks would detect format mismatches. |
| **Port conflicts** | Low–Medium | Low | Port `:7891` may be in use. Drive already supports `cursorDrive.mcp.port` config override. Dynamic port assignment (Phase 2) eliminates this entirely. |
| **Plugin staleness** | Medium | Low | Users forget to re-run installer after VSIX update. Auto-install on activation (enhancement) would solve this. |

---

## 8. Summary

Drive's plugin and MCP server architecture is well-positioned:

1. **Hybrid architecture (ADR-0002) is validated** by the ecosystem — every major AI coding tool uses a similar split between runtime and AI behavior layers.

2. **MCP bridge pattern (ADR-0003) is correct** given Cursor's API limitations. No viable alternative exists until Cursor exposes a Chat Participant API.

3. **Self-hosted MCP server** is appropriate for the current local-first architecture. Remote deployment is a future consideration.

4. **Plugin installer** solves the distribution problem pragmatically. Enhancements (version checking, auto-install, selective updates) are incremental improvements, not architectural changes.

5. **Dynamic MCP registration** is the main future opportunity. When Cursor's API matures, Drive should migrate from static config to dynamic registration. The migration path is incremental and low-risk.
