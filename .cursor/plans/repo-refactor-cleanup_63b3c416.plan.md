---
name: repo-refactor-cleanup
overview: Refactor the full repo structure, core modules, CLI/scripts, tests, and docs to create a clean, consistent layout with updated imports and fixes for all breaking changes.
todos:
  - id: target-map
    content: Define target structure and move plan
    status: completed
  - id: core-splits
    content: Split core modules and update imports
    status: completed
  - id: cli-scripts
    content: Consolidate CLI and scripts into packages
    status: completed
  - id: tests-reorg
    content: Restructure tests to mirror source
    status: completed
  - id: docs-adr
    content: Reorganize docs and fix ADR conflict
    status: in_progress
  - id: manifest-verify
    content: Update manifest and validate
    status: pending
isProject: false
---

# Repo Refactor Cleanup

## Targets

- Source code organization in [src/roller/](src/roller/)
- CLI/scripts consolidation in [src/roller/cli/](src/roller/cli/) and [scripts/](scripts/)
- Tests alignment in [tests/](tests/)
- Docs cleanup in [docs/](docs/)
- ADR conflict fix in [docs/adr/](docs/adr/)
- Manifest alignment in [configs/agent_directory_structure.yaml](configs/agent_directory_structure.yaml)

## Plan

1. Define the target structure and move plan
  - Draft the new directory layout with a short map in the refactor notes.
  - Use these files as anchors:
    - [src/roller/tailoring/generator.py](src/roller/tailoring/generator.py)
    - [src/roller/tailoring/agent_tailor.py](src/roller/tailoring/agent_tailor.py)
    - [src/roller/shared/models.py](src/roller/shared/models.py)
    - [src/roller/cli/main.py](src/roller/cli/main.py)
    - [scripts/](scripts/)
2. Split large core modules and update imports
  - Split `shared/models.py` into a package:
    - `src/roller/shared/models/job.py`, `profile.py`, `application.py`, `outreach.py`
    - Update all imports that currently use `roller.shared.models`.
  - Split tailoring logic:
    - Extract analysis logic into `src/roller/tailoring/analyzer.py`.
    - Extract formatting/assembly into `src/roller/tailoring/formatter.py`.
    - Keep `generator.py` focused on generation orchestration.
  - Extract agent CLI wrapper from `agent_tailor.py` into `src/roller/tailoring/agent_client.py` and slim `agent_tailor.py` to orchestration.
  - Remove or merge thin wrapper `agent_generators.py` where redundant.
3. Consolidate CLI + scripts
  - Move inline commands from [src/roller/cli/main.py](src/roller/cli/main.py) into `src/roller/cli/commands/` (fill the placeholder files and delete empty stubs).
  - Convert script implementations in [scripts/](scripts/) into importable modules under `src/roller/tools/` (or `src/roller/cli/utils/`), and make scripts thin wrappers.
  - Remove `sys.path.insert` hacks and standardize command naming.
  - Update `pyproject.toml` script entry points if paths change.
4. Restructure tests to mirror source
  - Organize `tests/unit/` by domain: `shared/`, `pipeline/`, `tailoring/`, `discovery/`, `application/`, `recon/`, `outreach/`, `cli/`.
  - Move script tests into `tests/unit/scripts/` or `tests/integration/scripts/` and update imports to the new library modules.
  - Update `tests/conftest.py` and any path assumptions.
5. Clean and reorganize docs + ADR fix
  - Create `docs/guides/`, `docs/status/`, `docs/plans/` and move root documents into the appropriate folder.
  - Fix the ADR number conflict by renaming `docs/adr/0011-swarm-agents-pipeline-optimization.md` and update [docs/adr/INDEX.md](docs/adr/INDEX.md) plus any references.
  - Add or update READMEs if needed for new docs directories.
6. Align manifest and validate
  - Update [configs/agent_directory_structure.yaml](configs/agent_directory_structure.yaml) to include new directories.
  - Run `python scripts/agent_directory_structure.py setup` and `validate` to confirm structure.
  - Run `pytest` and `ruff` to confirm refactor fixes.

## Notes

- Breaking changes are allowed; all internal references, tests, and docs will be updated to match.
- The manifest remains the source of truth for directory structure after moves.
