# Handoff: MCP 500 + command discovery — resolved (2026-02-26)

This note captures the root cause and the implemented fix for the MCP 500 loop.

---

## Resolution status

- **Resolved:** recurring MCP SSE/POST 500 transport failures
- **Resolved:** startup activation race where MCP server was not listening early
- **Resolved:** debug ingest contamination left in runtime source files

---

## Root cause

`src/mcpServer.ts` used a single `StreamableHTTPServerTransport` in **stateless mode**:

- `sessionIdGenerator: undefined`
- same transport instance reused for multiple `/mcp` requests

In `@modelcontextprotocol/sdk` this is invalid: stateless transports cannot be reused across requests and throw after the first handled request. That throw path surfaced as repeated 500s in client logs.

---

## What was changed

### 1) MCP transport lifecycle and error handling (`src/mcpServer.ts`)

- Switched to reusable session-aware streamable HTTP transport:
  - `sessionIdGenerator: () => randomUUID()`
- Added explicit MCP request wrapper with `try/catch`:
  - catches thrown transport errors
  - returns controlled JSON-RPC 500 only if response was not already sent
- Added MCP-compatible route matching helper:
  - handles `/mcp` plus compatibility aliases (`/mcp/sse`, `/sse`)

### 2) HTTP diagnostics (`src/mcpServer.ts`)

- Added request-level logs:
  - ingress: method + URL
  - egress: final status code + sent state
  - early close logging if connection closes before completion

### 3) Activation timing (`package.json`)

- Added:
  - `"activationEvents": ["onStartupFinished"]`

This starts the extension early so MCP is likely listening before initial client probes.

### 4) Instrumentation cleanup (`src/extension.ts`, `src/mcpServer.ts`)

- Removed all `#region agent log` debug ingest fetch blocks.

---

## Validation evidence

- `npm run compile` passes (`0` TypeScript errors).
- `npm test` passes:
  - **28 suites**
  - **284 tests**
  - includes new MCP regression coverage for probe + repeated request behavior.

---

## New MCP regression checks added

In `tests/mcpServer.test.ts`:

- initialize session helper for stateful MCP flow
- MCP tool call tests updated to include session headers
- regression test confirms:
  - GET `/mcp` probe does **not** return 500
  - repeated POST `/mcp` requests remain 200 (no transport reuse crash loop)

---

## Follow-up considerations

- MCP logs are currently verbose (intentional for diagnosis). If noise becomes an issue, gate logs behind a Drive setting.
- Cloud-agent work remains tracked separately in `.cursor/plans/s_as_screen_capture_impl.plan.md` (Phase 3 explicitly blocked on Phase 2 + artifact spike).
