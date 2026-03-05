# Cursor Computer Use: Implementation Analysis

**Prepared:** February 2026
**Scope:** Current state, integration points, implementation options, testing strategy, and rollout plan.

---

## Current state

### What exists

`src/cursorCliRunner.ts` wraps the Cursor CLI (`agent -p "..."`) for headless/scripted coding tasks. The MCP tool `cursor_cli_run` exposes this via `mcpServer.ts`. This is the only current bridge between Drive and Cursor's agent execution.

| File | Role |
|---|---|
| `src/cursorCliRunner.ts` | Spawn Cursor CLI process, capture stdout/stderr, handle timeout |
| `src/mcpServer.ts` | `cursor_cli_run` tool registration; A2A task endpoints (`/tasks`) |
| `src/operatorRegistry.ts` | In-memory operator lifecycle: spawn, switch, pause, resume, dismiss, merge, delegate |
| `src/toolAllowlist.ts` | Permission presets (`readonly`, `standard`, `full`) with operator-aware capability checks |

### What does not exist

- No screenshot or browser interaction capability.
- No Cloud Agent dispatch — `operatorRegistry.spawn()` creates in-memory state only.
- No visual verification of any kind.
- No webhook-triggered operator spawning (A2A `/tasks` endpoint exists but is passive — it waits for HTTP requests, does not push).

---

## Integration points

### `mcpServer.ts` — Add screenshot tools

The MCP server registers tools via `this.mcpServer.tool(name, description, schema, handler)`. Screenshot tools would follow the same pattern:

```typescript
this.mcpServer.tool(
  "screenshot_capture",
  "Capture a screenshot of a URL or the current browser state.",
  {
    url: z.string().optional().describe("URL to navigate to before capture."),
    selector: z.string().optional().describe("CSS selector to capture (default: full page)."),
    viewport_width: z.number().optional().describe("Viewport width in pixels."),
    viewport_height: z.number().optional().describe("Viewport height in pixels."),
  },
  async (params) => { /* ... */ }
);
```

### `operatorRegistry.ts` — Cloud Agent dispatch

`OperatorContext` could gain an optional `executionTarget` field:

```typescript
export type ExecutionTarget = "local" | "cloud";

export interface OperatorContext {
  // ... existing fields
  executionTarget?: ExecutionTarget;
  cloudAgentId?: string; // Cursor Cloud Agent ID, if dispatched
}
```

`spawn()` would accept an `executionTarget` option. When `"cloud"`, spawn would call the Cursor Cloud Agents API (when available) and store the external ID.

### `toolAllowlist.ts` — New capabilities

New capabilities for screenshot and cloud execution:

```typescript
export type Capability =
  | "fileRead" | "fileWrite" | "terminalExecute"
  | "gitRead" | "gitWrite" | "webSearch" | "modelCall"
  | "screenshotCapture"  // new: take screenshots via MCP
  | "cloudDispatch";     // new: dispatch to Cloud Agent VM
```

Permission preset mapping:

| Preset | `screenshotCapture` | `cloudDispatch` |
|---|---|---|
| `readonly` | No | No |
| `standard` | Yes | No |
| `full` | Yes | Yes |

---

## Option A: Swap-first — MCP screenshot tools (community)

### Approach

Register community MCP screenshot tools (Puppeteer-based or Playwright-based) in Drive's MCP server. Keep operator dispatch local. Operators call screenshot tools to visually verify their work.

### Steps

1. **Add screenshot tool to `mcpServer.ts`.**
   Register a `screenshot_capture` tool that delegates to a community MCP server (e.g., Webpage Screenshot MCP via Puppeteer) running as a subprocess.

2. **Add `screenshotCapture` capability to `toolAllowlist.ts`.**
   Gate the tool behind the `standard` and `full` presets.

3. **Add screenshot display to Agent Screen.**
   Extend `AgentScreenPanel` to render base64 images returned by screenshot tools. Add an `agent_screen_screenshot` tool or extend `agent_screen_activity` to accept image payloads.

4. **Wire into operator workflow.**
   Operators can call `screenshot_capture` after making UI changes. The Agent Screen shows the captured screenshot alongside the operator's activity log.

### Pros

- Uses existing, working community tools.
- No dependency on unreleased Cursor APIs.
- Low integration complexity — standard MCP tool registration.
- Immediate value for operators doing UI work.

### Cons

- Community tools may break across Cursor/browser versions.
- Puppeteer/Playwright dependency adds ~100MB to the extension.
- No actual execution backend — operators still don't "do" anything, they just see screenshots.

### Complexity estimate

| Component | Effort |
|---|---|
| MCP tool registration | Small (pattern exists) |
| Puppeteer subprocess management | Medium |
| Agent Screen image display | Medium |
| Permission gating | Small |
| **Total** | **~2 weeks** |

---

## Option B: Native Cloud Agent dispatch

### Approach

Extend `operatorRegistry.spawn()` to dispatch operators to Cursor Cloud Agent VMs. The operator's task runs in a cloud VM with the full tool harness. Results are retrieved via polling or webhook.

### Steps

1. **Define `CloudAgentClient` interface.**
   Abstract the Cursor Cloud Agents API behind an interface for testability and future portability.

   ```typescript
   interface CloudAgentClient {
     dispatch(task: string, options: CloudDispatchOptions): Promise<CloudAgentHandle>;
     getStatus(handle: CloudAgentHandle): Promise<CloudAgentStatus>;
     cancel(handle: CloudAgentHandle): Promise<void>;
   }
   ```

2. **Extend `operatorRegistry.spawn()` with `executionTarget`.**
   When `executionTarget === "cloud"`, call `cloudAgentClient.dispatch()` and store the handle.

3. **Add `cloudDispatch` capability to `toolAllowlist.ts`.**
   Only `full` preset operators can dispatch to cloud.

4. **Map Cloud Agent lifecycle to operator status.**
   Poll or receive webhooks for Cloud Agent completion. Update operator status accordingly.

5. **Integrate with A2A task endpoints.**
   Cloud Agent tasks are exposed as A2A tasks via the existing `/tasks` endpoint.

### Pros

- Operators gain actual execution capability — they can work autonomously in background VMs.
- Aligns with Drive's A2A task architecture (ADR-0014).
- Enables "fire and forget" voice commands.

### Cons

- **Blocked on Cursor Cloud Agents API** — no public API as of February 2026.
- High integration complexity: VM lifecycle, result retrieval, error handling, cost management.
- Lock-in to Cursor-specific infrastructure.

### Complexity estimate

| Component | Effort |
|---|---|
| `CloudAgentClient` interface + mock | Medium |
| `operatorRegistry.spawn()` extension | Medium |
| Status polling / webhook handler | Medium-Large |
| A2A task integration | Small (endpoint exists) |
| Permission gating | Small |
| **Total** | **~4–6 weeks** (assuming API access) |

---

## Tests and evaluations

### Screenshot comparison tests

```typescript
// Pseudocode: visual regression test
const baseline = await loadBaseline("login-page.png");
const current = await screenshotCapture({ url: "http://localhost:3000/login" });
const diff = pixelDiff(baseline, current);
assert(diff.percentage < 0.5, `Visual regression detected: ${diff.percentage}% changed`);
```

Test matrix:
- Full-page screenshots at multiple viewport sizes (1280×720, 1920×1080, 375×812).
- Element-level screenshots with CSS selector targeting.
- Dark mode / light mode variants.
- Dynamic content handling (loading states, animations).

### Visual regression detection

Use perceptual hashing or pixel-diff algorithms:
- **Pixel diff** — exact comparison, high false-positive rate for anti-aliasing differences.
- **Perceptual hash** — tolerant of minor rendering differences, better for CI.
- **Structural similarity (SSIM)** — measures perceived visual quality, good threshold for "meaningful change."

### Cloud Agent round-trip tests

For Option B, test the full dispatch → execute → retrieve cycle:

1. Spawn operator with `executionTarget: "cloud"`.
2. Verify Cloud Agent VM is created.
3. Verify operator status transitions: `active` → `background` → `completed`.
4. Verify A2A task status mirrors operator status.
5. Verify result retrieval (stdout, file changes, screenshots).
6. Verify timeout and cancellation paths.
7. Verify cascade dismiss propagates to cloud agents.

### Permission tests

Verify capability gating:
- `readonly` operators cannot call `screenshot_capture` or `cloudDispatch`.
- `standard` operators can call `screenshot_capture` but not `cloudDispatch`.
- `full` operators can call both.
- Config overrides only restrict, never grant beyond registry preset (existing invariant from `toolAllowlist.ts`).

---

## Rollout plan

### Phase 1: Screenshot tools via community MCP (Option A)

**Trigger:** Visual verification becomes a clear need for operator workflows.

1. Register `screenshot_capture` tool in `mcpServer.ts`.
2. Add `screenshotCapture` capability to `toolAllowlist.ts`.
3. Extend Agent Screen to display screenshots.
4. Ship behind `cursorDrive.experimental.screenshotTools` feature flag.

### Phase 2: Cloud Agent dispatch (Option B)

**Trigger:** Cursor publishes a public Cloud Agents API.

1. Implement `CloudAgentClient` against the public API.
2. Extend `operatorRegistry.spawn()` with `executionTarget`.
3. Add `cloudDispatch` capability.
4. Wire A2A task lifecycle to Cloud Agent status.
5. Ship behind `cursorDrive.experimental.cloudDispatch` feature flag.

### Phase 3: Visual regression CI

**Trigger:** Phase 1 is stable and operators regularly capture screenshots.

1. Add baseline screenshot storage (`.drive/baselines/`).
2. Add `screenshot_compare` MCP tool.
3. Integrate with CI via webhook-triggered operators.
