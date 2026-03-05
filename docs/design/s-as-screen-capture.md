# S-AS Screen Capture — Design Document

> **Status:** Draft
> **Author:** Cloud Agent
> **Date:** 2026-02-25
> **Scope:** Research findings + recommended design for surfacing agent execution
> artifacts (video, screenshots, live streaming) in the Agent Screen (S-AS).

---

## 1. Current State

### Agent Screen (`src/agentScreen.ts`)

- `AgentScreenPanel` is a singleton WebviewPanel (or OutputChannel in
  `bottomLog` mode) that renders text-based `ActivityEvent` items.
- Event types: `activity`, `file`, `decision`, `agentSwitch`, `clear`,
  `planProgress`.
- Webview HTML is a self-contained page with tabs (Activity / Files /
  Decisions), a plan-progress overlay, and CSP that allows only
  `style-src` and `script-src` from the webview's own `cspSource`.
- No media elements (`<video>`, `<img>` for dynamic content) exist today.

### Cursor CLI Runner (`src/cursorCliRunner.ts`)

- `runCursorCli(prompt)` spawns `agent -p "..."` via `child_process.spawn`.
- `stdio: ["ignore", "pipe", "pipe"]` — stdout/stderr piped but **buffered
  to a single string**. No streaming, no EventEmitter, no PTY.
- Returns `{ stdout, stderr, exitCode, timedOut, error }` only after the
  process exits.

### MCP Server (`src/mcpServer.ts`)

- HTTP + StreamableHTTP transport on `127.0.0.1:<port>/mcp`.
- 25+ registered MCP tools; `cursor_cli_run` delegates to `runCursorCli`.
- A2A task endpoints (`POST /tasks`, `GET /tasks/:id`, SSE support) already
  exist with `operatorProgress`, `operatorCompleted`, `operatorError`, and
  `operatorEscalated` event types.
- `POST /run` exposes the CLI runner over HTTP but returns only when the
  process finishes.

### Operator Registry (`src/operatorRegistry.ts`)

- `OperatorContext` carries `permissionPreset`, `role`, `depth`, and
  `parentId`.
- `OperatorRegistryEvents` emitter supports `operatorCompleted`,
  `operatorProgress`, `operatorError`, `taskDelegated`, `operatorEscalated`.
- No concept of "artifact" or "media attachment" on an operator today.

---

## 2. Feasibility Matrix

| # | Approach | Feasibility | Complexity | User Value | New Dependencies | Notes |
|---|----------|:-----------:|:----------:|:----------:|:----------------:|-------|
| A1 | **Cloud Agent video polling** — POST `/v0/agents` to create a cloud agent, poll status, retrieve video/screenshot artifacts via API or GitHub | **Medium** | Medium | **High** | `node-fetch` or built-in `fetch` (Node 20 native) | Video/screenshot artifacts are produced by cloud agents and attached to PRs. No documented API endpoint for direct artifact retrieval — likely requires GitHub API to pull from PR comments/checks. |
| A2 | **Cloud Agent live status streaming** — poll `GET /v0/agents/{id}` or conversation endpoint for real-time step progress | **Medium** | Low–Medium | **Medium** | None | Conversation history endpoint returns text messages. No evidence of video URLs in the response payload. Useful for showing agent progress text in S-AS in real time. |
| B1 | **CLI `stream-json` stdout streaming** — upgrade `cursorCliRunner.ts` to use `--output-format stream-json` and emit events line-by-line | **High** | **Low** | **High** | None | CLI supports `stream-json` with message types `user`, `assistant`, `tool_call`, `text_delta`. Minimal code change — add EventEmitter to runner, parse NDJSON lines, post to AgentScreenPanel. |
| B2 | **PTY via `node-pty`** — replace `child_process.spawn` with a PTY for ANSI-rich terminal rendering in S-AS | **Low** | **High** | Medium | `node-pty` (native C++ module) | Platform-specific binaries. Does not bundle cleanly into VSIX. VS Code ships its own `node-pty` but the internal require path is unstable and undocumented. Not recommended. |
| B3 | **VS Code custom Terminal + output capture** — use `vscode.window.createTerminal({ pty })` with a custom `Pseudoterminal` to pipe CLI output | **Medium** | Medium | Medium | None | Custom PTY captures `onDidWrite` output. But terminal rendering is in VS Code's terminal panel, not in the S-AS WebviewPanel. Coupling between terminal pane and S-AS is awkward. Could serve as a secondary view. |
| B4 | **IDE screen recording (FFmpeg / platform APIs)** — capture the Cursor window itself from within the extension | **Very Low** | Very High | Low | `ffmpeg` binary, OS-level APIs | VS Code Chronicler exists but requires external FFmpeg. Extensions run in Node.js host with no access to display server. Relies on shelling out to platform-specific screen capture tools. Fragile, not portable, privacy concerns. **Closed — not viable.** |

---

## 3. Recommended Path

### Primary: B1 — CLI `stream-json` stdout streaming into S-AS

**Rationale:**

1. **Zero new dependencies.** Uses existing CLI capabilities (`--output-format
   stream-json`) and Node.js built-in streams/EventEmitter.
2. **High user value.** Operators and users see live CLI agent progress
   (tool calls, file edits, reasoning) in the Agent Screen as it happens,
   rather than waiting for the full output.
3. **Low complexity.** The change is ~100 lines: add an EventEmitter to
   `cursorCliRunner.ts`, parse NDJSON in a `data` handler, and wire events
   to `AgentScreenPanel.postEvent()`.
4. **Incremental.** Does not block or conflict with Track A work later.

### Fallback: A2 → A1 — Cloud Agent status polling, then artifact retrieval

**Rationale:**

1. A2 (live status polling) is straightforward once we confirm the
   conversation endpoint's response shape with a live API call.
2. A1 (video artifact retrieval) depends on whether Cursor exposes artifact
   URLs in the API or only through GitHub PR attachments. If API-only, this
   is a simple `GET` + render in webview. If GitHub-only, we use
   `@octokit/rest` (or the user's `gh` CLI) to pull PR comment media.
3. Both require the user to supply a Cursor API key (see Section 4).

---

## 4. Auth & Secrets Design

### Cursor API Key (for Track A cloud agents)

| Concern | Design |
|---------|--------|
| **Storage** | VS Code `SecretStorage` via `context.secrets.store("cursorDrive.cursorApiKey", key)`. Never in `settings.json`. |
| **Retrieval** | `context.secrets.get("cursorDrive.cursorApiKey")` at tool invocation time. |
| **Prompting** | If key is absent when a cloud-agent MCP tool is invoked, show an `InputBox` with `password: true` and persist via `SecretStorage`. |
| **Separation** | This key is independent of the CLI auth flow. The CLI authenticates through `~/.cursor/` credentials managed by `cursor login`. Keep them separate. |
| **Config** | Add `cursorDrive.cloudAgents.apiBaseUrl` (default `https://api.cursor.com`) as a setting for enterprise/self-hosted overrides. |

### GitHub Token (for artifact retrieval from PRs)

If video artifacts are only accessible via GitHub PR comments/checks:

| Concern | Design |
|---------|--------|
| **Storage** | Reuse `.env` `GITHUB_PERSONAL_ACCESS_TOKEN` if present, else `SecretStorage`. |
| **Scope** | `repo` scope minimum (to read PR comments and check run artifacts). |
| **Fallback** | If no token, surface a "Video available on PR" link in S-AS instead of inline playback. |

---

## 5. MCP Tool Spec (Cloud Agents Path — Track A)

### `cloud_agent_launch`

```typescript
{
  name: "cloud_agent_launch",
  description: "Launch a Cursor Cloud Agent for a coding task. Returns agent ID for status polling. Requires cursorDrive.cursorApiKey.",
  inputSchema: {
    repository: z.string().describe("GitHub repo slug (owner/repo)."),
    prompt: z.string().describe("Task description for the cloud agent."),
    branch: z.string().optional().describe("Target branch (default: auto-generated)."),
    model: z.string().optional().describe("Model override (e.g. 'claude-sonnet-4')."),
  },
  outputSchema: {
    agent_id: z.string(),
    status: z.enum(["pending", "running", "completed", "failed"]),
    dashboard_url: z.string().optional(),
  }
}
```

### `cloud_agent_status`

```typescript
{
  name: "cloud_agent_status",
  description: "Poll a cloud agent's status and surface progress in the Agent Screen. Returns current status, conversation summary, and artifact URLs if available.",
  inputSchema: {
    agent_id: z.string().describe("Agent ID from cloud_agent_launch."),
    include_conversation: z.boolean().optional().describe("Include recent conversation messages (default false)."),
  },
  outputSchema: {
    status: z.enum(["pending", "running", "completed", "failed"]),
    pr_url: z.string().optional(),
    artifacts: z.array(z.object({
      type: z.enum(["video", "screenshot", "log"]),
      url: z.string(),
      label: z.string().optional(),
    })).optional(),
    recent_messages: z.array(z.object({
      role: z.enum(["user", "assistant"]),
      text: z.string(),
    })).optional(),
  }
}
```

### Event flow

```
MCP tool call → cloud_agent_launch
  ↓
POST https://api.cursor.com/v0/agents { repository, prompt, ... }
  ↓
Return agent_id → start polling interval (10s)
  ↓
GET /v0/agents/{id} → map status to AgentScreenPanel events
  ↓
On status === "completed":
  GET /v0/agents/{id}/conversation → extract artifact URLs
  OR: GitHub API → GET PR comments → extract video/image URLs
  ↓
Post "cloudAgentArtifact" event to AgentScreenPanel
  ↓
Webview renders <video> / <img> in a new "Artifacts" tab
```

---

## 6. Code Sketch — Primary Path (B1: CLI stream-json)

### 6.1. `cursorCliRunner.ts` — add streaming mode

```typescript
import { EventEmitter } from "events";

export interface CliStreamEvent {
  type: "user" | "assistant" | "tool_call" | "text_delta" | "done" | "error";
  /** Raw parsed JSON object from the stream-json line. */
  raw: Record<string, unknown>;
  /** Extracted text content (for assistant/text_delta types). */
  text?: string;
  /** Tool name (for tool_call type). */
  toolName?: string;
}

export interface StreamingCliRunner extends EventEmitter {
  on(event: "data", listener: (evt: CliStreamEvent) => void): this;
  on(event: "close", listener: (code: number | null) => void): this;
}

/**
 * Run Cursor CLI in streaming mode. Returns an EventEmitter that emits
 * parsed stream-json events as they arrive, one per line.
 */
export function runCursorCliStreaming(
  prompt: string,
  options?: RunCursorCliOptions
): StreamingCliRunner;
```

**Key implementation notes:**

- Spawn with `args = [...argsPrefix, "-p", prompt, "--output-format", "stream-json"]`.
- `stdio: ["ignore", "pipe", "pipe"]` — same as today.
- Buffer stdout by newline. For each complete line, `JSON.parse` and emit a
  `CliStreamEvent`.
- On `child.close`, emit `"close"` event.
- Timeout behavior unchanged — kill the child after `effectiveTimeout`.

### 6.2. `agentScreen.ts` — add `ActivityEvent` type for CLI stream

```typescript
export interface ActivityEvent {
  type: "activity" | "file" | "decision" | "agentSwitch" | "clear"
      | "planProgress"
      | "cliStream";        // NEW
  // ... existing fields ...
  /** CLI stream payload (for cliStream type). */
  cliStreamType?: "assistant" | "tool_call" | "text_delta";
  cliToolName?: string;
}
```

Webview changes:
- Handle `cliStream` message type in the `window.addEventListener("message")`
  switch.
- `tool_call` events → render as activity items with a tool icon.
- `assistant` / `text_delta` → append to a streaming text block in the
  Activity tab (auto-scroll).

### 6.3. `mcpServer.ts` — upgrade `cursor_cli_run` tool

```typescript
// New tool: cursor_cli_run_streaming
this.mcpServer.tool(
  "cursor_cli_run_streaming",
  "Run a prompt through Cursor CLI with live streaming to the Agent Screen. " +
  "Output is streamed line-by-line as it's produced. [Sequential]",
  {
    prompt: z.string(),
    timeout_seconds: z.number().optional(),
  },
  async ({ prompt, timeout_seconds }) => {
    const runner = runCursorCliStreaming(prompt, { /* ... */ });
    const panel = AgentScreenPanel.getInstance();

    runner.on("data", (evt) => {
      if (panel) {
        panel.postEvent({
          type: "cliStream",
          cliStreamType: evt.type as any,
          text: evt.text,
          cliToolName: evt.toolName,
          operatorName: "CLI",
          timestamp: Date.now(),
        });
      }
    });

    return new Promise((resolve) => {
      runner.on("close", (code) => {
        resolve({
          content: [{ type: "text", text: `CLI finished (exit ${code})` }],
        });
      });
    });
  }
);
```

### 6.4. WebviewPanel CSP changes (for Track A artifacts)

To display video/image artifacts from cloud agents, the CSP must be relaxed
to allow `img-src` and `media-src` from the API domain:

```typescript
content="default-src 'none';
         style-src ${csp} 'nonce-${nonce}';
         script-src ${csp} 'nonce-${nonce}';
         img-src ${csp} https://api.cursor.com https://*.githubusercontent.com;
         media-src ${csp} https://api.cursor.com https://*.githubusercontent.com;"
```

This change is only needed when Track A is implemented.

---

## 7. Artifact API Discovery (p3-01 Spike)

**Date:** 2026-03-04
**Source:** [Cursor Cloud Agents API docs](https://cursor.com/docs/cloud-agent/api/endpoints)

### Findings

| # | Question | Answer |
|---|----------|--------|
| 1 | Does `GET /v0/agents/{id}/conversation` return artifact URLs? | **No.** The conversation endpoint returns `messages` with `id`, `type`, `text` only. No `artifacts`, `media`, or `attachments` fields. |
| 2 | Is there a dedicated `GET /v0/agents/{id}/artifacts` endpoint? | **Yes.** Documented endpoint returns `artifacts[]` with `absolutePath`, `sizeBytes`, `updatedAt`. Paths are filesystem-style (e.g. `/opt/cursor/artifacts/screenshot.png`, `/opt/cursor/artifacts/demo.mp4`). |
| 3 | How to obtain download URLs? | **GET /v0/agents/{id}/artifacts/download?path=...** - Pass `absolutePath` as query param. Returns `{ url: "https://cloud-agent-artifacts.s3.us-east-1.amazonaws.com/..." }` presigned S3 URL (15-minute expiry). |

### Decision

**Proceed with p3-02 (API path).** No GitHub extraction needed. Cloud Agent API provides:

1. `GET /v0/agents/{id}/artifacts` → list artifacts
2. `GET /v0/agents/{id}/artifacts/download?path=<absolutePath>` → presigned URL per artifact
3. Render in S-AS via `<img>` / `<video>` with CSP allowing `*.amazonaws.com` (or the resolved S3 domain)

### Implementation notes

- Rate limits: 300 req/min, 6000 req/hour for artifacts endpoints
- Presigned URLs expire in 15 minutes; fetch on-demand when user opens Artifacts tab or when agent completes
- Artifact type inference: use file extension (`.mp4` → video, `.png`/`.jpg` → screenshot) since API does not return `type` field

---

## 8. Open Questions (remaining)

| # | Question | Blocking? | How to resolve |
|---|----------|-----------|----------------|
| 3 | What is the exact JSON schema for `stream-json` messages? | No (B1 works with lenient parsing) | Run `agent -p "hello" --output-format stream-json` locally and capture all message types. |
| 4 | Does the Cloud Agents API support webhooks for agent completion? | No (polling works) | Check `docs.cursor.com/background-agent/api/webhooks`. |
| 5 | Can `--stream-partial-output` be combined with `--output-format stream-json` reliably? | No | Test locally with the flag combination. |
| 6 | Does the Cursor CLI `agent` command support `--mode=plan` and `--mode=ask` in stream-json format? | No | Test with `agent -p "..." --mode=plan --output-format stream-json`. |
| 3 | What is the exact JSON schema for `stream-json` messages? The blog post and third-party docs show `user`, `assistant`, `tool_call`, `text_delta` — are there other types (e.g., `error`, `status`)? | No (B1 works with lenient parsing) | Run `agent -p "hello" --output-format stream-json` locally and capture all message types. |
| 4 | Does the Cloud Agents API support webhooks for agent completion, or is polling the only option? | No (polling works) | Check `docs.cursor.com/background-agent/api/webhooks` — search results suggest a webhooks page exists. If webhooks are available, prefer them over polling. |
| 5 | Can `--stream-partial-output` be combined with `--output-format stream-json` reliably, or does it produce malformed JSON lines? | No (we can omit it initially) | Test locally with the flag combination. |
| 6 | Does the Cursor CLI `agent` command support `--mode=plan` and `--mode=ask` in stream-json format, or only the default agent mode? | No | Test with `agent -p "..." --mode=plan --output-format stream-json`. |

---

## 9. Implementation Phases

### Phase 1 — CLI streaming in S-AS (Track B1)

- Add `runCursorCliStreaming()` to `cursorCliRunner.ts`.
- Add `cliStream` event type to `AgentScreenPanel`.
- Add `cursor_cli_run_streaming` MCP tool.
- Update webview HTML to render streaming text and tool-call badges.
- Tests: unit tests for NDJSON parsing; integration test with mock child
  process.

### Phase 2 — Cloud Agent status in S-AS (Track A2)

- Add `cursorDrive.cursorApiKey` SecretStorage flow.
- Add `cloud_agent_launch` and `cloud_agent_status` MCP tools.
- Poll agent status and surface conversation messages in S-AS Activity tab.
- Tests: mock HTTP responses; unit tests for polling logic.

### Phase 3 — Cloud Agent artifact display (Track A1)

- Resolve Open Question #1 and #2 to determine artifact retrieval path.
- If API exposes URLs: render `<video>` / `<img>` in a new S-AS "Artifacts"
  tab.
- If GitHub-only: use Octokit or `gh` CLI to pull PR media; render in S-AS
  with appropriate CSP.
- Add CSP `img-src` / `media-src` directives.
- Tests: webview rendering tests with sample media URLs.

---

## 10. NDJSON Ingest Discovery (p0-01 Spike)

**Question:** Is `cursor.ndjsonIngest.*` hookable from an extension, replacing the custom `NdjsonParser`?

**Findings:**

`cursor.ndjsonIngest.start`, `cursor.ndjsonIngest.stop`, `cursor.ndjsonIngest.showStatus`, and
`cursor.ndjsonIngest.copyCurl` are registered Cursor commands. Based on analysis of their names and
the existence of a `copyCurl` variant (which implies an HTTP endpoint that accepts NDJSON POST
requests), this pipeline is Cursor's **internal telemetry/logging ingest** — not a general-purpose
stream that extensions can hook into. It is not designed to receive `--output-format stream-json`
CLI output.

**Decision:** Proceed with custom `NdjsonParser` as planned (p1-01/p1-02). The `cursor.ndjsonIngest`
commands are surfaced in `cursorDrive.diagnose` as a diagnostic probe (the command is called
silently and its availability is reported), but Drive does not depend on or route data through it.

**Webview DevTools Workflow (p0-02):**

For AgentScreen UI iteration, the workflow is:

1. Run `cursorDrive.showAgentScreen` (Ctrl+Shift+S) to open the webview.
2. Run `cursorDrive.openWebviewDevTools` (command palette) — calls
   `workbench.action.webview.openDeveloperTools`, opening Chromium DevTools scoped to the Drive
   webview panel.
3. Use the Elements tab to prototype CSS for `.cli-tool-call`, `.cli-stream-block`, and the Phase 3
   Artifacts tab before baking changes into `buildHtml()` in `src/agentScreen.ts`.

This workflow is now accessible as a registered Drive command, not requiring manual command palette
knowledge.

---

## 11. Rejected Alternatives

| Alternative | Reason for rejection |
|-------------|---------------------|
| **node-pty** (B2) | Native C++ module with platform-specific binaries. Does not bundle cleanly into VSIX. VS Code's internal `node-pty` has an unstable require path. The CLI's `stream-json` output provides structured data that is strictly better than raw ANSI for the S-AS use case. |
| **IDE screen recording** (B4) | Requires external FFmpeg binary or OS-level display server access. Extensions run in a Node.js host process with no window handle. Privacy concerns with recording the user's entire screen. The only existing VS Code extension doing this (Chronicler) requires manual FFmpeg installation. |
| **`vscode.window.createTerminal` as primary** (B3) | Custom PTY captures output but renders in the terminal panel, not the S-AS WebviewPanel. Wiring terminal output to the webview adds indirection without benefit over direct stdout streaming. May be useful as a secondary "watch" view but not as the primary delivery mechanism. |
| **MCP `img-src blob:` for local screenshots** | Webview CSP with `blob:` is fragile and VS Code restricts it. `vscode-resource:` URIs from `localResourceRoots` are the safe path for local files but add filesystem management overhead. Defer to Track A's HTTPS-based artifact URLs. |
