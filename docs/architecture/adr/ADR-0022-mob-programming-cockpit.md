# ADR-0022: Mob Programming Cockpit — Multi-Operator Workspace Isolation

## Status
Accepted

## Metadata
- Date: 2026-02-26
- Deciders: Cursor Drive maintainers
- Related: ADR-0004 (Multi-Agent Registry), ADR-0016 (Terminology and Hierarchy), ADR-0020 (Agent Steering), ADR-0021 (Orchestration Enhancement)

## Context

Drive supports multiple concurrent operators, but all operate on the same working tree. This creates several problems:

1. **Operator conflicts** — Two operators editing the same file create race conditions.
2. **No isolation** — An operator's uncommitted changes are visible to (and may break) other operators.
3. **No audit trail** — There's no way to review what each operator changed before it affects the user's code.
4. **No approval gate** — Operator changes merge directly into the user's branch without explicit approval.

The industry standard for multi-agent coding (as seen in Devin, SWE-agent, and similar tools) is workspace isolation via git worktrees, with a sync layer that surfaces proposals for review.

## Decision

**ADOPT** a driver-led multi-operator control plane with:

### 1. Git Worktree Isolation

Each operator gets an isolated git worktree:
- **Branch naming:** `drive/op/<operatorId>` (deterministic)
- **Path:** `.drive/worktrees/<operatorId>/` (deterministic)
- **Lifecycle:** allocate on demand, release on dismiss, cleanup orphans

Centralized `GitService` wraps all git shell calls with typed `GitResult<T>` error handling.

### 2. Sync Engine

`StateSyncCoordinator` computes deterministic snapshots:
- User HEAD commit and branch
- Per-operator HEAD, merge-base, changed files
- Conflict heuristic: file-intersection between operator and user changes

### 3. Proposal Lifecycle

Changes flow through auditable proposals:
```
pending_review → approved → applying → applied
                          ↘ conflict / failed_apply
pending_review → rejected
```

All proposals persisted in `.drive/state-sync/` via `SyncLedger`.

### 4. Approval-Gated Apply

Apply is serialized through `IntegrationQueue`:
- Single-flight FIFO processing
- Only approved proposals are apply-eligible
- Merge conflict detection with automatic abort and error reporting
- Failure does not deadlock the queue

### 5. Agent Screen Dashboard

New Sync tab in S-AS showing:
- User branch/head summary
- Per-operator workspace state with status badges
- Active proposals with conflict indicators
- Integration queue state

### 6. MCP Tool Surface

Full lifecycle operable via MCP tools:
- `operator_sync_status`, `operator_sync_proposals`
- `operator_sync_approve`, `operator_sync_reject`
- `operator_sync_apply` (gated + serialized)
- `operator_events_latest`
- `integration_queue_status`

## Consequences

### Positive
- Operators cannot interfere with each other's work
- All changes are auditable before reaching the user branch
- Deterministic sync snapshots enable reliable status reporting
- S-AS provides steering information for informed decisions
- Core flow works without external dependencies (MCP Apps optional)

### Negative
- Git worktree operations add I/O overhead per operator
- `.drive/worktrees/` and `.drive/state-sync/` directories use disk space
- More complex extension initialization path

### Risks Mitigated
- **Git command brittleness:** Centralized in `GitService` with typed errors
- **Queue/apply races:** Single-flight mutex primitive
- **Schema drift:** Single source of truth in `syncTypes.ts`
- **UI complexity:** MVP limited to Sync + Activity tabs; video deferred

## Deferred

- Pixel streaming / visual snapshot feed (contract scaffold in `snapshotFeed.ts`)
- MCP Apps external connectors (graceful no-op stubs included)
- Remote control path for S-AS (remains view-only per invariants)
- Auto-allocation of worktrees on operator spawn (manual/on-demand for now)
