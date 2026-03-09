# PRDs — Product Requirements

Five PRDs define the full feature set of Cursor Drive. Each PRD has a stable number (PRD 1–5) referenced throughout the codebase and ADRs. "Multi-agent" in PRD titles refers to multi-operator (Drive workers) plus Cursor agents; see [ADR-0016](../architecture/adr/ADR-0016-drive-terminology-and-hierarchy.md) for terminology.

## PRD index

| # | File | Focus | P0 completion |
|---|------|-------|---------------|
| PRD 1 | [prd-voice-io.md](prd-voice-io.md) | Voice input/output pipeline — filler cleaner, glossary, sanitizer, optimizer, TTS | ~62% |
| PRD 2 | [prd-session-persona.md](prd-session-persona.md) | Named agent identity, concise-first responses, session memory | ~86% |
| PRD 3 | [prd-multi-agent.md](prd-multi-agent.md) | Parallel agent spawning, comms agent, group chat UX | ~60% |
| PRD 4 | [prd-safety-config.md](prd-safety-config.md) | Approval gates, tool allowlist, privacy defaults, config schema | ~86% |
| PRD 5 | [prd-cursor-integration.md](prd-cursor-integration.md) | Status bar, Agent Screen (S-AS), Cursor mode wrapping, operator switcher | ~71% |

P0 = must-have for MVP. Completion percentages reflect implemented P0 acceptance criteria. See `.cursor/plans/mvp-gaps.plan.md` for remaining gaps.

## Reading order for new contributors

1. `prd-cursor-integration.md` — overall UX vision and how Drive integrates into Cursor
2. `prd-voice-io.md` — input pipeline (filler → optimizer → router)
3. `prd-multi-agent.md` — agent system and tangent spawning
4. `prd-safety-config.md` — full config schema and safety model
5. `prd-session-persona.md` — agent persona and memory contract

## How to propose PRD changes

PRDs are intentionally numbered and stable. When a feature area changes:
1. Edit the relevant PRD file in place.
2. Update the P0 completion percentage in this README if the implementation status changed.
3. Add new acceptance criteria to the appropriate phase section (P0/P1/P2).
4. For new feature areas that don't fit any existing PRD, create `prd-<slug>.md` with the next available number, add it to this index, and reference it from relevant ADRs.

## Cross-references

| PRD | Related ADRs | Related design docs |
|-----|-------------|---------------------|
| PRD 1 (Voice I/O) | ADR-0012 | `design/ai/prompt-optimizer-design.md` |
| PRD 2 (Session + Persona) | ADR-0015 | `design/ux/drive-mode-user-journey.md` |
| PRD 3 (Multi-Agent) | ADR-0004, ADR-0003 | `design/architecture/cursor-native-system-design.md` |
| PRD 4 (Safety + Config) | ADR-0005 | `../reference/config-schema.md` |
| PRD 5 (Cursor Integration) | ADR-0002, ADR-0008, ADR-0012 | `design/architecture/cursor-native-system-design.md` |
