---
name: Code Review Fixes
overview: Resolve the issues identified during the comprehensive code review by dispatching 5 parallel subagents. Each subagent will handle fixes for a specific file to maximize efficiency.
todos: []
isProject: false
---

# Code Review Fixes Plan

We will resolve the code review findings by splitting the work into 5 concurrent tasks. Each task will target a specific module and will be executed by a parallel, async subagent (`code-reviewer` or `generalPurpose`).

## Subagent 1: `cursor.py` (Discovery Parser)
**Target:** `src/roller/discovery/parsers/cursor.py`
**Actions:**
- **Company Singleton:** Refactor the module-level mutable `_COMPANY` into a `_make_company()` factory function or create a fresh `Company` instance per parse call to avoid SQLite deduplication collisions.
- **RSC Regex Brittle:** Add a `logger.warning("RSC plain-text pattern not found for %s; using HTML fallback", url)` if the `_RSC_PLAIN_RE` match fails.
- **JSON Unescaping:** Replace `raw.replace("\\n", "\n").replace('\\"', '"').replace("\\\\", "\\")` with `json.loads(f'"{raw}"')` for robust unescaping.
- **Type Hints:** Add `-> str` return type to `_strip_html`.

## Subagent 2: `local.py` (Storage Backend)
**Target:** `src/roller/shared/storage/local.py`
**Actions:**
- **Profile Serialization Coupling:** Refactor `_serialize_profile` and `_deserialize_profile` to not rely on `KnowledgeBase(Config())`. Implement a clean serialization method (e.g. using `dataclasses.asdict` or standalone parsing).
- **Misleading Async:** Remove the `async` keyword from `_save_company` since it performs no I/O and has no `await`.
- **Exception Swallowing:** Update the `try/except Exception:` block in `_get_connection` to explicitly use `except Exception as e:` or explicitly catch `sqlite3.Error` / `BaseException` to prevent swallowing critical errors like `KeyboardInterrupt`.
- **Contact Company Loss:** In `_row_to_contact`, map the joined `companies` table columns into a proper `Company` instance instead of dropping it.

## Subagent 3: `config.py` (Configuration)
**Target:** `src/roller/core/config.py`
**Actions:**
- **Mutable Singleton:** Add a clear docstring warning to `get_config()` specifying that `Config` is a mutable singleton and its attributes must not be mutated by consumers.
- **Unused Alias:** Remove the unused `type URL = str` alias.
- **Formatting:** Add a blank line before `type Seconds = int`.
- **Inline Validation:** Move `log_level` validation directly into `from_env()` to catch invalid values before the global `validate()` call.

## Subagent 4: `stages.py` (Pipeline Stages)
**Target:** `src/roller/pipeline/stages.py`
**Actions:**
- **Double Execution:** Fix the worker path double-execution bug in `TailoringStage._execute_with_workers` by correctly mapping worker results instead of running the sequential fallback `_execute_sequential` if workers succeeded.
- **Path Construction:** In `ApplicationStage._execute`, change `Path(context.config.storage.data_dir) / "resumes" / "tailored"` to `context.config.storage.resume_dir / "tailored"`.
- **Duck Typing:** Replace `hasattr(ai, "complete_structured")` in `_score_job_with_ai` with a proper interface check.
- **Inline Helper:** Inline the `_truncate` helper directly where it is used.

## Subagent 5: `persistence.py` (Tailoring Persistence)
**Target:** `src/roller/tailoring/persistence.py`
**Actions:**
- **Slug Deduplication:** Update `_slug_for_job` to include the job ID (e.g. appending a short hash or the UUID) to guarantee unique filenames and prevent collisions when two jobs share the same company and title.
- **Optional Date Formatting Check:** Verify `end_date` is properly checked before `.strftime` is called in `_resume_to_markdown`.