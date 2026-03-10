---
name: Merge roler excluding personal data
overview: Merge the roler codebase into another repo while excluding all resume and role data, and removing or generalizing references to personal files so the target repo has no PII.
todos: []
isProject: false
---

# Merge roler Codebase (Excluding Personal Data)

## Goal

Merge roler into another codebase without including or referencing personal data:

- **Exclude:** `data/resumes/`, `data/roles/`, and all contents (including `November 2025 HarrisonHalperin_Resume.docx.md`, `January 2026 HarrisonHalperin_Resume.docx.md`, `JD Solutions Architect.md`)
- **Generalize:** Any code or docs that hardcode paths to those files

---

## 1. Exclude from Merge (Do Not Copy)


| Path                         | Reason                                  |
| ---------------------------- | --------------------------------------- |
| `data/resumes/` (entire dir) | Personal resume data                    |
| `data/roles/` (entire dir)   | Personal role packets, job descriptions |
| `data/packets/`              | Tailored cover letters (personal)       |
| `data/knowledge_base/`       | May contain personal notes              |
| `data/.ralph/`               | Local run state, context logs           |


**Keep:** `data/configs/` if it has non-personal config; `data/` structure with placeholder READMEs if needed.

---

## 2. Code Changes (Remove Personal File References)

### 2.1 [src/roler/cli/commands/resume.py](src/roler/cli/commands/resume.py)

**Current:** Default `input_path` = `Path("data/resumes/master/January 2026 HarrisonHalperin_Resume.docx.md")`

**Change:** Use a generic default and require `--input` when no default exists:

```python
# Option A: Require --input (no default)
input_path: Annotated[Path, typer.Option("--input", "-i", ...)] = None
# Then: if input_path is None, print usage and exit

# Option B: Generic default that user replaces
] = Path("data/resumes/master/resume.md"),
```

**Recommendation:** Option B — keep `data/resumes/master/resume.md` as the default so the CLI still works; users add their own file there.

### 2.2 [tests/unit/tailoring/test_resume_parser.py](tests/unit/tailoring/test_resume_parser.py)

**Current:** `skipif` and test use `data/resumes/master/Park Fabian Resume October 2024 Final-1.pdf`

**Change:** Use a generic fixture path, e.g. `data/resumes/master/sample-resume.pdf`, and document that the test is skipped unless that fixture exists. No reference to "Park Fabian".

### 2.3 [docs/guides/reference/resume-formatting-logic.md](docs/guides/reference/resume-formatting-logic.md)

**Current:** "From `data/resumes/master/January 2026 HarrisonHalperin_Resume.docx.md`"

**Change:** "From `data/resumes/master/resume.md`" (or "your master resume file")

---

## 3. Documentation References (Generic Only)

These files reference `data/resumes/` or `data/roles/` as **directory structure** (not specific files). That is acceptable — they describe where the app expects data. No changes needed unless you want to add a note that these dirs are user-provided and not shipped.


| File                                                       | Status                                           |
| ---------------------------------------------------------- | ------------------------------------------------ |
| `docs/guides/architecture/architecture-overview.md`        | OK — generic paths                               |
| `docs/guides/architecture/directory-layout-conventions.md` | OK — generic layout                              |
| `docs/diagrams/architecture/system-overview.diagram.md`    | OK — generic                                     |
| `src/roler/app/paths.py`                                   | OK — returns `data/resumes/`, `data/roles/` dirs |
| `src/roler/hooks/trace_recorder.py`                        | OK — redaction list, not file refs               |


---

## 4. Merge Execution Order

1. **Exclude** `data/resumes/`, `data/roles/`, `data/packets/`, `data/knowledge_base/`, `data/.ralph/` from the merge.
2. **Apply** code changes (resume.py, test_resume_parser.py, resume-formatting-logic.md).
3. **Add** `data/resumes/` and `data/roles/` as empty dirs with `.gitkeep` or a README if the target repo needs the structure.
4. **Verify** `roler resume export --input path/to/resume.md` works with a sample file.

---

## 5. Optional: .gitignore for Personal Data

Ensure target repo `.gitignore` includes:

```
data/resumes/master/*.md
data/resumes/master/*.pdf
data/roles/**/job_description.md
data/roles/**/resume.md
data/roles/**/cover_letter.md
```

Or ignore the whole dirs if users will never commit personal data.