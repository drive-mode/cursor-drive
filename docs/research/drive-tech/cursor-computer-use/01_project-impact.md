# Cursor Computer Use: Project Impact on Drive

**Prepared:** February 2026
**Scope:** How Cursor's computer use capabilities affect Drive's operator model, architecture, and roadmap.

---

## Impact on Drive operators

### Visual verification of UI changes

Operators that make UI changes (CSS, React components, HTML templates) currently have no way to verify their work visually. They rely on lint/type checks and test suites.

With MCP screenshot tools, an operator could:
1. Make a UI change.
2. Call a screenshot MCP tool to capture the rendered page.
3. Compare against a baseline or reason over the screenshot to verify correctness.
4. Report visual verification status on the Agent Screen (`agent_screen_activity`).

This closes the "blind coding" gap for UI work.

### Browser-based testing

Operators could run browser-based tests beyond unit/integration tests:
- Navigate to a URL, interact with elements, capture screenshots at each step.
- Verify end-to-end flows (login → dashboard → action → result).
- Detect visual regressions by comparing screenshots across runs.

Drive's Agent Screen (`agent_screen_file`, `agent_screen_decision`) could surface these visual test results.

---

## Cloud Agents as an execution target

### Async background work

Cloud Agents map naturally to Drive's background operators. An operator spawned via `operator_spawn` with status `"background"` conceptually matches a Cloud Agent running in a background VM.

The gap: Drive's `operatorRegistry.spawn()` creates an in-memory operator with no execution backend. Cloud Agents provide that backend — a VM where the operator's task actually runs.

### Dispatch model

```
User voice command
  → Drive pipeline (filler-clean → sanitize → route)
    → operator_spawn (local registry)
      → [future] Cloud Agent dispatch (VM creation, tool harness, autonomous execution)
        → operator completes → merge results
```

Today, the pipeline stops at the local registry. Cloud Agent dispatch would extend the chain to actual background execution.

### A2A Task mapping

Drive's A2A Task endpoints (`POST /tasks`, `GET /tasks/:id`) already map operator lifecycle to A2A task states:

| A2A state | Drive operator status |
|---|---|
| `submitted` | Operator spawned |
| `working` | `active` or `background` |
| `completed` | `completed` or `merged` |
| `canceled` | Dismissed via `operator_dismiss` |

Cloud Agent lifecycle maps to the same states. A Cloud Agent could be represented as an A2A task, with the VM acting as the execution backend for the operator.

---

## Parallel agent support → Drive multi-operator model

Cursor's 8-agent parallel execution via git worktrees maps to Drive's multi-operator model:

| Cursor parallel agents | Drive operators |
|---|---|
| Up to 8 concurrent agents | Configurable `maxConcurrent` via `getMaxConcurrent()` |
| Git worktree isolation | Operator visibility (`isolated`, `shared`, `collaborative`) |
| Independent execution | Background operators with separate task context |
| Merge after completion | `operator_merge` combines memory/context |

**Key difference:** Cursor's parallel agents are fully isolated via worktrees. Drive's operators share an in-memory registry and can have `shared` or `collaborative` visibility. True isolation would require either worktree-level separation or Cloud Agent VMs.

---

## What it enables

### Operators verify their own work

An operator working on a React component could:
1. Edit the file.
2. Call `screenshot_capture` (MCP tool) to render the component.
3. Analyze the screenshot for correctness.
4. Log the result via `agent_screen_decision`.

No human intervention needed for visual QA of straightforward UI changes.

### Asynchronous operator execution

Cloud Agents allow operators to work independently for minutes or hours. The user can:
- Spawn an operator for a long-running task ("refactor the auth module").
- Continue working with another operator in the foreground.
- Receive the completed result via webhook or polling.

This unlocks "fire and forget" delegation — a key use case for voice-first interaction where the user wants to issue a command and move on.

### Automated test runs

Operators could trigger and monitor test suites:
- Run `npm test` in a Cloud Agent VM.
- Capture screenshots of failing UI tests.
- Report results on the Agent Screen.

---

## Dependencies

| Dependency | Status | Required for |
|---|---|---|
| Cursor Cloud Agents API | **Not public** (Feb 2026) | Programmatic operator dispatch to cloud VMs |
| MCP screenshot tools | **Community/emerging** | Visual verification, browser-based testing |
| Vision-capable model | **Available** (GPT-4o, Claude 3.5) | Reasoning over screenshots |
| Cursor v0.49+ | **Shipped** | Image support in MCP tool responses |
| Webhook/Background Agent API | **Limited access** | Automated coordination, external triggers |

---

## Risks

| Risk | Severity | Detail |
|---|---|---|
| **Cursor-specific API lock-in** | High | Cloud Agents API is proprietary and not public. No alternative path if Cursor changes direction. |
| **Cloud Agent execution cost** | Medium | Each Cloud Agent consumes VM resources. Cost scales with agent count and runtime. |
| **Visual verification reliability** | Medium | Screenshots are point-in-time; dynamic content, animations, and race conditions reduce reliability. |
| **No public dispatch API** | High (blocker) | Cannot programmatically create Cloud Agents from Drive's operator registry. Must wait for API availability. |
| **Screenshot tool maturity** | Medium | Community MCP servers may break across Cursor versions. No official support. |
| **Privacy: screen captures** | Medium | Screenshots may contain sensitive data (credentials, PII). Must not persist or transmit without consent. |

See [04_risks-and-mitigations.md](04_risks-and-mitigations.md) for mitigations.

---

## Summary

Computer use capabilities extend Drive's operator model from logical orchestration to physical execution. The highest-value near-term integration is MCP screenshot tools for visual verification. Cloud Agent dispatch is blocked on API availability but architecturally aligned with Drive's existing operator lifecycle and A2A task mapping.
