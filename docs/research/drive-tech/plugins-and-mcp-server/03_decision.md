# Building Plugins for Cursor Drive — Decision

**Topic:** Adoption scorecard and recommendation for plugin and MCP server strategy in Cursor Drive.

**Date:** February 2026

---

## 1. Scorecard

| Dimension | Score (1–5) | Rationale |
|---|---|---|
| **User value** | 3 | Version checking and auto-install improve reliability for existing users. Dynamic MCP registration would reduce setup friction. However, the current architecture already works — these are polish improvements, not new capabilities. |
| **Integration complexity** | 1 | Very low. Option A changes extend existing files (`pluginInstaller.ts`, `mcpServer.ts`). No new abstractions, no new dependencies, no new runtime processes. |
| **Maintenance burden** | 2 | Low. Version marker is a file read. Selective updates add hash comparison logic. Dynamic registration stub is dormant until Cursor API evolves. No ongoing operational burden. |
| **Security / privacy risk** | 1 | Minimal. No new data exposure. Plugin installer already copies files; version checking adds a read-only marker. MCP server stays on localhost. No new network surfaces. |
| **Lock-in / portability risk** | 2 | Low. MCP is an open protocol. `.cursor/` plugin layer is Cursor-specific, but Drive's skills/rules are plain markdown — portable as documentation even if the format changes. Option B (deferred) would reduce lock-in further by making the MCP server standalone. |
| **Ecosystem maturity** | 4 | High. MCP is established (v1.0, SDK v1.26.0). VSIX packaging is industry standard (`@vscode/vsce`). Cursor's plugin layer is stable. The only immature component is Cursor's `registerServer()` API — handled by deferring dynamic registration. |
| **Time to first value** | 4 | Fast. Option A (version checking, auto-install, marketplace prep) delivers in 1 session. No prerequisite work needed. All changes build on existing infrastructure. |

**Aggregate:** Very low complexity, very low risk, moderate value — the current architecture is sound and incremental enhancement is the right strategy.

---

## 2. Recommendation

### ADOPT: Keep Current Architecture, Enhance Incrementally (Option A)

**What:** Enhance the plugin installer with version checking and auto-install. Prepare for dynamic MCP server registration. Add marketplace metadata for publication readiness.

**Confidence:** High

**Rationale:**

1. **The hybrid architecture is working well.** The extension + plugin layer split (ADR-0002) aligns with the platform's design and the broader ecosystem's convergence on dual-layer architectures. No structural change needed.

2. **The MCP bridge pattern is validated.** With Chat Participant API unavailable in Cursor, the local MCP server (ADR-0003) remains the only reliable AI-to-extension bridge. The protocol is stable and Drive's implementation is mature (30+ tools, A2A endpoints, health check).

3. **The plugin installer solves a real problem.** Keeping `.cursor/` files version-aligned with the extension is a genuine distribution challenge. Version checking and auto-install close this gap without architectural complexity.

4. **Dynamic MCP registration is a future optimization, not a necessity.** The `.cursor/mcp.json` approach works. Dynamic registration would remove one setup step, but the installer already handles it. Worth preparing for, not worth blocking on.

5. **No disruptive changes needed.** The recommended enhancements total ~155 lines of additive code across existing files. No new packages, no new build steps, no new runtime processes.

### DEFER: Standalone MCP Package (Option B)

**What:** Extract Drive's MCP server into a standalone npm package for cross-editor use.

**Confidence:** Medium

**Rationale:**

1. **No validated demand.** No users have requested Drive MCP tools from outside Cursor. Building cross-editor portability without demand risks creating dead infrastructure.

2. **Abstraction cost.** Many Drive tools depend on VS Code APIs (`AgentScreenPanel`, `StatusBarItem`). Extracting them requires adapter interfaces that add complexity without current benefit.

3. **Monorepo overhead.** Introducing a packages directory, workspace configuration, and separate build/publish workflows is significant overhead for an unvalidated use case.

4. **Revisit trigger:** Defer until at least 3 user-reported cases where Drive MCP tools are needed outside Cursor, or until a concrete cross-editor partnership (e.g., MCP integration with Claude Code) materializes.

---

## 3. Decision Matrix

| Enhancement | Decision | Confidence | Phase | Estimated effort |
|---|---|---|---|---|
| Plugin installer version checking | **ADOPT** | High | Phase 1 | ~30 lines |
| Selective file updates | **ADOPT** | High | Phase 1 | ~40 lines |
| Auto-install on activation | **ADOPT** | High | Phase 1 | ~20 lines |
| Dynamic MCP registration stub | **ADOPT** | High | Phase 2 | ~25 lines |
| Marketplace metadata | **ADOPT** | High | Phase 3 | ~10 lines |
| Standalone MCP package | **DEFER** | Medium | Phase 4 | ~400 lines |
| Remote MCP server deployment | **DEFER** | Low | TBD | Unknown |
| Chat Participant integration | **DEFER** | Low | TBD | Unknown (Cursor API dependent) |

---

## 4. Success Criteria

### Phase 1 (Plugin Installer Enhancements)

- [ ] `.drive-version` marker written after successful install
- [ ] `isUpToDate()` correctly detects version match/mismatch
- [ ] Selective updates preserve unchanged files (verified by mtime)
- [ ] Auto-install triggers on extension activation when plugin is outdated
- [ ] Auto-install does not trigger when plugin is up to date
- [ ] All existing tests pass (no regressions)
- [ ] New tests cover version checking, selective update, and auto-install paths

### Phase 2 (Dynamic MCP Registration)

- [ ] `registerDynamically()` detects Cursor API availability
- [ ] Falls back to `.cursor/mcp.json` when API unavailable
- [ ] Config flag `cursorDrive.mcp.dynamicRegistration` gates behavior
- [ ] Diagnostics (`cursorDrive.diagnose`) report registration method

### Phase 3 (Marketplace Publication)

- [ ] `npx vsce package` produces valid VSIX
- [ ] VSIX installs cleanly in fresh Cursor instance
- [ ] Plugin installer works after marketplace install
- [ ] Extension icon and license present in marketplace listing

---

## 5. Related Decisions

| ADR | Relationship |
|---|---|
| ADR-0002 (Hybrid Extension + Plugin) | Foundation. This research validates the hybrid architecture. |
| ADR-0003 (MCP Bridge Pattern) | Foundation. MCP server is the core bridge; enhancements build on it. |
| ADR-0007 (Installable Distribution) | Distribution. Plugin installer enhancements are direct follow-through. |
| ADR-0009 (Hook-Based Prompt Interception) | Integration. Hooks are installed by the plugin installer. |
| MCP Apps research (`../mcp-apps/`) | Adjacent. MCP Apps extend the MCP server with UI capabilities. |
