# ADR-0011: Native Mode Compatibility

## Status
Accepted

## Metadata
- Date: 2026-02-23
- Deciders: Cursor Drive maintainers
- Supersedes: none
- Superseded by: none
- Related: ADR-0008 (mode wrapper), ADR-0009 (hook interception)

## Context

Drive historically had sub-modes: plan, agent, ask, direct, collab. Cursor has native modes: Plan, Agent, Ask, Debug. How should Drive align with Cursor's mode model?

## Decision

Drive sub-modes map **1:1** to Cursor native modes. The `direct` mode is retired.

### Mapping Table

| Drive subMode | Cursor native mode | Behavior |
|---------------|--------------------|----------|
| plan | Plan | Drive pipeline + Plan mode; plan authoring, TODO tracking |
| agent | Agent | Drive pipeline + Agent mode; code gen, multi-file edits |
| ask | Ask | Drive pipeline + Ask mode; read-only, explanatory |
| debug | Debug | Drive pipeline + Debug mode; bug focus, test prioritization |

### Direct Mode Disposition

**Retired.** "Direct" implied bypassing Drive's pipeline or using a generic execution mode. Cursor has no "direct" mode. All prompts go through Agent, Plan, Ask, or Debug. Drive's pipeline runs regardless; the sub-mode selects which Cursor mode receives the prompt.

Legacy references to `direct` or `run` should map to `agent` (Agent mode).

### Extension Points Drive Can Modify

| Extension point | Drive can modify? | How |
|-----------------|-------------------|-----|
| Prompt text before model | Yes | via `beforeSubmitPrompt` hook |
| Context injection | Yes | via hook output |
| Persona / system prompt | Yes | via skills, rules |
| Mode selection UI | No | Cursor owns mode switcher |
| Chat rendering | No | Cursor owns chat panel |
| Status bar | Yes | Drive status bar shows Drive + subMode |

### Compatibility Guarantees

1. When Drive is active and user selects Plan in Cursor, Drive's `plan` sub-mode is used; persona and rules align with planning.
2. Drive does not override Cursor's mode. It synchronizes its `subMode` state with the user's Cursor mode selection.
3. If Cursor adds a new native mode, Drive adds a corresponding sub-mode; mapping stays 1:1.

## Consequences

**Positive**: No mode proliferation; clear mental model; Cursor UI remains source of truth for mode.

**Negative**: Legacy `direct`/`run`/`collab` concepts must be migrated to the 4-mode model.

## References

- ADR-0008: Drive mode wrapper architecture
- `src/driveMode.ts` — subMode state
- `.cursor/rules/vision-invariants.mdc` — invariant 3
