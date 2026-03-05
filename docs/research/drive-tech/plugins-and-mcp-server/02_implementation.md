# Building Plugins for Cursor Drive — Implementation Plan

**Topic:** Current state, integration points, implementation options, testing strategy, and rollout plan for plugin and MCP server enhancements.

**Date:** February 2026

---

## 1. Current State

### mcpServer.ts

The MCP server is the core bridge between Cursor's AI and the extension runtime. It runs an HTTP server on `:7891` using `@modelcontextprotocol/sdk` with `StreamableHTTPServerTransport`.

- **Transport:** HTTP + StreamableHTTP (stateless, no session tracking)
- **Tools:** 30+ registered tools across 6 domains (TTS, Agent Screen, persistent memory, operator management, Drive control, Cursor CLI)
- **Deprecated aliases:** 8 tools with `agent_*` and `share_screen_*` prefixes (mapped to `operator_*` and `agent_screen_*`)
- **A2A endpoints:** Agent Card at `/.well-known/agent-card.json`, task CRUD at `/tasks`, `/tasks/:id`, `/tasks/:id/cancel`
- **Additional HTTP:** `/health` (diagnostics), `/pipeline` (prompt pipeline), `/run` (Cursor CLI)
- **Binding:** `127.0.0.1` (localhost only)

**Key types:**
```typescript
interface DriveMcpServerOptions {
  port?: number;
  driveMgr: DriveModeManager;
  operatorRegistry: OperatorRegistry;
  sessionMemory: SessionMemory;
  persistentMemory?: PersistentMemory;
  getMaxConcurrent?: () => number;
}
```

### pluginInstaller.ts

The plugin installer copies Drive's `.cursor/` files from the VSIX into the workspace. It handles:

- **Directory copy:** `agents/`, `commands/`, `rules/` → `.cursor/`
- **MCP config merge:** Merges Drive's `mcp.json` into workspace `.cursor/mcp.json` preserving existing servers
- **Hook installation:** Copies `drive-preprocessor.py` to `.cursor/hooks/`, registers in `hooks.json`
- **Skill gating:** Reads `SKILL.md` frontmatter, checks `requires:` (bins, env, OS), skips unmet skills

**Key types:**
```typescript
interface PluginInstallResult {
  workspaceRoot: string;
  installedPaths: string[];
  skippedSkills?: string[];
}

interface SkillRequires {
  bins?: string[];
  env?: string[];
  os?: string[];
}
```

### VSIX Packaging

Packaging via `npx vsce package` (`@vscode/vsce` ^3.7.1). The VSIX includes compiled TypeScript (`out/`), plugin assets (`agents/`, `commands/`, `rules/`), `mcp.json`, and `.cursor/hooks/` and `.cursor/skills/`. Internal files (docs, plans, tests, sandbox) are excluded.

---

## 2. Integration Points

### 2.1 mcpServer.ts — Transport and Registration Upgrades

**When Cursor exposes dynamic MCP registration:**

Add an optional `registerDynamically()` method that uses the Cursor API instead of relying on `.cursor/mcp.json`:

```typescript
async registerDynamically(): Promise<boolean> {
  try {
    const api = vscode.extensions.getExtension('cursor.cursor')?.exports;
    if (api?.mcp?.registerServer) {
      api.mcp.registerServer({
        name: 'cursor-drive',
        url: `http://127.0.0.1:${this.port}/mcp`,
      });
      return true;
    }
  } catch { /* fall through */ }
  return false;
}
```

**Integration constraints:**
- Must fall back to `.cursor/mcp.json` if dynamic registration fails
- Must handle extension reload (re-register on activation)
- Must not break existing `.cursor/mcp.json` workflow

### 2.2 pluginInstaller.ts — Enhanced Distribution

**Version checking:**

Add a version marker file to detect whether workspace plugin files match the extension version:

```typescript
async function isUpToDate(cursorDir: string, extensionVersion: string): Promise<boolean> {
  const markerPath = path.join(cursorDir, '.drive-version');
  try {
    const installed = await fs.readFile(markerPath, 'utf8');
    return installed.trim() === extensionVersion;
  } catch {
    return false;
  }
}
```

**Selective updates:**

Rather than overwriting all plugin files, compare file hashes and only update changed files. This preserves user customizations to skills or rules they've edited.

### 2.3 package.json — Marketplace Configuration

Current configuration is sufficient for marketplace publication:

| Field | Current value | Status |
|---|---|---|
| `name` | `cursor-drive` | OK |
| `publisher` | `hh` | OK — needs marketplace publisher account |
| `categories` | `["AI", "Chat"]` | OK |
| `engines.vscode` | `^1.85.0` | OK — minimum VS Code version |
| `repository` | GitHub URL | OK |
| `icon` | Not set | Needed for marketplace listing |
| `license` | Not set | Needed for marketplace listing |

---

## 3. Implementation Options

### Option A: Enhance Current Architecture (~150 lines)

**Scope:** Keep the existing architecture. Add version checking to the plugin installer, prepare for dynamic MCP registration, and improve packaging for marketplace readiness.

**Changes:**

| File | Change type | ~Lines |
|---|---|---|
| `pluginInstaller.ts` | Add version checking, write `.drive-version` marker | +30 |
| `pluginInstaller.ts` | Add selective update (hash comparison before copy) | +40 |
| `mcpServer.ts` | Add `registerDynamically()` stub (behind feature flag) | +25 |
| `package.json` | Add `icon`, `license`, marketplace metadata | +10 |
| `extension.ts` | Auto-install plugin on activation if outdated | +20 |
| `tests/pluginInstaller.test.ts` | Version check and selective update tests | +30 |
| **Total** | | **~155** |

**Complexity:** Low. All changes extend existing code. No new abstractions or dependencies.

**Time to first value:** 1 session. Version checking and auto-install provide immediate reliability improvement.

**Risks:** Minimal. Version checking is additive. Dynamic registration stub is behind a flag. Auto-install can be disabled via config.

### Option B: Extract Standalone MCP Package (~400 lines)

**Scope:** Extract Drive's MCP server into a standalone npm package (`@cursor-drive/mcp-server`) that can run as either stdio or HTTP. This enables running Drive's MCP tools without the VS Code extension — useful for other editors (Zed, JetBrains) via MCP, or for headless CI/CD environments.

**Changes:**

| File | Change type | ~Lines |
|---|---|---|
| `packages/mcp-server/index.ts` (new) | Standalone MCP server with dual transport | +150 |
| `packages/mcp-server/tools/` (new) | Tool definitions extracted from `mcpServer.ts` | +100 |
| `packages/mcp-server/package.json` (new) | Package manifest with bin entry | +20 |
| `src/mcpServer.ts` | Refactor to use extracted package | -50/+30 |
| `tests/packages/mcp-server.test.ts` (new) | Standalone server tests | +60 |
| Build configuration | Monorepo setup (workspaces or Turborepo) | +40 |
| **Total** | | **~400** |

**Complexity:** Medium-High. Introduces monorepo structure. Tools that depend on VS Code APIs (Agent Screen, status bar) need adapter interfaces.

**Time to first value:** 2–3 sessions. Significant restructuring before any user-visible benefit.

**Risks:**
- **Abstraction mismatch:** Many Drive tools call VS Code APIs directly (`AgentScreenPanel.getInstance()`). Extracting them requires adapter interfaces for the VS Code dependency.
- **Maintenance burden:** Two packages to version, test, and publish.
- **Unclear demand:** No evidence that users need Drive MCP tools outside Cursor.
- **Monorepo overhead:** Build tooling, dependency management, publishing workflow.

### Option comparison

| Dimension | Option A (enhance) | Option B (extract) |
|---|---|---|
| Lines of change | ~155 | ~400 |
| Complexity | Low | Medium-High |
| New abstractions | None | Adapter interfaces, monorepo |
| External dependencies | None | None |
| User value (immediate) | Version alignment, auto-install | Portability to other editors |
| User value (future) | Dynamic MCP registration ready | Cross-editor MCP server |
| Maintenance burden | None (extends existing) | Medium (two packages) |
| Risk | Minimal | Abstraction mismatch, unclear demand |

---

## 4. Tests and Evaluations

### 4.1 Existing Tests

Drive already has tests for the MCP server and plugin installer:

| Test file | Coverage |
|---|---|
| `tests/src/mcpServer.ts` | MCP server startup, tool registration, HTTP endpoint routing |
| `tests/pluginInstaller.test.ts` | Plugin directory copy, MCP config merge, hook registration, skill gating |

### 4.2 New Tests (Option A)

**Plugin installer version checking:**
```
✓ isUpToDate returns false when .drive-version is missing
✓ isUpToDate returns false when version mismatches
✓ isUpToDate returns true when version matches
✓ install writes .drive-version after completion
✓ install skips copy when isUpToDate returns true (selective mode)
```

**Selective updates:**
```
✓ unchanged files are not overwritten (mtime preserved)
✓ changed files are overwritten
✓ new files are added
✓ removed source files do not delete existing workspace files
```

**Auto-install on activation:**
```
✓ activates and installs when plugin is outdated
✓ activates and skips when plugin is up to date
✓ handles missing workspace folder gracefully
```

**Dynamic MCP registration stub:**
```
✓ registerDynamically returns false when Cursor API unavailable
✓ registerDynamically returns true when Cursor API available (mocked)
✓ falls back to mcp.json when dynamic registration fails
```

### 4.3 Transport Compatibility Tests

**StreamableHTTP transport:**
```
✓ MCP server responds to POST /mcp with valid JSON-RPC
✓ MCP server returns 404 for unknown paths
✓ Health endpoint returns server status
✓ A2A Agent Card returned at /.well-known/agent-card.json
✓ Tool call roundtrip works end-to-end (spawn → list → dismiss)
```

### 4.4 Evaluation Criteria

| Criterion | Target | Measurement |
|---|---|---|
| No regression in existing tests | 100% pass rate | `npm test` |
| Version checking coverage | All paths (missing, mismatch, match) | Unit test count |
| Selective update correctness | Only changed files overwritten | File mtime assertion |
| Auto-install safety | Does not break on missing workspace | Error handling test |
| Transport compatibility | HTTP + StreamableHTTP work | Integration test |

---

## 5. Rollout Plan

### Phase 1: Plugin Installer Enhancements (Option A)

**Target:** Next implementation session.

1. Add `.drive-version` marker file written after install
2. Add `isUpToDate()` check before full install
3. Add selective file update (hash comparison)
4. Add auto-install on extension activation (when outdated)
5. Write tests for version checking and selective updates
6. Update `package.json` with marketplace metadata (`icon`, `license`)

**Validation:** All existing tests pass + new installer tests pass. Manual test: install extension, run installer, update VSIX, verify auto-install updates `.cursor/` files.

### Phase 2: Dynamic MCP Registration Preparation

**Target:** When Cursor improves `registerServer()` API.

1. Add `registerDynamically()` method to `DriveMcpServer`
2. Gate behind `cursorDrive.mcp.dynamicRegistration` config flag (default `false`)
3. On activation: attempt dynamic registration → fall back to `.cursor/mcp.json`
4. Log success/failure for diagnostics

**Validation:** Dynamic registration stub tests pass. Manual test in Cursor: verify MCP server appears in tool list with dynamic registration enabled.

### Phase 3: Marketplace Publication

**Target:** After Phase 1 is stable.

1. Add extension icon
2. Add license field to `package.json`
3. Finalize `.vscodeignore` for clean package
4. Test `npx vsce package` produces valid VSIX
5. Publish to VS Code Marketplace (or Cursor marketplace when available)

**Validation:** `vsce package` succeeds. VSIX installs cleanly in fresh Cursor instance. Plugin installer works after marketplace install.

### Phase 4: Standalone MCP Package (Deferred — Option B)

**Target:** Only if cross-editor demand is validated.

Revisit Option B if:
- Users request Drive MCP tools from non-Cursor editors
- Claude Code or other AI tools want to call Drive's operator management
- Team-shared Drive instances become a use case

**Gate:** At least 3 user-reported cases where Drive MCP tools are needed outside Cursor.
