# Agent Routing: docs/

This file tells AI agents which subdirectory to search based on their intent.

## Intent → Directory map

| Intent | Directory | Notes |
|---|---|---|
| "How does the system work?" | `design/architecture/` | Start with `cursor-native-system-design.md` |
| "How does each module work?" | `design/architecture/cursor-drive-walkthrough.md` | |
| "Why was this decision made?" | `architecture/adr/` | ADRs 0001-0006; see `adr/README.md` |
| "What is the architecture?" | `architecture/` | README + ADRs |
| "What are the requirements?" | `prd/` | 5 PRDs covering all feature areas |
| "What are the requirements traceability?" | `plans/` | traceability-matrix.md maps PRDs → plan TODOs |
| "ADR validation?" | `plans/` | adr-validation-map.md maps ADRs → tests/checks |
| "How do I set up / run?" | `guides/getting-started.md` | |
| "How do I test?" | `guides/live-testing.md` | |
| "What config key controls X?" | `reference/config-schema.md` | |
| "What MCP tools exist?" | `reference/mcp-tools.md` | |
| "What commands/keybindings exist?" | `reference/commands-and-shortcuts.md` | |
| "How does the voice pipeline work?" | `prd/prd-voice-io.md` + `design/ai/prompt-optimizer-design.md` | |
| "How does model selection work?" | `design/ai/model-cost-tiers.md` | |
| "How do agents work?" | `prd/prd-multi-agent.md` + `design/architecture/cursor-native-system-design.md` | |
| "What's the safety model?" | `prd/prd-safety-config.md` | |
| "How does the persona work?" | `prd/prd-session-persona.md` | |
| "What are the UX principles?" | `design/ux/drive-mode-analysis-and-ux.md` | |
| "What's the pair-programming philosophy?" | `design/philosophy/senior-engineer-pair-programming.md` | Steering, teaching, concise-first; ADR-0015 |
| "What's the user journey?" | `design/ux/drive-mode-user-journey.md` | |
| "Naming conventions?" | `design/naming/cursor-aligned-naming.md` | |
| "Continuing in a new chat?" | `guides/handoff.md` | |
| "Research / background reading?" | `research/` | |
| "Voice integration options?" | `research/openclaw-integration-analysis.md` | |
| "Plan generation prompts?" | `prompts/` | |

## Discovery protocol

When you need to understand an unfamiliar area:
1. Read the relevant directory's `README.md` first — it summarizes all files.
2. Then read the specific file(s) it points to.
3. For cross-cutting concerns (e.g., "how does config affect TTS?"), read `reference/config-schema.md` for the config side and `prd/prd-voice-io.md` for the feature side.

## What lives outside docs/

| What | Where |
|---|---|
| Executable plans | `.cursor/plans/*.plan.md` |
| Architecture overview | `docs/architecture/README.md` |
| Extension source | `src/` |
| Plugin skills | `.cursor/skills/` |
| Plugin rules | `.cursor/rules/` |
| Plugin commands | `.cursor/commands/` |
| Hooks | `.cursor/hooks/` |
