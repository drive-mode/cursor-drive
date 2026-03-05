# Prompt Pipeline Design

Drive's prompt pipeline transforms and routes every prompt when Drive is active. This document defines the stages, contracts, and boundary between the Python hook and the TypeScript extension.

## Overview

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

## Pipeline Stages

### 1. Drive-active gate (extension)

| Property | Value |
|----------|-------|
| **Module** | `driveMode` / pipeline entry |
| **Input** | `prompt: string`, `driveActive: boolean` |
| **Output** | Pass-through or full pipeline |
| **Skip when** | `driveActive === false` — return `{ prompt, route: direct, model: execution }` unchanged |

### 2. Wake-word detect

| Property | Value |
|----------|-------|
| **Module** | `glossaryExpander` (builtin: `"hey drive"` → `""`) |
| **Input** | Raw prompt string |
| **Output** | Prompt with activation phrase stripped |
| **Skip when** | No "hey drive" prefix — pass through |

### 3. Filler-clean

| Property | Value |
|----------|-------|
| **Module** | `fillerCleaner.cleanFillerWords()` |
| **Input** | Prompt string |
| **Output** | `{ cleaned, original, wasModified }` — use `cleaned` |
| **Skip when** | `wasModified === false` — no change |

### 4. Glossary-expand

| Property | Value |
|----------|-------|
| **Module** | `glossaryExpander.expandGlossary()` |
| **Input** | Prompt string, optional glossary entries |
| **Output** | `{ expanded, original, wasExpanded, matchedTriggers }` — use `expanded` |
| **Skip when** | `wasExpanded === false` — no matches |

### 5. Sanitize

| Property | Value |
|----------|-------|
| **Module** | `sanitizer.sanitizePrompt()` |
| **Input** | Prompt string, optional maxLength |
| **Output** | `{ sanitized, original, wasTruncated, injectionPatternsFound }` — use `sanitized` |
| **Skip when** | Never — always run (truncation and injection stripping are safety-critical) |

### 6. Approval-gate

| Property | Value |
|----------|-------|
| **Module** | `approvalGates.checkPrompt()` or `scanPrompt()` |
| **Input** | Sanitized prompt string |
| **Output** | `allow` → continue; `block` → return gate error; `warn` → show dialog, then allow/block |
| **Skip when** | Config `cursorDrive.approvalGates.enabled === false` |

### 7. Session-context-inject

| Property | Value |
|----------|-------|
| **Module** | `sessionMemory.buildContextString()` |
| **Input** | N/A (reads from SessionMemory state) |
| **Output** | Context string to prepend to prompt when non-empty |
| **Skip when** | `buildContextString()` returns `""` |

### 8. Route

| Property | Value |
|----------|-------|
| **Module** | `router.route()` |
| **Input** | `{ prompt, command?, driveSubMode? }` |
| **Output** | `RouteDecision { mode, reason }` |
| **Skip when** | Never — always run |

### 9. Model-select

| Property | Value |
|----------|-------|
| **Module** | `modelSelector.tierForMode()`, `selectModelForTier()` |
| **Input** | `RouteDecision.mode` |
| **Output** | `ModelTier` (and optionally selected model for display) |
| **Skip when** | Never — always run |

## Extension / Hook Boundary

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Cursor Host                                                             │
│                                                                         │
│  User types prompt ──► beforeSubmitPrompt hooks (Python)                 │
│                              │                                          │
│                              ▼                                          │
│                    ┌─────────────────────┐                               │
│                    │ drive-preprocessor  │  Context-only: cleaned        │
│                    │ (Python)           │  preview, mode hints,         │
│                    └─────────┬───────────┘  tangent hints                │
│                              │                                          │
│              ┌───────────────┼───────────────┐                            │
│              │               │               │                            │
│              ▼               ▼               ▼                            │
│     [Future: HTTP /pipeline]  │      [MCP tool: drive_run_pipeline]       │
│     Hook calls extension     │      Agent calls when processing         │
│     for full transforms      │      prompt                               │
│                              │                                            │
└──────────────────────────────┼──────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Extension Host (VS Code)                                               │
│                                                                         │
│  runPipeline(prompt, context)                                          │
│       │                                                                  │
│       ├── Drive-active gate (driveMgr.active)                           │
│       ├── fillerCleaner, glossaryExpander, sanitizer                    │
│       ├── approvalGates (block/warn dialogs)                            │
│       ├── sessionMemory.buildContextString()                            │
│       ├── router.route()                                                │
│       └── modelSelector.tierForMode()                                   │
│                                                                         │
│  Output: { prompt, route, model } or { blocked, gateResult }             │
└─────────────────────────────────────────────────────────────────────────┘
```

### Current State

- **Hook**: Adds context only (no prompt modification). Passes through.
- **Extension**: `runPipeline()` implements full pipeline. Invoked by MCP tool or future HTTP endpoint.
- **Handoff**: Not yet wired. Hook and extension run independently. Hook provides hints; extension pipeline is ready for when Cursor or a bridge invokes it.

## References

- [ADR-0009: Hook-Based Prompt Interception](../../architecture/adr/ADR-0009-hook-based-prompt-interception.md)
- [docs/reference/hooks.md](../../reference/hooks.md)
- `src/pipeline.ts` — `runPipeline` implementation
