# Compound-Engineering Plugin: Adoption Checklist

Items from [compound-engineering-plugin](https://github.com/EveryInc/compound-engineering-plugin/tree/e1906592cbd49889beb82e1be76359398b6d3d58/plugins/compound-engineering) that are relevant to Cursor Drive and **do not require external API keys**. Use this to decide what to implement manually in our codebase.

---

## Skills to adopt (no API keys)

| Skill | What it does | Our status / action |
|-------|--------------|---------------------|
| **brainstorming** | Explore WHAT to build before planning; one-question-at-a-time, YAGNI, capture to `docs/brainstorms/`. | **Add** — We have plan skills but no explicit "brainstorm before plan" flow. |
| **document-review** | Structured review of brainstorm/plan docs: assess → evaluate → one critical fix → simplify. | **Enhance** — We have `doc-reviewer` (docs accuracy/staleness). Consider a separate skill or section for "refine this plan/brainstorm" with their protocol. |
| **file-todos** | File-based todos in `todos/` with naming `{id}-{status}-{priority}-{desc}.md`, YAML frontmatter, dependencies, work logs. | **Optional** — If we want project-level todo tracking (not just in-memory TodoWrite). No API. |
| **git-worktree** | Create/list/switch/cleanup worktrees via a single script; .env copy, .gitignore. | **Reference only** — We already have `worktreeManager.ts`. Use their skill for **process** (when to offer worktree, cleanup flow) and optionally a small script for .env copy if we don't have it. |
| **agent-native-architecture** | Prompt-native agent design: action/context parity, shared workspace, MCP tool design. | **Selective** — Aligns with Drive's operator/tool design. Copy references that match our stack (e.g. `mcp-tool-design.md`, `shared-workspace-architecture.md`). |
| **create-agent-skills** / **skill-creator** | How to write effective skills (description, when-to-use, links). | **We have** `.cursor/skills/` and create-skill rule; use their checklist if we formalize skill reviews. |

**Skip (API / external deps):**
`rclone`, `gemini-imagegen`, `agent-browser` (optional npm), `context7` (external MCP).
`learnings-researcher` / `best-practices-researcher` / `framework-docs-researcher` may use web search — treat as optional or "with user's search" only.

---

## Commands / workflows to adopt (no API keys)

| Command | What it does | Our status / action |
|---------|--------------|---------------------|
| **workflows:brainstorm** | Run brainstorm flow; optionally run repo-research-analyst; save to `docs/brainstorms/`; handoff to plan or document-review. | **Add** — As a Cursor rule or a short command/skill that invokes the brainstorming skill and our plan flow. |
| **workflows:plan** | Turn feature/bug into a plan: idea refinement (or use brainstorm), local research (repo + learnings), optional external research, SpecFlow analysis, then write plan to `docs/plans/`. | **Align** — We have `.cursor/plans/` and plan-system-maintainer. Reuse their **structure** (minimal / standard / comprehensive) and "post-plan options" (deepen, review, work). |
| **workflows:compound** | Document solved problems so knowledge compounds (e.g. into `docs/solutions/`). | **Add** — Fits "capture what we learned" without any API. Can be a skill or a short command that writes to `docs/solutions/` with a template. |
| **changelog** | Changelog from recent merges (git + optional `gh`). Uses `disable-model-invocation: true` for deterministic steps; formatting is the only "creative" part. | **Add** — No API key. Optional Discord webhook is user-owned. We can have a small script or command that runs `git log`/`gh pr list` and then one LLM call for the prose. |
| **/triage** | Triage pending file-todos; approve/defer/priority. | **Only if** we adopt file-todos. |
| **/resolve_todo_parallel**, **/resolve_pr_parallel** | Resolve code TODOs or PR comments in parallel. | **Optional** — Process only; we'd wire to our executor (e.g. subagents). No API. |

**Skip:**
`/lfg`, `/slfg` (full autonomous/swarm — different product).
`/deepen-plan` (runs multiple research agents; some may use web).
`/test-browser`, `/feature-video`, `/xcode-test` (tooling-specific).
`/create-agent-skill`, `/heal-skill`, `/generate_command` (Claude Code–specific).

---

## Agents to use as prompt reference (no API keys)

All of these are **prompt-only** (model: inherit); no external services.

| Agent | Use for |
|-------|--------|
| **repo-research-analyst** | Onboarding, conventions, issue/PR patterns, template discovery. Use as prompt reference for "research this repo before planning". |
| **git-history-analyzer** | Why code looks the way it does; file evolution, contributors, patterns. Pure git commands. |
| **code-simplicity-reviewer** | Final pass for simplicity/minimalism. Good for "review mode" in our loop. |
| **pattern-recognition-specialist** | Patterns and anti-patterns in code. |
| **architecture-strategist** | ADR/compliance-style checks. We have ADRs; this can inform review. |
| **spec-flow-analyzer** | Validate/refine feature spec and flows. Useful before or after planning. |

**Skip:**
Design agents (Figma), every-style-editor (internal style guide), framework-specific reviewers (Rails/Python/DHH/Kieran) unless we add TS/Rails equivalents.
Security-sentinel, performance-oracle, data-* agents — use as optional "review lens" prompts if we want them.

---

## Structural conventions to adopt

- **Plan filename:** `docs/plans/YYYY-MM-DD-<type>-<kebab-name>-plan.md` (we already use date-prefixed plans; we can align type/name).
- **Brainstorm filename:** `docs/brainstorms/YYYY-MM-DD-<topic>-brainstorm.md`.
- **Solutions:** `docs/solutions/` for compound knowledge (problem → solution, no API).
- **Workflow order:** Brainstorm (WHAT) → Plan (HOW) → Work; optional document-review between steps.
- **Changelog:** From git + `gh` only; one LLM pass for tone/structure; Discord webhook optional.

---

## Summary: high-value, no-API additions

1. **Brainstorm flow** — Skill + optional command: clarify WHAT before plan; write to `docs/brainstorms/`.
2. **Document-review protocol** — For plans/brainstorms: assess → evaluate → one critical fix → simplify (extend or separate from doc-reviewer).
3. **workflows:compound** — Command/skill: "Document this solution" → `docs/solutions/` with template.
4. **Changelog command** — Script: recent merges via git/gh → single LLM call → formatted changelog (Discord optional).
5. **Plan structure** — Adopt minimal / standard / comprehensive levels and post-plan options in our plan-system-maintainer / execute-plans flow.
6. **Repo + git-history agents** — Use as prompt templates for "research before plan" and "why does this code look like this".
7. **file-todos** — Optional: only if we want persistent, file-based todo tracking with dependencies and work logs.
8. **Git worktree process** — Reuse their "when to offer worktree / cleanup" logic; we already have `worktreeManager`.

All of the above can be implemented with existing Cursor/Drive infra (skills, rules, MCP, extension) and no extra API keys.
