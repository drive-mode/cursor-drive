# Fork vs Upstream Comparison

Comparison of `hhalperin/cursor-drive:main` (fork) vs `drive-mode/cursor-drive:main` (upstream/origin) after integrating all hhalperin branches into main.

## Summary

- **Commits on fork not on upstream**: 88
- **Commits on upstream not on fork**: 0
- **Files changed**: 66 files, +22,951 / -16 lines

The fork is strictly ahead of upstream. All work from hhalperin branches (develop, cursor/*, drive-mode, drive-mvp, feat/drive-mode, master) has been merged into main with drive-mode as canonical for conflicts (ADR-0024).

## Key additions on fork

| Area | Additions |
|------|-----------|
| Governance | `src/governance/*` (scan, entropy, focusGuard, projectGraph, taskLedger, aiSummary, cli, fsUtils, paths, schemas), `docs/guides/governance.md` |
| Agent-browser | `.agents/skills/agent-browser/`, `.cursor/skills/agent-browser/`, `.cursor/skills/electron/`, `.cursor/skills/drive-ui-test/` |
| Plans | `cursor_drive_state_sync_95317c89`, `cursor_native_commands_wire_4b8e2c17`, `drive_ux_polish_and_auto-mcp_deb68d21`, `governance_entropy_control_1d0c8c2e`, `openclaw_capability_scrape_8fa228d1`, `voice_user_journey_storyboard_59290404`, `wire_and_fix_drive_886a9ffa` |
| ADR | ADR-0024 (fork merge drive-mode canonical) |
| Tests | `clarificationHandler`, `tangentFlow`, `tangentNameExtractor`, `governance/*`, expanded `agentScreen`, `commsAgent` |

## Regenerating this comparison

```bash
git fetch origin
git fetch hhalperin
git log origin/main..hhalperin/main --oneline
git log hhalperin/main..origin/main --oneline
git diff origin/main..hhalperin/main --stat
```

## Opening a PR to upstream

To propose these changes to drive-mode/cursor-drive:

1. Base: `drive-mode/cursor-drive:main`
2. Compare: `hhalperin/cursor-drive:main`
3. Include this summary in the PR description.
