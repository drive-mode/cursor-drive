---
name: Resume Markdown Format and PDF
overview: Improve resume markdown structure for better rendering and PDF output, and enable conversion to PDF using roler's built-in PDFTemplate or external tools.
todos: []
isProject: false
---

# Resume Markdown Formatting and PDF Conversion

## Current State

- **Resume location:** [data/resumes/master/January 2026 HarrisonHalperin_Resume.docx.md](data/resumes/master/January%2026%20HarrisonHalperin_Resume.docx.md)
- **Existing tooling:** [src/roler/tailoring/pdf_template.py](src/roler/tailoring/pdf_template.py) — `PDFTemplate.render_pdf(markdown_content, output_path)` converts markdown to one-page PDF via WeasyPrint
- **Dependencies:** `pip install 'roler[pdf]'` (WeasyPrint, markdown, pypdf, pdfplumber)

## 1. Markdown Formatting Improvements

The PDFTemplate CSS expects a specific heading hierarchy for optimal styling:


| Element         | Current                   | Recommended                         | Reason                                        |
| --------------- | ------------------------- | ----------------------------------- | --------------------------------------------- |
| Name            | `# **Name`**              | `# Name`                            | h1 is already bold; redundant `**`            |
| Section headers | `### **EXPERIENCE**`      | `## Experience`                     | h2 gets border-bottom, compact spacing in CSS |
| Job titles      | `**Title** - **Company**` | Keep as-is                          | Renders as bold text                          |
| Contact line    | Mixed                     | `Phone | Email | LinkedIn | GitHub` | Matches `_resume_to_markdown` pattern         |


**Additional fixes:**

- Line 3: Email link typo — `mailto:harrisonhalperin@gmail.com` but display text shows `lplfinancial.com`; align href and display text
- Section headers: Use `## Experience`, `## Skills`, `## Education`, `## Certifications` (title case, h2)

**Structure that maps to PDFTemplate CSS:**

```markdown
# Harrison Halperin

(949) 395-6570 | email@example.com | linkedin.com/... | github.com/...

Summary paragraph...

## Experience

**Title** – Company    Date Range

Bullet points...

## Skills
...
```

## 2. PDF Conversion Options

### Option A: Use roler's PDFTemplate (recommended)

No new dependencies. Add a small script or CLI that:

1. Reads the markdown file
2. Calls `PDFTemplate().render_pdf(content, output_path, validate_one_page=False)` (your resume may exceed one page; set `False` to allow)
3. Writes PDF to `data/resumes/master/` or a path you specify

**Implementation:** Add `scripts/resume_to_pdf.py` or a `roler resume export --pdf` CLI that accepts `--input` and `--output`.

### Option B: Pandoc (external)

```bash
pandoc "January 2026 HarrisonHalperin_Resume.docx.md" -o resume.pdf
```

Requires [Pandoc](https://pandoc.org/) installed. For better styling, use a reference PDF or custom template.

### Option C: VS Code / Cursor extension

Extensions like "Markdown PDF" render .md to PDF from the editor. No code changes.

## 3. Recommended Approach

1. **Format the markdown** — Update the resume file with the heading structure above so it renders well both as raw markdown and when converted to PDF.
2. **Add a conversion script** — Create `scripts/resume_to_pdf.py` that uses `PDFTemplate.render_pdf()` for one-command PDF generation.
3. **Optional:** Add `roler resume export` CLI subcommand if you want it integrated into the main CLI.

## Key Files

- [src/roler/tailoring/pdf_template.py](src/roler/tailoring/pdf_template.py) — `render_pdf()`, `RESUME_CSS`, `markdown_to_html()`
- [src/roler/tailoring/resume_parser.py](src/roler/tailoring/resume_parser.py) — `parse_resume_markdown()` (uses `### **SECTION`** for structured parsing; can keep that for parsing while improving display)
- [pyproject.toml](pyproject.toml) — `[project.optional-dependencies]` pdf extra

## Note on resume_parser

The parser detects "structured" format via `### **SECTION**` headers. If you change to `## Experience`, the parser may treat it as "loose" format. Both paths work; `_split_sections` and `_split_sections_loose` both extract sections. Verify `parse_resume_markdown` still extracts correctly after format changes, or keep `### **EXPERIENCE**` for parsing and add a separate "display" template if needed.