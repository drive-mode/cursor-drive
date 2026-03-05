# VS Code Extensions — Decision

**Topic:** Adoption scorecard and recommendation for VS Code extension API enhancements in Cursor Drive.

**Date:** February 2026

---

## 1. Scorecard


| Dimension                      | Score (1–5) | Rationale                                                                                                                                                                                                                                                                                                                                             |
| ------------------------------ | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **User value**                 | 3           | LM Tools registration makes Drive discoverable in VS Code's agent mode — useful for VS Code users but no impact on Cursor users until Cursor adopts the API. Webview accessibility improves experience for screen reader users and meets marketplace standards. Model utils enhancements are internal quality improvements with marginal user impact. |
| **Integration complexity**     | 2           | Low. LM Tools registration is additive (fails gracefully). Webview changes are confined to HTML generation. Model utils changes are backward-compatible. No new architectural layers required for Option A.                                                                                                                                           |
| **Maintenance burden**         | 2           | Low. `lmToolsBridge.ts` is a thin wrapper (~160 lines) with clear ownership. Webview ARIA attributes are static. Model utils enhancements are small additions to an existing module. No new runtime dependencies.                                                                                                                                     |
| **Security / privacy risk**    | 1           | Minimal. LM Tools registration exposes the same tool surface already available via MCP. No new data exposure. Webview ARIA changes do not affect CSP or script execution.                                                                                                                                                                             |
| **Lock-in / portability risk** | 1           | None. LM Tools registration is VS Code-specific but optional. MCP bridge remains primary. All enhancements are additive — removing them leaves the extension functional. No vendor lock-in introduced.                                                                                                                                                |
| **Ecosystem maturity**         | 5           | The VS Code extension ecosystem is the most mature IDE extension platform. Core APIs (commands, configuration, webview, status bar) are stable since VS Code 1.0. The LM API has been stable since June 2024. LM Tools API since March 2025.                                                                                                          |
| **Time to first value**        | 3           | Phase 1 (accessibility + model utils) delivers in 1 session. Phase 2 (LM Tools) in 1 additional session. Value depends on VS Code user base size and Cursor's API adoption timeline.                                                                                                                                                                  |


**Aggregate:** Mature ecosystem, low complexity, low risk. Incremental enhancements add value without disruption.

---

## 2. Recommendation

### ADOPT: Incremental Enhancement (Option A)

**What:** Register Drive tools via LM Tools API (with feature detection). Improve Agent Screen accessibility. Enhance model selection in `modelUtils.ts`. Keep MCP bridge as primary integration path.

**Confidence:** High

**Rationale:**

1. **VS Code's extension ecosystem is mature and stable.** Drive is built on APIs that have been stable for years. The newer AI APIs (LM API, LM Tools) have also reached stable status. The risk of API breakage is extremely low.
2. **Drive is well-positioned for incremental enhancement.** The extension architecture follows best practices. The gaps (missing LM Tools registration, webview accessibility, model selection hints) are small and self-contained. Each can be shipped independently with zero risk to existing functionality.
3. **LM Tools registration is the right additive step.** It makes Drive's pipeline tools visible to VS Code's native agent mode without replacing the MCP bridge. If Cursor eventually adopts `vscode.lm.registerTool`, Drive's tools would be immediately discoverable there too.
4. **Accessibility is a baseline requirement.** The Agent Screen's ARIA gaps are a quality debt. Fixing them is low-effort (~50 lines), improves screen reader support, and prepares the extension for marketplace compliance.
5. **MCP bridge validation.** The Chat Participant API's unavailability in Cursor confirms that Drive's MCP bridge pattern (ADR-0003) is the correct primary integration. This research validates that decision — no change needed.

### DEFER: Dual-Path Architecture (Option B)

**What:** Abstract tool registration behind a `ToolRegistry` interface with LM Tools and MCP backends.

**Confidence:** Medium

**Rationale:**

1. **Premature abstraction.** A dual-path registry adds ~300 lines of abstraction for a second backend (LM Tools) that may not be usable in Cursor. The MCP backend works everywhere today.
2. **Refactoring risk.** Extracting tool registration from `mcpServer.ts` into a shared registry touches a critical code path. The benefit (unified tool definition) does not justify the regression risk until a third registration path emerges.
3. **Revisit trigger:** Adopt if (a) Cursor confirms `vscode.lm.registerTool` support, or (b) a third tool registration mechanism (e.g., A2A tool exposure) becomes necessary.

---

## 3. Decision Matrix


| Enhancement                                              | Decision    | Confidence | Phase   | Estimated effort                       |
| -------------------------------------------------------- | ----------- | ---------- | ------- | -------------------------------------- |
| Agent Screen ARIA roles and live regions                 | **ADOPT**   | High       | Phase 1 | ~35 lines                              |
| `modelUtils.ts` selector hints + `onDidChangeChatModels` | **ADOPT**   | High       | Phase 1 | ~35 lines                              |
| LM Tools registration for 4 Drive tools                  | **ADOPT**   | High       | Phase 2 | ~170 lines                             |
| LM Tools `prepareInvocation` confirmation                | **ADOPT**   | High       | Phase 2 | Included above                         |
| Dual-path `ToolRegistry` abstraction                     | **DEFER**   | Medium     | Phase 3 | ~300 lines                             |
| `registerMcpServerDefinitionProvider` adoption           | **MONITOR** | Medium     | Phase 4 | ~20 lines (when ready)                 |
| Chat Participant API adoption                            | **MONITOR** | Low        | TBD     | ~50 lines (when Cursor supports)       |
| Chat Provider API adoption                               | **REJECT**  | High       | —       | Drive does not need to register models |


---

## 4. Success Criteria

### Phase 1 (Webview Accessibility + Model Utils)

- Agent Screen tabs have `role="tab"`, `aria-selected`, `aria-controls`
- Agent Screen panels have `role="tabpanel"`, `aria-labelledby`
- Activity panel has `aria-live="polite"` for dynamic content
- `modelUtils.ts` passes selector hints to `selectChatModels`
- `onDidChangeChatModels` listener invalidates stale model references
- All existing tests pass (no regressions)
- Browser tests validate ARIA attributes

### Phase 2 (LM Tools Registration)

- `lmToolsBridge.ts` registers 4 tools when `vscode.lm.registerTool` is available
- Registration is silently skipped when `registerTool` is unavailable
- `drive_set_mode` and `drive_status` tools work end-to-end
- `operator_spawn` and `operator_switch` tools work end-to-end
- State-changing tools show confirmation via `prepareInvocation`
- `cursorDrive.discoverAPIs` reports registered LM tools
- All existing tests pass (no regressions)
- New `lmToolsBridge.test.ts` tests pass

---

## 5. Related Decisions


| ADR / Document                  | Relationship                                                                |
| ------------------------------- | --------------------------------------------------------------------------- |
| ADR-0003 (MCP Bridge)           | Foundation. MCP bridge remains primary; LM Tools is additive.               |
| ADR-0008 (Drive Mode Wrapper)   | Context. `drive_set_mode` LM Tool maps to the same mode-switching logic.    |
| ADR-0010 (Tiered Model Routing) | Enhancement. `modelUtils.ts` improvements strengthen tier selection.        |
| `src/apiDiscovery.ts`           | Discovery. Runtime probes confirm which APIs are available in current host. |
| `src/agentScreen.ts`            | Implementation. Accessibility fixes target `buildHtml()`.                   |
| `src/modelUtils.ts`             | Implementation. LM API enhancements target this file.                       |


