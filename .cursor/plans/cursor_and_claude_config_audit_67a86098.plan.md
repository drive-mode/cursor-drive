---
name: Cursor and Claude config audit
overview: Audit every file in `.cursor/` and `.claude/` against file-type best practices, document each file with recommended changes, then have a subagent produce a consolidation plan to remove redundancies and bad practices.
todos: []
isProject: false
---

# .cursor/ and .claude/ Config Audit and Consolidation Plan

## Reference: Best practices used

- **Rules (Cursor):** [create-rule SKILL](.cursor/../create-rule) — `.mdc` in `.cursor/rules/`, YAML frontmatter (`description`, `globs?`, `alwaysApply?`), under ~50 lines, one concern per rule, actionable with examples.
- **Skills (Cursor/Claude):** [create-skill SKILL](.cursor/../create-skill) — `SKILL.md` with `name` + `description` (third-person, WHAT+WHEN, trigger terms), body under ~500 lines, progressive disclosure, no Windows paths, consistent terminology.
- **Commands:** Cursor uses frontmatter (`title`, `description`, `command`, `parameters`). Claude commands are often short usage docs or stubs that point to a skill.
- **Agents (Claude):** Frontmatter `name` + `description`, body = clear instructions; avoid duplicating rule/skill content.
- **Personas:** Clear role, when to consult, concise; can mirror “When to use” from skills to avoid drift.

---

## Part 1: .cursor/ file-by-file summary

### Personas (3 files)

| File | Purpose | Assessment | Recommended changes |
|------|---------|------------|---------------------|
| [.cursor/personas/computer_vision_expert.md](.cursor/personas/computer_vision_expert.md) | CV expert persona: image processing, detection, DL, metrics. | Well-structured (role, approach, principles, style, when to consult). | None critical. Optionally add explicit trigger phrase list so agent matching aligns with “When to Consult”. |
| [.cursor/personas/digital_forensics_expert.md](.cursor/personas/digital_forensics_expert.md) | Forensics persona: evidence, malware, timelines, chain of custody. | Same good structure. | Same as above. |
| [.cursor/personas/cryptography_expert.md](.cursor/personas/cryptography_expert.md) | Crypto persona: encryption, protocols, PQ crypto. | Same. | Same as above. |

### Rules (3 files)

| File | Purpose | Assessment | Recommended changes |
|------|---------|------------|---------------------|
| [.cursor/rules/decryption_guidelines.md](.cursor/rules/decryption_guidelines.md) | Long reference: hidden data extraction, PNG chunks, LSB, metadata, pipelines, validation. | **Not a rule:** ~410 lines, no frontmatter, `.md`. Cursor rules should be `.mdc`, short, one concern. | **Option A:** Move to `docs/decryption_guidelines.md` as project docs. **Option B:** Split into 2–3 focused `.mdc` rules (e.g. “Use config and project scripts for extraction”) with `description` + `globs`/`alwaysApply` and link to doc for detail. |
| [.cursor/rules/steganography_detection.md](.cursor/rules/steganography_detection.md) | Long reference: format analysis, PNG/JPEG rules, Unicode stego, workflow, tools, risk levels. | Same issue: ~240 lines, `.md`, no frontmatter. | Same as decryption: move to `docs/` or split into short `.mdc` rules that reference the doc. |
| [.cursor/rules/plans-require-todos.mdc](.cursor/rules/plans-require-todos.mdc) | Plans must have todos; use TodoWrite when executing. | Correct format: frontmatter (`description`, `alwaysApply: true`), concise. | None. |

### Commands (2 files)

| File | Purpose | Assessment | Recommended changes |
|------|---------|------------|---------------------|
| [.cursor/commands/analyze.md](.cursor/commands/analyze.md) | PNG analysis: CLI examples (png_analyzer, chunk_analyzer, unicode_scanner, steganography, batch). | **Reference doc**, not a Cursor command: no frontmatter, no `command`/`parameters`. | Either (1) Add frontmatter and define a command (e.g. `analyze`) with params, or (2) Move to `docs/analyze_commands.md` and keep one short command file that points to it. |
| [.cursor/commands/clean.md](.cursor/commands/clean.md) | Full “clean” command: stego detection/cleaning, battle sim, video, reporting. | Proper frontmatter (`title`, `description`, `command: clean`, `parameters`). | Optional: trim marketing-style bullets; keep one “Quick start” and one “Options” section for clarity. |

### Skills (1 file)

| File | Purpose | Assessment | Recommended changes |
|------|---------|------------|---------------------|
| [.cursor/skills/ai-detection-loop/SKILL.md](.cursor/skills/ai-detection-loop/SKILL.md) | AI detection loop: Identifier → Planner → Reviewer → feedback → implement → rerun. | Good: frontmatter, WHEN, workflow, CLI helpers, paths. | Minor: ensure description has trigger terms (already has “identify AI tells”, “run the AI detection loop”, “make this look less AI-generated”). Consider single source of truth with .claude copy (see Part 3). |

### Plans (1 file)

| File | Purpose | Assessment | Recommended changes |
|------|---------|------------|---------------------|
| [.cursor/plans/advanced-visualization-system-for-steganography-battle-simulation-0a2f25de.plan.md](.cursor/plans/advanced-visualization-system-for-steganography-battle-simulation-0a2f25de.plan.md) | To-dos for visualization engine, frame capture, self-healing detection, video, Rich dashboard, testing. | Plan content is fine. **Does not conform** to [plans-require-todos.mdc](.cursor/rules/plans-require-todos.mdc): rule requires a `todos` array in YAML frontmatter; this file uses a markdown list and HTML comment. | Add YAML frontmatter with `todos` array (id, content, status) so tooling and the rule are satisfied; keep the markdown list as human-readable view if desired. |

---

## Part 2: .claude/ file-by-file summary

### Agents (2 files)

| File | Purpose | Assessment | Recommended changes |
|------|---------|------------|---------------------|
| [.claude/agents/watermark-detector.md](.claude/agents/watermark-detector.md) | Specialist: run detection, interpret results, debug. Lists scripts and paths. | Clear name/description and bullet instructions. | Avoid duplicating full path layout: point to “See asset paths rule” or config; keep script list and report locations here. |
| [.claude/agents/asset-organizer.md](.claude/agents/asset-organizer.md) | Specialist: migrate/move/reorganize assets. Unified layout + legacy paths. | Clear. | **Redundancy:** Same layout and paths as [.claude/rules/asset-paths.md](.claude/rules/asset-paths.md). Agent should reference the rule as single source of truth and add only migration/behavior (e.g. when to run migrate script). |

### Commands (2 files)

| File | Purpose | Assessment | Recommended changes |
|------|---------|------------|---------------------|
| [.claude/commands/run-detection.md](.claude/commands/run-detection.md) | Usage for `python -m src.cli full-test [dir]` with examples and integration tests. | Short, clear. | None. |
| [.claude/commands/clean-image.md](.claude/commands/clean-image.md) | One-liner: invokes clean-image skill; single source [.claude/skills/clean-image/SKILL.md](.claude/skills/clean-image/SKILL.md). | Good pattern: command is stub to skill. | None. |

### Rules (2 files)

| File | Purpose | Assessment | Recommended changes |
|------|---------|------------|---------------------|
| [.claude/rules/asset-paths.md](.claude/rules/asset-paths.md) | Use `src.config`; unified layout; import and `ensure_dirs()`. | Focused, canonical. | Treat as **single source** for path layout; agents/other docs should reference it, not re-list paths. |
| [.claude/rules/watermark-workflow.md](.claude/rules/watermark-workflow.md) | After editing detection/cleaning: run tests, fixtures, output dirs, integration/unit test paths. | Focused. | None. |

### Skills (2 files)

| File | Purpose | Assessment | Recommended changes |
|------|---------|------------|---------------------|
| [.claude/skills/clean-image/SKILL.md](.claude/skills/clean-image/SKILL.md) | Run watermark pipeline on an image; agent must run CLI (PowerShell/Bash). | Strong: WHEN, “you run the commands”, steps, paths, alternatives. | None. |
| [.claude/skills/ai-detection-loop/SKILL.md](.claude/skills/ai-detection-loop/SKILL.md) | Same workflow as Cursor ai-detection-loop: Identifier → Planner → Reviewer → implement → rerun. | **Duplicate** of [.cursor/skills/ai-detection-loop/SKILL.md](.cursor/skills/ai-detection-loop/SKILL.md). | **Single source of truth:** Keep one canonical SKILL.md (e.g. in .cursor) and have .claude version be a short stub that links to it or sync from one place to avoid drift. |

### Settings (1 file)

| File | Purpose | Assessment | Recommended changes |
|------|---------|------------|---------------------|
| [.claude/settings.json](.claude/settings.json) | Schema + project description. | Minimal, valid. | None. |

---

## Part 3: Subagent consolidation plan (redundancies and bad practices)

A subagent will review the summaries above and produce a short consolidation plan. That plan will cover:

1. **Single source of truth** — Which files own “asset paths”, “ai-detection-loop” workflow, “clean”/“clean-image” behavior.
2. **Redundancy removal** — asset-organizer vs asset-paths; watermark-detector vs rules; Cursor vs Claude ai-detection-loop.
3. **Bad practice fixes** — Long .md “rules” in .cursor converted to .mdc or moved to docs; analyze.md vs command format; plan file frontmatter.
4. **Cross-folder consistency** — Naming (e.g. clean vs clean-image), where personas vs agents are used, and when to prefer a rule vs an agent vs a skill.

The output of that review is provided in the next section (subagent result).

---

## Part 4: Subagent output – consolidation plan

*Subagent will run in readonly mode on the summaries above and return a concise consolidation plan. Pending execution, placeholder actions below.*

**Planned consolidation actions:**

1. **ai-detection-loop (redundancy)**
   - Keep one canonical skill (e.g. `.cursor/skills/ai-detection-loop/SKILL.md`).
   - In `.claude/skills/ai-detection-loop/SKILL.md` either: replace with a short stub that says “See .cursor/skills/ai-detection-loop/SKILL.md” (if Claude can follow cross-folder links), or add a sync step/docs note so both stay in sync.

2. **Asset paths (redundancy)**
   - **Canonical:** `.claude/rules/asset-paths.md`.
   - **asset-organizer agent:** Reduce to “when to migrate/reorganize” and “use rule asset-paths and config”; remove full path list.
   - **watermark-detector agent:** Reference asset-paths rule for paths; keep script list and report locations.

3. **Cursor rules that are long docs (bad practice)**
   - **decryption_guidelines.md / steganography_detection.md:** Move to `docs/` (e.g. `docs/decryption_guidelines.md`, `docs/steganography_detection.md`). Optionally add 1–2 short `.mdc` rules in `.cursor/rules/` that state “when editing extraction/detection code, follow docs/decryption_guidelines.md and docs/steganography_detection.md” with appropriate `globs` or `alwaysApply`.

4. **Cursor commands (bad practice)**
   - **analyze.md:** Either add command frontmatter and a short body with one primary command + link to `docs/analyze_commands.md`, or move current content to `docs/analyze_commands.md` and leave a minimal command that points there.

5. **Plan file vs plans-require-todos (bad practice)**
   - **advanced-visualization-system-...plan.md:** Add YAML frontmatter with a `todos` array (id, content, status) matching the existing checklist items so it complies with `plans-require-todos.mdc`.

6. **No further redundancy**
   - Cursor `clean` (battle/demo) vs Claude `clean-image` (pipeline) serve different surfaces; keep both.
   - Personas are complementary to skills; no change beyond optional trigger wording.

After the user approves this plan, implementation can proceed in this order: (1) docs move + optional .mdc stubs, (2) plan file frontmatter, (3) analyze command decision + edit, (4) asset-path consolidation in .claude, (5) ai-detection-loop single source of truth.
