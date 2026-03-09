# MCP Adoption Plan

## Focus
MCP Apps + connector strategy + MCP server enhancements + A2A protocol integration.

## Input
Read:
- `docs/research/drive-tech/mcp-apps/02_implementation.md`
- `docs/research/drive-tech/other-relevant-tech/02_implementation.md` (A2A section)
- `docs/architecture/adr/ADR-0017-mcp-apps-adoption-strategy.md`
- `docs/research/drive-tech/_synthesis/02_recommended-architecture-changes.md`
- `src/mcpServer.ts`, `src/agentScreen.ts`
- Existing `.cursor/plans/*.plan.md`

## Output
Create `.cursor/plans/drive_mcp_infrastructure_<hash>.plan.md` with TODOs covering:
1. MCP Apps prototype: activity feed as MCP App UI resource
2. MCP Apps evaluation: test rendering in 2+ hosts
3. A2A endpoint enhancement: SSE streaming for /tasks/:id
4. A2A Agent Card enhancement: richer capability descriptions
5. MCP Registry preparation: .well-known discovery support
6. Decision gate: ADOPT or REJECT MCP Apps based on prototype results

## Requirements
- Prototype TODOs include success criteria + exit criteria
- Decision gates explicitly defined
- Dedupe against existing plans
- No timelines
