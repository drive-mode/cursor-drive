# Building Plugins for Cursor Drive — Risks and Mitigations

**Topic:** Risk analysis for plugin architecture, MCP server strategy, and distribution approach.

**Date:** February 2026

---

## 1. Risk Registry

### R1: Cursor–VS Code API Divergence — Platform APIs drift apart

| Field | Detail |
|---|---|
| **Category** | Platform |
| **Likelihood** | Medium |
| **Impact** | High |
| **Description** | Cursor is a VS Code fork. As Cursor adds AI-specific APIs (hooks, skills, MCP config) and potentially removes or restricts VS Code APIs (Chat Participant), the extension API surface diverges. Drive's extension code assumes `vscode.*` APIs work identically in Cursor and VS Code. A divergence could break extension functionality. |
| **Mitigation** | (1) Drive uses only stable, well-documented `vscode.*` APIs (webview, status bar, commands, configuration). These are foundational and unlikely to diverge. (2) AI-specific behavior is in the plugin layer (`.cursor/`), not the extension — plugin format changes affect markdown files, not TypeScript. (3) Monitor Cursor release notes for API deprecations. (4) The `cursorDrive.diagnose` command detects API availability issues at runtime. |
| **Residual risk** | Low after mitigation. Foundational VS Code APIs have never changed incompatibly across Cursor versions. |

---

### R2: Marketplace Restrictions — Extension capabilities limited by marketplace policy

| Field | Detail |
|---|---|
| **Category** | Distribution |
| **Likelihood** | Low |
| **Impact** | Medium |
| **Description** | If Drive is published to the VS Code Marketplace or a future Cursor marketplace, policies may restrict certain capabilities: spawning processes (`child_process`), binding network ports, writing files outside the workspace. Drive's MCP server binds a localhost port; the Cursor CLI runner spawns a child process; the plugin installer writes to `.cursor/`. |
| **Mitigation** | (1) Drive's MCP server uses only Node's built-in `http` module on localhost — no external network access. (2) Process spawning is limited to the optional Cursor CLI runner (disabled by default). (3) Plugin installer writes only to the workspace `.cursor/` directory, which is standard for Cursor plugins. (4) If marketplace restrictions apply, the VSIX can be distributed directly (sideload) as a fallback. |
| **Residual risk** | Very low. Localhost HTTP and workspace file writes are standard extension patterns. |

---

### R3: Port Conflict — MCP server fails to start

| Field | Detail |
|---|---|
| **Category** | Runtime |
| **Likelihood** | Low–Medium |
| **Impact** | Low |
| **Description** | Drive's MCP server defaults to port `:7891`. If another process or a second Cursor window occupies this port, the server fails to start. Without the MCP server, the AI cannot call any Drive tools. |
| **Mitigation** | (1) Port is configurable via `cursorDrive.mcp.port` setting. (2) Server emits a clear error on port-in-use. (3) `cursorDrive.diagnose` command reports port status. (4) Future: dynamic port assignment with `registerDynamically()` eliminates fixed port dependency entirely. |
| **Residual risk** | Very low with config override. Eliminated when dynamic registration is adopted. |

---

### R4: Plugin Staleness — Workspace `.cursor/` files out of sync with extension

| Field | Detail |
|---|---|
| **Category** | Distribution |
| **Likelihood** | Medium |
| **Impact** | Medium |
| **Description** | After a VSIX update, the workspace `.cursor/` files may still contain the previous version's plugin assets. If the extension adds new MCP tools that the hook or skill references, or changes the hook contract, the stale plugin files could cause subtle failures (missing tool references, incorrect prompt processing). |
| **Mitigation** | (1) Phase 1 adds `.drive-version` marker and `isUpToDate()` check. (2) Auto-install on activation updates plugin files when version mismatches. (3) `cursorDrive.diagnose` reports plugin version alignment. (4) Hook and skill changes are backward-compatible — new features are additive, not breaking. |
| **Residual risk** | Low after Phase 1 auto-install. Very low with version checking. |

---

### R5: Hook Contract Changes — Cursor changes hook input/output format

| Field | Detail |
|---|---|
| **Category** | Platform |
| **Likelihood** | Low |
| **Impact** | High |
| **Description** | Drive's `drive-preprocessor.py` hook relies on a specific stdin/stdout contract: JSON input with `prompt` and `context` fields, JSON output with modified `prompt` and/or augmented `context`. If Cursor changes this contract (new fields, different serialization, different lifecycle), the hook would silently fail or produce incorrect results. |
| **Mitigation** | (1) The hook contract is versioned (`hooks.json` has `version: 1`). Cursor would increment the version for breaking changes. (2) Drive's hook implementation is defensive — it passes through unchanged on parse errors. (3) The hook is a thin layer; rewriting for a new contract is <50 lines. (4) Monitor Cursor documentation for hook API changes. |
| **Residual risk** | Low. Hook contracts are unlikely to change without versioning and a migration period. |

---

### R6: Dynamic Registration API Instability — Cursor's `registerServer()` changes

| Field | Detail |
|---|---|
| **Category** | Platform |
| **Likelihood** | Medium |
| **Impact** | Low |
| **Description** | Cursor's `vscode.cursor.mcp.registerServer()` API is limited and undocumented. If Drive adopts it for dynamic registration and the API changes, the registration would break. Since `.cursor/mcp.json` is the fallback, the impact is limited — but users would see the server disappear and reappear in the tool list. |
| **Mitigation** | (1) Dynamic registration is behind a config flag (`cursorDrive.mcp.dynamicRegistration`, default `false`). (2) Registration always falls back to `.cursor/mcp.json`. (3) Feature flag is only enabled when the API is tested and stable. (4) Diagnostics report which registration method is active. |
| **Residual risk** | Very low. Feature flag ensures no user impact until API is validated. |

---

### R7: Skill Gating False Negatives — Valid skills incorrectly skipped

| Field | Detail |
|---|---|
| **Category** | Distribution |
| **Likelihood** | Low |
| **Impact** | Low |
| **Description** | The plugin installer's skill gating checks `requires:` in SKILL.md frontmatter (binaries in PATH, environment variables, OS platform). A false negative — skipping a skill that should have been installed — reduces Drive's AI capabilities without user awareness. For example, if `python3` is in a non-standard PATH location, the `binExists()` check fails and the skill is skipped. |
| **Mitigation** | (1) `installDrivePluginToWorkspace()` returns `skippedSkills` array — the extension can surface this to the user. (2) `binExists()` uses `which`/`where` which respect the full PATH. (3) Users can manually copy skipped skills from the VSIX. (4) Most Drive skills have no `requires:` — gating affects only specialized skills. |
| **Residual risk** | Very low. Skipped skills are reported; manual override is available. |

---

### R8: MCP SDK Breaking Changes — `@modelcontextprotocol/sdk` major version update

| Field | Detail |
|---|---|
| **Category** | Dependency |
| **Likelihood** | Low |
| **Impact** | Medium |
| **Description** | Drive depends on `@modelcontextprotocol/sdk` ^1.26.0. A major version bump (v2.0) could change the `McpServer` API, `StreamableHTTPServerTransport` interface, or tool registration pattern. This would require changes to `mcpServer.ts`. |
| **Mitigation** | (1) MCP v1.0 spec is stable and widely adopted. A v2.0 would have a long migration window. (2) Drive pins to `^1.x` — no automatic major version upgrades. (3) The SDK is maintained by Anthropic with strong backward compatibility commitments. (4) Drive's MCP surface is standard (tool registration, HTTP transport) — migration to a new API would be mechanical, not architectural. |
| **Residual risk** | Low. Semver pinning prevents surprise upgrades. |

---

## 2. Risk Matrix

| Risk | Likelihood | Impact | Mitigation effectiveness | Residual |
|---|---|---|---|---|
| R1: API divergence | Medium | High | High (stable APIs only) | Low |
| R2: Marketplace restrictions | Low | Medium | High (standard patterns) | Very Low |
| R3: Port conflict | Low–Medium | Low | High (configurable + future dynamic) | Very Low |
| R4: Plugin staleness | Medium | Medium | High (auto-install + version check) | Low |
| R5: Hook contract changes | Low | High | High (defensive parsing + versioning) | Low |
| R6: Dynamic registration instability | Medium | Low | High (feature flag + fallback) | Very Low |
| R7: Skill gating false negatives | Low | Low | High (reported + manual override) | Very Low |
| R8: MCP SDK breaking changes | Low | Medium | High (semver pinning) | Low |

---

## 3. Monitoring Plan

| Signal | Measurement | Threshold | Action |
|---|---|---|---|
| MCP server startup failures | Extension activation logs | Any failure | Check port conflict; suggest config override |
| Plugin version mismatch rate | `.drive-version` check on activation | >0 after auto-install | Debug auto-install; ensure marker written |
| Skipped skills count | `installDrivePluginToWorkspace()` result | >0 | Surface to user via notification; log reason |
| Hook processing errors | `drive-preprocessor.py` stderr | Any error | Check hook contract compatibility; update hook |
| Cursor API availability | `cursorDrive.diagnose` output | Missing expected APIs | Track Cursor version; update API usage |
| MCP SDK version | `package-lock.json` audit | Major version available | Evaluate migration; do not auto-upgrade |

---

## 4. Contingency

| If… | Then… |
|---|---|
| Cursor removes or breaks a VS Code API Drive uses | Migrate to Cursor-specific alternative if available; file issue with Cursor team; disable affected feature with clear user message |
| Marketplace rejects Drive extension | Distribute via direct VSIX download; publish to alternative registry |
| Port `:7891` is permanently unavailable | Use dynamic port assignment; update `.cursor/mcp.json` via installer |
| Hook contract changes in Cursor | Update `drive-preprocessor.py` to new contract; version-gate: keep old contract support for backward compatibility |
| `registerServer()` API is removed | Stay on `.cursor/mcp.json`; no user impact (feature flag prevents exposure) |
| MCP SDK v2.0 ships | Evaluate migration scope; pin to v1.x until migration tested; allocate 1 session for migration |
| Users need Drive MCP outside Cursor | Revisit Option B (standalone package); evaluate demand before building |
