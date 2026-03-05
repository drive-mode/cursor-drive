# VS Code Extensions — Implementation Plan

**Topic:** Integration points, implementation options, testing strategy, and rollout plan for VS Code extension API enhancements in Cursor Drive.

**Date:** February 2026

---

## 1. Current State

### extension.ts

Clean `activate()`/`deactivate()` with sequential service initialization:

1. DriveMode manager (mode state machine)
2. OperatorRegistry + SessionMemory + PersistentMemory + CommsAgent (core services)
3. Status bar (reactive to mode + operator changes)
4. MCP server (HTTP on configurable port, async start)
5. Commands (12 registered via `registerCommand`)
6. API Discovery (runtime introspection of host capabilities)

All services are wired to `context.subscriptions` for cleanup. Error isolation per component — a status bar failure does not prevent MCP server startup.

### modelUtils.ts

Single source of truth for `vscode.lm` usage:

- `selectTierModel(tier, token)` — calls `vscode.lm.selectChatModels({})`, matches against `TIER_PREFERENCES[tier]`
- Four tiers: `routing` (cheapest), `planning` (mid), `execution` (user's model), `reasoning` (highest)
- Fallback: if no preference match, returns `models[0]`
- No selector hints (calls `selectChatModels` with empty object)
- No `onDidChangeChatModels` listener

### agentScreen.ts

Webview panel with:

- CSP nonces (per-render, `default-src 'none'`)
- Three tabbed panels: Activity, Files, Decisions
- Plan progress overlay (configurable)
- `postMessage` communication for file open, ask-about-item, plan navigation
- VS Code theme integration via CSS variables
- Dual display mode: webview tab or OutputChannel log

**Accessibility gaps:** No ARIA roles on tabs/panels, no `aria-live` regions, no explicit `aria-label` on interactive items.

### Test infrastructure

| Layer | Tool | Coverage |
|---|---|---|
| Unit tests | Jest + `tests/__mocks__/vscode.ts` | 17 test files covering core modules |
| Browser tests | Playwright | 2 specs: `smoke.spec.ts`, `sharescreen.spec.ts` |
| Extension tests | Not present | No `@vscode/test-electron` integration tests |

The mock covers `vscode.lm.selectChatModels`, `vscode.window`, `vscode.workspace`, `vscode.commands`, `EventEmitter`, status bar items, and output channels.

---

## 2. Integration Points

### 2.1 modelUtils.ts — LM API Enhancements

**Current:** `selectChatModels({})` with preference-list matching.

**Enhancements:**

| Change | File | Lines |
|---|---|---|
| Add selector hints (vendor, family) per tier | `modelUtils.ts` | +15 |
| Add `onDidChangeChatModels` listener with cache invalidation | `modelUtils.ts` | +20 |
| Add `countTokens()` wrapper for session memory | `modelUtils.ts` | +15 |
| Update tests | `tests/modelSelector.test.ts` | +25 |

### 2.2 agentScreen.ts — Webview Accessibility

**Current:** Functional webview with theme integration but missing ARIA patterns.

**Changes:**

| Change | Method | Lines |
|---|---|---|
| Add ARIA tab pattern (`role="tablist"`, `role="tab"`, `role="tabpanel"`) | `buildHtml()` | +15 |
| Add `aria-live="polite"` to activity panel | `buildHtml()` | +3 |
| Add `aria-label` to interactive items | `buildHtml()` (JS template) | +10 |
| Add focus management on tab switch | `buildHtml()` (JS) | +8 |
| Add high-contrast theme audit | Browser tests | +20 |

### 2.3 extension.ts — LM Tools Registration

**Current:** Tools registered only via MCP server.

**Change:** On activation, register a subset of Drive tools via `vscode.lm.registerTool` if available.

| Change | File | Lines |
|---|---|---|
| Feature-detect `vscode.lm.registerTool` | `extension.ts` | +5 |
| Create tool wrappers for `drive_set_mode`, `drive_status`, `operator_spawn`, `operator_switch` | New `lmToolsBridge.ts` | +120 |
| Register tools with `prepareInvocation` confirmation for state-changing tools | `lmToolsBridge.ts` | +40 |
| Deregister on deactivate | `extension.ts` | +3 |
| Update tests | New `tests/lmToolsBridge.test.ts` | +60 |

---

## 3. Implementation Options

### Option A: Swap-First — LM Tools Registration + Webview Accessibility (~200 lines)

**Scope:**

1. Register 4 Drive tools via `vscode.lm.registerTool` (with runtime feature detection)
2. Add ARIA roles and live regions to Agent Screen webview
3. Enhance `modelUtils.ts` with selector hints and `onDidChangeChatModels`
4. Keep MCP bridge as primary tool surface (no change)

**Estimated changes:**

| File | Change type | ~Lines |
|---|---|---|
| `lmToolsBridge.ts` (new) | Tool wrappers for LM Tools API registration | +160 |
| `extension.ts` | Feature-detect + register/deregister LM tools | +10 |
| `agentScreen.ts` | ARIA roles, live regions, focus management | +35 |
| `modelUtils.ts` | Selector hints, `onDidChangeChatModels` listener | +35 |
| `tests/lmToolsBridge.test.ts` (new) | LM Tools registration tests | +60 |
| `tests/modelSelector.test.ts` | Enhanced model selection tests | +25 |
| `tests/__mocks__/vscode.ts` | Add `lm.registerTool`, `lm.tools` stubs | +15 |
| **Total** | | **~340** |

**Complexity:** Low. LM Tools registration is additive (fails gracefully if API absent). Webview changes are confined to `buildHtml()`. Model utils changes are backward-compatible.

**Time to first value:** 1–2 sessions.

**Risks:**
- `vscode.lm.registerTool` may not be available in Cursor → graceful no-op, zero breakage
- ARIA changes cannot break functionality (additive HTML attributes)
- Model selector hints may return fewer results in some environments → existing fallback still works

### Option B: Dual-Path Architecture (~600+ lines)

**Scope:**

1. Everything in Option A
2. Abstract tool registration behind a `ToolRegistry` interface with two backends:
   - `LmToolsBackend` — registers via `vscode.lm.registerTool` (for VS Code native agent mode)
   - `McpBackend` — registers via MCP server (for MCP clients)
3. Unified tool definition format that maps to both backends
4. Runtime detection: use LM Tools when in VS Code, MCP when in Cursor, both when available
5. Unified tool invocation logging across both paths

**Estimated changes:**

| File | Change type | ~Lines |
|---|---|---|
| `toolRegistry.ts` (new) | Abstract registry interface + dual-path dispatcher | +150 |
| `lmToolsBridge.ts` (new) | LM Tools backend implementation | +120 |
| `mcpServer.ts` | Refactor tool registration to use `ToolRegistry` | +80 |
| `extension.ts` | Initialize `ToolRegistry` with detected backends | +20 |
| `agentScreen.ts` | ARIA improvements (same as Option A) | +35 |
| `modelUtils.ts` | LM API enhancements (same as Option A) | +35 |
| Tests | Registry, dual-path, fallback tests | +150 |
| **Total** | | **~600+** |

**Complexity:** Medium. The `ToolRegistry` abstraction is a new architectural layer. Refactoring `mcpServer.ts` to delegate tool registration through the registry touches a critical code path.

**Time to first value:** 2–3 sessions.

**Risks:**
- Abstraction overhead for a second backend that may never be used in Cursor
- `mcpServer.ts` refactoring risks regressions in MCP tool handling
- Dual-path adds testing surface (both backends × all tools × both environments)

**Benefits over Option A:**
- Unified tool definition eliminates duplication if many tools are registered in both systems
- Cleaner separation of concerns if a third registration path emerges (e.g., A2A tool exposure)
- Better observability — single logging point for all tool invocations regardless of path

---

## 4. Tests and Evaluations

### 4.1 LM Tools Bridge Tests (`tests/lmToolsBridge.test.ts`)

```
✓ registerDriveTools calls vscode.lm.registerTool for each tool
✓ registerDriveTools is no-op when vscode.lm.registerTool is undefined
✓ drive_set_mode tool invokes driveMode.setSubMode with correct mode
✓ drive_status tool returns current mode, active state, operator count
✓ operator_spawn tool calls operatorRegistry.spawn and returns operator info
✓ prepareInvocation returns confirmation message for state-changing tools
✓ disposables are returned for cleanup on deactivation
```

### 4.2 Model Utils Enhancement Tests (`tests/modelSelector.test.ts`)

```
✓ selectTierModel with selector hints passes vendor/family to selectChatModels
✓ selectTierModel falls back to empty selector when hints return no results
✓ onDidChangeChatModels callback invalidates cached model selection
✓ countTokens delegates to model.countTokens when available
✓ countTokens falls back to heuristic when model.countTokens is unavailable
```

### 4.3 Webview Accessibility Tests (`tests/browser/sharescreen.spec.ts`)

```
✓ tabs have role="tab" and aria-selected attributes
✓ tab panels have role="tabpanel" and aria-labelledby
✓ activity panel has aria-live="polite"
✓ file items have aria-label with file path
✓ tab switching updates aria-selected and moves focus to panel
✓ dynamic activity items are announced by aria-live region
```

### 4.4 Extension Activation Tests (`tests/extension.test.ts`)

```
✓ activate registers LM tools when vscode.lm.registerTool is available
✓ activate skips LM tools registration when vscode.lm.registerTool is missing
✓ deactivate disposes LM tools registrations
```

### 4.5 Evaluation Criteria

| Criterion | Target | Measurement |
|---|---|---|
| No regression in existing tests | 100% pass rate | `npm test` |
| LM Tools registration coverage | All 4 tools tested | Unit test count |
| Graceful degradation | Zero errors when `registerTool` absent | Feature-detect test |
| Accessibility audit | Zero ARIA violations in webview | Playwright accessibility snapshot |
| Model selection accuracy | Tier preferences still respected | Existing `modelSelector.test.ts` |

---

## 5. Rollout Plan

### Phase 1: Webview Accessibility + Model Utils (~35 + 35 lines)

**Target:** Next session.

1. Add ARIA tab pattern and `aria-live` to `agentScreen.ts` `buildHtml()`
2. Add selector hints and `onDidChangeChatModels` to `modelUtils.ts`
3. Update browser tests for accessibility assertions
4. Update model selection unit tests

**Validation:** All existing tests pass. Browser tests confirm ARIA attributes. Model selection tests confirm enhanced behavior with fallback.

### Phase 2: LM Tools Registration (~170 lines)

**Target:** After Phase 1 stabilizes.

1. Create `lmToolsBridge.ts` with tool wrappers for 4 Drive tools
2. Feature-detect `vscode.lm.registerTool` in `extension.ts`
3. Register tools on activation; dispose on deactivation
4. Add `vscode.lm.registerTool` stub to test mock
5. Write LM Tools bridge tests

**Validation:** Unit tests pass. Manual verification via `cursorDrive.discoverAPIs` in VS Code (if available) confirms tools appear in `vscode.lm.tools`.

### Phase 3: Dual-Path Architecture (Deferred)

**Target:** Only if LM Tools API gains Cursor adoption or a third registration path emerges.

1. Create `ToolRegistry` abstraction
2. Refactor `mcpServer.ts` to register tools through registry
3. Wire LM Tools backend into registry
4. Unified logging and observability

**Gate:** Confirmed Cursor support for `vscode.lm.registerTool`, or a validated need for unified tool registration across 3+ backends.

### Phase 4: Proposed API Adoption (Monitor Only)

**Target:** When `registerMcpServerDefinitionProvider` graduates to stable and Cursor adopts it.

1. Auto-register MCP server on activation
2. Remove manual `mcp.json` setup requirement
3. Update `pluginInstaller.ts` to skip `mcp.json` when auto-registration works

**Gate:** API graduation + Cursor support confirmation via `apiDiscovery.ts`.
