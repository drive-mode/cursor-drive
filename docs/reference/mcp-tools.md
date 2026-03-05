# MCP Tools Reference

All tools exposed by the Drive MCP server at `http://127.0.0.1:7891/mcp`.

Source: `src/mcpServer.ts`. Register in `.cursor/mcp.json`.

---

## Registration

```json
{
  "mcpServers": {
    "drive": {
      "url": "http://127.0.0.1:7891/mcp"
    }
  }
}
```

Health check: `GET http://127.0.0.1:7891/health` → `{"status":"ok","name":"cursor-drive","port":7891}`

Pipeline (hook→extension): `POST http://127.0.0.1:7891/pipeline` with body `{ "prompt": "..." }` → pipeline result JSON.

**Transport:** Streamable HTTP (MCP over HTTP POST to `/mcp`). The server binds to `127.0.0.1` only. Port may be 7892, 7893, etc. if 7891 is in use — check the Cursor Drive output channel for the actual port.

---

## MCP Apps (interactive UI in chat)

When `cursorDrive.mcp.enableApps` is `true` (default), these tools return `_meta.ui.resourceUri: "ui://cursor-drive/agent-screen"` so Cursor can render the Agent Screen inline in chat:

| Tool | Returns `_meta.ui` |
|------|--------------------|
| `agent_screen_activity` | Yes |
| `agent_screen_file` | Yes |
| `agent_screen_decision` | Yes |
| `agent_screen_plan_update` | No (text only) |

The UI resource is an activity feed showing operator activity, files, and decisions. Requires Cursor 2.6+ (or another host that supports MCP Apps). If the host cannot render Apps, tools still work with text output. See [demo-mcp-apps](../guides/demo-mcp-apps.md).

---

## TTS tools

### `tts_speak`

Speak text aloud through the Drive TTS engine.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `text` | string | yes | Text to speak. Truncated to `tts.maxSpokenSentences`. |
| `voice` | string | no | Voice name override. |

Returns: `"ok"` (silently no-ops if TTS is disabled)

---

### `tts_stop`

Immediately stop any ongoing TTS speech.

No parameters.

Returns: `"stopped"`

---

## Agent Screen tools

### `agent_screen_activity`

Push an activity event to the Drive Agent Screen (S-AS).

| Parameter | Type | Required | Description |
|---|---|---|---|
| `operator_name` | string | yes | Name of the operator reporting this activity. |
| `text` | string | yes | Short description of the current action. |

Example: `operator_name: "Alpha"`, `text: "Reading src/auth.ts"`

---

### `agent_screen_file`

Record a file touch in the Agent Screen Files tab. Clicking the entry opens the file in the editor.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `operator_name` | string | yes | Name of the operator touching this file. |
| `file_path` | string | yes | Workspace-relative or absolute path. |

---

### `agent_screen_decision`

Record a key decision in the Agent Screen Decisions tab.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `operator_name` | string | yes | Name of the operator making the decision. |
| `text` | string | yes | Decision or reasoning (e.g. "Chose token bucket over leaky bucket"). |

---

### `agent_screen_plan_update`

Push plan progress to the Agent Screen. When `showPlanProgress` is enabled, displays active plan name, TODO counts, and current in-progress TODO.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `plan_id` | string | yes | Plan ID (e.g. 'terminology-sas-overhaul'). Used to derive .plan.md path for open-on-click. |
| `plan_name` | string | yes | Human-readable plan name. |
| `completed_count` | number | yes | Number of completed TODOs. |
| `total_count` | number | yes | Total number of TODOs. |
| `current_todo` | string | no | The currently in_progress TODO content (clickable to open plan file). |

---

## Deprecated: Agent Screen aliases

Use `agent_screen_*` instead. These still work but log a deprecation warning:

- `share_screen_activity` → `agent_screen_activity` (use `operator_name` instead of `agent_name`)
- `share_screen_file` → `agent_screen_file`
- `share_screen_decision` → `agent_screen_decision`

---

## Drive mode tools

### `drive_set_mode`

Change the active Drive meta-mode.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `mode` | `"ask" \| "agent" \| "plan" \| "debug"` | yes | Target Drive mode. |

Mode mapping to SubMode: `ask→ask`, `agent→agent`, `plan→plan`, `debug→direct`

Returns: `"mode set to {mode}"`

---

### `drive_run_pipeline`

Run the Drive prompt pipeline (filler-clean, glossary-expand, sanitize, approval-gate, session-context-inject, route). Use when processing a user prompt with Drive active.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `prompt` | string | yes | Raw user prompt to process. |

Returns (success): JSON `{ prompt, route, model }` — transformed prompt, route decision, model tier.

Returns (blocked): JSON `{ blocked: true, gateResult }` — approval gate blocked the prompt.

---

## Operator tools

### `operator_spawn`

Spawn a new named operator for a parallel task (tangent).

| Parameter | Type | Required | Description |
|---|---|---|---|
| `name` | string | no | Operator name. If omitted, uses next default name (Beta, Gamma, …). |
| `task` | string | yes | Task description for the new operator. |

Returns: `{"id": "...", "name": "Beta", "task": "..."}`

Enforces `operators.maxConcurrent`. Returns error if limit is reached.

---

### `operator_switch`

Switch the foreground operator.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `name_or_id` | string | yes | Operator name (e.g. `"Beta"`) or operator id. |

Returns: `"switched to {name}"` or error if not found.

Side effect: Agent Screen title updates to show the new operator.

---

### `operator_list`

List all active operators.

No parameters.

Returns: JSON array of `{id, name, task, status}` for each active operator.

---

### `operator_pause`

Pause an active/background operator.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `name_or_id` | string | yes | Operator name or id to pause. |

Returns: `"paused"` or `"not found"`

---

### `operator_resume`

Resume a paused operator.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `name_or_id` | string | yes | Operator name or id to resume. |

Returns: `"resumed"` or `"not found or not paused"`

---

### `operator_dismiss`

Dismiss (deactivate) an operator.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `name_or_id` | string | yes | Operator name or id to dismiss. |

Returns: `"dismissed"` or `"not found"`

---

### `operator_merge`

Merge a source operator's memory and context into a target operator, then deactivate the source.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `source` | string | yes | Name or id of the operator to merge FROM. |
| `target` | string | yes | Name or id of the operator to merge INTO. |

Returns: `"merged"` or `"one or both operators not found"`

Side effect: Agent Screen logs the merge event. Source operator status becomes `merged`.

---

## Deprecated: Operator aliases

Use `operator_*` instead. These still work but log a deprecation warning:

- `agent_spawn` → `operator_spawn`
- `agent_switch` → `operator_switch`
- `agent_list` → `operator_list`
- `agent_pause` → `operator_pause`
- `agent_resume` → `operator_resume`
- `agent_dismiss` → `operator_dismiss`
- `agent_merge` → `operator_merge`

---

## Usage pattern in Drive persona

```
// Before reading a file:
agent_screen_activity({ operator_name: "Alpha", text: "Reading src/auth.ts" })
agent_screen_file({ operator_name: "Alpha", file_path: "src/auth.ts" })

// After making a key decision:
agent_screen_decision({ operator_name: "Alpha", text: "Using JWT over sessions for statelessness" })

// Spawning a tangent:
operator_spawn({ task: "Research rate limiting patterns for the API" })
// → returns { name: "Beta", id: "..." }

// When done speaking a summary:
tts_speak({ text: "Updated auth.ts to use JWT. Tests passing." })
```

---

## Sync Control Plane tools (Mob Programming Cockpit)

These tools are available when a workspace is open and sync services are initialized.

### `operator_sync_status`

Get the current sync status snapshot: user branch/head, per-operator workspace state, active proposals.

- **Parameters:** none
- **Returns:** `SyncStatusSnapshot` JSON (userBranch, userHeadCommit, operators[], proposals[])
- **Concurrency:** Parallel-safe

### `operator_sync_proposals`

List sync proposals with optional filtering.

- **Parameters:**
  - `operator_id` (string, optional) — filter by operator
  - `status` (string, optional) — filter by status (e.g., "pending_review", "approved")
- **Returns:** Array of `SyncProposal` objects

### `operator_sync_approve`

Approve a sync proposal by ID. Only proposals in `pending_review` or `conflict` status.

- **Parameters:** `proposal_id` (string, required)
- **Returns:** Updated `SyncProposal` or error

### `operator_sync_reject`

Reject a sync proposal by ID with optional reason.

- **Parameters:**
  - `proposal_id` (string, required)
  - `reason` (string, optional)
- **Returns:** Updated `SyncProposal` or error

### `operator_sync_apply`

Apply an approved proposal. Serialized through integration queue.

- **Parameters:** `proposal_id` (string, required)
- **Returns:** `ApplyResult` (success, proposalId, mergeCommit or error/conflictFiles)
- **Gate:** Only `approved` proposals can be applied

### `operator_events_latest`

Get recent operator activity events, newest first.

- **Parameters:**
  - `limit` (number, optional, default 50)
  - `operator_id` (string, optional) — filter by operator
- **Returns:** Array of `OperatorActivityEvent`

### `integration_queue_status`

Get current integration queue state.

- **Parameters:** none
- **Returns:** `{ processing, pending, completed }`

### `connector_publish_proposal`

Publish proposal summary to external connector. Graceful no-op if unconfigured.

- **Parameters:**
  - `proposal_id` (string, required)
  - `channel` (string, optional)

### `connector_push_progress`

Push operator progress to external system. Graceful no-op if unconfigured.

- **Parameters:**
  - `operator_id` (string, required)
  - `message` (string, required)
