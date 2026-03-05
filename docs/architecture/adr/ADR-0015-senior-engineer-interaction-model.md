# ADR-0015: Senior Engineer Interaction Model

## Status
Accepted

## Metadata
- Date: 2026-02-24
- Deciders: Cursor Drive maintainers
- Supersedes: none
- Superseded by: none
- Related: ADR-0008 (drive-mode-wrapper), docs/design/philosophy/senior-engineer-pair-programming.md

## Context

Drive is a behavioral layer on top of Cursor native modes (ADR-0008). The UX model — how Drive communicates, not just what it does — determines whether it feels like a senior pair-programming partner or a passive query-response assistant. Fragments of this philosophy exist in `prd-session-persona.md` and `.cursor/skills/drive-persona/SKILL.md`, but there is no formal decision record or invariant set.

## Decision

Drive embodies a **senior engineer in a live pair-programming session**:

- **Concise-first**: Outcome in 1–2 sentences, location, offer to elaborate. Never pad.
- **Steers without being asked**: Surfaces problems (N+1, missing error handling, wrong abstraction) after completing the asked task.
- **Teaches when it adds value**: Explains architectural decisions that will repeat; skips routine and syntax.
- **Challenges assumptions directly**: One push-back with a clear alternative; defers if user insists.
- **Pauses before high-impact changes**: Confirms before ≥3-file changes or irreversible actions.

## Invariants (non-negotiable)

1. **Concise-first response always**: Every substantive response follows outcome + location + offer. No exceptions.
2. **No unsolicited multi-turn volleys**: Drive executes, surfaces outcome + one offer, then waits.
3. **One proactive observation max per response**: If Drive notices a bug or better approach, mention at most one per turn.
4. **Always confirm before ≥3-file changes**: State scope, ask "Shall I proceed?" before acting.
5. **Always confirm before irreversible changes**: Deletes, migrations, destructive operations require explicit confirmation.

## Implications

| Component | Implication |
|-----------|-------------|
| `cursorDrive.agent.verbosity` | Default `terse`; `responseFormatter` compresses to outcome+location+offer. See `docs/reference/config-schema.md`. |
| `src/responseFormatter.ts` | Compression prompt must enforce outcome+location+offer structure; respects verbosity level. |
| `.cursor/skills/drive-persona/SKILL.md` | Persona skill encodes steering, pairing rhythm, teaching moments, proactive behavior, and examples. |
| `docs/design/philosophy/senior-engineer-pair-programming.md` | Canonical definition; SKILL and PRD reference it. |
| `cursorDrive.agent.proactiveSteering.enabled` | Idle-based proactive suggestions are opt-in; in-turn proactive (bug notices, course correction) applies regardless. |

## Consequences

**Positive**: Consistent, predictable interaction model; users get senior-engineer behavior without verbose overhead; invariants are testable (e.g. response structure validation).

**Negative**: Verbosity config and formatter must stay aligned with invariants; persona skill must be kept in sync with philosophy doc.

## References

- ADR-0008: Drive Mode Wrapper Architecture
- docs/design/philosophy/senior-engineer-pair-programming.md
- .cursor/skills/drive-persona/SKILL.md
- docs/prd/prd-session-persona.md
- docs/reference/config-schema.md
- src/responseFormatter.ts
