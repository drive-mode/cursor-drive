# VS Code Extensions — Risks and Mitigations

**Topic:** Risk analysis for adopting VS Code extension API enhancements in Cursor Drive.

**Date:** February 2026

---

## 1. Risk Registry

### R1: Cursor API Divergence — LM Tools API Not Available in Cursor

| Field | Detail |
|---|---|
| **Category** | Platform compatibility |
| **Likelihood** | High |
| **Impact** | Low |
| **Description** | Cursor forks VS Code but does not expose all APIs. `vscode.lm.registerTool` may not exist in Cursor's runtime, meaning LM Tools registration would silently fail. Drive's primary user base is Cursor, not VS Code. |
| **Mitigation** | Feature detection at registration time: check `typeof vscode.lm.registerTool === 'function'` before calling. If absent, skip registration entirely. MCP bridge remains the primary tool surface regardless. The `apiDiscovery.ts` command probes this at runtime and logs availability. |
| **Residual risk** | Very low. LM Tools registration is purely additive. Failure to register has zero effect on Drive's MCP-based functionality. |

---

### R2: Model Selector Hint Regression — Fewer Models Returned

| Field | Detail |
|---|---|
| **Category** | Functionality |
| **Likelihood** | Medium |
| **Impact** | Low |
| **Description** | Passing `{ vendor, family }` to `selectChatModels` instead of `{}` filters the result set. If selector hints are too restrictive (e.g., no model matches `vendor: 'copilot'` in an environment), the call returns empty. Current code returns all models and filters client-side. |
| **Mitigation** | Two-pass strategy: first try with hints, fall back to `{}` if no results. This preserves the current behavior (scan all, match preferences) while trying the more efficient path first. |
| **Residual risk** | Very low. Two-pass ensures no regression. |

---

### R3: Dual Registration Confusion — Same Tool Visible Twice

| Field | Detail |
|---|---|
| **Category** | Usability |
| **Likelihood** | Low–Medium |
| **Impact** | Low |
| **Description** | If both MCP and LM Tools registrations are active, VS Code's agent mode could see the same Drive tool from both surfaces. The tool would appear twice with different invocation paths — potentially confusing for users and agents. |
| **Mitigation** | (1) LM Tools names are prefixed with `cursorDrive_` (e.g., `cursorDrive_setMode`) while MCP tools use `drive_set_mode`. Different names prevent collision. (2) LM Tools descriptions reference Drive explicitly so the agent can deduplicate. (3) If this becomes a reported issue, add dedup logic or disable one path based on environment detection. |
| **Residual risk** | Low. Different naming and different invocation paths make collision unlikely. |

---

### R4: Webview Accessibility Regression — ARIA Breaks Layout

| Field | Detail |
|---|---|
| **Category** | Quality |
| **Likelihood** | Low |
| **Impact** | Low |
| **Description** | Adding ARIA attributes (`role`, `aria-selected`, `aria-live`) to the Agent Screen HTML could theoretically affect rendering in specific webview implementations or themes, though ARIA attributes are presentation-neutral by spec. |
| **Mitigation** | (1) ARIA attributes do not affect visual rendering — they are metadata for assistive technologies. (2) Browser tests (`sharescreen.spec.ts`) verify both functional behavior and accessibility attributes. (3) Changes are confined to `buildHtml()` — a single method in a single file. |
| **Residual risk** | Very low. ARIA attributes are universally safe to add. |

---

### R5: Proposed API Premature Adoption — Building on Unstable Foundations

| Field | Detail |
|---|---|
| **Category** | Architecture |
| **Likelihood** | Medium |
| **Impact** | Medium |
| **Description** | Proposed APIs (`registerMcpServerDefinitionProvider`, `chatProvider`) could be dropped or changed before graduation. Building on them risks wasted effort and potential breakage if the API shape changes. |
| **Mitigation** | The recommended plan does NOT use any proposed APIs. All enhancements use stable APIs only (`selectChatModels` — stable since 1.90, `registerTool` — stable since 1.99). Proposed APIs are in "MONITOR" status — no code is written until they graduate. |
| **Residual risk** | None. No proposed API code in the recommended plan. |

---

### R6: `onDidChangeChatModels` Event Storm — Excessive Re-Selection

| Field | Detail |
|---|---|
| **Category** | Performance |
| **Likelihood** | Low |
| **Impact** | Low |
| **Description** | The `onDidChangeChatModels` event could fire frequently (e.g., during Copilot initialization, model updates). If each event triggers a full `selectChatModels` call, it could cause unnecessary API traffic. |
| **Mitigation** | Debounce the event handler: wait 500ms after the last event before re-selecting. Only invalidate cached models — actual re-selection happens lazily on next `selectTierModel` call. |
| **Residual risk** | Very low. Debouncing + lazy re-selection eliminates storm risk. |

---

### R7: LM Tools `prepareInvocation` UX Confusion — Unexpected Confirmations

| Field | Detail |
|---|---|
| **Category** | Usability |
| **Likelihood** | Low–Medium |
| **Impact** | Low |
| **Description** | State-changing tools (e.g., `drive_set_mode`, `operator_spawn`) use `prepareInvocation` to show a confirmation dialog before execution. If VS Code's agent mode triggers these tools automatically during a multi-step plan, repeated confirmations could interrupt flow. |
| **Mitigation** | (1) Only state-changing tools use `prepareInvocation` — read-only tools (`drive_status`) execute without confirmation. (2) The confirmation message is concise and actionable (e.g., "Switch Drive to plan mode?"). (3) If user feedback indicates excessive confirmations, make confirmation optional via configuration. |
| **Residual risk** | Low. Confirmation for state changes aligns with Drive's approval-gate philosophy (ADR-0005). |

---

### R8: Test Mock Drift — Mock Falls Behind Real API

| Field | Detail |
|---|---|
| **Category** | Quality |
| **Likelihood** | Medium |
| **Impact** | Medium |
| **Description** | `tests/__mocks__/vscode.ts` must be updated to include `lm.registerTool`, `lm.tools`, and `lm.onDidChangeChatModels` stubs. If the mock drifts from the real API, tests pass but production fails. |
| **Mitigation** | (1) Add comprehensive stubs to the mock when implementing each feature. (2) `apiDiscovery.ts` serves as ground truth — run it in real VS Code/Cursor to verify assumptions. (3) Consider adding a "mock completeness" check that compares mock surface against actual `vscode.lm` type definitions. |
| **Residual risk** | Low with diligent mock maintenance. Medium if mocks are not updated alongside features. |

---

## 2. Risk Matrix

| Risk | Likelihood | Impact | Mitigation effectiveness | Residual |
|---|---|---|---|---|
| R1: Cursor API divergence | High | Low | High (feature detection) | Very Low |
| R2: Model selector regression | Medium | Low | High (two-pass fallback) | Very Low |
| R3: Dual registration confusion | Low–Medium | Low | High (different naming) | Low |
| R4: Webview ARIA regression | Low | Low | High (attributes are inert) | Very Low |
| R5: Proposed API premature adoption | Medium | Medium | High (not using any) | None |
| R6: Model change event storm | Low | Low | High (debounce + lazy) | Very Low |
| R7: prepareInvocation UX friction | Low–Medium | Low | Medium (read-only exempted) | Low |
| R8: Test mock drift | Medium | Medium | Medium (manual maintenance) | Low |

---

## 3. Monitoring Plan

| Signal | Measurement | Threshold | Action |
|---|---|---|---|
| `vscode.lm.registerTool` availability in Cursor | `apiDiscovery.ts` probe | Function exists | Enable LM Tools registration for Cursor users |
| LM Tools invocation count | Extension telemetry (if enabled) | Any invocation | Validates VS Code agent mode discovery works |
| Webview accessibility violations | Playwright accessibility audit | Any violation | Fix before marketplace submission |
| Model selection failures (empty result) | Output channel `[Drive]` logs | >5% of selections return `undefined` | Review selector hints strategy |
| `onDidChangeChatModels` event frequency | Debounce counter in logs | >10 events per minute | Increase debounce window |
| Proposed API graduation | VS Code monthly release notes | API moves to stable | Implement planned enhancement (Phase 4) |

---

## 4. Contingency

| If… | Then… |
|---|---|
| Cursor never adopts `vscode.lm.registerTool` | LM Tools code remains dormant; zero maintenance cost. Remove after 12 months if unused. |
| Model selector hints cause regressions | Revert to `selectChatModels({})` only (current behavior). Two-pass makes this automatic. |
| Dual registration causes user confusion | Disable LM Tools registration when MCP connection is detected. Single-path by default. |
| ARIA changes cause unexpected webview behavior | Revert ARIA attributes (additive-only changes, easy rollback). |
| Proposed API is dropped | No impact — no code written for proposed APIs. Remove from monitoring list. |
| VS Code deprecates `vscode.lm.registerTool` | Migrate to replacement API or remove `lmToolsBridge.ts`. ~160 lines to update/remove. |
