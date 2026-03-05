# Cursor Computer Use: Decision

**Prepared:** February 2026
**Recommendation:** PROTOTYPE
**Confidence:** Medium-High

---

## Scorecard

| Dimension | Score (1–5) | Rationale |
|---|---|---|
| **User value** | 3 | Visual verification and async execution are valuable, but not currently blocking any user workflow. |
| **Integration complexity** | 3 | Screenshot tools: low-medium. Cloud dispatch: high, blocked on API. Blended score. |
| **Maintenance burden** | 3 | Community MCP tools require ongoing compatibility testing. Cloud Agent integration adds lifecycle management. |
| **Security / privacy risk** | 2 | Screenshots may capture credentials or PII. Cloud VMs process code in external infrastructure. Manageable with controls. |
| **Lock-in / portability risk** | 1 | Cursor lock-in is the explicit project strategy (Drive is a Cursor-native extension). Lock-in risk is a non-issue. |
| **Ecosystem maturity** | 3 | Local agents and Cloud Agents are production-ready. Screenshot MCP tools are community-driven and emerging. No public dispatch API. |
| **Time to first value** | 3 | Screenshot tools could ship in ~2 weeks. Cloud dispatch is blocked indefinitely until API access. |

**Scale:** 1 = strong positive (low risk / high value), 5 = strong negative (high risk / low value).

---

## Recommendation: PROTOTYPE

### Do now

Prototype with community MCP screenshot tools immediately. Cursor lock-in is the explicit project strategy — Drive is a Cursor-native extension by design — so lock-in risk is a non-issue.

Monitor Cursor Cloud Agents API for public availability; prototype with community MCP screenshot tools immediately.

### Monitor

1. **Cursor Cloud Agents API:** Watch for public API announcements. When available, proceed with Option B (Cloud Agent dispatch).
2. **MCP screenshot tool maturity:** Track community MCP servers (Webpage Screenshot, BrowserLoop, Browser Tools MCP). Integrate the most stable option as part of the prototype.
3. **Cursor's own visual verification:** Cursor may ship native screenshot/visual capabilities without requiring MCP tools. This would supersede Option A entirely.

### Prototype scope

Implement Option A (MCP screenshot tools) as a gated experiment (`cursorDrive.experimental.screenshotTools`). Target:

- Integration with one community MCP screenshot tool.
- Visual verification for operator workflows that benefit from screenshot feedback.
- Feature-flagged, independently revertible.

---

## Rationale

### Why prototype now

1. **Cursor lock-in is intentional.** Drive is a Cursor-native extension by explicit project strategy (ADR-0002, ADR-0003). Lock-in to Cursor's ecosystem is a feature, not a risk. The previous DEFER was driven by lock-in concerns that do not apply to this project.

2. **Strong architectural alignment.** Cloud Agents map cleanly to Drive's operator model and A2A task lifecycle. The integration is natural, not forced.

3. **Clear immediate value.** Visual verification closes a real gap in operator capability. Prototyping with community MCP screenshot tools provides value now, independent of the Cloud Agents API timeline.

4. **Low-cost experimentation.** Community MCP screenshot tools can be integrated behind a feature flag with minimal risk. The prototype is independently revertible.

### Remaining considerations

1. **No public Cloud Agents API.** Option B (Cloud Agent dispatch) remains blocked on Cursor releasing a programmatic API. The prototype focuses on Option A (screenshot tools) while monitoring for API availability.

2. **Community MCP tools are maturing.** Screenshot MCP servers require version pinning and compatibility testing. The prototype should target the most stable option and gate behind `cursorDrive.experimental.screenshotTools`.

---

## Decision tree

```
Has Cursor published a public Cloud Agents API?
├── Yes → Re-evaluate Option B (Cloud Agent dispatch)
│         Proceed if lock-in risk is acceptable
└── No
    ├── Is there a concrete demand for visual verification?
    │   ├── Yes → Implement Option A (screenshot tools via community MCP)
    │   │         Gate behind feature flag
    │   └── No → Continue monitoring
    └── Has a screenshot MCP tool reached official support?
        ├── Yes → Implement Option A
        └── No → Continue monitoring
```

---

## Comparables

| Technology | Drive decision | Rationale |
|---|---|---|
| A2A Protocol | **Accepted** (ADR-0014) | Open standard, low lock-in, clear interop value |
| Strands Agents SDK | **Evaluate** (ADR-0014) | TypeScript-native, low commitment until eval completes |
| LangGraph | **Deferred** (ADR-0014) | Python-heavy, overkill for current scale |
| Cursor Computer Use | **Prototype** (this doc) | Cursor lock-in is intentional; prototype with MCP screenshot tools now |
