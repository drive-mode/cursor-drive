---
name: Drive Mode Installable UI Build
overview: Implement installable Drive extension + plugin delivery and complete Drive UI surfaces for Cursor IDE workflows.
planType: task
planId: drive-mode-installable-ui
parentPlanId: cursor-drive
childPlanIds: []
dependsOn: []
todos:
  - id: dm-ui-01-governance
    content: "Create feature branch drive-mode and map work to this executable plan before code edits."
    status: completed
  - id: dm-ui-02-architecture
    content: "Add architecture docs and ADR describing extension+plugin installable distribution model."
    status: completed
  - id: dm-ui-03-installability
    content: "Implement plugin installer flow and packaging updates so other machines can install Drive quickly."
    status: completed
  - id: dm-ui-04-ui
    content: "Build out status bar, mode surface, agent management, and share-screen behavior for Drive UI."
    status: completed
  - id: dm-ui-05-tests
    content: "Add and update tests for new installer/UI/registry behavior and keep compile+tests passing."
    status: completed
  - id: dm-ui-06-verify
    content: "Verify packaging and installation outputs, then update docs and changelog for release readiness."
    status: completed
isProject: false
---

# Drive Mode Installable UI Build

## Purpose

Make Drive Mode practical to install and use on other machines by shipping the extension and plugin together, while improving UI ergonomics across status bar, share-screen, and agent operations.

## Dependency notes

- Parent workstream: `cursor-drive`.
- Architecture docs should land before major implementation edits.
- Packaging verification depends on compile/tests passing.

## TODO detail

### id: dm-ui-01-governance
Create branch and keep this plan updated as tasks move from pending to completed.

### id: dm-ui-02-architecture
Document architecture decisions and install model in `docs/architecture/` before coding major feature changes.

### id: dm-ui-03-installability
Implement plugin installer command and package include/exclude rules for clean VSIX output.

### id: dm-ui-04-ui
Improve status bar, mode support, agent management commands, and share-screen behavior.

### id: dm-ui-05-tests
Expand Jest coverage for touched modules and behavior boundaries.

### id: dm-ui-06-verify
Run compile/test/package commands, inspect VSIX contents, and update user-facing docs/changelog.
