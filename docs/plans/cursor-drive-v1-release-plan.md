# Cursor Drive v1 Release Plan

Collaborative plan from parallel subagents: release readiness, S-AS UX (terminal-first, editor focus, chat/reasoning), and ACP/MCP integration.

## Portfolio Context

cursor-drive v1 is the top Now priority in the portfolio. Shipping it unblocks:
1. claude-drive sync of v1 fixes (ai-secretagent)
2. roler.ai ACP harness — which uses claude-agent-sdk patterns proven in claude-drive

**Dependency chain:** cursor-drive v1 ships → claude-drive syncs v1 fixes → roler.ai ACP harness begins.

See [drive-mode-portfolio-strategy.md](drive-mode-portfolio-strategy.md) for the full rationale.

**User vision:** Agent Screen = terminal; editor shows edits (one file at a time when parallel); chat = line of thinking; full Cursor AI IDE with Drive features; leverage ACP, MCP apps, possibly UI integration.

**Related docs:**
- [S-AS v1 UX Proposal](../design/ux/s-as-v1-ux-proposal.md)
- [Drive UI Surfaces](../design/ux/drive-ui-surfaces-and-devtools.md)
- [repo-audit.md](../../repo-audit.md)

---

## 1. Release Readiness Checklist

### v1 Blockers (must fix)

| # | Task | Path | Depends |
|---|------|------|---------|
| 1 | Add missing config schema keys | `package.json` contributes.configuration | — |
| 2 | Create `src/config.ts` with zod validation | New file | #1 |
| 3 | Wire slash commands to pipeline | `src/pipeline.ts`, Composer integration | — |
| 4 | Fix config-schema.md reference | `docs/reference/config-schema.md` | #2 |
| 5 | Add config loading tests | `tests/config.test.ts` | #2 |
| 6 | Verify CI: npm ci, compile, test | `.github/workflows/ci.yml` | #2 |
| 7 | Verify VSIX packages | `npx vsce package` | #6 |
| 8 | Update README Status | `README.md` | #1–#3 |
| 9 | Update getting-started Node version | `docs/guides/getting-started.md` | — |

**Critical path:** 1 → 2 → 4, 5, 6, 7. Item 3 can run in parallel.

### Config keys to add (from repo-audit)

`approvalGates`, `agents.permissions`, `sanitizer.maxLength`, `glossary`, `agent.sessionMemory`, `agent.proactiveSteering`, `agents.commsAgent`, `modeSwitching.requireConfirmation`, `cloudAgents.apiBaseUrl`

### Deferred (post-v1)

- Audit logging
- Data-egress guard
- Browser tests in CI (keep manual; document in live-testing.md)
- Slash command wiring if Composer doesn't expose `command` (fallback: keyword routing only)

---

## 2. S-AS UX: Terminal-First, Editor, Chat

### 2.1 Current State

| displayMode | Implementation | Notes |
|-------------|----------------|-------|
| **tab** | WebviewPanel beside editor | Full UI: Live, Activity, Files, Decisions, Sync |
| **panel** | Same as tab | Bug: enum says "bottom panel" but code path identical |
| **bottomLog** | OutputChannel "Drive Agent Screen" | Text-only; no webview, no chimes, no links |

### 2.2 Terminal as Agent Screen

**Already available:** `bottomLog` = Output channel with text activity feed. Format: `[operator] text`, `[operator] Touched: path`, `[CLI] label: text`.

**Possible extension:** Add `terminal` displayMode using `createTerminal({ pty })` + custom `Pseudoterminal`. Plain text or ANSI; lives in terminal panel.

**v1 decision:** Keep `bottomLog` as terminal-like option. Make it a first-class choice (or default) for users who prefer Output over webview. Add true terminal pty later if needed.

### 2.3 Editor Focus: One File at a Time

- **Drive does not edit files.** Cursor agent/CLI does. Drive receives `agent_screen_file` MCP calls.
- **Cursor:** Owns editor focus when it applies edits. Extensions cannot override.
- **Drive:** Focuses only on user click in Agent Screen (`openFile` → `showTextDocument`).

**"One file at a time" for parallel operators:**

| Approach | v1? | Notes |
|----------|-----|-------|
| No auto-focus (current) | Yes | User clicks to open; predictable |
| "Follow operator X" | Later | When X touches file F, auto `showTextDocument(F)` |
| Most recent wins | Later | Any `logFile` → focus that file; can feel jumpy |

**v1:** Keep click-to-open. Add optional "Follow operator" post-v1.

### 2.4 Chat: Line of Thinking vs Payload

**Cursor does not expose** reasoning vs final message. No API for Composer internals.

**What we have:**

| Source | Content | Available |
|--------|---------|-----------|
| CLI stream-json | `text_delta` (assistant output) | Yes — `cursor_cli_run_streaming` → Live tab |
| MCP tools | `agent_screen_activity`, `agent_screen_decision` | Yes — operators log reasoning |
| Composer | User prompt, model response | No — not exposed |

**Conclusion:** For in-IDE Composer, we cannot split "line of thinking" vs "chat payload." For CLI runs, `text_delta` is the assistant stream (may include reasoning). We surface it in Agent Screen Live tab. For in-IDE, operators must call `agent_screen_activity` / `agent_screen_decision` to surface reasoning.

### 2.5 v1 S-AS Layout Options

**Option A — Webview primary (current)**

- Live tab: Files strip + streaming activity
- Tabs: Live | Activity | Files | Decisions | Sync
- bottomLog: Minimal fallback

**Option B — Terminal-first (user vision)**

- Default displayMode: `bottomLog` — Agent Screen = Output channel
- Optional: `tab` for rich UI (chips, links, plan progress)
- Editor: Cursor opens files on edit; we list touched files; user clicks to open

**Recommendation:** Support both. Add config `cursorDrive.agentScreen.defaultDisplayMode` or document that `bottomLog` is the "terminal-first" choice. Fix or remove `panel` (currently broken).

---

## 3. ACP/MCP/MCP Apps Integration

### 3.1 ACP

| Component | Status | v1 |
|-----------|--------|-----|
| `@agentclientprotocol/sdk` | In package.json, no imports | Not used |
| `cursor-sdk/` | SessionAccumulator, ToolCallTracker | Not wired |
| Cursor CLI `agent acp` | Future NDJSON transport | Deferred |

**v1:** No ACP work. Defer to post-v1 when Cursor CLI ACP is available.

### 3.2 MCP

| Component | Status | v1 |
|-----------|--------|-----|
| MCP server :7891 | Implemented | Required |
| Tools (operator_*, agent_screen_*, etc.) | Implemented | Required |
| Plugin installer | Hooks, config, skills | Required |

**v1:** Keep current MCP server and tools. No changes.

### 3.3 MCP Apps

| Component | Status | v1 |
|-----------|--------|-----|
| `ui://cursor-drive/agent-screen` | Registered via ext-apps | Optional |
| `agent_screen_*` with `_meta.ui` | Return resourceUri in chat | Cursor 2.6+ |
| Inline Agent Screen in chat | Renders in iframe | When enableApps |

**v1:** MCP Apps optional (`cursorDrive.mcp.enableApps`). Enables inline Agent Screen in chat when Cursor 2.6+.

### 3.4 "Spoofing UI" — What's Possible

| Approach | Feasible? |
|----------|-----------|
| Modify Composer chrome | No — AGENTS.md: "Composer UI is not extensible" |
| DOM injection | No — no workbench DOM access |
| MCP Apps inline in chat | Yes — `ui://` renders when tool returns `_meta.ui` |
| Webview that looks like chat | Partial — we can create webview; cannot replace Composer |
| Status bar, QuickPicks, commands | Yes — standard extension APIs |

**Practical:** Use MCP Apps for inline Agent Screen in chat. Use webview for dedicated panel. No Composer chrome modification.

---

## 4. Implementation Order

### Phase 1: Release Blockers

1. Add config schema keys to package.json
2. Create src/config.ts
3. Wire slash commands (if Composer exposes command; else document limitation)
4. Fix config-schema.md
5. Add config tests
6. Update README, getting-started

### Phase 2: S-AS Polish

1. Fix or remove `panel` displayMode
2. Document bottomLog as "terminal-first" option
3. Optionally make bottomLog default for new users
4. Ensure CLI `text_delta` streams to Live tab (verify existing behavior)

### Phase 3: Testing & Validation

1. Run full Jest suite
2. Manual browser smoke (serve-web + Playwright)
3. VSIX packaging
4. Manual install in Extension Development Host

### Phase 4: Post-v1 (Backlog)

- "Follow operator" for editor focus
- Terminal pty displayMode
- ACP / cursor-sdk wiring when Cursor CLI supports it
- More MCP App `ui://` resources (plan-progress, operators, file-diff)

---

## 5. Files to Touch

| File | Phase | Change |
|------|-------|--------|
| `package.json` | 1 | Add config schema keys |
| `src/config.ts` | 1 | New; zod validation |
| `src/pipeline.ts` | 1 | Pass `command` to route() if available |
| `docs/reference/config-schema.md` | 1 | Fix src/config.ts reference |
| `tests/config.test.ts` | 1 | New |
| `src/agentScreen.ts` | 2 | Fix panel or remove |
| `package.json` | 2 | displayMode enum if panel removed |
| `README.md` | 1 | Status section |
| `docs/guides/getting-started.md` | 1 | Node 20 |

---

## 6. Summary

| Area | v1 Scope |
|------|----------|
| **Release** | Config schema, config.ts, slash commands, docs |
| **S-AS** | bottomLog as terminal-like; fix panel; webview or bottomLog |
| **Editor** | Click-to-open; no auto-focus |
| **Chat** | Reasoning via CLI stream + MCP tools; Composer not exposed |
| **ACP** | Deferred |
| **MCP** | Server, tools, plugin installer |
| **MCP Apps** | Optional inline Agent Screen |

