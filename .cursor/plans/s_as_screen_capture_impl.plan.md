---
planId: s_as_screen_capture_impl
planType: task
parentPlanId: cursor-drive
childPlanIds: []
dependsOn: []
name: S-AS Screen Capture Implementation
overview: "Implement live CLI streaming into Agent Screen (Phase 1) and Cloud Agent integration (Phase 2-3). Primary path: upgrade cursorCliRunner.ts to use --output-format stream-json, pipe NDJSON events to AgentScreenPanel in real time. Fallback path: Cloud Agents API polling + artifact display in webview."
todos:
  - id: p0-01-ndjson-ingest-spike
    content: |
      SPIKE: Run `cursor.ndjsonIngest.showStatus` and `cursor.ndjsonIngest.copyCurl` from the Cursor command palette. Determine whether Cursor's built-in NDJSON ingest endpoint is hookable from an extension (can we POST stream-json output to it rather than parsing ourselves). Also check `cursor.ndjsonIngest.start` / `stop` lifecycle. If hookable: replace or thin-wrap p1-01/p1-02. If not hookable: proceed with custom NdjsonParser as planned. Document findings in docs/design/s-as-screen-capture.md under a new "NDJSON Ingest Discovery" section.
    status: completed
  - id: p0-02-webview-devtools-workflow
    content: |
      Establish UI iteration workflow for AgentScreen webview development. Open AgentScreen (`cursorDrive.showAgentScreen`), then run `workbench.action.webview.openDeveloperTools` from command palette — this opens Chromium DevTools scoped to the Drive webview. Use it to prototype CSS for `.cli-tool-call`, `.cli-stream-block`, and the Phase 3 Artifacts tab layout before baking into buildHtml(). No code output required; this is a dev tooling setup step.
    status: completed
  - id: p1-01-ndjson-parser
    content: |
      Create src/ndjsonParser.ts — pure function that buffers a string by newlines and yields parsed JSON objects. No deps. Signature: `class NdjsonParser { feed(chunk: string): Record<string,unknown>[] }`. Handles partial lines across chunks, skips blank lines, catches JSON.parse errors per line (logs + skips). Export CliStreamEvent interface: { type, raw, text?, toolName? }. Add mapToCliStreamEvent() that normalizes raw JSON into CliStreamEvent (maps message types user/assistant/tool_call/text_delta/error to the enum, extracts text content and toolName fields from the raw object).
    status: completed
  - id: p1-02-ndjson-tests
    content: |
      Create tests/ndjsonParser.test.ts. Cases: single complete line; multi-line chunk; partial line across two chunks; blank lines; malformed JSON line (skipped, no throw); stream-json tool_call message mapping; assistant message mapping; text_delta mapping; unknown type passthrough. Minimum 10 test cases.
    status: completed
  - id: p1-03-streaming-runner
    content: |
      Add runCursorCliStreaming() to src/cursorCliRunner.ts. Returns a typed EventEmitter (StreamingCliRunner). Spawns child_process with args [...argsPrefix, "-p", prompt, "--output-format", "stream-json"]. Uses NdjsonParser on stdout data events. Emits "data" with CliStreamEvent per parsed line. Emits "close" with exit code. Timeout kills child same as runCursorCli(). Also accumulates full stdout string so callers can get the buffered result on close. Keep existing runCursorCli() unchanged (non-breaking).
    status: completed
  - id: p1-04-streaming-runner-tests
    content: |
      Create tests/cursorCliRunner.test.ts (or extend if exists). Mock child_process.spawn to emit chunked stdout lines matching stream-json format. Verify: "data" events fire with correct CliStreamEvent fields; "close" fires with exit code; timeout kills process; error event from spawn is handled; partial JSON lines buffered across chunks. Use jest fake timers for timeout test.
    status: completed
  - id: p1-05-activity-event-type
    content: |
      Extend ActivityEvent in src/agentScreen.ts: add "cliStream" to the type union. Add optional fields: cliStreamType?: "assistant" | "tool_call" | "text_delta" | "user" | "error"; cliToolName?: string. In postEvent(), handle cliStream for OutputChannel mode: format as "[CLI] <toolName|type>: <text>". In webview postMessage(), pass through as-is (webview JS handles rendering).
    status: completed
  - id: p1-06-webview-cli-stream
    content: |
      Update buildHtml() in src/agentScreen.ts. In the message handler switch, add case "cliStream". Rendering rules: (a) tool_call → addActivity("CLI", "🔧 <toolName>: <text>", ts) with a distinct CSS class .cli-tool-call (monospace, muted bg). (b) assistant → addActivity("CLI", text, ts). (c) text_delta → append to last .cli-stream-block element if exists, else create one. This enables streaming text to build up in a single block rather than one activity-item per delta. (d) user → addActivity("CLI/user", text, ts) with italic style. (e) error → addActivity("CLI", "⚠ " + text, ts) with warning color.
    status: completed
  - id: p1-07-mcp-streaming-tool
    content: |
      Register cursor_cli_run_streaming MCP tool in src/mcpServer.ts. Schema: { prompt: z.string(), timeout_seconds: z.number().optional() }. Implementation: call runCursorCliStreaming(), wire "data" events to AgentScreenPanel.postEvent({ type:"cliStream", ... }). On "close", return accumulated stdout as tool result. Keep existing cursor_cli_run tool unchanged (backward compat).
    status: completed
  - id: p1-08-mcp-streaming-tool-test
    content: |
      Add test in tests/mcpServer.test.ts for the streaming tool. Mock runCursorCliStreaming to emit 3 data events then close. Verify: tool returns content with accumulated output; AgentScreenPanel mock receives postEvent calls with type:"cliStream".
    status: completed
  - id: p1-09-post-run-streaming
    content: |
      Upgrade POST /run in mcpServer.ts to support streaming. If request Accept header is "text/event-stream", use runCursorCliStreaming and write SSE data events. Final event: data: {type:"done", exitCode} then end response.
    status: completed
  - id: p1-10-post-run-streaming-test
    content: |
      Add test in tests/mcpServer.test.ts for SSE streaming on POST /run. Send request with Accept: text/event-stream header, mock streaming runner, verify SSE events are received in order, verify response ends after "done" event.
    status: completed
  - id: p1-11-compile-and-test
    content: |
      Run npm run compile (zero errors) and npm test (all tests pass including new ones). Fix any type errors or test failures. Verify the VSIX packages without errors.
    status: completed
  - id: p2-01-cloud-agent-client
    content: |
      Create src/cloudAgentClient.ts using Node 20 native fetch() for documented Cloud Agent endpoints: POST /v0/agents (launch), GET /v0/agents/{id} (status), GET /v0/agents/{id}/conversation (conversation). Functions: launchAgent({ repository, prompt, branch?, model? }): Promise<{ agentId, status, dashboardUrl?, prUrl? }>; getAgentStatus(agentId): Promise<{ status, prUrl?, summary? }>; getAgentConversation(agentId): Promise<{ messages[] }>. Auth: accept apiKey and authMode ("basic" | "bearer"), defaulting to "basic" (`Authorization: Basic base64(apiKey + ':')`) with fallback retry to bearer (`Authorization: Bearer <apiKey>`) on 401/403 when response indicates unsupported auth scheme. Base URL from config cursorDrive.cloudAgents.apiBaseUrl (default https://api.cursor.com). Wrap non-2xx responses in CloudAgentError with status and endpoint.
    status: completed
  - id: p2-02-cloud-agent-client-tests
    content: |
      Create tests/cloudAgentClient.test.ts. Mock global fetch. Test: launchAgent success (201), auth fallback basic→bearer behavior, getAgentStatus with running/completed states, getAgentConversation returns messages, and error mapping for 401/403/404/409/429/500 plus network failures. Cover base URL override from config.
    status: completed
  - id: p2-03-secret-storage
    content: |
      Add API key management to src/extension.ts. On activate, register command cursorDrive.setApiKey that prompts InputBox(password:true) and stores via context.secrets.store("cursorDrive.cursorApiKey", key). Export helper getApiKey(context): Promise<string|undefined> using context.secrets.get(). Add "cursorDrive.cloudAgents.apiBaseUrl" setting to package.json contributes.configuration with default "https://api.cursor.com".
    status: completed
  - id: p2-04-mcp-cloud-agent-tools
    content: |
      Register cloud_agent_launch and cloud_agent_status MCP tools in src/mcpServer.ts. cloud_agent_launch: requires apiKey from SecretStorage (prompt if absent), calls POST /v0/agents via cloudAgentClient.launchAgent(), posts activity to AgentScreenPanel, starts background polling interval (10s) that calls GET /v0/agents/{id} and posts updates to S-AS. On terminal state, fetch GET /v0/agents/{id}/conversation and include short excerpt. cloud_agent_status: single poll against GET /v0/agents/{id}, optional conversation excerpt call. Both tools gated by "full" permission preset. Handle 401/403/404/409/429/500 with user-facing actionable messages (reauth, missing agent, conflict, rate limit backoff, retryable server error).
    status: completed
  - id: p2-05-mcp-cloud-agent-tests
    content: |
      Add tests in tests/mcpServer.test.ts for both cloud agent tools. Mock cloudAgentClient functions. Verify: launch creates poll interval, status returns correct shape, permission preset gating, AgentScreenPanel receives progress events during polling.
    status: completed
  - id: p2-06-sas-cloud-status-events
    content: |
      Extend ActivityEvent with type "cloudAgentStatus". Add optional fields: cloudAgentId, cloudStatus, prUrl. In webview, render as a special activity item with a status badge (pending=grey, running=blue, completed=green, failed=red) and clickable PR link. In OutputChannel mode, format as "[CloudAgent <id>] <status>: <prUrl>".
    status: completed
  - id: p2-07-phase2-compile-test
    content: |
      Run npm run compile and npm test. Fix all errors. Verify VSIX.
    status: completed
  - id: p2-08-operator-progress-wiring
    content: |
      Validate end-to-end streaming progress wiring into OperatorRegistry.emitProgress for CLI stream events and A2A SSE subscribers. If gaps remain, wire missing calls in mcpServer/runner path; if intentionally deferred, document exact reason and impacted flows in this plan and docs/design/s-as-screen-capture.md.
    status: completed
  - id: p3-01-resolve-artifact-api
    content: |
      SPIKE: make live API calls to determine artifact retrieval path. Test GET /v0/agents/{id}/conversation on a completed agent with video artifacts. Check for artifacts/media/attachments fields. Probe GET /v0/agents/{id}/artifacts and record response code/schema if present. Document findings in docs/design/s-as-screen-capture.md Section 7. Decision gate: if API returns usable artifact URLs, proceed with p3-02; otherwise route Phase 3 to p3-03 GitHub extraction path.
    status: completed
  - id: p3-02-artifact-via-api
    content: |
      If API returns artifact URLs: add getAgentArtifacts(agentId) to cloudAgentClient.ts. Returns array of { type: video|screenshot|log, url, label? }. Extend polling in cloud_agent_launch to fetch artifacts when status is completed.
    status: completed
  - id: p3-03-artifact-via-github
    content: |
      If artifacts are GitHub-only: add extractArtifactsFromPr(prUrl, githubToken?) to a new src/githubArtifacts.ts. Uses GitHub REST API to list PR comments, regex-match video/image URLs from comment body. Falls back to rendering a "View on GitHub" link if no token.
    status: cancelled
  - id: p3-04-sas-artifacts-tab
    content: |
      Add fourth tab "Artifacts" to AgentScreen webview. Renders <video> and <img> elements for artifact URLs. Update CSP to allow img-src and media-src from api.cursor.com and *.githubusercontent.com. Add new ActivityEvent type "cloudAgentArtifact" with fields: artifactType, artifactUrl, artifactLabel.
    status: completed
  - id: p3-05-sas-artifacts-tab-test
    content: |
      Test webview rendering logic for artifacts. Verify: video element created with controls for video type; img element for screenshot; CSP headers include required domains; clickable label opens URL in browser.
    status: completed
  - id: p3-06-phase3-compile-test
    content: |
      Run npm run compile and npm test. Fix all errors. Verify VSIX.
    status: completed
isProject: false
---

# S-AS Screen Capture Implementation Plan

## Purpose

Bring live agent execution visibility to the Agent Screen (S-AS). Today S-AS
only shows text events posted by MCP tools. After this plan:

- **Phase 1**: CLI runs via `cursor_cli_run_streaming` stream NDJSON events
(tool calls, assistant text, deltas) into S-AS in real time.
- **Phase 2**: Cloud Agent runs surface status, conversation progress, and PR
links in S-AS via API polling.
- **Phase 3**: Cloud Agent video/screenshot artifacts render inline in a new
S-AS "Artifacts" tab.

## Design Reference

Full research and feasibility analysis: [docs/design/s-as-screen-capture.md](../../docs/design/s-as-screen-capture.md)

## Architecture

```
Phase 1 (CLI streaming):
  runCursorCliStreaming()                    ← src/cursorCliRunner.ts
    └─ child_process.spawn + --output-format stream-json
       └─ NdjsonParser.feed(chunk)          ← src/ndjsonParser.ts
          └─ CliStreamEvent
             ├─ AgentScreenPanel.postEvent({type:"cliStream"})
             └─ OperatorRegistry.emitProgress() → A2A SSE

Phase 2 (Cloud Agent polling):
  cloudAgentClient.launchAgent()            ← src/cloudAgentClient.ts
    └─ POST /v0/agents → agentId
       └─ setInterval(10s): getAgentStatus(agentId)
          ├─ AgentScreenPanel.postEvent({type:"cloudAgentStatus"})
          └─ on completed: getAgentConversation(agentId)

Phase 3 (Artifact display):
  BLOCKED until Phase 2 client/auth completion + p3-01 spike decision.
  Resolved by spike (p3-01):
    ├─ API path: cloudAgentClient.getAgentArtifacts()
    └─ GitHub path: githubArtifacts.extractArtifactsFromPr()
       └─ AgentScreenPanel: new "Artifacts" tab with <video>/<img>
```

## File Change Map


| File                                 | Phase | Change                                                                                                                                 |
| ------------------------------------ | ----- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `src/ndjsonParser.ts`                | 1     | **New.** NDJSON line parser + CliStreamEvent mapper.                                                                                   |
| `tests/ndjsonParser.test.ts`         | 1     | **New.** Parser unit tests.                                                                                                            |
| `src/cursorCliRunner.ts`             | 1     | Add `runCursorCliStreaming()`, export `StreamingCliRunner`. Keep existing `runCursorCli()`.                                            |
| `tests/cursorCliRunner.test.ts`      | 1     | **New.** Streaming runner tests with mock spawn.                                                                                       |
| `src/agentScreen.ts`                 | 1,2,3 | Extend `ActivityEvent` union. Add webview rendering for `cliStream`, `cloudAgentStatus`, `cloudAgentArtifact`. CSP updates in Phase 3. |
| `src/mcpServer.ts`                   | 1,2   | Register `cursor_cli_run_streaming`, `cloud_agent_launch`, `cloud_agent_status`. SSE upgrade for POST /run.                            |
| `tests/mcpServer.test.ts`            | 1,2   | Tests for new MCP tools and SSE streaming.                                                                                             |
| `src/cloudAgentClient.ts`            | 2     | **New.** HTTP client for Cloud Agents API.                                                                                             |
| `tests/cloudAgentClient.test.ts`     | 2     | **New.** Fetch-mocked client tests.                                                                                                    |
| `src/extension.ts`                   | 2     | Register `cursorDrive.setApiKey` command, pass `context` to MCP server for SecretStorage access.                                       |
| `package.json`                       | 2     | Add `cursorDrive.cloudAgents.apiBaseUrl` setting, `cursorDrive.setApiKey` command.                                                     |
| `src/githubArtifacts.ts`             | 3     | **New** (if GitHub path). PR comment media extraction.                                                                                 |
| `docs/design/s-as-screen-capture.md` | 3     | Close Open Questions section with spike findings.                                                                                      |


## Dependency Budget


| Phase | New npm deps                            | Justification                                                         |
| ----- | --------------------------------------- | --------------------------------------------------------------------- |
| 1     | **None**                                | Node.js EventEmitter + JSON.parse.                                    |
| 2     | **None**                                | Node 20 native `fetch()`.                                             |
| 3     | **None** (preferred) or `@octokit/rest` | Only if GitHub artifact path is chosen and raw fetch is insufficient. |


## Risk Register


| Risk                                              | Likelihood | Mitigation                                                                                 |
| ------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------ |
| CLI `stream-json` format changes between versions | Low        | Lenient parser: unknown types logged + skipped, not thrown.                                |
| Cloud Agents API doesn't expose artifact URLs     | Medium     | p3-01 spike resolves before implementation. GitHub fallback path.                          |
| API key UX friction for Phase 2                   | Low        | SecretStorage prompt only on first use; stored permanently. Clear error message if absent. |
| Webview CSP blocks external media in Phase 3      | Low        | Explicit `img-src`/`media-src` directives for known domains.                               |


## Ordering Constraints

- Phase 0 (p0-01, p0-02) is pre-flight — run first, no code output required.
- p0-01 result gates whether p1-01/02 are built from scratch or adapted.
- Phase 1 is fully independent — can ship alone.
- Phase 2 depends on nothing in Phase 1 (parallel-safe), but Phase 1 should
ship first for immediate user value.
- Phase 3 is blocked on full Phase 2 completion (client + auth + status tools)
and p3-01 spike outcome.
- Within Phase 1: p0-01 → p1-01/02 (parser) → p1-03/04 (runner) → p1-05/06 (S-AS) → p1-07/08 (MCP) → p1-09/10 (HTTP SSE) → p1-11 (verify).

---

## Phase 1 Reconciliation

### Verified


| Todo                    | Status | Evidence                                                                                                                                                               |
| ----------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| p1-01 NdjsonParser      | ✓      | `src/ndjsonParser.ts`: `NdjsonParser` class + `mapToCliStreamEvent()`. Handles partial lines, blank lines, malformed JSON (warn+skip).                                 |
| p1-02 ndjson tests      | ✓      | `tests/ndjsonParser.test.ts`: 18 test cases covering all event types and buffer edge cases.                                                                            |
| p1-03 StreamingRunner   | ✓      | `src/cursorCliRunner.ts`: `runCursorCliStreaming()` added. Existing `runCursorCli()` unchanged. `--output-format stream-json` flag used.                               |
| p1-04 runner tests      | ✓      | `tests/cursorCliRunner.test.ts`: 7 tests including fake-timer timeout, partial chunk buffering, error handling.                                                        |
| p1-05 ActivityEvent     | ✓      | `src/agentScreen.ts`: `cliStream                                                                                                                                       |
| p1-06 webview cliStream | ✓      | `buildHtml()`: CSS classes `.cli-tool-call`, `.cli-stream-block`, `.cli-user`, `.cli-error` added. `case 'cliStream':` handler with text_delta streaming accumulation. |
| p1-07 MCP tool          | ✓      | `src/mcpServer.ts`: `cursor_cli_run_streaming` tool registered. Wires data events to AgentScreenPanel. Returns accumulated stdout.                                     |
| p1-08 MCP test          | ✓      | `tests/mcpServer.test.ts`: tool registration verified, postEvent calls verified with 300ms timing approach.                                                            |
| p1-09 POST /run SSE     | ✓      | `src/mcpServer.ts`: `Accept: text/event-stream` detection; SSE headers; streaming events; `{type:"done",exitCode}` final event.                                        |
| p1-10 SSE test          | ✓      | `tests/mcpServer.test.ts`: SSE mode verified, JSON fallback path verified.                                                                                             |
| p1-11 gate              | ✓      | `npm run compile`: 0 errors. `npm test`: 258/258 pass (23 suites, up from 228).                                                                                        |


### Residual risks

- `StreamingCliRunner.getAccumulatedStdout()` exposed via `Object.defineProperty` — callers need to cast to access it; consider making it a proper class method in Phase 2 cleanup.
- `emitProgress` wiring needs explicit end-to-end verification for all streaming paths (CLI stream tool + A2A SSE). Tracked by `p2-08-operator-progress-wiring`.

---

## Phase 2 Reconciliation

### Verified

| Todo | Status | Evidence |
|------|--------|----------|
| p2-01 cloudAgentClient | ✓ | `src/cloudAgentClient.ts`: launchAgent, getAgentStatus, getAgentConversation. Basic/bearer auth with 401/403 fallback. CloudAgentError for non-2xx. |
| p2-02 cloudAgentClient tests | ✓ | `tests/cloudAgentClient.test.ts`: 16 tests — launch 201, auth fallback, errors 401/404/429/500, getAgentStatus, getAgentConversation, base URL override. |
| p2-03 secret storage | ✓ | `extension.ts`: getApiKey(), cursorDrive.setApiKey command. `package.json`: cursorDrive.cloudAgents.apiBaseUrl. |
| p2-04 MCP cloud agent tools | ✓ | `mcpServer.ts`: cloud_agent_launch, cloud_agent_status. Polling 10s, permission gated (webSearch/full), error handling 401/403/404/429/500. |
| p2-05 MCP cloud agent tests | ✓ | `mcpServer.test.ts`: tool registration, launch+postEvent, permission denial, status+postEvent. |
| p2-06 cloudAgentStatus events | ✓ | `agentScreen.ts`: postEvent OutputChannel `[CloudAgent <id>] <status>: <prUrl>`. Webview addCloudAgentStatusItem with status badge + PR link. |
| p2-07 compile/test | ✓ | `npm run compile`: 0 errors. `npm test`: 514 pass (driveSidebar, pipeline failures pre-existing). |
| p2-08 operator progress | ✓ | cursor_cli_run_streaming calls emitProgress when foreground operator exists. A2A SSE subscribes to operatorProgress. POST /run SSE has no operator context (stateless HTTP) — intentionally no emitProgress. |

### Residual risks

- Cloud agent polling interval is not cleared on MCP server stop — minor leak; intervals stop when agent reaches terminal state.
- driveSidebar.test.ts and pipeline.test.ts failures are pre-existing (ExtensionMode mock, wake-word assertion).
