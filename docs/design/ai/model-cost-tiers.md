# Model Cost Tiers: Design Document

## Problem

AI coding assistants default to the user's selected flagship model for every operation. Routing a request ("is this a plan or an execute?") or cleaning a prompt ("remove the filler words") does not require a frontier model. Using gpt-4o for a routing decision wastes money and adds latency.

Cursor Drive uses a three-tier model selection strategy proportional to task complexity.

---

## The three tiers

### Tier 1: Routing (cheapest available)

**Used for:** Prompt optimization, filler detection scoring, intent routing hints.

**Target:** gpt-4o-mini, claude-haiku, gemini-1.5-flash, gpt-3.5-turbo (in preference order).

**Why:** Classification and rewriting on short text. Basic language understanding; not deep reasoning.

**Cost profile:** 200-500 input tokens + 100-200 output tokens. At gpt-4o-mini pricing, fractions of a cent per request.

### Tier 2: Planning (mid-tier)

**Used for:** Clarification loops (plan sub-mode), plan artifact generation (goals, tasks, risks, acceptance criteria).

**Target:** gpt-4o, claude-sonnet, gemini-1.5-pro, gpt-4-turbo.

**Why:** Planning requires reasoning about requirements, tradeoffs, constraints. Mid-tier model suffices.

### Tier 3: Execution (user's model)

**Used for:** Code generation, multi-file edits, complex implementation.

**Target:** Whatever the user has selected in Cursor's model picker.

**Why:** User chose their model; execution is where quality matters most.

---

## Selection logic

`modelSelector.ts` wraps `vscode.lm.selectChatModels({})`:

```typescript
// Get all available models
const models = await vscode.lm.selectChatModels({});

// Match against preference list (first match wins)
for (const preferred of TIER_PREFERENCES[tier]) {
  const match = models.find(
    (m) => m.family?.toLowerCase().includes(preferred)
        || m.id?.toLowerCase().includes(preferred)
  );
  if (match) return match;
}

// Fallback: first available model
return models[0];
```

**Fallback chain:** Preference match → first available model → `request.model` (caller's fallback). Never errors on unavailability.

**Transparency:** `describeModel(model, tier)` returns a label shown in the chat stream: `"gpt-4o-mini [cheap routing]"`.

---

## Tier-to-mode mapping

`tierForMode(routeMode)` is the bridge between the router and the model selector:

```
RouteMode "plan"   → Tier "planning"   → mid-tier model
RouteMode "run"    → Tier "execution"  → user's model
RouteMode "direct" → Tier "execution"  → user's model
RouteMode "collab" → Tier "execution"  → user's model
```

Planning downgrades to mid-tier; execution paths use the user's selection.

---

## Cost profile example

Typical drive mode session (voice input, 3 turns):

| Step | Model | Approx tokens | Cost (est.) |
|---|---|---|---|
| Prompt optimization | gpt-4o-mini | 600 in / 150 out | ~$0.001 |
| Plan artifact (plan mode) | gpt-4o | 2000 in / 800 out | ~$0.03 |
| Code generation (run mode) | user's model | 8000 in / 2000 out | varies |

Optimizer + routing cost less than 0.5% of a typical execution call. Planning savings matter when users have a premium model.

---

## Future: budget cap

`cursorDrive.budgetCapUsd` (not yet implemented) will allow workspace-level spend limits enforced across all session model calls.
