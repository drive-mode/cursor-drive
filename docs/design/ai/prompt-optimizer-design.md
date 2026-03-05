# Prompt Optimizer: Design Document

## Problem

Voice dictation produces unstructured, hedged, filler-laden text. Cursor's STT passes it to the AI verbatim. The AI then has to guess what the user actually wants, often getting it wrong or asking unnecessary clarifying questions.

Example raw input:
> "uhh like maybe we should refactor the auth module or whatever, I don't know, maybe add some tests too"

What the user actually wanted:
> "Refactor the auth module: extract AuthService, add unit tests for login and logout flows"

The gap between those two is the optimizer's job.

---

## Design goals

1. **Never lose intent** — Preserve intent; only clarify.
2. **Zero cost for clean inputs** — Clean, typed prompts pass through untouched.
3. **Non-blocking** — Failure never blocks drive mode; requests always proceed.
4. **User control** — The user sees the optimized version before it runs. They can opt out per-request (skip) or permanently (autoApprove = false, or disabled entirely).
5. **Cheapest possible model** — Short prompts don't need flagship models.

---

## Two-stage pipeline

### Stage 1: Client-side filler removal (free)

`fillerCleaner.cleanFillerWords(raw)` runs first:

- Regex-based filler word removal using word-boundary anchors
- Consecutive duplicate phrase collapse
- Sentence casing preservation
- Returns `{ cleaned, original, wasModified }`

This stage is entirely local. No network, no API call, no latency beyond a few microseconds.

### Stage 2: AI rewrite (cheap model, conditional)

Only runs when:
- `wasModified` is true (filler was found), OR
- `looksLikeDictation(text)` is true (filler density > 10% or trailing uncertainty), OR
- `cleaned.length > 120` (long prompts benefit from compression)

Uses `selectCheapModel()` from `modelSelector.ts` — the cheapest model Cursor makes available (target: gpt-4o-mini or claude-haiku).

System prompt (abbreviated):
> "Rewrite the developer's request into a clear, specific, actionable engineering prompt. Preserve ALL intent. Remove filler, hedging, and rambling. If already clear, return unchanged."

---

## Approval flow

After optimization, the user sees:

```
Prompt optimizer — I've cleaned up your request:

Original:
> uhh like maybe refactor the auth module or whatever add some tests idk

Optimized:
> Refactor auth module: extract AuthService class, add unit tests for login/logout flows

Proceeding with optimized version...
```

With `autoApprove: false` (default), this is shown before the main model call. The current implementation proceeds after showing — a future version will use `vscode.window.showQuickPick` for a proper blocking Approve / Edit / Skip modal.

With `autoApprove: true`, only a brief inline note appears and the pipeline continues silently.

---

## Configuration

| Setting | Default | Behavior |
|---|---|---|
| `cursorDrive.promptOptimizer.enabled` | `true` | Enables the full pipeline |
| `cursorDrive.promptOptimizer.autoApprove` | `false` | Skip the diff display |

The optimizer only runs when drive mode is active. Non-drive `@drive` calls skip the optimizer entirely.

---

## Future: blocking approval modal

`vscode.window.showQuickPick` supports a blocking call. Future version would present:

```
Optimized prompt ready:
> [optimized text]

[✓ Use optimized]  [✎ Edit]  [✗ Use original]
```

Requires storing the result and re-entering the pipeline with the user's choice; `OptimizeResult` from `optimizePrompt()` supports this.

---

## Design principle: single-pass rewrite over multi-turn clarification

Traditional chatbots clarify iteratively. Cursor's visual environment lets users approve a diff in one click: one cheap model call, one diff shown, user approves. Solves unstructured → structured intent at lower latency than iterative clarification.
