# Operator Registry v2 Design

Design for evolving the OperatorRegistry (ADR-0004) to a lead+worker model informed by Claude Code Agent Teams and A2A protocol.

## 1. Shared Task List

**Concept**: One central task list. A lead operator claims tasks and assigns them to workers. Workers execute and mark tasks complete.

```
┌─────────────────────────────────────────────────────────────┐
│                    Shared Task List                          │
│  [ ] Refactor auth module                                    │
│  [ ] Add rate limiting to API                                │
│  [x] Research token bucket vs leaky bucket                   │
│  [ ] Write integration tests                                │
└─────────────────────────────────────────────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
    Lead (Alpha)         Worker (Beta)       Worker (Gamma)
    claims, assigns      executes            executes
```

**Implementation**:
- New `TaskQueue` or `SharedTaskList` module
- Tasks: id, description, status (pending | claimed | in_progress | completed | failed), claimedBy?, assignedTo?
- Lead calls `claimTask(id)` or `assignTask(id, workerId)`
- Workers call `startTask(id)`, `completeTask(id)`, `failTask(id, reason)`

**Order**: Implement after event bus (aof-04). Task list is the coordination primitive for lead+worker.

## 2. Mailbox Messaging

**Concept**: Typed async messages between operators via EventEmitter + queue. Workers post results; lead consumes at natural boundaries.

```
  Beta (worker)                    Alpha (lead)
       │                                │
       │  postMessage("result", {...})   │
       │ ──────────────────────────────► │
       │                                │  consumeMailbox()
       │                                │  process results
       │  postMessage("question", ...)  │
       │ ◄──────────────────────────────│
       │                                │
```

**Implementation**:
- Extend OperatorRegistry events: `operatorMessage(fromId, toId, type, payload)`
- Per-operator mailbox: `Map<operatorId, Message[]>`
- `postMessage(toId, type, payload)` — enqueue
- `consumeMailbox(operatorId)` — drain and return messages
- CommsAgent can subscribe to `operatorMessage` for user-facing summaries

**Order**: After shared task list. Mailbox enables result handoff.

## 3. File-Lock Coordination

**Concept**: Prevent concurrent writes to the same file by different operators. When operator A is editing `src/auth.ts`, operator B must wait or choose a different file.

```
  Alpha editing src/auth.ts
       │
       │  acquireLock("src/auth.ts")
       │  ──► Lock granted
       │
  Beta wants to edit src/auth.ts
       │
       │  acquireLock("src/auth.ts")
       │  ──► Blocked or "file locked by Alpha"
       │
  Alpha completes
       │
       │  releaseLock("src/auth.ts")
       │  ──► Beta can now acquire
```

**Implementation**:
- `FileLockRegistry`: `Map<filePath, { operatorId, acquiredAt }>`
- `acquireLock(filePath, operatorId)` — grant if free, else reject
- `releaseLock(filePath)` — clear
- MCP tools or edit hooks call acquire before write, release after
- Optional: `getLockedFiles()` for UI display

**Order**: After mailbox. File locks reduce merge conflicts when workers touch same files.

## 4. Lead Operator Concept

**Concept**: Orchestrator role, not just "first spawned operator". Lead receives user requests, delegates subtasks, aggregates results. Workers execute focused tasks.

| Aspect | v1 (current) | v2 |
|--------|--------------|-----|
| Foreground | First spawned | Explicit lead designation |
| Delegation | Manual spawn + merge | Task assignment + mailbox |
| Coordination | None | Shared task list, file locks |

**Implementation**:
- `OperatorContext.role?: "lead" | "worker"`
- `setLead(operatorId)` — designate lead; previous lead becomes worker
- Lead-only operations: `claimTask`, `assignTask`, `consumeMailbox` (workers post, lead consumes)
- Default: first operator is lead; spawn sets new operators as workers

**Order**: Implement with shared task list. Lead is the consumer of the task list and mailbox.

## Implementation Order

1. **Event bus** (done) — operatorCompleted, operatorProgress, taskDelegated
2. **Lead designation** — add `role` to OperatorContext, `setLead()`
3. **Shared task list** — TaskQueue, claim/assign/complete
4. **Mailbox** — postMessage, consumeMailbox, operatorMessage event
5. **File locks** — FileLockRegistry, acquire/release

## Diagrams

### Lead+Worker Flow

```
User request
     │
     ▼
┌─────────┐     claim/assign      ┌──────────────┐
│  Lead   │ ◄───────────────────► │ Task List    │
│ (Alpha) │                       └──────────────┘
└────┬────┘
     │ assign
     ├─────────────────► Worker (Beta)  ──► postMessage(result)
     │                                         │
     └─────────────────► Worker (Gamma) ──► postMessage(result)
     │                                         │
     ▼ consumeMailbox()
  Aggregate, respond to user
```

### File Lock Flow

```
Worker A                    FileLockRegistry              Worker B
    │                              │                            │
    │ acquireLock("auth.ts")       │                            │
    │ ──────────────────────────► │ granted                    │
    │                              │                            │
    │                              │  acquireLock("auth.ts")    │
    │                              │ ◄───────────────────────── │
    │                              │ blocked                    │
    │ releaseLock("auth.ts")       │                            │
    │ ──────────────────────────► │                            │
    │                              │ ─────────────────────────► │ granted
```

## References

- ADR-0004: In-memory AgentRegistry (OperatorRegistry)
- ADR-0014: Agent Orchestration Strategy
- [Claude Code Agent Teams](https://code.claude.com/docs/en/agent-teams)
- [A2A Protocol Research](../../research/a2a-protocol-research.md)
