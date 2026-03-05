---
planId: mob-programming-cockpit-mvp
planType: task
parentPlanId: cursor-drive
childPlanIds: []
dependsOn: []
todos:
  - id: mpc-mvp
    content: "Mob Programming Cockpit MVP — implemented"
    status: completed
isProject: false
---

# Mob Programming Cockpit — MVP Plan

## Status: Implemented

## Scope

Driver-led multi-operator control plane with S-AS dashboard observability.

### Included in MVP
- ✅ Isolated git worktrees per operator
- ✅ Deterministic sync snapshots
- ✅ Conflict detection (file-intersection heuristic)
- ✅ Proposal lifecycle (pending → approved → applied)
- ✅ Approval-gated, serialized apply via IntegrationQueue
- ✅ MCP tools for full lifecycle operation
- ✅ S-AS Sync tab with operator states and proposals
- ✅ Activity event buffer with operator filtering
- ✅ Persistent ledger (.drive/state-sync/)
- ✅ Connector stubs (graceful no-op)
- ✅ Snapshot feed contract scaffold

### Deferred Post-MVP
- ⏳ Pixel streaming / visual snapshot feed
- ⏳ MCP Apps external connectors (actual integration)
- ⏳ Auto-worktree allocation on operator spawn
- ⏳ Advanced conflict resolution (three-way merge UI)
- ⏳ S-AS remote control path
- ⏳ Cross-worktree file diffing in S-AS

## Architecture

```
User IDE (main worktree)
    ↕ GitService
    ↕ StateSyncCoordinator ← computes snapshots + proposals
    ↕ SyncLedger (persists to .drive/state-sync/)
    ↕ IntegrationQueue (serializes applies)
    
Operator worktrees (.drive/worktrees/<id>/)
    ↕ WorktreeManager (allocate/release lifecycle)
    ↕ OperatorRegistry (metadata: branch, commit, syncState)

MCP Tools (7 sync + 2 connector + 1 queue)
    → operator_sync_status/proposals/approve/reject/apply
    → operator_events_latest
    → integration_queue_status
    → connector_publish_proposal, connector_push_progress

S-AS Agent Screen
    → Sync tab (operators, proposals, queue)
    → Activity tab (events, decisions)
    → bottomLog mode (concise text formatting)
```

## New Files
| File | Purpose |
|------|---------|
| `src/syncTypes.ts` | Shared type contracts |
| `src/gitService.ts` | Centralized git command wrapper |
| `src/worktreeManager.ts` | Per-operator worktree lifecycle |
| `src/stateSyncCoordinator.ts` | Sync engine + conflict heuristic |
| `src/syncLedger.ts` | Persistent proposal + decision storage |
| `src/integrationQueue.ts` | Single-flight apply serializer |
| `src/snapshotFeed.ts` | Contract scaffold for future pixel streaming |

## Updated Files
| File | Changes |
|------|---------|
| `src/operatorRegistry.ts` | +workspace metadata fields, +updateWorkspaceState() |
| `src/mcpServer.ts` | +10 new MCP tools, +constructor options |
| `src/agentScreen.ts` | +Sync tab, +sync/proposal/queue events |
| `src/commsAgent.ts` | +sync notification type |
| `src/extension.ts` | +sync service initialization + wiring |

## Key Decisions
- See ADR-0022 for full rationale
- Worktree allocation is on-demand (not auto on spawn) to avoid startup latency
- Conflict heuristic uses simple file intersection (no content-level merge analysis)
- Proposals are persisted as JSON (not in git) for restart safety
- Apply gate uses existing approval gates infrastructure
