# Design Documentation

Rationale and trade-off docs. These explain *why* things work the way they do. Use "operator" and "Agent Screen (S-AS)" per [ADR-0016](../architecture/adr/ADR-0016-drive-terminology-and-hierarchy.md); some older docs may still say "agent" or "ShareScreen".

## Subdirectories

| Directory | Contents |
|---|---|
| [`architecture/`](architecture/README.md) | System design, component map, request pipeline, code walkthrough |
| [`ux/`](ux/README.md) | User journey, mode analysis, UX principles |
| [`ai/`](ai/README.md) | Prompt optimizer, model cost tiers, AI pipeline design |
| [`naming/`](naming/README.md) | Extension/mode naming decisions aligned with Cursor conventions |
| [`automation/`](automation/README.md) | Plan lifecycle automation design exploration |

## Quick navigation

**"How does the system work?"** → `architecture/cursor-native-system-design.md`

**"How does each module work?"** → `architecture/cursor-drive-walkthrough.md`

**"Why is the UI designed this way?"** → `ux/drive-mode-analysis-and-ux.md`

**"How does the voice pipeline work?"** → `ai/prompt-optimizer-design.md`

**"How does model selection work?"** → `ai/model-cost-tiers.md`

**"What is the naming rationale?"** → `naming/cursor-aligned-naming.md`

**"How does plan automation work?"** → `automation/plan-lifecycle-automation/SYNTHESIS.md`

## When to read these

- **Before implementing a module** — read the relevant design doc to understand prior decisions
- **When the PRD is unclear** — design docs often have more implementation detail
- **When making architecture decisions** — check here before adding new patterns
