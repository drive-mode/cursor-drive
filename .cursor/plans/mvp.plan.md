---
name: Cursor Drive MVP
overview: Consolidated plan to ship the Cursor Drive extension MVP. Aggregates remaining work from cursor-drive-master.plan.md, cursor-drive-v1-release-plan.md, and repo_review_and_get_back_on_track. Supersedes scattered plan references for a single executable plan.
todos:
  - id: mvp-repo-reconcile
    content: Reconcile develop with origin/develop (ahead 12, behind 12). Inspect divergence; merge or reset per repo_review; resolve conflicts.
    status: completed
  - id: mvp-compile-verify
    content: Verify npm run compile succeeds. Fix any build errors before proceeding.
    status: completed
  - id: mvp-test-verify
    content: Run npm test; confirm 555+ pass, 1 skipped. Fix any regressions.
    status: completed
  - id: mvp-smoke
    content: Manual smoke test — F5 (or npm run reinstall:dev-sandbox) → toggle Drive (Ctrl+Shift+D) → submit "hello" → confirm response + Agent Screen shows activity.
    status: completed
  - id: mvp-ci-green
    content: Run npm ci && npm run compile && npm test. Ensure CI workflow passes locally. Fix .github/workflows/ci.yml if needed.
    status: completed
  - id: mvp-vsix-package
    content: Run npx vsce package. Verify .vsix artifact is produced.
    status: completed
  - id: mvp-vsix-install
    content: Install .vsix in clean Cursor (Extensions → Install from VSIX). Confirm extension activates, Drive toggle works.
    status: completed
  - id: mvp-docs-smoke
    content: Update README or CONTRIBUTING with final smoke-test steps if not already documented.
    status: completed
isProject: true
---

# Cursor Drive MVP Plan

Single consolidated plan for shipping the MVP. All prior Phase 1 work (tests, config, docs) is complete. This plan covers the remaining verification and packaging steps.

---

## MVP Definition

**Core loop:** User installs extension → toggles Drive (Ctrl+Shift+D) → submits prompt (type or voice) → pipeline processes it → model responds → Agent Screen shows activity. Optional: spawn operator via "tangent X — task".

**Out of scope for MVP:** Proactive steering, Piper/ElevenLabs TTS, Cloudflare Worker, reinstall CI automation, slash command wiring (keyword routing works without), ACP, displayMode panel fix.

---

## Completed (Pre-MVP)

| ID | Item | Source |
|----|------|--------|
| p1-tests | Fix test failures (modeSwitcher mock, agentScreen Unicode, glossaryExpander) | master |
| p1-config-schema | Add missing config schema keys to package.json | master |
| p1-config-ts | Create src/config.ts with zod validation | master |
| p1-config-schema-doc | Fix docs/reference/config-schema.md reference to config.ts | master |
| p1-config-test | Add tests/config.test.ts | master |
| p1-readme | Update README Status section | master |
| p1-getting-started | Update docs/guides/getting-started.md Node version (20) | master |
| p2-display-mode | Fix or document panel displayMode (legacy alias for tab) | master |
| p2-bottomlog-docs | Document bottomLog as terminal-first option | master |
| p8-token-fix | Fix token logging in scripts/create-cloudflare-token.mjs | master |

---

## Execution Order

```
mvp-repo-reconcile
       │
       ├──► mvp-compile-verify
       │
       ├──► mvp-test-verify
       │
       └──► mvp-smoke (manual; can run in parallel with CI)
                    │
                    ├──► mvp-ci-green
                    │
                    └──► mvp-vsix-package ──► mvp-vsix-install
                                    │
                                    └──► mvp-docs-smoke
```

---

## Detailed Todos

### mvp-repo-reconcile

**Goal:** Resolve `develop...origin/develop [ahead 12, behind 12]` so you have a clean base for packaging.

**Steps:**
1. `git log --oneline develop ^origin/develop` — inspect your 12 commits
2. `git log --oneline origin/develop ^develop` — inspect origin's 12 commits
3. Decide: keep your state, adopt origin (cursor-drives Mar 13 cleanup), or merge
4. If adopting origin: `git fetch origin && git reset --hard origin/develop` (back up first: `git branch develop-backup`)
5. If merging: `git fetch origin && git merge origin/develop` (resolve conflicts)
6. If rebasing: `git fetch origin && git rebase origin/develop`

**Verification:** `git status` shows clean or expected uncommitted; `develop` and `origin/develop` aligned or merged.

---

### mvp-compile-verify

**Goal:** Ensure the extension builds.

**Steps:**
1. `npm ci`
2. `npm run compile`
3. Fix any TypeScript or build errors

**Verification:** `npm run compile` exits 0.

---

### mvp-test-verify

**Goal:** Ensure all tests pass.

**Steps:**
1. `npm test`
2. Expect 555+ passed, 1 skipped
3. Fix any failing tests (mocks, expectations)

**Verification:** `npm test` exits 0.

---

### mvp-smoke

**Goal:** Confirm the core loop works end-to-end.

**Steps:**
1. F5 (or `npm run reinstall:dev-sandbox` if using sandbox)
2. Toggle Drive (Ctrl+Shift+D or status bar click)
3. Submit a prompt (e.g. "hello" or "Call agent_screen_activity and log a short status")
4. Confirm: model responds; Agent Screen shows activity when model uses `agent_screen_*` tools

**Verification:** Response appears; Agent Screen (tab or bottomLog) shows activity.

**Debug:** Output → Cursor Drive; `cursorDrive.diagnose`; `curl http://127.0.0.1:7891/health`.

---

### mvp-ci-green

**Goal:** CI workflow passes.

**Steps:**
1. Run `npm ci && npm run compile && npm test` locally
2. Push to trigger CI (or run workflow manually)
3. Fix `.github/workflows/ci.yml` or scripts if CI fails

**Verification:** CI job passes on push/PR.

---

### mvp-vsix-package

**Goal:** Produce installable VSIX.

**Steps:**
1. `npx vsce package`
2. Confirm `cursor-drive-*.vsix` is created

**Verification:** `.vsix` file exists in project root.

---

### mvp-vsix-install

**Goal:** Confirm VSIX installs and runs in clean Cursor.

**Steps:**
1. Open Cursor (or fresh profile)
2. Extensions → … → Install from VSIX
3. Select the built `.vsix`
4. Reload if prompted
5. Toggle Drive; submit prompt; confirm Agent Screen

**Verification:** Extension activates; core loop works from packaged install.

---

### mvp-docs-smoke

**Goal:** Document smoke-test steps for future verification.

**Steps:**
1. Check README, CONTRIBUTING, or docs/guides for smoke-test instructions
2. Add or update: F5 → toggle → submit → confirm Agent Screen
3. Reference `docs/guides/getting-started.md` or `docs/guides/demo-mcp-apps.md` if relevant

**Verification:** New contributor can follow docs to verify MVP.

---

## Success Criteria

- [ ] `npm run compile` passes
- [ ] `npm test` passes (555+ tests)
- [ ] F5 → Drive toggle → submit prompt → model responds
- [ ] Agent Screen shows activity when model uses `agent_screen_*` tools
- [ ] `npx vsce package` produces `.vsix`
- [ ] VSIX installs and runs in clean Cursor
- [ ] Repo `develop` reconciled with `origin/develop` (or merge complete)

---

## Critical Path (Reference)

```
Extension activates → MCP starts :7891 → Hook runs → Pipeline runs → Model responds → MCP tools update UI → User sees result
```

| Step | Verify |
|------|--------|
| A | Output channel "Cursor Drive" shows `[Drive] activate() complete` |
| B | Output shows `MCP server: listening on port 7891` |
| C | `.cursor/hooks.json` has `drive-preprocessor`; Drive: Install Plugin to Workspace |
| D | Submit prompt with Drive ON; no crash = pipeline ran |
| E | Chat shows model response |
| F | Agent Screen shows activity when model calls `agent_screen_*` |

---

## Debug Cheat Sheet

| When | Action |
|------|--------|
| After every change | `npm run compile` → `npm test` |
| Before claiming done | F5 → toggle → submit "hello" → confirm response + Agent Screen |
| Pipeline breaks | Output → Cursor Drive; add `out.appendLine` at pipeline stages |
| Hook doesn't run | Check Cursor Plugins output; verify `drive-preprocessor` in hooks.json |
| MCP tools fail | `curl http://127.0.0.1:7891/health`; `cursorDrive.diagnose` |
| Tests fail | Read failure; fix mock or implementation |

---

## Deferred (Explicitly Out of Scope)

- Slash command wiring (keyword routing works)
- ACP / cursor-sdk wiring
- Extension reinstall automation (Phase 7)
- Cloudflare setup phases (Phase 8)
- Integration tests (@vscode/test-cli)
- Audit logging, data-egress guard
- displayMode panel fix (documented as legacy)

---

## Sources

- `.cursor/plans/cursor-drive-master.plan.md`
- `docs/plans/cursor-drive-v1-release-plan.md`
- `.cursor/plans/repo_review_and_get_back_on_track_21628908.plan.md`
- `docs/plans/testing-and-scope-pivot.plan.md`
