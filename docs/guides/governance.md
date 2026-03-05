# Governance & Entropy Control

Cursor Drive includes a deterministic governance scan that snapshots project structure, computes an entropy score, and generates an actionable workboard.

Artifacts are written to `.drive/governance/` (gitignored).

## Run a scan

### CLI

```bash
npm run compile
npm run governance -- scan
```

### VS Code / Cursor command

- Command palette → **Drive: Run Governance Scan**

### MCP (for agents/operators)

- `governance_scan({ mode: "full", ai_summary: false })`
- Optional AI summary (cheap model): `governance_scan({ ai_summary: true })`

## Outputs (where to look)

| Artifact | Path | What it contains |
|---|---|---|
| Project graph | `.drive/governance/snapshots/project-graph.latest.json` | File nodes + import edges + test mapping edges |
| Entropy report | `.drive/governance/reports/entropy.latest.md` | Entropy score, metrics table, top findings |
| Entropy JSON | `.drive/governance/reports/entropy.latest.json` | Same as above, machine-readable |
| Task ledger | `.drive/governance/tasks/task-ledger.latest.json` | Tasks derived from findings (prioritized) |
| Workboard | `.drive/governance/tasks/workboard.latest.md` | P0/P1/P2 task view for humans |
| History | `.drive/governance/history/entropy.ndjson` | Append-only time series of scores/metrics |

## How to interpret the entropy score

- The score is **directional**. The report is only useful if it comes with evidence and ranked findings.
- Prefer acting on **P0 workboard items** and the top 5 findings; ignore the rest until those shrink.

## Focus Guard (distraction suppression)

Focus Guard blocks spawning new operators when WIP is too high.

Config keys:
- `cursorDrive.governance.enabled`
- `cursorDrive.governance.wip.maxActivePlans`
- `cursorDrive.governance.wip.maxActiveOperators`

Active plans are derived from `.cursor/plans/registry.yaml` (`todo_empty: false`, non-archived, non-project).

