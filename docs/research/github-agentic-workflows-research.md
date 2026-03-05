# GitHub Agentic Workflows Research

## Purpose

Research GitHub Agentic Workflows (gh-aw) documentation to identify ideas for Cursor Drive that we may have missed. gh-aw runs AI coding agents in GitHub Actions for repository automation—issue triage, CI investigation, docs updates, code quality.

**Sources**: [gh-aw docs](https://github.github.io/gh-aw/), [gh-aw repo](https://github.com/github/gh-aw), [agentics examples](https://github.com/githubnext/agentics)

---

## 1. Ideas We've Missed (High Value for Drive)

### 1.1 Safe Inputs / Safe Outputs Pattern

**What**: Agent runs **read-only**; writes happen via structured, validated outputs processed by a separate stage. Safe inputs = custom MCP tools with typed params, inline scripts (JS, Python, shell, Go), controlled secret access.

**For Drive**:
- **Safe outputs**: Drive could emit structured "intent" (create branch, add comment, revert) that a separate layer validates and executes—never give the model direct write access.
- **Safe inputs**: Inline tools in Drive config—e.g. `analyze-codebase`, `fetch-adr`—with typed inputs and env-bound secrets. Reduces prompt injection risk.

**Action**: Add "intent layer" between Drive and execution; validate before applying changes.

---

### 1.2 Sanitized Context

**What**: gh-aw provides `needs.activation.outputs.text`—sanitized context that neutralizes @mentions, bot triggers, XML injection, limits size (0.5MB, 65k lines), strips ANSI.

**For Drive**:
- Sanitize user prompt + workspace context before passing to model. Strip accidental triggers, limit token budget.
- For **voice**: dictation can inject "execute", "go", etc. Sanitization prevents accidental submission.

**Action**: Add context sanitization step before router/model.

---

### 1.3 Slash Command Triggers with Context

**What**: `/my-bot` as first word in comment; workflow receives sanitized `title + body` or comment body. Auto-add reaction (eyes), edit comment with run link.

**For Drive**:
- We have `/plan`, `/run`, `/drive`—but gh-aw's **context injection** is strong: "The current context text is: ${{ ... }}". Drive could inject workspace path, open files, selected text as structured context.
- **Reaction feedback**: When Drive starts, add a reaction or badge so user knows it's processing.

**Action**: Slash commands must receive rich, structured context (workspace, selection, open files); add visible "processing" feedback.

---

### 1.4 Lock-for-Agent (Concurrency Control)

**What**: `lock-for-agent: true` on issue triggers—locks the issue during workflow execution to prevent race conditions and concurrent modifications.

**For Drive**:
- When Drive is "driving" on a file or branch, **lock** or mark it so other agents/sessions don't conflict.
- Per-session mutex: only one Drive session per workspace (or per branch) at a time.

**Action**: Add session locking—e.g. "Drive is active on branch X" badge; block or queue overlapping Drive sessions.

---

### 1.5 Skip-If-Match / Skip-If-No-Match

**What**: Conditionally skip workflow based on GitHub search query. `skip-if-match: 'is:issue is:open in:title "[daily-report]"'`—skip if any match. `skip-if-no-match`—skip if no matches.

**For Drive**:
- **Skip if no work**: "Skip Drive activation if no uncommitted changes" or "if no open TODOs".
- **Skip if busy**: "Skip if another Drive session is active".
- Reduces unnecessary model calls and cost.

**Action**: Add pre-activation checks (workspace state, session count) before starting Drive.

---

### 1.6 Manual Approval Gates

**What**: `manual-approval: production`—requires human approval before execution via GitHub environment protection rules.

**For Drive**:
- **Approval for destructive actions**: Revert, delete branch, force push—require explicit user approval in chat (button or "yes").
- Matches our version-control-first, "ask before worktree" flow.

**Action**: Add approval gates for high-impact actions; surface in chat as buttons.

---

### 1.7 Dictation / Speech-to-Text Skill

**What**: gh-aw has a **dictation skill** (SKILL.md) that:
- Fixes speech-to-text errors (e.g. "agent ic workflows" → "agentic workflows")
- Project glossary for terminology
- Removes filler words (um, like, you know)
- Improves clarity and professional tone

**For Drive**:
- For voice-first: run dictation post-processing before routing. Fix "drive" vs "dive", "revert" vs "revert", etc.
- Maintain a Drive-specific glossary (plan, run, drive, revert, worktree, branch).

**Action**: Add dictation post-processing for voice input; glossary for Drive terms.

---

### 1.8 Agent Imports & Versioning

**What**: Import agents from `owner/repo/.github/agents/agent-name.md@v1.0.0`. Shareable agent instructions, versioned, reusable across teams.

**For Drive**:
- **Drive agent library**: Different "driver" personalities or specializations—e.g. `drive/planning.md`, `drive/security-review.md`—importable and versioned.
- User could choose "strict planner" vs "fast executor" agent.

**Action**: Support agent imports in Drive config; allow swapping Drive "personality" or mode.

---

### 1.9 Tool Allowlists & Least Privilege

**What**: Bash tool allows specific commands: `bash: ["echo", "ls", "git status"]` or `git:*` for families. No write by default.

**For Drive**:
- Explicit **tool allowlist** for Drive: which MCP tools, which file ops, which git commands.
- Per-session or per-user policy: "Drive can read, create branch, edit—but not force push."

**Action**: Define Drive tool allowlist; enforce least privilege per action type.

---

### 1.10 Structured Safe Output Types

**What**: Pre-defined output types—`create-issue`, `add-comment`, `create-pull-request`, `add-labels`—with max limits, validation, auto-expiration.

**For Drive**:
- **Drive output types**: `create-branch`, `revert-edit`, `add-comment`, `apply-changes`—each with schema, max count, approval flag.
- Supports deterministic post-processing and auditability.

**Action**: Define Drive intent schema; validate before execution.

---

## 2. Ideas We Could Strengthen

### 2.1 Fuzzy Scheduling (for Scheduled Drive)

**What**: `on: daily` scatters execution time deterministically per workflow to avoid load spikes. `daily between 9:00 and 17:00`, `daily around 14:00`.

**For Drive**:
- If we add "scheduled Drive" (e.g. daily standup, weekly review), use scattered times.
- Less relevant for on-demand Drive; relevant for future "background Drive" features.

---

### 2.2 Stop-After (Cost Control)

**What**: `stop-after: "+7d"`—disable workflow triggering after a deadline.

**For Drive**:
- **Session timeout**: Drive session auto-ends after N minutes of inactivity.
- **Trial/cost cap**: "Drive mode expires after 10 hours this week" for cost control.

---

### 2.3 Workflow Lock File (Compile Step)

**What**: `.md` is source of truth; `gh aw compile` generates `.lock.yml` with security hardening. Commit both.

**For Drive**:
- **Config compilation**: Drive rules/config could compile to a validated, locked format—prevents runtime config injection.
- Less critical for extension; more for backend/orchestration.

---

### 2.4 Reaction Feedback

**What**: Command workflows add eyes emoji to triggering comment; edit comment with workflow run link.

**For Drive**:
- **Visual feedback**: When user says "drive" or submits, show immediate reaction—e.g. "Drive listening" badge, or edit last message with "Processing...".
- We have this in the journey doc; gh-aw reinforces it.

---

## 3. Ideas That Align With What We Have

| gh-aw Concept | Our Equivalent |
|---------------|----------------|
| Natural language instructions | Drive mode, planning prompts |
| MCP for tools | We use a local MCP server as the AI-to-extension bridge |
| Multiple AI engines | Cursor has model selection |
| Slash commands | /plan, /run, /drive |
| Version control first | Worktree/branch in our journey |
| Human approval for critical ops | Approval gates in journey |
| Defense-in-depth security | Drive strict-mode defaults, approval gates |

---

## 4. Summary: Top Actions for Cursor Drive

| Priority | Idea | Action |
|----------|------|--------|
| **P0** | Dictation post-processing | Add voice → text cleanup; glossary for Drive terms; filler removal |
| **P0** | Sanitized context | Sanitize user input + workspace context before model; limit size |
| **P1** | Safe outputs pattern | Drive emits structured intents; separate validation/execution layer |
| **P1** | Approval gates | Buttons or "yes" for revert, worktree, destructive actions |
| **P1** | Session locking | One Drive session per workspace/branch; prevent conflicts |
| **P2** | Skip-if checks | Pre-activation: skip if no changes, or if another session active |
| **P2** | Tool allowlist | Explicit allowlist for Drive; least privilege |
| **P2** | Agent imports | Versioned, shareable Drive agent configs |
| **P3** | Structured output schema | Define create-branch, revert, apply-changes with validation |

---

## 5. References

- [How They Work](https://github.github.io/gh-aw/introduction/how-they-work/)
- [Safe Outputs](https://github.github.io/gh-aw/reference/safe-outputs/)
- [Safe Inputs](https://github.github.io/gh-aw/reference/safe-inputs/)
- [Triggers](https://github.github.io/gh-aw/reference/triggers/)
- [Command Triggers](https://github.github.io/gh-aw/reference/command-triggers/)
- [Packaging & Imports](https://github.github.io/gh-aw/guides/packaging-imports/)
- [Dictation Skill](https://raw.githubusercontent.com/github/gh-aw/main/skills/dictation/SKILL.md)
- [Security Architecture](https://github.github.io/gh-aw/introduction/architecture/)
