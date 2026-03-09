# Cursor Drive: Code Walkthrough

Module-by-module overview of the extension pipeline.

---

## Overview: The pipeline in one picture

When Drive is active, the `beforeSubmitPrompt` hook routes prompts through this pipeline:

```
"drive agent uhh refactor auth maybe add tests idk"
                │
        ┌───────▼────────┐
        │ /cancel guard  │  → exits drive, returns early
        └───────┬────────┘
                │
        ┌───────▼──────────────┐
        │ Activation word      │  "drive" → driveMgr.setActive(true)
        │ + sub-mode parse     │  "agent" → driveMgr.setSubMode("agent")
        └───────┬──────────────┘
                │ "refactor auth maybe add tests idk"
        ┌───────▼──────────────┐
        │ Filler cleaner       │  FREE, client-side
        │ (fillerCleaner.ts)   │  → "Refactor auth, add tests"
        └───────┬──────────────┘
                │
        ┌───────▼──────────────────────────────────────────┐
        │ Prompt optimizer (promptOptimizer.ts)            │
        │   1. looksLikeDictation() → yes                  │
        │   2. selectCheapModel()   → gpt-4o-mini          │
        │   3. AI rewrite           → "Refactor auth       │
        │      module: extract AuthService, add unit tests │
        │      for login/logout flows"                     │
        │   4. show diff → user approves                   │
        └───────┬──────────────────────────────────────────┘
                │ optimized prompt
        ┌───────▼──────────────────────┐
        │ Intent router (router.ts)    │
        │   driveSubMode="agent"       │
        │   → RouteMode="run"          │
        └───────┬──────────────────────┘
                │
        ┌───────▼──────────────────────┐
        │ Model selector               │
        │ (modelSelector.ts)           │
        │   tierForMode("run")         │
        │   → "execution"              │
        │   → request.model (user's)   │
        └───────┬──────────────────────┘
                │
        ┌───────▼──────────────────────┐
        │ Main model call              │
        │ system: Drive persona +      │
        │   execution engineer prompt  │
        │ user:  optimized prompt      │
        └───────┬──────────────────────┘
                │
        stream.markdown(response)
```

---

## Module 1: `driveMode.ts` — State manager

**What it does:** Holds the single source of truth for drive state. Two fields: `active` (boolean) and `subMode` (`plan | agent | ask | direct`). Persisted to VS Code's `workspaceState` so state survives window reloads.

**Key design decisions:**

*EventEmitter pattern* — Rather than polling state, consumers subscribe to `onDidChange`. The status bar and any future observer react immediately when state changes without coupling to the manager's internals.

```typescript
// Caller subscribes once; fires on every setActive/setSubMode/toggle call.
const sub = driveMgr.onDidChange((state) => {
  updateStatusBar(state);
});
```

*Early-return no-ops* — `setActive` and `setSubMode` do nothing if the value isn't changing. This prevents spurious events and redundant `workspaceState` writes.

*`toggle()` applies config* — When turning ON, `toggle()` reads `cursorDrive.defaultSubMode` from workspace settings and applies it. This respects the user's preference without the participant needing to know about it.

*`void` on Thenable* — `workspaceState.update()` returns a `Thenable`. We prefix with `void` to make the fire-and-forget intent explicit to TypeScript's strict mode without an unnecessary `await` in a synchronous function.

---

## Module 2: `statusBar.ts` — Live UI

**What it does:** Creates a single `StatusBarItem` that reflects drive state in real time.

```
$(play-circle) Drive: AGENT   ← active, agent sub-mode (warning background color)
$(circle-slash) Drive          ← inactive (default color)
```

**Key design decisions:**

*Render-from-state* — The `render()` function reads from `mgr.active` and `mgr.subMode` directly. The `onDidChange` subscription calls `render()` after every state change. There's no local copy of state in `statusBar.ts` — the manager is the single source of truth.

*Disposable composition* — `createDriveStatusBar` returns a `Disposable` that disposes both the event subscription and the `StatusBarItem`. Callers push it to `context.subscriptions` and never need to track it manually.

*Click → `cursorDrive.setSubMode`* — The status bar click doesn't implement the QuickPick itself; it fires the registered command in `extension.ts`. This keeps `statusBar.ts` decoupled from command logic.

---

## Module 3: `router.ts` — Intent detection

**What it does:** Maps a prompt + optional slash command + optional drive sub-mode to a `RouteMode` (`plan | run | direct | collab`). Pure function — no state, no side effects, no API calls.

**Priority order:**

```
1. Explicit slash command (/plan, /run)      — highest priority
2. Drive sub-mode hint (plan, agent, ask)    — higher than keywords
3. Keyword matching (PLAN_KEYWORDS, RUN_KEYWORDS)
4. Default: "direct"                         — lowest priority
```

**Key design decisions:**

*Sub-mode mapping* — Drive sub-modes don't map 1:1 to route modes because the user thinks in different terms than the router. `"agent"` → `"run"` (agent = execution), `"ask"` → `"direct"` (ask = read-only, no system routing needed).

*Stateless by design* — The router receives everything it needs in one call. No history, no session context. This keeps routing cheap, testable, and deterministic.

*Fall-through for unknown sub-modes* — The `switch` statement has no `default` branch for `driveSubMode`. An unrecognised value (future-proofing) falls through to keyword routing rather than crashing.

---

## Module 4: `fillerCleaner.ts` — Voice cleanup

**What it does:** Strips filler words and collapsed repetitions from transcribed speech. Runs entirely client-side — no network call, zero cost.

**Key design decisions:**

*Word-boundary regex* — Each filler uses `\b` anchors so "like" doesn't strip "likewise" or "unlike". Common failure mode in naive filler cleaners.

*Repetition collapse* — `\b(\w+(?:\s+\w+){0,2})\s+\1\b` catches "can you can you" → "can you" for sequences of 1-3 words. Longer repetitions are left alone (they might be intentional emphasis).

*Sentence casing preservation* — If the original prompt started with a capital, the result does too. Prevents jarring output like `"refactor the auth module"` when the user typed `"Refactor the auth module like maybe add tests"`.

*`wasModified` flag* — The return value includes a boolean indicating whether meaningful changes were made. `promptOptimizer.ts` uses this to decide whether to skip the expensive LM optimization pass.

*`looksLikeDictation()` heuristic* — Separate from cleaning: returns `true` when filler density exceeds 10% of words OR trailing uncertainty markers are present. The optimizer uses this to force-run even when `wasModified` is false (the text might be grammatically intact but semantically murky).

---

## Module 5: `promptOptimizer.ts` — Prompt optimization

**What it does:** Runs an AI rewrite of the cleaned prompt using the cheapest available model, then shows the user the original vs. optimized version and waits for approval before proceeding.

Note: `promptOptimizer.ts` is not yet implemented. Tracked in [`.cursor/plans/archive/mvp-gaps.plan.md`](../../../.cursor/plans/archive/mvp-gaps.plan.md).

**The full flow:**

```typescript
// 1. Read config
const { enabled, autoApprove } = readConfig();

// 2. Client-side cleaning (free)
const { cleaned, wasModified } = cleanFillerWords(rawPrompt);

// 3. Decide if LM is worth calling
const shouldCallLM = wasModified || looksLikeDictation(rawPrompt) || cleaned.length > 120;

// 4. Call cheap model if needed
if (shouldCallLM) {
  const cheapModel = await selectCheapModel(token);
  // → sends OPTIMIZER_SYSTEM_PROMPT + cleaned text
  // → receives single clean rewrite
}

// 5a. Auto-approve: note it in stream, proceed silently
// 5b. Manual approve: stream original vs. optimized, wait
```

**Key design decisions:**

*LM call is conditional* — Short, clean prompts skip the LM. Only messy or long prompts pay the `gpt-4o-mini` cost.

*Failure is non-fatal* — On cheap model failure (rate limit, network), optimizer returns filler-cleaned text. Request still proceeds.

*`autoApprove` config* — Skips approval step. Workspace setting (repo-specific).

*System prompt is specific* — `OPTIMIZER_SYSTEM_PROMPT` says "preserve ALL intent" and "if already clear, return unchanged." Prevents LMs from adding assumptions.

*Future: approval modal* — Current: diff in chat stream. Future: `vscode.window.showQuickPick` for Approve / Edit / Skip modal.

---

## Module 6: `modelSelector.ts` — Cost tiers

**What it does:** Wraps `vscode.lm.selectChatModels()` with a preference-ordered tier system. Returns the cheapest available model for routing/optimization, a capable model for planning, and defers to the user's selection for execution.

**The three tiers:**

| Tier | Used for | Preference list |
|---|---|---|
| `routing` | Prompt optimization, intent detection | gpt-4o-mini, claude-haiku, gemini-flash, gpt-3.5-turbo |
| `planning` | Clarification loops, plan artifacts | gpt-4o, claude-sonnet, gemini-pro, gpt-4-turbo |
| `execution` | Code generation, multi-file edits | user's chosen model via `request.model` |

**Key design decisions:**

*`vscode.lm.selectChatModels({})` with no filter* — We get all available models and filter by our preference list. This is more portable than filtering by family up-front, since model availability varies between Cursor versions and user configurations.

*Match by `family` OR `id`* — The VS Code LM API uses both fields inconsistently across model providers. Checking both prevents misses.

*Graceful fallback* — If no preference matches, we return `models[0]` (first available). If `selectChatModels` throws, we return `undefined`. Callers then fall back to `request.model` (user's selection). The system always has a path forward.

*`tierForMode()` is the bridge* — This function connects `router.ts`'s output (`RouteMode`) to `modelSelector.ts`'s input (`ModelTier`). It lives in `modelSelector.ts` because tier selection is a cost concern, not a routing concern.

*`describeModel()` for transparency* — Returns a human-readable string shown in the progress indicator: `"gpt-4o-mini [cheap routing]"`. Users can see exactly what model is being used and why.

---

## Module 7: `extension.ts` input pipeline — The coordinator

**What it does:** Wires all modules together. The `cursorDrive.processInput` command runs the full input pipeline. This is the only place that knows about all the others.

**Key design decisions:**

*Drive persona in system prompt* — The drive persona is not a configuration string; it's hardcoded in the Drive skill (`skills/drive-persona/SKILL.md`). The persona is a product contract, not a user-configurable option: lead with recommendations, adapt when pushed back, cost-aware, confirm before large changes.

*Optimizer only when drive active* — The filler cleaner runs always (it's free). The prompt optimizer only runs when drive mode is active.

*`request.model` for execution* — When the tier is `execution`, we use the user's currently selected model in Cursor. The user chose that model deliberately. We only override for routing and planning tiers.

---

## Module 8: `extension.ts` — Wiring

**What it does:** The activate function. Creates all modules, registers all commands, pushes everything to `context.subscriptions` for automatic cleanup on deactivation.

**Why it's thin:** All logic lives in modules. `extension.ts` is pure wiring — it creates instances and connects them. If you need to understand behavior, you read the module. If you need to understand lifetime, you read `extension.ts`.

**Command registrations:**

| Command ID | Behavior |
|---|---|
| `cursorDrive.toggle` | `driveMgr.toggle()` — one-liner |
| `cursorDrive.exit` | `driveMgr.setActive(false)` + info message |
| `cursorDrive.setSubMode` | QuickPick → `driveMgr.setSubMode()` + `setActive(true)` |

The QuickPick in `setSubMode` strips the Codicon prefix from labels via `.split(" ").pop()` to get the mode word. Labels are formatted as `"$(icon) Word"` — the last space-separated token is always the mode name.

---

## Architecture: Self-contained extension pipeline

Cursor Drive is a **standalone** VS Code / Cursor extension. There is no external backend, no shared core, no adapter layer. Every module lives in `src/` and runs inside the VS Code extension host.

```
@drive chat input
  └── extension.ts (coordinator)
        ├── fillerCleaner.ts    — client-side, free
        ├── promptOptimizer.ts  — routing-tier model, conditional
        ├── router.ts           — pure function, stateless
        ├── modelSelector.ts    — 3-tier cost selection
        ├── agentRegistry.ts    — multi-agent pool
        ├── mcpServer.ts        — local MCP bridge :7891
        ├── shareScreen.ts      — WebviewPanel
        ├── statusBar.ts        — live status item
        └── tts.ts              — OS-native speech
```

The MCP server at `:7891` is how the Cursor AI calls back into the extension — updating the ShareScreen, triggering TTS, switching modes, and spawning/managing agents. This is the only "bridge" in the system: extension host ↔ local HTTP MCP ↔ Cursor AI.

---

## Testing guide

Run `npm test` for the automated test suite (Jest). 8 of 18 modules have unit tests. See `.cursor/plans/test-coverage.plan.md` for the remaining 10.

To test manually in the Extension Development Host:

**F5 launch** — Open the project root in Cursor, press F5. This opens an Extension Development Host window with the extension loaded.

**Test activation:**
Toggle Drive via status bar or `Ctrl+Shift+D`, then: `agent add a login page`
Expected: drive mode active, status bar shows `Drive: AGENT`, progress shows routing decision.

**Test filler cleaning:**
With Drive active: `uhh like maybe refactor the auth module you know`
Expected: optimizer shows cleaned prompt, asks for approval.

**Test /cancel:**
With Drive active: `/cancel`
Expected: status bar shows `Drive` (inactive), response "Drive mode off."

**Test sub-mode toggle:**
Press `Ctrl+Shift+D` → drive activates with default sub-mode.
Click status bar → QuickPick appears with sub-mode options.
