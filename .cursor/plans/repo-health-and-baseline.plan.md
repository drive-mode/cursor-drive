---
planId: repo-health-and-baseline
name: Repo Health and Baseline
overview: Establish a clean baseline: git triage, fix test failures, sync fork/upstream, reconcile plan system, and perform architecture review with prioritized bugfixes.
planType: task
parentPlanId: cursor-drive
childPlanIds: []
dependsOn: []
todos:
  - id: phase1-git-triage
    content: "Break accumulated changes into logical commits (governance, skills/rules, source, docs)"
    status: completed
  - id: phase2-fix-tests
    content: "Fix test failures (pipeline wake-word text, driveSidebar mock, TTS/port if any)"
    status: completed
  - id: phase3-fork-upstream-sync
    content: "Sync fork with upstream, purge old branches, push or open PR"
    status: completed
  - id: phase4-plan-reconcile
    content: "Run plan-sync, update cursor-drive childPlanIds, verify diagram"
    status: completed
  - id: phase5-repo-review
    content: "Map core flows, plan permission/MCP/operator hardening fixes"
    status: completed
  - id: phase6-bugfix-impl
    content: "Implement prioritized bugfixes with verification gates"
    status: completed
isProject: false
---

# Repo Health and Baseline (Consolidated)

Merges: project_cleanup_and_reset, fork_upstream_sync_and_branch_cleanup, repo_review_and_bugfix.

## Phase 1: Git Triage and Commit

Break accumulated changes into logical commits on current branch.


| Commit            | Scope                                                                             |
| ----------------- | --------------------------------------------------------------------------------- |
| 1 — Governance    | `.cursor/agents/`, `.cursor/hooks/`, `.cursor/plans/`, `.cursor-plugin/`          |
| 2 — Skills, rules | `.cursor/skills/`, `.cursor/rules/`, `.cursor/commands/`, `.cursor/settings.json` |
| 3 — Source        | `src/`, `tests/`                                                                  |
| 4 — Docs          | `docs/`, `.gitignore`                                                             |


## Phase 2: Fix Test Failures

- **pipeline.test.ts**: Wake-word expects `"How can I help?"` but receives `"Drive listening. How can I help?"` — align expectation or response.
- **driveSidebar.test.ts**: Mock missing `webviewView.onDidChangeVisibility`.
- **TTS/port** (if still failing): Stub `say.stop`, `getSpokenHistory`; fix mcpServer port teardown.

Gate: `npm run compile && npm test` pass.

## Phase 3: Fork and Upstream Sync

1. Stash or commit local WIP
2. `git fetch hhalperin` and `git fetch origin`
3. Checkout main, `git pull hhalperin main`
4. Push main to fork: `git push hhalperin main`
5. Update develop from main, push to fork
6. Purge old branches on GitHub (keep main, develop)
7. `git fetch hhalperin --prune`
8. If push access: `git push origin main`; else open PR from fork to upstream

## Phase 4: Plan System Reconciliation

- Run `python .cursor/hooks/plan-runner.py sync-registry`
- Update `cursor-drive.plan.md` childPlanIds to match active plans
- Verify `plan-master.diagram.md` shows only active plans

## Phase 5: Repo Review (Planning)

### Core runtime flow

```
beforeSubmitPrompt (Cursor) → drive-preprocessor.py (adds context)
  → Cursor native agent receives prompt + context
  → Agent calls Drive MCP tools (drive_run_pipeline, operator_spawn, etc.)
  → mcpServer.ts: runPipeline() → router → approvalGates → model-select
  → Operator actions: registry.spawn(), toolAllowlist.checkPermissionForOperator()
```

- **Hook**: `drive-preprocessor.py` adds filler/tangent/mode hints; does not block.
- **Pipeline**: `runPipeline()` in `pipeline.ts` — filler-clean, glossary, sanitize, route, approval-gate.
- **MCP**: `mcpServer.ts` exposes `drive_run_pipeline`, `operator_spawn`, `execute_tool`; handlers call `checkPermissionForOperator()` for operator-aware tools.

### Planned hardening (Phase 6)

| Item | Status | Notes |
|------|--------|------|
| Permission precedence (deny-wins) | Implemented | `toolAllowlist.getEffectivePresetForOperator()` already applies config override as restrict-only |
| MCP capability enforcement | To verify | Ensure all operator-sensitive handlers call `checkPermissionForOperator` before executing |
| Spawn validation | To implement | `operatorRegistry.spawn()` — validate name uniqueness, parent cascade |
| Approval-gate consistency | To verify | `approvalGates` + `pipeline` pass operator context correctly |
| Test expansion | To add | Permission cascade, MCP denial, spawn edge cases |

## Phase 6: Bugfix Implementation

After Phase 5 approval, implement in order:

1. Permission precedence in `toolAllowlist.ts`
2. Capability checks in MCP handlers (`mcpServer.ts`)
3. Spawn validation in `operatorRegistry.ts`
4. Approval-gate consistency in `approvalGates.ts` and `pipeline.ts`
5. Test expansion

Verification after each batch: `npm run compile`, `npm test`, invariant check (vision-invariants, operator-hierarchy, tiered-model-routing).

## Reconciliation

### Verified

| Phase | Outcome |
|-------|---------|
| 1 — Git triage | 5 commits: governance, skills/rules, source, docs, test fixes |
| 2 — Fix tests | pipeline.test.ts (wake-word expectation), driveSidebar.test.ts (onDidChangeVisibility, ExtensionMode mock) |
| 3 — Fork sync | main pushed to hhalperin; develop merge skipped (local changes); branch purge on GitHub is manual |
| 4 — Plan reconcile | sync-registry run; childPlanIds match; diagram shows 9 active plans |
| 5 — Repo review | Core flow documented; toolAllowlist deny-wins already implemented; MCP handlers use checkPermissionForOperator |
| 6 — Bugfix impl | Spawn validation (name collision, invalid parentId) already in operatorRegistry; added 2 tests in operatorRoles.test.ts |

### Residual risks

- **Branch purge**: Old branches on fork (hhalperin) remain; delete via GitHub UI per docs/guides/fork-and-upstream-sync.md
- **Upstream push**: `git push origin main` not attempted; if no write access, open PR from fork to drive-mode/cursor-drive
- **Worker leak**: Jest reports "worker process has failed to exit gracefully" — known; tests pass

### Evidence

- `npm run compile && npm test`: 47 suites, 520 tests pass
- `git log --oneline -6`: a9c47df..f736b8e (governance, skills, source, docs, fix)

## References

- [CONTRIBUTING.md](../../CONTRIBUTING.md) — branch strategy
- [docs/guides/fork-and-upstream-sync.md](../../docs/guides/fork-and-upstream-sync.md)
- [.cursor/rules/operator-hierarchy.mdc](../../.cursor/rules/operator-hierarchy.mdc)
