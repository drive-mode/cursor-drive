# VS Code Extensions — Project Impact on Cursor Drive

**Topic:** How VS Code's extension API architecture and newer AI extensibility APIs affect Drive's current design and roadmap.

**Date:** February 2026

---

## 1. Drive's Extension Is Well-Structured

Drive's `extension.ts` follows VS Code extension best practices:

| Practice | Drive implementation | Source |
|---|---|---|
| **Clean `activate()`/`deactivate()`** | Sequential service initialization with error isolation per component | `src/extension.ts` |
| **Subscriptions cleanup** | All disposables pushed to `context.subscriptions` | `src/extension.ts` |
| **Status bar** | Left-aligned item with mode + operator state, wired to `onDidChange` events | `src/statusBar.ts` |
| **Webview CSP** | Per-render nonce, `default-src 'none'`, scoped `style-src` and `script-src` | `src/agentScreen.ts` |
| **Configuration schema** | 22 typed settings with enums, ranges, and descriptions | `package.json` → `contributes.configuration` |
| **Commands + keybindings** | 12 commands registered via contribution points and `registerCommand` | `package.json` + `src/extension.ts` |
| **Output channel diagnostics** | Structured `[Drive]` prefixed logging with error surfacing | `src/extension.ts` |

The extension architecture is solid. The gaps are not structural — they are in API adoption. Drive does not use the newer AI extensibility APIs because they either (a) are not available in Cursor or (b) were not yet stable when Drive was built.

---

## 2. Chat Participant API — Not Available, MCP Bridge Is Correct

### Status

The Chat Participant API (`vscode.chat.createChatParticipant`) is stable in VS Code (1.93+) but **not exposed in Cursor**. Cursor's chat panel is a custom implementation that does not dispatch to extension-registered participants.

Drive's `extension.ts` documents this explicitly:

> *Note: vscode.chat.createChatParticipant is NOT supported in Cursor's chat. The @drive participant has been removed.*

### Impact

**None — Drive's decision is validated.** The MCP bridge pattern (ADR-0003) is the correct alternative:

| Approach | VS Code | Cursor | Cross-IDE |
|---|---|---|---|
| Chat Participant API | ✅ Works | ❌ Not available | ❌ VS Code only |
| MCP bridge (Drive's approach) | ✅ Works | ✅ Works | ✅ Any MCP client |

Drive's MCP server on `localhost:7891` provides the same tool surface that a chat participant would — but accessible from any MCP-compatible client, not just VS Code's chat.

### What to monitor

- Cursor may adopt the Chat Participant API in a future release. Track Cursor's changelog and `apiDiscovery.ts` probe results.
- If Cursor adopts it, Drive could register a lightweight `@drive` participant as a convenience entry point (not primary UX — per vision invariant #4).

---

## 3. Language Model API — Already Used, Can Be Enhanced

### Current usage

Drive already uses `vscode.lm.selectChatModels` via `modelUtils.ts`:

```
modelUtils.ts → selectTierModel(tier, token)
  → vscode.lm.selectChatModels({})
  → match against TIER_PREFERENCES[tier]
  → return best match or first available
```

This is consumed by:
- `modelSelector.ts` → `selectModelForTier()` — primary model selection entry
- `commsAgent.ts` → routing-tier model for notification summarization
- `promptOptimizer.ts` → routing-tier model for voice prompt rewriting
- `router.ts` → cheap model for intent classification

### Enhancement opportunities

| Enhancement | What | Benefit | Complexity |
|---|---|---|---|
| **Model selector hints** | Pass `{ vendor, family }` to `selectChatModels` instead of `{}` | More deterministic tier selection — avoids scanning all models | Low (~10 lines in `modelUtils.ts`) |
| **`onDidChangeChatModels` listener** | React when models become available/unavailable | Dynamic tier fallback — if preferred model disappears, re-select | Low (~15 lines) |
| **Token counting** | Use `model.countTokens()` for session memory budgeting | Replace heuristic token estimation in `sessionMemory.ts` with API-backed counting | Medium (~30 lines) |
| **Streaming response handling** | Use async iterator pattern for `model.sendRequest` | Already done implicitly — verify streaming is used correctly in all call sites | Audit only |

### Risks

Model selector hints (`vendor`, `family`) require knowledge of which models are registered. Cursor's model registry differs from VS Code + Copilot. Using overly specific selectors could return empty results in Cursor. The current approach (select all, filter by preference list) is more defensive.

---

## 4. LM Tools API — Could Enable Native Agent Mode Discovery

### Opportunity

The Language Model Tools API (`vscode.lm.registerTool`, stable in VS Code 1.99+) lets extensions register tools that VS Code's built-in agent mode can discover and invoke.

Drive has 20+ MCP tools registered via `mcpServer.ts`. These are accessible to any MCP client — but they are **invisible to VS Code's native agent mode**. Registering a subset via `vscode.lm.registerTool` would make Drive's pipeline tools discoverable without requiring MCP connection setup.

### Candidate tools for LM Tools registration

| MCP tool | LM Tools registration value | Priority |
|---|---|---|
| `drive_set_mode` | Agent mode can switch Drive modes contextually | High |
| `drive_status` | Agent mode can check Drive state before acting | High |
| `operator_spawn` | Agent mode can create operators | Medium |
| `operator_switch` | Agent mode can switch active operators | Medium |
| `agent_screen_activity` | Agent mode can log activity to Agent Screen | Low |
| `agent_screen_file` | Agent mode can track file touches | Low |

### Constraints

- **Cursor support unknown.** Whether Cursor's agent mode respects `vscode.lm.registerTool` registrations is unconfirmed. Drive's `apiDiscovery.ts` should probe `vscode.lm.tools` and `vscode.lm.registerTool` to determine availability.
- **Dual registration.** Tools would be registered both as MCP tools (for MCP clients) and LM Tools (for native agent mode). The tool logic is shared; only the registration wrapper differs.
- **No breaking changes.** LM Tools registration is additive. If `vscode.lm.registerTool` is not available (throws), the extension continues to work via MCP only.

---

## 5. Webview Improvements — Accessibility Audit for Agent Screen

### Current state

`agentScreen.ts` produces well-structured HTML with:
- ✅ CSP nonces (per-render, `default-src 'none'`)
- ✅ VS Code theme variables for all colors
- ✅ Responsive layout (flexbox, scrollable panels)
- ✅ Keyboard-navigable tabs
- ✅ `retainContextWhenHidden: true`

### Gaps

| Gap | Description | Severity |
|---|---|---|
| **Missing ARIA roles** | Tab buttons lack `role="tab"`, `aria-selected`, and `aria-controls`. Panel containers lack `role="tabpanel"`. | Medium |
| **Missing ARIA labels** | Activity items, file items, and decision items lack `aria-label` for screen readers. | Medium |
| **Focus management** | Tab switching does not move focus to the active panel. | Low |
| **Color contrast** | `.activity-time` and `.file-operator` use `--vscode-descriptionForeground` which may not meet 4.5:1 contrast ratio in all themes. | Low |
| **Live region** | New activity items are appended dynamically but no `aria-live="polite"` region announces them to screen readers. | Medium |

### Recommended fixes

1. Add ARIA tab pattern: `role="tablist"` on `.tabs`, `role="tab"` + `aria-selected` on `.tab`, `role="tabpanel"` + `aria-labelledby` on `.panel`
2. Add `aria-live="polite"` to `#panel-activity` for dynamic content announcements
3. Add `aria-label` to file items and decision items
4. Audit color contrast with VS Code's accessibility checker for high-contrast themes

These are ~50 lines of changes in `agentScreen.ts`, confined to the `buildHtml()` method.

---

## 6. `registerMcpServerDefinitionProvider` — Auto-Registration Opportunity

### Current friction

Users must manually edit `.cursor/mcp.json` to register Drive's MCP server:

```json
{ "mcpServers": { "drive": { "url": "http://localhost:7891/mcp" } } }
```

Drive's `pluginInstaller.ts` can install this file, but it requires running a command.

### Proposed API opportunity

If `registerMcpServerDefinitionProvider()` graduates to stable, Drive could auto-register its MCP server on activation:

```typescript
vscode.lm.registerMcpServerDefinitionProvider('cursorDrive', {
  provideMcpServerDefinitions() {
    return [{ label: 'Cursor Drive', url: `http://127.0.0.1:${mcpPort}/mcp` }];
  }
});
```

This eliminates the manual setup step entirely. The server definition would be dynamic (respects `cursorDrive.mcp.port` setting) and cleaned up on extension deactivation.

### Status

Proposed API — not yet in stable VS Code, not in Cursor. Monitor for graduation.

---

## 7. What to Monitor

| Signal | Source | Action trigger |
|---|---|---|
| **Cursor adopts Chat Participant API** | Cursor changelog, `apiDiscovery.ts` probes | Consider lightweight `@drive` participant (fallback only) |
| **Cursor respects `vscode.lm.registerTool`** | `apiDiscovery.ts` probes | Register Drive tools for native agent mode discovery |
| **`registerMcpServerDefinitionProvider` graduates** | VS Code release notes | Auto-register MCP server on activation |
| **Chat Provider API graduates** | VS Code release notes | Evaluate: could Drive register its own model? (likely not needed) |
| **VS Code webview accessibility audit enforcement** | Marketplace requirements | Ensure Agent Screen passes audit |
| **`vscode.lm.selectChatModels` selector changes** | VS Code API changelog | Update `modelUtils.ts` selector hints |

---

## 8. Summary

Drive's extension is well-architected for its current scope. The MCP bridge pattern (ADR-0003) is validated — it provides broader reach than VS Code-specific APIs. The gaps are incremental:

| Area | Current state | Recommended action | Effort |
|---|---|---|---|
| Chat Participant API | Correctly not used (Cursor limitation) | Monitor for Cursor adoption | None now |
| Language Model API | Used via `modelUtils.ts` | Enhance with selector hints, `onDidChangeChatModels`, token counting | Low |
| LM Tools API | Not used | Register Drive tools for native agent mode (additive) | Medium |
| Webview accessibility | CSP and theming correct; ARIA gaps | Add ARIA roles and live regions to Agent Screen | Low |
| MCP auto-registration | Manual `mcp.json` required | Wait for `registerMcpServerDefinitionProvider` graduation | None now |
