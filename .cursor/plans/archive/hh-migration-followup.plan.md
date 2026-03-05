---
name: hh Migration Follow-up
overview: Add migrated ADRs (privacy, plan placement), traceability/validation docs, remove Discord/hh references, and optionally add OpenClaw/self-driving docs. Uses subagents per step.
planType: task
planId: hh-migration-followup
parentPlanId: cursor-drive
childPlanIds: []
todos:
  - id: step1-adrs
    content: "Add ADR-0005 (Privacy Strict Default) and ADR-0006 (Plan File Placement). Update adr/README.md and docs/architecture/README.md."
    status: completed
  - id: step2-traceability
    content: "Add docs/plans/traceability-matrix.md and docs/plans/adr-validation-map.md. Map PRDs → plan TODOs → tests."
    status: completed
  - id: step3-discord-cleanup
    content: "Remove Discord/hh references. Update hh-policy-pack (hh.policy→approvalGates, pytest→npm test). Add docs/architecture/standalone-note.md."
    status: completed
  - id: step4-optional-docs
    content: "Add OpenClaw integration analysis (docs/research/) and self-driving takeaways to planning rules."
    status: completed
isProject: false
---

# hh Migration Follow-up Plan

Add ideas left behind during cursor-drive migration from hh repo. Remove Discord-oriented content. Each step is executed by a dedicated subagent.

## Step 1: Add ADR-0005 and ADR-0006 (Subagent: adr-writer)

**Todos for subagent:**
1. Create `docs/architecture/adr/ADR-0005-privacy-strict-default.md` — adapt from hh ADR-0004; context = Cursor Drive extension, not hh/Discord
2. Create `docs/architecture/adr/ADR-0006-plan-file-placement-and-governance.md` — adapt from hh ADR-0006; update Related docs to cursor-drive paths
3. Update `docs/architecture/adr/README.md` — add 0005 and 0006 to index table
4. Update `docs/architecture/README.md` — add 0005 and 0006 to ADR table

## Step 2: Add Traceability and ADR Validation (Subagent: traceability-builder)

**Todos for subagent:**
1. Create `docs/plans/` directory if missing
2. Create `docs/plans/traceability-matrix.md` — map 5 PRDs to plan TODOs and acceptance scenarios; lightweight format
3. Create `docs/plans/adr-validation-map.md` — map ADR-0001 through 0006 to required tests/checks
4. Add `docs/plans/README.md` — index for traceability and validation docs
5. Update `docs/README.md` and `docs/AGENTS.md` — add plans/ routing

## Step 3: Discord/hh Cleanup (Subagent: discord-cleanup)

**Todos for subagent:**
1. Update `.cursor/rules/hh-policy-pack.mdc` — replace `hh.policy` with `approvalGates`; replace `pytest` with `npm test`; consider renaming to `drive-policy-pack.mdc` (or keep name, update content only)
2. Add `docs/architecture/standalone-note.md` — short note: Cursor Drive is standalone; no hh backend, no Discord, no shared core
3. Grep for remaining `discord`, `Discord`, `hh-core`, `hh\.`, `mode_router\.py`, `src/hh` — remove or rewrite
4. Update `docs-overhaul.plan.md` completion criteria if it references "Discord/hh-core" as a check — ensure it's satisfied
5. Update `cursor-drive-handoff.md` — remove "Track 1 (cleanup)" from "What needs to happen next" if cleanup is done

## Step 4: Optional Docs (Subagent: optional-docs)

**Todos for subagent:**
1. Copy `openclaw-integration-analysis.md` from hh docs to `docs/research/openclaw-integration-analysis.md` — adapt Cursor Drive section; remove hh-specific Options A/B
2. Add reconciliation and blocker-protocol ideas to `.cursor/rules/subagent-planning-discipline.mdc` or new `docs/planning-system/self-driving-takeaways.md`
3. Update `docs/research/README.md` if it exists, or add to `docs/AGENTS.md` research routing

## References

- hh docs: `C:\Users\harri\Documents\Coding Projects\business\roller_ai\hh\docs`
- Previous comparison: ADR-0004 (privacy), ADR-0006 (plan placement), traceability matrix, adr-validation-map
