---
name: Hook-Based Prompt Pipeline
overview: "Design and implement the beforeSubmitPrompt pipeline: document Cursor hook capabilities, define the extension/hook boundary, implement pipeline orchestration in the extension, and add integration tests."
planType: task
planId: hook-prompt-pipeline
parentPlanId: cursor-drive
childPlanIds: []
dependsOn: [architecture-vision-foundation]
todos:
  - id: hpp-01-hook-contract
    content: "Research and document the Cursor beforeSubmitPrompt hook contract. Read .cursor/hooks/drive-preprocessor.py to understand current behavior. Determine: can hooks modify the prompt text, or can they only add context? Document findings in docs/reference/hooks.md. Acceptance: docs/reference/hooks.md exists; hook capabilities (read/modify/context-only) clearly stated; edge cases (Drive inactive, hook failure) documented."
    status: completed
  - id: hpp-02-pipeline-design
    content: "Write docs/design/architecture/prompt-pipeline-design.md documenting the Drive pipeline flow. Stages: wake-word-detect → filler-clean → glossary-expand → sanitize → approval-gate → session-context-inject → route → model-select. For each stage: module, input/output contract, when to skip. Include extension/hook boundary diagram. Acceptance: doc exists, all 8 stages documented, boundary diagram present, skip conditions defined."
    status: completed
  - id: hpp-03-extension-orchestration
    content: "Implement pipeline orchestration in src/extension.ts (or extract to src/pipeline.ts if >60 lines). Wire the stages: when Drive is active and a prompt arrives via beforeSubmitPrompt, run: cleanFillerWords → expandGlossary → sanitizePrompt → checkPrompt → sessionMemory.buildContextString injection → route. Export a runPipeline(input: string, context: DriveContext): Promise<PipelineResult> function. Acceptance: runPipeline exists and is called when Drive is active; each stage runs in correct order; pipeline is skipped when Drive is inactive; npm run compile succeeds."
    status: completed
  - id: hpp-04-drive-active-gate
    content: "Add Drive-active check as the first gate in the pipeline. When driveMgr.getState().active is false, the pipeline returns the original prompt unchanged. When active, run the full pipeline. Acceptance: unit test confirms pipeline is skipped when Drive is off; test confirms pipeline runs when Drive is on; no side effects when inactive."
    status: completed
  - id: hpp-05-hook-extension-boundary
    content: "Clarify and document the boundary between drive-preprocessor.py hook and the TypeScript extension pipeline. If the hook can invoke an extension API (e.g. via MCP tool call), wire that handoff. If hooks are context-only, document that the Python hook adds context while the TypeScript pipeline runs the actual prompt transforms. Update docs/reference/hooks.md with the final boundary decision. Acceptance: boundary is implemented or documented; no ambiguity about what runs in Python vs TypeScript."
    status: completed
  - id: hpp-06-pipeline-tests
    content: "Add tests/pipeline.test.ts (or extend tests/extension.test.ts) covering: (1) pipeline skipped when Drive inactive; (2) each stage called in order when active; (3) filler words removed; (4) blocked prompt returns gate result; (5) session context injected. Mock driveMode, fillerCleaner, sanitizer, approvalGates, sessionMemory. Acceptance: all 5 test cases pass; npm test passes; npm run compile passes."
    status: completed
isProject: false
---

# Hook-Based Prompt Pipeline

## Purpose

Drive's core integration is transparent prompt interception via `beforeSubmitPrompt`. This plan designs and implements the pipeline so all 9 currently-orphaned modules (fillerCleaner, glossaryExpander, sanitizer, approvalGates, router, modelSelector, sessionMemory, toolAllowlist, pluginInstaller) have a clear home in the flow.

## Current state

- `drive-preprocessor.py` exists as a `beforeSubmitPrompt` hook but its capabilities are unclear
- 9 TypeScript pipeline modules are implemented but **not wired** into any flow
- No `runPipeline()` function exists in the extension
- `extension.ts` handles Drive toggle/UI but does not intercept or transform prompts

## Pipeline stages

```
Input prompt
  │
  ├── [skip if Drive inactive] ──────────────────────────────────► original prompt
  │
  ▼
wake-word-detect (glossaryExpander — strips "hey drive" prefix)
  ▼
filler-clean (fillerCleaner — removes "uhh", "like", repetitions)
  ▼
glossary-expand (glossaryExpander — expands domain phrases)
  ▼
sanitize (sanitizer — truncate, strip injection patterns)
  ▼
approval-gate (approvalGates — block/warn on destructive patterns)
  │  [blocked] ──────────────────────────────────────────────────► gate error
  ▼
session-context-inject (sessionMemory.buildContextString())
  ▼
route (router — classify intent → RouteDecision)
  ▼
model-select (modelSelector — pick tier model)
  ▼
Output: { prompt: string, route: RouteDecision, model: ModelTier }
```

## Open questions

1. **Hook modify capability**: Can `beforeSubmitPrompt` hooks in Cursor modify the prompt text, or are they context-injection only? This is the most critical unknown — determines whether the TypeScript pipeline runs in the hook or in the extension. TODO hpp-01 resolves this.

2. **MCP bridge for hook→extension**: If hooks are context-only, can the hook call an MCP tool to trigger the TypeScript pipeline and get back the modified prompt? TODO hpp-05 resolves this.

## Execution strategy

**Executor role:** Implementer (hpp-01 research + hpp-02 design) then Implementer (hpp-03, hpp-04, hpp-05 code changes).

**Subagent fan-out:**
- Batch A: hpp-01 (research) — must complete first; it unblocks hpp-02 and hpp-05
- Batch B (parallel): hpp-02 (design doc) after hpp-01
- Batch C (parallel): hpp-03 + hpp-04 (implementation) after hpp-02
- Batch D: hpp-05 (boundary) can run with hpp-03/04 once hpp-01 is done
- Batch E: hpp-06 (tests) after hpp-03, hpp-04, hpp-05

**Phase gate before pipeline-wiring-mvp:** `runPipeline()` function must exist and pass hpp-06 tests.

**Delegation trigger:** Spawn a subagent if hpp-03 implementation spans both `extension.ts` and a new `pipeline.ts` module.

**Verification:** After all TODOs, run `npm run compile` and `npm test`. Confirm `docs/reference/hooks.md` exists with hook contract.

## Reconciliation

**Completed:** 2026-02-24

### Deliverables

| TODO | Outcome |
|------|---------|
| hpp-01 | `docs/reference/hooks.md` — hook contract, capabilities (modify/context/block), edge cases (Drive inactive, hook failure) |
| hpp-02 | `docs/design/architecture/prompt-pipeline-design.md` — 9 stages (incl. Drive-active gate), input/output contracts, skip conditions, extension/hook boundary diagram |
| hpp-03 | `src/pipeline.ts` — `runPipeline(input, ctx)`; MCP tool `drive_run_pipeline`; HTTP `POST /pipeline`; `SessionMemory` wired in extension |
| hpp-04 | Drive-active gate as first check in `runPipeline`; returns original prompt when `ctx.driveActive === false` |
| hpp-05 | Boundary documented in `hooks.md`: Python hook adds context; TypeScript pipeline runs transforms; future HTTP bridge for hook→extension |
| hpp-06 | `tests/pipeline.test.ts` — 5 cases: skip when inactive, run when active, filler removed, blocked returns gate result, session context injected |

### Changes

- **approvalGates**: Exported `getGateResult()` for pipeline to check block without UI; pipeline uses it before `checkPrompt` for warn.
- **package.json**: Added `moduleNameMapper` for `.js`→`.ts` so Jest resolves pipeline imports.
