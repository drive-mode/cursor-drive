---
name: Second Brain Full Conversion
overview: Convert the codebase to "second brain" terminology throughout, rename Literature to Documentation (folder, note_type, template, copy), remove "americanized" meta-references, and add a single source of truth for categories aligned with your Discord TOC.
todos: []
isProject: false
---

# Second Brain Full Conversion Plan

## Scope

- **Terminology**: Use "second brain" / "Second Brain" everywhere; remove "Zettelkasten", "americanized", and "coding- and business-oriented" as meta-descriptors.
- **Literature → Documentation**: Folder `10_Literature` → `10_Documentation`, note_type `literature` → `documentation`, template `note-literature` → `note-documentation`, and all user-facing copy.
- **Categories**: Add a canonical categories doc aligned with your Discord TOC; reference it from schema and README for tags.

---

## 1. Categories (Discord TOC alignment)

**New file**: [99_System/categories.md](99_System/categories.md)

- Single source of truth listing your Discord structure: each top-level header = category, each `#hashtag` = subcategory.
- Content: Documents (architecture, proposals, templates, tech-stack, glossary, diagrams); Design (brand, orchestration, front-end, middle-ware, examples, data-layer, networking-authentication); Project Management (planning, agenda, weekly-recap, daily-recap); TODO (todo, to-research); cewl-ai-shit (skills, agents, prompts, blogs-updates-research, plugins); General (general, debugging, ideas, tech-brainrot, daily-notes, tech-links); Business (founders-documents, expenses, biznis).
- State that tags should use this structure (e.g. `documents/architecture`, `design/brand`) so notes align with Discord.

---

## 2. Schema and core docs

**[99_System/note-schema.md](99_System/note-schema.md)**

- Replace opening line: drop "Americanized, coding-oriented vocabulary"; describe as "Roler second brain schema" (or similar); keep "permanent note = one atomic idea", "note system = knowledge base".
- `note_type` enum: `literature` → `documentation`.
- Folder layout: `10_Literature/` → `10_Documentation/` and description "one note per source (docs, RFCs, blog posts, internal design docs)".
- Tags: recommend category/subcategory from [99_System/categories.md](99_System/categories.md) (e.g. `documents/architecture`, `design/brand`) in addition to or instead of only `coding/`, `business/`, `roler/` so the second brain aligns with Discord.

**[README-notes.md](README-notes.md)**

- Title/intro: "Roler Second Brain (Obsidian)" and short description of the second brain (no "Americanized, coding- and business-oriented").
- Point to schema and to categories for tag structure.

---

## 3. Folder and template rename

- **Rename folder**: `10_Literature/` → `10_Documentation/`.
- **Rename template**: [90_Templates/note-literature.md](90_Templates/note-literature.md) → `90_Templates/note-documentation.md`; set `note_type: documentation` in frontmatter.

---

## 4. Scripts

**[scripts/validate_links.py](scripts/validate_links.py)**

- In `resolve_target()`, change candidate `vault / "10_Literature" / base` to `vault / "10_Documentation" / base`.

No change to [scripts/validate_schema.py](scripts/validate_schema.py) (only validates permanent notes in 20_Notes; no note_type enum check). No change to [scripts/create_note.py](scripts/create_note.py) (creates only permanent notes in 20_Notes).

---

## 5. Cursor: skills, agents, commands, rules

**Skills** (both [.cursor/skills/obsidian-notes/SKILL.md](.cursor/skills/obsidian-notes/SKILL.md) and [.cursor-plugin/skills/obsidian-notes/SKILL.md](.cursor-plugin/skills/obsidian-notes/SKILL.md)):

- Title/description: "Roler Second Brain" (or "Obsidian Second Brain"); drop Zettelkasten.
- Schema: `note_type` → include `documentation` instead of `literature`.
- Folders: `10_Literature/` → `10_Documentation/` ("documentation/sources").

**[.cursor/agents/note-taker.md](.cursor/agents/note-taker.md)** and **[.cursor/agents/obsidian.md](.cursor/agents/obsidian.md)**:

- Description: "Roler second brain" / "note system"; "inbox vs documentation vs permanent note".
- Replace "Literature (10_Literature/)" with "Documentation (10_Documentation/): one note per source…".
- obsidian.md: "inbox/documentation/permanent" and point to note-taker.

**Commands** (capture, research, moc, notes):

- [.cursor/commands/capture/COMMAND.md](.cursor/commands/capture/COMMAND.md): "Source → Documentation", `10_Documentation/`, `note-documentation` template.
- [.cursor/commands/research/COMMAND.md](.cursor/commands/research/COMMAND.md): "documentation in 10_Documentation/", "Literature notes" → "Documentation notes".
- [.cursor/commands/moc/COMMAND.md](.cursor/commands/moc/COMMAND.md): "10_Documentation/" instead of "10_Literature/".
- [.cursor/commands/notes/COMMAND.md](.cursor/commands/notes/COMMAND.md): "inbox/documentation/permanent".

**Rules**:

- [.cursor/rules/note-substance.md](.cursor/rules/note-substance.md): "source material, documentation, permanent notes, MOCs"; drop "literature".
- [.cursor/rules/note-vault-writes.md](.cursor/rules/note-vault-writes.md) and [.cursor-plugin/rules/note-vault-writes.md](.cursor-plugin/rules/note-vault-writes.md): path `10_Literature/` → `10_Documentation/`.

---

## 6. Templates README and meta

**[90_Templates/README.md](90_Templates/README.md)**

- "note-literature" → "note-documentation" (Documentation notes: source, claims, quotes, citations).
- Tags: reference categories (e.g. from 99_System/categories.md) alongside coding/business/roler if desired.

**[meta/plan-review-and-cursor-layout.md](meta/plan-review-and-cursor-layout.md)**

- Table: `10_Literature` → `10_Documentation`; note_type "literature" → "documentation"; "note-literature" → "note-documentation".
- Remove "Americanized naming" from "Did we build the second brain system?" paragraph.

**[meta/mermaid-in-obsidian.md](meta/mermaid-in-obsidian.md)**

- "Literature notes (10_Literature/)" → "Documentation notes (10_Documentation/)".

---

## 7. Long spec doc (agent-readable)

**[agent-readable-zettelkasten-obsidian.md](agent-readable-zettelkasten-obsidian.md)**

- **Rename** to `agent-readable-second-brain-obsidian.md`.
- **Global terminology pass** (in order to avoid breaking internal refs):
  - "Zettelkasten" / "Zettel" / "Zettel" → "second brain" / "permanent note" / "note" as appropriate (keep "structure notes", "MOCs", "claim block").
  - "literature" → "documentation"; "Literature" → "Documentation"; `10_Literature/` → `10_Documentation/`.
  - "zk_id" → "note_id", "zk_type" → "note_type" where the spec describes the implemented schema (so it matches [99_System/note-schema.md](99_System/note-schema.md)).
  - Remove "americanized" and "coding- and business-oriented" style meta-references.
- **Folder layout section**: `20_Zettels/` → `20_Notes/` (already true in practice); `10_Literature/` → `10_Documentation/`.
- **Frontmatter examples**: use `note_id`, `note_type` and `note_type: "documentation"` / `"permanent"` etc.

**.gitignore**: if it currently ignores `agent-readable-zettelkasten-obsidian.md`, add `agent-readable-second-brain-obsidian.md` and remove the old filename (or keep both if the old one is deleted).

---

## 8. Legacy / optional

- **meta/plans/agent-readable_zk_obsidian_5c7c344c.plan.md**: Optional; either update "Literature" → "Documentation", "10_Literature" → "10_Documentation", and "Zettelkasten" → "second brain" for consistency, or leave as historical.

---

## Summary of renames


| Current                                 | New                                     |
| --------------------------------------- | --------------------------------------- |
| 10_Literature/                          | 10_Documentation/                       |
| note_type: literature                   | note_type: documentation                |
| note-literature.md template             | note-documentation.md                   |
| "Literature" (UI/copy)                  | "Documentation"                         |
| "Zettelkasten" / "americanized" (docs)  | "second brain" / removed                |
| agent-readable-zettelkasten-obsidian.md | agent-readable-second-brain-obsidian.md |


---

## Verification

- Run `python scripts/validate_schema.py` and `python scripts/validate_links.py` from vault root (after folder rename) to confirm no regressions.
- Grep for `Literature`, `literature`, `10_Literature`, `note-literature`, `Zettelkasten`, `americanized` and fix any remaining hits in docs/skills/commands (excluding the legacy plan and the renamed spec file if you keep the old one in history only).
