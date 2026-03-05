# Design / AI

AI pipeline design: prompt optimization, model selection, cost strategy.

## Files

| File | What it covers |
|---|---|
| [prompt-optimizer-design.md](prompt-optimizer-design.md) | Two-stage prompt optimization pipeline: client-side filler removal + AI rewrite with user approval |
| [model-cost-tiers.md](model-cost-tiers.md) | Three-tier cost-aware model selection: routing → planning → execution |

## When to read these

- **Before changing the input pipeline** — read `prompt-optimizer-design.md` for the design goals and constraints
- **When selecting models for new features** — read `model-cost-tiers.md` for the tier strategy and fallback chain
- **When adding a new AI call** — check which tier is appropriate before hardcoding a model
