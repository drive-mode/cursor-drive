---
planId: cursor_plugin_marketplace_and_mcp_apps_implementation
planType: task
parentPlanId: cursor-drive
childPlanIds: []
dependsOn: []
name: Cursor Plugin Marketplace and MCP Apps Implementation
overview: Fix VSIX packaging for plugin installer, align .cursor-plugin/ with Cursor plugin standard, make MCP Apps CSP-compliant, and optionally submit to Cursor marketplace.
todos:
  - id: p1-vsix-packaging
    content: "Phase 1: Fix VSIX packaging so plugin installer works"
    status: completed
  - id: p2-cursor-plugin
    content: "Phase 2: Align .cursor-plugin/ with Cursor plugin standard"
    status: completed
  - id: p3-mcp-apps-csp
    content: "Phase 3: MCP Apps — self-contained HTML and CSP"
    status: completed
  - id: p4-marketplace
    content: "Phase 4: Cursor marketplace submission (optional)"
    status: completed
isProject: false
---

# Cursor plugin marketplace and MCP Apps alignment — implementation plan

**References:**

- [Building plugins](https://cursor.com/docs/plugins/building) — structure, manifest, discovery, submission
- [Plugins overview](https://cursor.com/docs/plugins) — marketplace, install, team marketplaces
- [Marketplace security](https://cursor.com/docs/plugins/security) — review, open source, MCP allowlist
- [MCP / MCP Apps](https://cursor.com/docs/context/mcp#mcp-apps) — Apps extension, progressive enhancement

**Impact on current build:** See [Impact summary](#impact-summary) below.

---

## Impact summary


| Area                         | Current state                                                                                                                                                                                                                                                                                                                                                                                                                          | Impact                                                                                                                                                                        |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Plugin structure**         | `.cursor-plugin/plugin.json` exists; paths point to `agents/`, `skills/`, `rules/`, `commands/`, `hooks/hooks.json`. Only `agents/` synced; skills/rules/commands/hooks "need copy" per README.                                                                                                                                                                                                                                        | Cursor marketplace expects a Git repo with a complete plugin root. Our `.cursor-plugin/` is incomplete for submission.                                                        |
| **VSIX vs plugin installer** | `pluginInstaller` copies from `extensionPath/agents`, `extensionPath/commands`, `extensionPath/rules`, `extensionPath/.cursor/skills`, `extensionPath/.cursor/hooks/drive-preprocessor.py`, `extensionPath/mcp.json`. Repo has these under `.cursor/`; `.vscodeignore` excludes `.cursor/`** (except hook file). So **VSIX does not contain** agents, commands, rules, or skills. Install command would fail (copy from missing dirs). | **Breaks** "Install Drive Plugin to Workspace" when users install from packaged VSIX. Must fix packaging or installer source paths.                                           |
| **MCP config**               | Drive uses `mcp.json` (no leading dot) in workspace `.cursor/`. Cursor plugin standard uses `.mcp.json` at plugin root.                                                                                                                                                                                                                                                                                                                | For **Cursor marketplace plugin** only: optional to add `.mcp.json` in plugin root for discovery; not required for extension flow.                                            |
| **MCP Apps**                 | One resource `ui://cursor-drive/agent-screen`; tools `agent_screen_activity`, `agent_screen_file`, `agent_screen_decision` return `_meta.ui`. HTML loads guest script from `https://esm.sh/@modelcontextprotocol/ext-apps`.                                                                                                                                                                                                            | Under strict host CSP (Cursor/Claude), external script can be blocked. R5 mitigation says self-contained HTML + nonce; current code does not comply.                          |
| **Security / marketplace**   | Extension (VSIX) = UI, MCP server :7891, TTS. Plugin = rules/skills/agents/commands/hooks. Cursor marketplace is for **plugins** (Git + `.cursor-plugin/`), not VSIX. Manual review, open source, MCP allowlist respected.                                                                                                                                                                                                             | No conflict: plugin lists rules/skills/etc.; MCP server runs in extension. Submit **plugin** to Cursor marketplace; keep **extension** on VS Code Marketplace or direct VSIX. |


---

## Implementation plan

### Phase 1: Fix VSIX packaging so plugin installer works

**Goal:** After installing the extension from VSIX, "Install Drive Plugin to Workspace" succeeds.

**Options (choose one):**

- **A — Prepublish copy:** Add a step (e.g. `vscode:prepublish` or a `package` script) that copies `.cursor/agents`, `.cursor/commands`, `.cursor/rules`, `.cursor/skills` into the extension root (e.g. `dist-plugin/` or root `agents/`, `commands/`, `rules/`) before packaging. Update `.vscodeignore` so those copied dirs are **included** in the VSIX (and continue to exclude `.cursor/` for dev). `pluginInstaller` keeps reading from `extensionPath/agents` etc.
- **B — Installer reads from .cursor in VSIX:** Change `pluginInstaller` to read from `extensionPath/.cursor/agents`, `extensionPath/.cursor/commands`, etc. Update `.vscodeignore` to **include** `.cursor/agents/`, `.cursor/commands/`, `.cursor/rules/`, `.cursor/skills/` (and any other needed paths), while still excluding `.cursor/plans/`, `.cursor/plans/`**, etc. so internal governance is not shipped.

**Recommendation:** B — single source of truth (`.cursor/` in repo), fewer copy steps, less drift. Require listing allowed `.cursor` subdirs in `.vscodeignore` (e.g. `!.cursor/agents/`, `!.cursor/commands/`, `!.cursor/rules/`, `!.cursor/skills/`).

**Tasks:**

- Implement Option B (or A): ensure plugin assets are present in VSIX and installer can read them.
- Update `pluginInstaller` if needed: e.g. source paths `extensionPath/.cursor/agents` etc., and keep `extensionPath/mcp.json` (already at root) and `extensionPath/.cursor/hooks/drive-preprocessor.py`.
- Verify: `npx vsce package` → install VSIX in clean Cursor → run "Install Drive Plugin to Workspace" → workspace `.cursor/` contains agents, commands, rules, skills, hooks, mcp.json.

---

### Phase 2: Align `.cursor-plugin/` with Cursor plugin standard

**Goal:** Repo (or plugin subdir) is a valid Cursor plugin for [cursor.com/marketplace/publish](https://cursor.com/marketplace/publish) and passes the [submission checklist](https://cursor.com/docs/plugins/building#submission-checklist).

**Cursor standard (from docs):**

- Required: `.cursor-plugin/plugin.json` with `name` (lowercase, kebab-case).
- Optional: description, version, author, homepage, repository, license, keywords, logo, rules, agents, skills, commands, hooks, mcpServers.
- Default discovery: `rules/`, `skills/` (subdirs with SKILL.md), `agents/`, `commands/`, `hooks/hooks.json`, `.mcp.json` at plugin root.
- All paths relative; no `..`; logo committed and referenced by relative path.

**Tasks:**

- Populate `.cursor-plugin/` so it is a complete plugin root: copy or sync skills, rules, commands, hooks from `.cursor/` (automate via npm script `build:plugin` as in `.cursor-plugin/README.md`).
- Add `homepage` and `repository` to `.cursor-plugin/plugin.json` (Cursor submission recommends these).
- For MCP: add either (1) `.mcp.json` at plugin root (Drive server entry) or (2) `mcpServers` in plugin.json (path or inline). Cursor discovers MCP from plugin root `.mcp.json` by default.
- Ensure `logo`: `assets/logo.svg` exists under plugin root. Cursor resolves relative paths to raw.githubusercontent.com; repo root has `assets/logo.svg` — confirm plugin root is repo root for marketplace (so `logo` path is valid) or add `assets/` under `.cursor-plugin/` and point logo there.
- Optional: filter to user-facing components only for marketplace (see `.cursor-plugin/README.md`) to avoid shipping plan-governor/doc-reviewer internals if desired.
- Validate: all rules, skills, agents, commands have required frontmatter (description, name where applicable); no absolute or `..` paths in manifest.

---

### Phase 3: MCP Apps — self-contained HTML and CSP

**Goal:** MCP App resource works under strict CSP (Cursor and other hosts). Align with [Cursor MCP Apps](https://cursor.com/docs/context/mcp#mcp-apps) and Drive’s own R5 (self-contained, nonce).

**Current gap:** `buildAgentScreenAppHtml()` (or guest HTML) loads script from `https://esm.sh/@modelcontextprotocol/ext-apps`. Strict CSP blocks external script; R5 says no external loads.

**Tasks:**

- Remove external script load for MCP App iframe: bundle or inline the minimal ext-apps guest code used in `agentScreenApp.ts`, or use a host-provided nonce and keep script inline (no esm.sh).
- If host supplies a nonce when serving the resource, inject it into the App HTML for inline script (and style) so we comply with R5 and strict hosts.
- Re-test MCP App in Cursor (and optionally Claude Desktop) with CSP strict; confirm no console/CSP errors.

---

### Phase 4: Cursor marketplace submission (optional)

**Goal:** Drive plugin discoverable and installable from [Cursor Marketplace](https://cursor.com/marketplace).

**Prerequisites:** Phases 1 and 2 done; plugin root complete and valid.

**Tasks:**

- Finalize plugin content (user-facing only vs full set) and version in `.cursor-plugin/plugin.json`.
- README: ensure `README.md` (or `PLUGIN-README.md`) documents usage and any config (per [Building plugins](https://cursor.com/docs/plugins/building#guidelines)).
- Submit: go to [cursor.com/marketplace/publish](https://cursor.com/marketplace/publish), submit repository link; Cursor team reviews.
- Document for maintainers: add a short "Publishing the Cursor plugin" section (e.g. in CONTRIBUTING or docs) — run `build:plugin`, commit, submit link; note that extension (VSIX) is separate and still needed for UI/MCP server/TTS.

---

## Dependency order

1. **Phase 1** — unblocks current users (VSIX + Install command); no dependency on 2–4.
2. **Phase 2** — depends on having a single source for components (Phase 1’s layout helps; can run copy-from-.cursor for `.cursor-plugin/`).
3. **Phase 3** — independent; can be done in parallel with 2.
4. **Phase 4** — depends on 2 (and optionally 3 for better cross-host MCP App behavior).

---

## Checklist (Cursor submission)

From [Building plugins](https://cursor.com/docs/plugins/building#submission-checklist):

- Plugin has valid `.cursor-plugin/plugin.json` with `name` unique, lowercase, kebab-case.
- `description` clearly explains purpose.
- All rules, skills, agents, commands have proper frontmatter metadata.
- Logo committed and referenced by relative path (if provided).
- `README.md` documents usage and configuration.
- All manifest paths relative and valid (no `..`, no absolute).
- Plugin tested locally.
- If multi-plugin repo: `.cursor-plugin/marketplace.json` at repo root with unique plugin names.

---

## Summary


| Phase | What                                              | Outcome                                                                                              |
| ----- | ------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| 1     | VSIX packaging / installer sources                | "Install Drive Plugin to Workspace" works from packaged VSIX.                                        |
| 2     | `.cursor-plugin/` complete and standard-compliant | Repo ready for Cursor plugin submission.                                                             |
| 3     | MCP App self-contained + nonce                    | MCP Apps work under strict CSP in Cursor and other hosts.                                            |
| 4     | Submit to Cursor marketplace                      | Plugin installable from cursor.com/marketplace; extension remains separate (VS Code or direct VSIX). |

---

## Reconciliation

**Verified:**
- Phase 1: `.vscodeignore` includes `.cursor/agents/`, `commands/`, `rules/`, `skills/`, `hooks/`; `pluginInstaller` reads from `extensionPath/.cursor/<dir>`. `pluginInstaller.test.ts` passes. VSIX packaging runs via `vscode:prepublish`.
- Phase 2: `npm run build:plugin` syncs `.cursor/` → `.cursor-plugin/`; `marketplace.json` source `.cursor-plugin`; `plugin.json` has `homepage`, `repository`; `.mcp.json` and `assets/logo.svg` copied; hooks filtered to drive-preprocessor only.
- Phase 3: MCP App uses bundled `app-with-deps.js` via blob URL when `getExtensionPath` provided; no external esm.sh load when bundle present. `agentScreenApp.test.ts` passes including CSP-compliant bundle test.
- Phase 4: "Publishing the Cursor plugin" section added to `docs/reference/marketplace-json-guide.md`.

**Residual risks:**
- MCP App bundle (~320KB) inlined in HTML when served; acceptable for CSP compliance.
- Actual Cursor marketplace submission is manual; not automated.

**Evidence:**
- `npm test` — pluginInstaller, agentScreenApp tests pass.
- `npm run compile` — succeeds.
- `npm run build:plugin` — runs without error.
