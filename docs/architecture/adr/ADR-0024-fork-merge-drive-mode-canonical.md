# ADR-0024: Fork Merge — Drive-Mode as Canonical for extension.ts and Core Stack

## Status

Accepted

## Metadata

- Date: 2026-03-04
- Deciders: Cursor Drive maintainers
- Related: PR from `hhalperin/cursor-drive:cursor/cursor-agentic-framework-review-288f` into `drive-mode/cursor-drive`

## Context

The fork `hhalperin/cursor-drive` and upstream `drive-mode/cursor-drive` had **unrelated Git histories**. A merge of branch `cursor-agentic-framework-review-288f` into drive-mode's main required `--allow-unrelated-histories` and produced 30+ add/add conflicts, including `src/extension.ts`.

The two codebases diverged architecturally:

| Aspect | Review branch (fork) | drive-mode main |
|--------|---------------------|------------------|
| UI panel | ShareScreenPanel | AgentScreenPanel |
| Agents | AgentRegistry | OperatorRegistry + CommsAgent |
| Activation | Synchronous | Async, output channel, try/catch init |
| Extra services | — | SessionMemory, PersistentMemory, plugin installer, sync/worktree, tangent flow |

## Decision

For the merge, **drive-mode (origin/main) was taken as canonical** for all conflicted files:

- **src/extension.ts** and the rest of the extension entrypoint and core stack: keep drive-mode's version (AgentScreenPanel, OperatorRegistry, async activate, full feature set).
- All other conflicted files (src/*.ts, package.json, README, .cursor/*, docs/*): resolved by keeping **ours** (origin/main); no selective re-application of review-branch edits unless explicitly required later.

Conflict resolution was performed with `git checkout --ours` for each conflicted path, then commit. The merge commit message: `merge: integrate cursor-agentic-framework-review-288f (drive-mode canonical)`.

## Consequences

- drive-mode/cursor-drive remains the single source of truth for the extension and plugin stack.
- The fork was updated (Option A): `sync-with-drive-mode` branch and force-push of `origin/main` to `hhalperin/main` so the fork can stay in sync via rebase or mirror.
- Future PRs from the fork should be created from branches based on `origin/main` to avoid unrelated-history merges.
