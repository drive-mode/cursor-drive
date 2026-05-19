---
name: Agent CLI Normalization
overview: Update code and documentation to consistently use `agent` as the Cursor CLI command (not `cursor` or `cursor agent`), removing the `cursor agent` fallback path and normalizing all references.
todos: []
isProject: false
---

# Agent CLI Normalization Plan

## Context

The Cursor CLI is invoked via the `agent` command, not `cursor` or `cursor agent`. The codebase currently supports both a standalone `agent` binary (preferred) and a `cursor agent` subcommand fallback on non-Windows. We will standardize on `agent` only and update all documentation.

## Code Changes

### 1. [src/roller/shared/ai/cursor.py](src/roller/shared/ai/cursor.py)

- **Remove `CURSOR_MAIN` path**: Delete `AgentBinaryType.CURSOR_MAIN`, `_cursor_main_candidates()`, and all logic that uses `cursor agent` as a fallback.
- **Simplify `_build_print_command()`**: Always use `[agent_path, "-p", prompt, ...]` — no `"agent"` subcommand.
- **Update `find_agent_binary()`**: Remove steps 4–6 (ROLLER_CURSOR_BIN, cursor main binary search, `cursor` on PATH). Keep only:
  1. ROLLER_CURSOR_AGENT_BIN
  2. Standalone binary locations
  3. `agent` on PATH
- **Update docstrings**: Replace "cursor agent" with "agent"; remove ROLLER_CURSOR_BIN from env var docs.
- **Update error messages**: Change "cursor agent failed" to "agent failed" in log line 218.

### 2. Tests

- **tests/unit/shared/ai/**: If any tests mock or assert CURSOR_MAIN behavior, remove or update them.
- **tests/unit/cursor_sdk/test_client.py**: `test_resolve_agent_binary_uses_cursor_bin_fallback` — verify if it tests the cursor fallback; update or remove.

## Documentation Updates

### 3. Guides (high priority)


| File                                                                                                   | Change                                                                                   |
| ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| [docs/guides/agents/capabilities.md](docs/guides/agents/capabilities.md)                               | "Cursor CLI" → "Cursor CLI (`agent`)" where clarifying; already mentions `agent login`.  |
| [docs/guides/agents/autonomous-agent.md](docs/guides/agents/autonomous-agent.md)                       | Ensure "agent" is the stated CLI command.                                                |
| [docs/guides/cursor-cli/cursor-cli-setup-python.md](docs/guides/cursor-cli/cursor-cli-setup-python.md) | Add note: "Official Cursor CLI command: `agent`. The `cursor-agent` wrapper invokes it." |
| [docs/guides/reference/dogfooding.md](docs/guides/reference/dogfooding.md)                             | Already uses "agent login"; ensure consistency.                                          |


### 4. Scripts


| File                                                     | Change                                                                                             |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| [scripts/cursor-aliases.sh](scripts/cursor-aliases.sh)   | Line 33: "Run cursor agent" → "Run Cursor agent (via `agent` command)" or "Run agent with prompt". |
| [scripts/cursor-aliases.ps1](scripts/cursor-aliases.ps1) | Same for line 61.                                                                                  |


### 5. Research docs (lower priority, factual correction)


| File                                                                                                                                                                             | Change                                       |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| [docs/research/cursor-primitives/2026-02-11-hooks-python-prompt-types-context-impact.md](docs/research/cursor-primitives/2026-02-11-hooks-python-prompt-types-context-impact.md) | "cursor agent" → "agent" (lines 70, 144).    |
| [docs/research/tools/2026-01-28-clawdbot-moltbot-assessment.md](docs/research/tools/2026-01-28-clawdbot-moltbot-assessment.md)                                                   | "cursor agent" → "agent" (line 61).          |
| [docs/archive/guides/setup-summary.md](docs/archive/guides/setup-summary.md)                                                                                                     | "Run cursor agent" → "Run agent" (line 179). |


### 6. Module-level docs

- [src/roller/cursor_sdk/AGENTS.md](src/roller/cursor_sdk/AGENTS.md): Already says "agent"; no change needed.
- [src/roller/tailoring/agent_client.py](src/roller/tailoring/agent_client.py): "cursor-agent" in docstrings — clarify it invokes `agent`.

## Environment Variables

- **Remove**: `ROLLER_CURSOR_BIN` — no longer used after removing CURSOR_MAIN.
- **Keep**: `ROLLER_CURSOR_AGENT_BIN` — override path to `agent` binary.

## Verification

- Run `pytest tests/unit/shared/ai/ tests/unit/cursor_sdk/` after code changes.
- Grep for remaining "cursor agent" and "ROLLER_CURSOR_BIN" to ensure no stragglers.
