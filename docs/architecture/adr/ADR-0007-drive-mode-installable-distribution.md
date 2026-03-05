# ADR-0007: Drive Mode installable distribution

- Status: Accepted
- Context owner: Cursor Drive maintainers

## Context

Drive Mode has two deliverables:

1. A VS Code extension (commands, status bar, share-screen UI, MCP server)
2. Cursor plugin assets (agent persona, rules, commands, MCP config, hooks)

Users need a setup path that works on new machines without manual file hunting. Current packaging mixes internal governance files in VSIX output and does not provide an explicit installer flow for plugin assets.

## Decision

1. Keep extension runtime code in the VSIX package as the primary executable unit.
2. Package Drive plugin assets with the extension and expose an extension command that installs/updates them into a workspace `.cursor/` directory.
3. Maintain manual fallback installation instructions for environments where command-driven installation is not preferred.
4. Keep packaging include/exclude rules strict so internal planning/governance files do not ship in release artifacts.

## Consequences

### Positive

- Users can install on new machines with one extension install plus one command.
- Plugin files stay version-aligned with the extension release.
- Packaging output becomes predictable and reviewable.

### Trade-offs

- Installer code must handle workspace edge cases (no workspace open, partially existing `.cursor` structure).
- Release process now validates both extension behavior and installer behavior.

## Follow-up implementation notes

- Add installer command in extension command palette.
- Ensure status/diagnostics report plugin install readiness.
- Add tests for installer and asset merge logic.
