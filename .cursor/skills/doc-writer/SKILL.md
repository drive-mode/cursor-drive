---
name: doc-writer
description: Use when writing or updating documentation in this repository. Style rules, structure conventions, reference doc generation.
---

# SKILL: doc-writer

Use this skill when writing or updating documentation in this repository.

## When to use

- Creating a new doc file in `docs/`
- Updating an existing doc after source changes
- Writing a README.md for a new directory
- Generating reference docs from source files

## Trigger

Read this skill when:
- User asks you to "write", "update", or "document" something
- You've made code changes and need to update docs
- You're creating a new directory and need a README.md

---

## Style rules (enforce strictly)

### No filler language

Never write:
- "This document provides..."
- "This guide aims to..."
- "In this section, we will..."
- "As we can see..."
- "It is important to note that..."
- "In conclusion..."

Instead: start with the content directly.

### Every directory gets a README.md

When creating a new directory in `docs/`, always create a `README.md` with:
1. One-line purpose statement
2. Table of files with descriptions
3. "When to read" or "Quick answers" section

### Tables over prose for structured data

Use markdown tables for: parameters, settings, file lists, comparison matrices.

### Reference docs are generated from source

When writing `docs/reference/` files:
- Read the source file (`src/config.ts`, `src/mcpServer.ts`, `package.json`) first
- Extract exact names, types, and defaults — don't paraphrase
- Mark your source: "Source: `src/config.ts`"

### Minimal diff principle

Edit the minimal section of the doc that needs updating. Don't rewrite sections that are still accurate.

---

## Doc structure conventions

### README.md files

```markdown
# [Directory Name]

One sentence purpose.

## [Topic heading]

| File | What it covers |
|---|---|
| [file.md](file.md) | Brief description |

## When to read / Quick answers

**"How do I X?"** → link-to-file
```

### Reference docs

```markdown
# [Topic] Reference

One sentence. Source: `path/to/source.ts`.

---

## [Section]

| Setting/Parameter | Type | Default | Description |
|---|---|---|---|
| `name` | type | `default` | What it does |
```

### Design docs

```markdown
# [Topic]: [Subtitle]

## Problem

What was broken or missing.

## Solution / Decision

What was chosen and why.

## Key design decisions

Bullet list of specific, non-obvious choices with rationale.
```

---

## Verification checklist

Before finalizing a doc:
- [ ] No filler sentences
- [ ] All file paths are real and correct
- [ ] All config keys match `src/config.ts`
- [ ] All MCP tool names match `src/mcpServer.ts`
- [ ] Cross-links resolve to real files
- [ ] The directory README.md is updated if a new file was added
