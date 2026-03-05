# Design / Architecture

System architecture and code structure rationale.

## Files

| File | What it covers |
|---|---|
| [cursor-native-system-design.md](cursor-native-system-design.md) | Full system design: request pipeline, MCP bridge, multi-agent, UI surfaces |
| [cursor-drive-walkthrough.md](cursor-drive-walkthrough.md) | Module-by-module code walkthrough with design decisions for each `src/` file |
| [agent-teams-methodology.md](agent-teams-methodology.md) | Multi-operator coordination patterns (role→sub-mode, handoff filter, escalation); no external orchestration framework |
| [agent-registry-v2-design.md](agent-registry-v2-design.md) | Lead+worker model, shared task list, mailbox, file-lock |

## When to read these

- **Before implementing a module** — read `cursor-drive-walkthrough.md` for the existing module's design decisions
- **To understand overall structure** — read `cursor-native-system-design.md` for the full architecture diagram and component map
- **ADRs** — see [`../../architecture/adr/`](../../architecture/adr/README.md) for the architectural decision records
