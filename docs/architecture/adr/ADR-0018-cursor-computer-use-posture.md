# ADR-0018: Cursor Computer Use Integration Posture

## Status
Proposed

## Metadata
- Date: 2026-02-24
- Deciders: Cursor Drive maintainers
- Related: ADR-0014 (Agent Orchestration Strategy)

## Context

Cursor is expanding agent capabilities beyond text-based code generation. Cloud Agents run in remote VMs with full shell access, and screenshot/computer-use tools enable visual verification of UI changes. These capabilities are available to Cursor users but have no public extension API — they are internal to Cursor's agent runtime.

Drive's operator model (ADR-0014) currently orchestrates agents that read/write code and call MCP tools. Visual verification (e.g., "does this CSS change look correct?") is a natural extension of the operator workflow, but there is no stable API to dispatch Cloud Agents or invoke screenshot tools programmatically from an extension.

Community MCP servers for browser automation (Puppeteer-based, Playwright-based) exist and could serve as a low-commitment bridge for visual verification tasks.

## Decision

**DEFER** active integration with Cursor's computer-use capabilities. Specifically:

1. **Do not build Cloud Agent dispatch.** There is no public API. Integrating with internal APIs creates fragile coupling that will break on Cursor updates.
2. **Monitor Cursor's API development.** Track Cursor changelogs and extension API proposals for Cloud Agent or screenshot tool exposure.
3. **Evaluate community MCP screenshot tools when demand arises.** If a Drive user or operator needs visual verification, recommend Puppeteer MCP server (`@anthropic/mcp-puppeteer`) as a low-commitment starting point. No built-in integration until there is clear demand.

## Alternatives Considered

1. **Integrate now with community tools** — Premature. No user has requested visual verification through Drive. Adding Puppeteer MCP as a dependency increases attack surface and maintenance burden without a demand signal. Rejected.
2. **Build native Cloud Agent dispatch** — Blocked. No public API exists. Building against internal Cursor APIs would create tight coupling and break on updates. Rejected.

## Consequences

**Positive:**
- No premature dependencies or maintenance burden
- No lock-in to a specific visual verification approach
- Clean integration point ready when Cursor exposes public API

**Negative:**
- Drive operators cannot leverage visual verification for UI tasks today
- First-mover advantage in visual-verification-aware agent orchestration is deferred

## Migration Strategy

When Cursor exposes a public API for Cloud Agent dispatch or screenshot tools:

1. Add `execution: "cloud"` option to `operatorRegistry.spawn()` in `agentRegistry.ts`
2. Cloud-spawned operators run in Cursor's remote VM with screenshot capability
3. Results (screenshots, terminal output) flow back through existing A2A task endpoints
4. Permission preset for cloud operators: `standard` (file read/write, terminal execute, git write) — no `full` preset by default due to cost implications

No breaking changes to existing operator flows. Cloud execution is an additive spawn option.

## Open Questions

- **Cursor API timeline:** No public commitment from Cursor on when (or whether) Cloud Agent APIs will be exposed to extensions.
- **Cost model:** Cloud Agents consume compute resources. Drive would need cost awareness in the operator spawn flow (e.g., user confirmation before cloud dispatch).
- **Screenshot tool standardization:** Will Cursor adopt the MCP computer-use tool spec, or define a proprietary API?
