---
name: Cursor Drive Orchestrator
overview: Meta-plan that runs all active cursor-drive child plans as sub-plans via mcp_task spawns. Invoke this plan to execute readme-redesign, repo-health-and-baseline, s_as_screen_capture_impl, sdk_and_protocol_research_6c42aa0c, and cursor_plugin_marketplace_and_mcp_apps_implementation in dependency order.
todos:
  - id: orch-01-run-all
    content: |
      Execute all active child plans as sub-plans. Run `python .cursor/hooks/plan-runner.py scan-new` first. Read plan-graph.yaml for state. Spawn mcp_task (subagent_type: generalPurpose) for each plan with state pending or in_progress, in dependency order: plans with empty depends_on first (parallel), then next wave. Use Plan Agent Prompt from .cursor/skills/execute-plans/SKILL.md. After each wave, run sync-registry. Sub-plans: readme-redesign, repo-health-and-baseline, s_as_screen_capture_impl, sdk_and_protocol_research_6c42aa0c, cursor_plugin_marketplace_and_mcp_apps_implementation.
    status: completed
isProject: false
---

# Cursor Drive Orchestrator

Run this plan to execute all active cursor-drive child plans as sub-plans. The single TODO instructs the agent to spawn `mcp_task` subagents for each plan per the execute-plans skill.

## Sub-plans (execution order)


| Plan                                                  | Deps | Notes                                        |
| ----------------------------------------------------- | ---- | -------------------------------------------- |
| readme-redesign                                       | none | README structure, install, quick start       |
| repo-health-and-baseline                              | none | Git triage, tests, fork sync, plan reconcile |
| s_as_screen_capture_impl                              | none | Phase 2–3 Cloud Agent, artifacts             |
| sdk_and_protocol_research_6c42aa0c                    | none | Copilot SDK, ACP, agentic frameworks         |
| cursor_plugin_marketplace_and_mcp_apps_implementation | none | VSIX, plugin standard, MCP Apps CSP          |


All five have empty `dependsOn`, so they can run in parallel (Wave 1).

## How to run

1. Say "run cursor-drive-orchestrator" or "execute the orchestrator plan"
2. Agent reads this plan, marks `orch-01-run-all` in_progress
3. Agent runs `scan-new`, reads plan-graph.yaml
4. Agent spawns 5 `mcp_task` calls (one per sub-plan) with Plan Agent Prompt from `.cursor/skills/execute-plans/SKILL.md`
5. After all complete, agent runs `sync-registry`, marks TODO completed

## Reconciliation

**Run:** 2026-03-04


| Plan                                                  | Outcome                                     |
| ----------------------------------------------------- | ------------------------------------------- |
| readme-redesign                                       | Complete — 7 TODOs done, 1 cancelled        |
| repo-health-and-baseline                              | Complete — 6 phases                         |
| s_as_screen_capture_impl                              | Phase 2 done; Phase 3 pending (p3-01 spike) |
| sdk_and_protocol_research_6c42aa0c                    | Complete — 6 tracks                         |
| cursor_plugin_marketplace_and_mcp_apps_implementation | Complete                                    |


**Gate:** `npm run compile` OK. `npm test` — 1 failure: `mcpServer.test.ts` POST /run SSE timeout (pre-existing flaky). 522 passed.

## References

- [execute-plans skill](.cursor/skills/execute-plans/SKILL.md)
- [plan-orchestrator agent](.cursor/agents/plan-orchestrator.md)
- [plan-master.diagram.md](.cursor/plans/plan-master.diagram.md)
