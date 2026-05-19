---
name: Consolidate venv to .venv
overview: Remove the single `.venv314` reference from the codebase and confirm requirements.txt is aligned with pyproject.toml. The project already uses `.venv` everywhere else.
todos: []
isProject: false
---

# Consolidate venv to .venv

## Findings

**Grep results:** `.venv314` appears in **one place only** — [`.gitignore`](roler/.gitignore) line 32:

```
.venv314/
```

All other references use `.venv`:
- [AGENTS.md](roler/AGENTS.md), [README.md](roler/README.md), setup guides, skills, plans
- [inventory.py](roler/src/roler/refactor/inventory.py), [orchestration.py](roler/src/roler/hooks/orchestration.py), [rename_roller_to_roler.py](roler/scripts/rename_roller_to_roler.py) — all exclude `.venv` (correct)
- [.cursorignore](roler/.cursorignore) — ignores `.venv/` and `venv/` (no `.venv314`)

**requirements.txt:** Already aligned with pyproject.toml. Uses `-e .[dev,web,pdf]` which matches the optional extras. Primary install remains `pip install -e ".[dev]"` per AGENTS.md; `requirements.txt` is a convenience for `pip install -r requirements.txt`.

## Changes

| File | Action |
|------|--------|
| [`.gitignore`](roler/.gitignore) | Remove the `.venv314/` line from the "Virtual environments" section |

No other edits needed. The `.venv/` and `venv/` entries in `.gitignore` already cover the canonical venv. Removing `.venv314/` completes the consolidation.

## Post-change (manual)

If you have an existing `.venv314` folder, delete it and recreate with:

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -e ".[dev,web,pdf]"
```

Python 3.14 is enforced by `requires-python = ">=3.14"` in pyproject.toml; using `python` (or `py -3.14`) will create a 3.14 venv when that is the default or selected.
