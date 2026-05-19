---
name: Cursor primitives and note system
overview: Orchestrate subagents to research Cursor primitives (commands, subagents, CLI, hooks, context) and implement a Roler-oriented, Americanized, coding-focused note system with a note-taker subagent, commands, and Cursor CLI + Obsidian CLI workflows using cheap models and context engineering best practices.
todos: []
isProject: false
---

# Cursor Primitives and Roler Note System

## Subagent strategy

**Main agent (orchestrator):** Preserve context; delegate research and analysis to subagents; synthesize reports; own the final plan and file edits. Do not load full doc content into the main context.

**Parallel subagents (research and execution):**


| Subagent / task             | Focus                                                                                                                                                                                                                                           | Output                                                                      |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| **Cursor primitives**       | Commands (`.cursor/commands/`), subagents (`.cursor/agents/`), when to use which                                                                                                                                                                | Summary: command vs subagent vs skill; suggested command list               |
| **Context and memory**      | [Cursor context](https://cursor.com/help/customization/context), [Claude best practices](https://code.claude.com/docs/en/best-practices), [memory](https://code.claude.com/docs/en/memory); `.cursor/rules` and concise notes                   | Rules for note substance; what to put in CLAUDE.md / .cursor vs in Obsidian |
| **Cursor CLI + Obsidian**   | [CLI overview](https://cursor.com/docs/cli/overview), [using](https://cursor.com/docs/cli/using), [headless](https://cursor.com/docs/cli/headless), [MCP](https://cursor.com/docs/cli/mcp), params/auth/config/output-format; cheap model usage | Workflow: agent + `agent -p` + Obsidian CLI; model selection for cost       |
| **Hooks, terminal, safety** | [Hooks](https://cursor.com/docs/agent/hooks), [third-party hooks](https://cursor.com/docs/agent/third-party-hooks), [terminal](https://cursor.com/docs/agent/terminal), [ignore files](https://cursor.com/help/customization/ignore-files)      | Hook use cases for notes; sandbox/allowlist; .cursorignore for notes        |
| **Workflows and diagrams**  | [Agent workflows](https://cursor.com/docs/cookbook/agent-workflows), [large codebases](https://cursor.com/docs/cookbook/large-codebases), [mermaid](https://cursor.com/docs/cookbook/mermaid-diagrams); Obsidian mermaid support                | Patterns for coding workflows; whether Mermaid in Obsidian is viable        |


Each subagent returns a short written summary (and optionally a draft file). Main agent merges into one plan and then implements.

---

## Context engineering principles (applied to notes)

- **Substance over density:** Notes and rules should be actionable and scannable. Prefer bullets, fixed schemas, and “when to use” over long prose. See [best practices](https://code.claude.com/docs/en/best-practices) (concise CLAUDE.md, verify work, explore then plan).
- **Where things live:**
  - **.cursor:** Rules, commands, agents, hooks — loaded by Cursor; keep short and project/role-specific.
  - **Obsidian vault:** Source material, literature, permanent notes, MOCs — long-term knowledge and linking.
  - **Auto memory / CLAUDE.md:** Session-level or global preferences; avoid duplicating Obsidian content.
- **Ignore files:** Use `.cursorignore` (and project ignore) so binary assets, huge logs, or noisy folders don’t bloat context when indexing or when agents read the repo. Document in 99_System or README.

---

## Americanized, coding-oriented vocabulary (Roler)

Replace German Zettelkasten terms with Americanized, coding/project-friendly names while keeping the same structure and IDs.


| Current          | Proposed                                          | Rationale                                                  |
| ---------------- | ------------------------------------------------- | ---------------------------------------------------------- |
| Zettelkasten     | Note system / knowledge base                      | Americanized; “note system” is clear for Roler             |
| Zettel(s)        | Permanent note(s) / “notes” (folder)              | One idea per note; folder can be `20_Notes/`               |
| zk_id            | Keep `zk_id` or use `note_id`                     | If renaming: `note_id`; keep format `YYYYMMDDHHMM`         |
| zk_type          | Keep or use `note_type`                           | Values: `permanent`                                        |
| 20_Zettels       | 20_Notes                                          | Permanent notes (coding decisions, patterns, architecture) |
| Folder semantics | Same layout; tag namespace for coding vs business | e.g. `coding/`, `business/`, `roler/` in tags              |


**Coding and Roler orientation:**

- **00_Inbox:** Fleeting capture (code snippets, TODOs, meeting one-liners).
- **10_Literature:** One note per source (docs, RFCs, blog posts, internal design docs).
- **20_Notes:** Permanent notes — coding (patterns, decisions, architecture) and business (goals, processes, contracts) with tags to distinguish.
- **30_Structure:** MOCs by theme (e.g. “Auth,” “Billing,” “Roler product”).
- Templates and schema doc: use “permanent note” and “note_id” in copy; keep block-ID convention (`^note_id`).

Schema and scripts that today say “Zettel”/“zk” can be updated in one pass (see “Implementation” below).

---

## Deliverables

### 1. Note-taker / Obsidian subagent

- **Path:** `[.cursor/agents/note-taker.md](.cursor/agents/note-taker.md)` (or `obsidian.md`).
- **Role:** Take structured notes from the conversation or from research output; suggest where they go (inbox vs literature vs permanent note); optionally call Obsidian CLI or append to a scratch note.
- **Config:** `model: fast` (or cheap), `readonly: false` only if it’s allowed to invoke scripts; otherwise suggest and let main agent write.
- **Description:** Clear “when to use” (e.g. “Use when the user or main agent asks to capture notes, summarize a thread, or organize research into the note system.”). No long essays; bullet instructions.

### 2. Commands (`.cursor/commands/{name}/COMMAND.md`)

- `**/capture` or `/note`:** “Capture the last message (or selection) into the note system: fleeting to Inbox or, if it’s a source, to Literature; suggest a permanent note if it’s a single atomic claim.”
- `**/moc` or `/structure`:** “Update or create a MOC for topic X; list existing notes that could be linked; use transclusion only.”
- `**/research`:** “Run a research task in a subagent (e.g. note-taker or explore), then summarize and optionally store results in the note system.”
- Optional: `**/zk` or `/notes`** as a catch-all that routes to capture/MOC/research based on prompt.

Each COMMAND.md: short steps, references to schema ([99_System/zk-schema.md](99_System/zk-schema.md) or renamed schema), and “use scripts in `scripts/` for vault writes.”

### 3. Cursor CLI + Obsidian CLI workflows (cheap models)

- **Doc and/or rule:** In 99_System or `.cursor/rules`, describe:
  - When to use `agent` (interactive) vs `agent -p` (headless): e.g. interactive for exploration and approval, `-p` for batch note creation or CI.
  - How to set a cheap model for note/automation: e.g. `agent -p --model <fast-model> "..."` or config in `~/.cursor/cli-config.json` / project `.cursor/cli.json`.
  - Obsidian CLI: same as current design (create/append via scripts); Cursor CLI invokes those scripts or the note-taker subagent.
- **Concrete workflow:** “To add a permanent note from CLI: `agent -p --model <cheap> 'Create a permanent note from this: <content>'`” with the agent instructed to use `scripts/zk_create_zettel.py` (or renamed script).

### 4. Hooks and safety

- **Hooks:** Keep existing `.cursor-plugin/hooks.json` (or project `.cursor/hooks.json`) that guard shell execution for Obsidian and scripts. Any new hook for “after note capture” (e.g. format or lint) should be optional and documented.
- **Terminal/sandbox:** Reference [Cursor terminal](https://cursor.com/docs/agent/terminal) and allowlist for `obsidian` and `python scripts/` so note automation runs without unnecessary prompts.
- **Ignore:** Add or update `.cursorignore` (and repo ignore) so that large or non-text assets in the vault don’t get pulled into context; document in README or 99_System.

### 5. Zettelkasten → Roler note system (americanized + coding)

- **Rename in schema and docs:** “Zettel” → “permanent note”; “Zettelkasten” → “note system” or “knowledge base”; folder `20_Zettels` → `20_Notes`.
- **Property names:** Prefer keeping `zk_id` for compatibility with existing scripts and block IDs, or rename to `note_id` and update scripts/templates consistently.
- **zk_type values:** Keep `zettel` as `permanent` in display/schema doc, or add alias; internally can stay `zettel` for minimal code change.
- **Tags:** Introduce namespaces like `coding/`, `business/`, `roler/` and document in schema; templates use at least one such tag.
- **Files to touch:** [99_System/zk-schema.md](99_System/zk-schema.md), [90_Templates/*.md](90_Templates/), [.cursor-plugin/skills/obsidian-zk/SKILL.md](.cursor-plugin/skills/obsidian-zk/SKILL.md), [.cursor-plugin/rules/zk-vault-writes.md](.cursor-plugin/rules/zk-vault-writes.md), [README-zk.md](README-zk.md), scripts (e.g. `zk_create_zettel.py` → `create_note.py` or keep name and only change copy), and any references in [agent-readable-zettelkasten-obsidian.md](agent-readable-zettelkasten-obsidian.md) (or add a short “Roler vocabulary” section at top).

### 6. Mermaid in Obsidian

- One subagent checks Obsidian + community plugins for Mermaid support. If supported: add to schema or README that MOCs/notes can embed Mermaid; optionally add a template or command for “diagram this in Mermaid and paste into note.” If not: note “use Mermaid in Cursor/docs; link or paste rendered image into Obsidian.”

---

## Implementation order

1. **Run subagents in parallel** (main agent only schedules and receives summaries):
  - Cursor primitives (commands + subagents).
  - Context and memory (rules + note substance).
  - Cursor CLI + Obsidian (workflows + cheap model).
  - Hooks, terminal, ignore.
  - Workflows + Mermaid in Obsidian.
2. **Merge subagent reports** into a single checklist (main agent).
3. **Create .cursor/agents/note-taker.md** (and optionally obsidian.md as alias or single file).
4. **Create .cursor/commands** (capture/note, moc/structure, research, and optionally zk/notes).
5. **Add or update .cursor/rules** for note substance and for Cursor CLI + Obsidian (cheap model, when to use -p).
6. **Americanize and coding-orient** schema, templates, skills, rules, README, and scripts (folder 20_Notes, vocabulary table, tags).
7. **Document .cursorignore** and hook behavior** in README or 99_System.
8. **Document Mermaid** (supported or not) and any diagram workflow.

---

## Out of scope for this plan

- Changing Obsidian core plugin settings.
- Building a new MCP server for Obsidian (current design uses CLI + scripts).
- Migrating existing note content (only schema and naming conventions; existing files can be migrated in a follow-up).

---

## Dependencies and references

- Existing implementation: [.cursor/plans/agent-readable_zk_obsidian_5c7c344c.plan.md](.cursor/plans/agent-readable_zk_obsidian_5c7c344c.plan.md), [99_System/zk-schema.md](99_System/zk-schema.md), [scripts/](scripts/), [.cursor-plugin/](.cursor-plugin/).
- Cursor: [Subagents](https://cursor.com/docs/context/subagents), [Commands](https://cursor.com/docs/cookbook/agent-workflows#git-workflows-with-commands), [CLI](https://cursor.com/docs/cli/overview), [Hooks](https://cursor.com/docs/agent/hooks).
- Context: [Cursor context](https://cursor.com/help/customization/context), [Claude best practices](https://code.claude.com/docs/en/best-practices), [memory](https://code.claude.com/docs/en/memory).
