---
name: Drive mode next sprint
overview: Reframe Drive as a meta-layer wrapping Cursor's native modes (Drive-Ask, Drive-Agent, Drive-Plan, Drive-Debug), add voice/semantic mode switching with strict privacy controls, complete the P0 pipeline gaps, add glossary, sanitization, and approval gates.
todos:
  - id: drive-meta-layer
    content: "Rename SubMode to CursorMode (ask/agent/plan/debug), add debug mode, update driveMode.ts + router.ts + statusBar.ts to use Drive-[Mode] framing. Status bar: 'Drive › Agent' not 'Drive: AGENT'."
    status: pending
  - id: mode-switching
    content: "Add modeSwitcher.ts: voice command detection ('switch to agent', 'go plan mode') + semantic suggestion from router. Settings: modeSwitching.voiceEnabled, semanticEnabled, requireConfirmation, allowedModes."
    status: pending
  - id: optimizer-quickpick
    content: Replace stub approval in promptOptimizer.ts with real vscode.window.showQuickPick flow (Use optimized / Use original / Edit optimized)
    status: pending
  - id: glossary-expander
    content: Add glossaryExpander.ts with user-configurable shortcut phrases (including mode-switch phrases like 'go agent', 'switch to plan'); wire into pipeline after filler cleaning; add cursorDrive.glossary setting
    status: pending
  - id: sanitization
    content: "Add f0-3 context sanitization: 4000-char truncation + injection sequence stripping; cursorDrive.maxPromptLength config"
    status: pending
  - id: approval-gates
    content: "Add approvalGates.ts: scan prompt + response for dangerous ops; showWarningMessage gate; cursorDrive.approvalGates settings"
    status: pending
  - id: tests-and-docs
    content: Write tests for modeSwitcher, glossaryExpander, approvalGates; update README with Drive-[Mode] architecture + Voice + Drive section
    status: pending
isProject: false
---

# Drive Mode: Next Sprint

## Core architectural framing

Drive is a **meta-layer** that sits in front of Cursor's native modes — not a replacement for them. The result is a set of compound modes:

```
Drive-Ask    → Drive layer + Ask behavior    (read-only, explanations)
Drive-Agent  → Drive layer + Agent behavior  (full autonomy, code changes)
Drive-Plan   → Drive layer + Plan behavior   (clarify, plan artifact)
Drive-Debug  → Drive layer + Debug behavior  (trace, diagnose)
```

The Drive layer adds to every mode:

- Voice input processing (filler cleaning, glossary, sanitization)
- Semantic intent detection (can suggest a mode switch)
- Approval gates (safety guards before dangerous ops)
- Mode switching controls (voice or semantic, governed by settings)

The user — or the driver AI — can switch between `Drive-Ask`, `Drive-Agent`, etc. **by voice** ("switch to agent", "let's plan this") or **semantically** (router detects a planning request while in `Drive-Agent`) — all controlled by strict settings.

---

## Batch 1: Drive-[Mode] architecture alignment

### 1a. Rename SubMode → CursorMode (`driveMode.ts`)

```typescript
// Current
export type SubMode = "plan" | "agent" | "ask" | "direct";

// New — aligned with Cursor's native mode names
export type CursorMode = "ask" | "agent" | "plan" | "debug";
```

Add `debug` as a supported mode. Update `DriveModeManager` to use `CursorMode`.

### 1b. Router output aligned to CursorMode (`router.ts`)

`RouteDecision` gains a `suggestedMode` field — the router can now recommend a mode switch when it detects a mismatch between the current mode and the request type:

```typescript
export interface RouteDecision {
  mode: RouteMode;               // existing: how to handle this request
  suggestedMode?: CursorMode;    // new: if Drive should switch modes
  reason: string;
}
```

### 1c. Status bar: `Drive › Agent` framing (`statusBar.ts`)

Change from `Drive: AGENT` to `Drive › Agent` — the `›` visually communicates hierarchy (Drive wraps Agent), matching the mental model.

---

## Batch 2: Mode switching with strict controls

New module: `extension/src/modeSwitcher.ts`

### Voice command detection

Detects explicit mode-switch intent in the processed prompt before routing:

```
"switch to agent"    → setMode("agent")
"go to plan mode"    → setMode("plan")
"drive ask"          → setMode("ask")
"debug this"         → setMode("debug")
```

### Semantic suggestion

When `router.suggestedMode !== currentMode`, the switcher checks settings and either:

- Auto-switches (if `semanticEnabled: true` + `requireConfirmation: false`)
- Shows QuickPick confirmation: `"Drive detected a planning request — switch to Drive-Plan?"` (if `requireConfirmation: true`)
- Does nothing, routes in current mode (if `semanticEnabled: false`)

### Settings (strict controls — privacy + agent control)

```json
"cursorDrive.modeSwitching.voiceEnabled": true,
"cursorDrive.modeSwitching.semanticEnabled": false,
"cursorDrive.modeSwitching.requireConfirmation": true,
"cursorDrive.modeSwitching.allowedModes": ["ask", "agent", "plan", "debug"]
```

`semanticEnabled` defaults to **false** — AI-driven mode changes are opt-in. `requireConfirmation` defaults to **true** — even voice switches ask before acting. Users who want fully automatic behavior can flip both, but the privacy-safe default never changes modes without explicit user action.

---

## Batch 3: Complete P0 pipeline gaps

### Prompt optimizer — real QuickPick approval (`promptOptimizer.ts`)

Replace the "proceeding in 3 seconds" stub:

```typescript
const choice = await vscode.window.showQuickPick([
  { label: "$(check) Use optimized", value: "optimized" },
  { label: "$(discard) Use original", value: "original" },
  { label: "$(edit) Edit...", value: "edit" },
], { title: "Drive: Prompt Optimizer" });
// "edit" → showInputBox pre-filled with optimized text
// cancelled → use original (safe default)
```

### Glossary expander (`glossaryExpander.ts` — new module)

User-configurable voice shortcuts. **Mode-switch phrases live here too** — the glossary is the single place where voice → intent mapping is configured.

```json
"cursorDrive.glossary": [
  { "phrase": "ship it",     "expansion": "commit and push all staged changes" },
  { "phrase": "scratch that","command": "cancel" },
  { "phrase": "take stock",  "expansion": "summarize what has changed in this session" },
  { "phrase": "go agent",    "modeSwitch": "agent" },
  { "phrase": "let's plan",  "modeSwitch": "plan" },
  { "phrase": "debug this",  "modeSwitch": "debug" }
]
```

Pipeline position: after filler cleaning, before optimizer.

### Context sanitization (`f0-3`, inline in `participant.ts`)

- Truncate to `cursorDrive.maxPromptLength` chars (default 4 000). Show notice in stream if truncated.
- Strip injection sequences: `\nSystem:`, `<|im_start|>`, `\n---\n` and similar.

---

## Batch 4: Approval gates (`f1-2`)

New module: `extension/src/approvalGates.ts`

Scans outgoing prompt **and** streamed model response for dangerous operation patterns.

```
flowchart
  prompt --> scanner
  scanner -->|clean| router
  scanner -->|flagged| gate[showWarningMessage]
  gate -->|confirmed| router
  gate -->|denied| abort
  modelResponse --> responseScanner
  responseScanner -->|dangerous command found| inlineWarning[append warning badge]
```


| Pattern                            | Level | Action                 |
| ---------------------------------- | ----- | ---------------------- |
| `revert`, `undo all`, `hard reset` | warn  | confirm before routing |
| `force push`, `push --force`       | warn  | confirm before routing |
| `delete branch`, `drop database`   | warn  | confirm before routing |
| `rm -rf`, `del /f /s`, `format c:` | block | hard block, no proceed |


Settings: `cursorDrive.approvalGates.enabled` (default `true`), `cursorDrive.approvalGates.hardBlockPatterns` (user-extensible array).

---

## Updated pipeline (end state)

```
@drive prompt
  │
  ├─ 1. /cancel guard
  ├─ 2. Activation word + inline mode detection
  ├─ 3. Filler cleaning          (fillerCleaner.ts)
  ├─ 4. Glossary expansion       (glossaryExpander.ts)  ← NEW
  │       └─ mode-switch phrases route to modeSwitcher
  ├─ 5. Sanitization             (inline)               ← NEW
  ├─ 6. Approval gate — prompt   (approvalGates.ts)     ← NEW
  ├─ 7. Prompt optimizer         (promptOptimizer.ts)   [real QuickPick]
  ├─ 8. Mode switch gate         (modeSwitcher.ts)      ← NEW
  ├─ 9. Intent routing           (router.ts)
  ├─ 10. Model selection         (modelSelector.ts)
  ├─ 11. Model call
  └─ 12. Response gate           (approvalGates.ts)     ← NEW
```

---

## File changes summary

- `[extension/src/driveMode.ts](extension/src/driveMode.ts)` — rename SubMode → CursorMode, add `debug`
- `[extension/src/router.ts](extension/src/router.ts)` — add `suggestedMode` to RouteDecision
- `[extension/src/statusBar.ts](extension/src/statusBar.ts)` — `Drive › [Mode]` labeling
- `[extension/src/modeSwitcher.ts](extension/src/modeSwitcher.ts)` — new: voice + semantic mode switching
- `[extension/src/glossaryExpander.ts](extension/src/glossaryExpander.ts)` — new: phrase → expansion/command/modeSwitch
- `[extension/src/approvalGates.ts](extension/src/approvalGates.ts)` — new: dangerous op detection
- `[extension/src/promptOptimizer.ts](extension/src/promptOptimizer.ts)` — real QuickPick approval
- `[extension/src/participant.ts](extension/src/participant.ts)` — wire full pipeline
- `[extension/package.json](extension/package.json)` — all new settings
- `[extension/tests/modeSwitcher.test.ts](extension/tests/modeSwitcher.test.ts)` — new tests
- `[extension/tests/glossaryExpander.test.ts](extension/tests/glossaryExpander.test.ts)` — new tests
- `[extension/tests/approvalGates.test.ts](extension/tests/approvalGates.test.ts)` — new tests
- `[extension/README.md](extension/README.md)` — Drive-[Mode] architecture + Voice + Drive section
