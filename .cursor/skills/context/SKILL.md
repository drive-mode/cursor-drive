# Context skill

---
name: context
description: >
  Diagnostic and optimization skill for agent context. Use to measure what an agent
  loaded (tokens, files, load levels), compare against workflow priors, and propose
  or apply optimizations. Proactive before long agentic tasks or after a slow/expensive
  session.
triggers:
  - "/context"
  - "what's in context"
  - "reduce token usage"
  - "audit what agent loaded"
  - "optimize workflow token footprint"
  - "why so many tokens"
  - "what did the agent load"
  - "optimize my context"
  - "build a context prior"
---

## Scope

- **Root:** Agent runs from the context skill root (`.cursor/skills/context/`).
- **Scripts:** `scripts/` (measure.py, optimize.py, diff.py).
- **References:** `references/` (workflow-priors.yaml, load-levels.md).

---

## Mode routing

| User intent | Mode | Example |
|-------------|------|--------|
| `/context` or `/context report` | Report | Show current or last-session context usage |
| `/context optimize` | Optimize | Propose/apply rebalancing using priors |
| `/context diff` or `/context learn` | Diff/Learn | Compare before/after; update priors from outcome |
| `/context reset` | Reset | Clear priors for a workflow type (edit workflow-priors.yaml) |

---

## 1. Report mode

**When:** User says `/context`, `/context report`, or asks what’s in context / what the agent loaded / token usage.

1. **Find transcript**
   - Prefer most recent under `.cursor/transcripts/` or `~/.claude/` (or workspace equivalent).
   - If none found or ambiguous, ask: “No transcript found under .cursor/transcripts or ~/.claude. Please provide the path to the transcript file.”

2. **Run measure**
   - From skill root:
     `python scripts/measure.py --transcript <path> --format table`
   - If user wants JSON for later steps: add `--output scripts/profile_current.json`.

3. **Show output**
   - Display the measure script stdout (table or summary).

4. **Prior note**
   - If `references/workflow-priors.yaml` has a matching workflow with `sessions > 0` or `p50_savings_pct`, briefly note expected savings from priors (e.g. “Priors suggest ~X% savings for this workflow type.”).

5. **Next step**
   - Offer: “Run `/context optimize` to apply suggestions?”

---

## 2. Optimize mode

**When:** User says `/context optimize` or wants to reduce tokens / optimize context.

1. **Report first**
   - Run Report mode (find transcript, run measure with `--format table` and `--output scripts/profile_before.json`).
   - Show the table so the user sees current usage.

2. **Save before profile**
   - Ensure profile is written:
     `python scripts/measure.py --transcript <path> --format json --output scripts/profile_before.json`

3. **Dry-run optimize**
   - Run (omit `--apply` for dry-run):
     `python scripts/optimize.py --profile scripts/profile_before.json --priors references/workflow-priors.yaml`
   - Display the proposal (file-level and/or load-level changes).

4. **Confirmation**
   - If the proposal would change load levels or excludes (i.e. requires user approval per policy), pause and ask: “Apply these changes? (yes/no)”
   - If user approves (or policy does not require confirmation), continue.

5. **Apply**
   - Run:
     `python scripts/optimize.py --profile scripts/profile_before.json --priors references/workflow-priors.yaml --apply`
   - Capture the proposal JSON from stdout.

6. **Build profile_after for Diff**
   - `optimize.py --apply` does not write a second TokenProfile. diff.py needs two profiles (before + after). Build a synthetic “after” profile: copy `scripts/profile_before.json`, apply the proposal’s `changes` to each matching file’s `load_level_detected`, set `total_tokens` to the proposal’s `proposed_tokens`, and write to `scripts/profile_after.json`. If you cannot synthesize (e.g. proposal format doesn’t match), skip handoff and say: “To update priors, run another session with the suggested rebalancing, then run `/context learn` with the new transcript as the ‘after’ measure.”

7. **Hand off to Diff/Learn**
   - If `scripts/profile_after.json` exists, continue to Diff/Learn mode with `scripts/profile_before.json` and `scripts/profile_after.json`.

---

## 3. Diff/Learn mode

**When:** User says `/context diff`, `/context learn`, or Optimize mode has just applied and hands off.

1. **Before/after profiles**
   - Use existing `scripts/profile_before.json` and `scripts/profile_after.json` if from Optimize.
   - Otherwise, if user has only one run: run measure twice (before/after) or ask for paths. If only one profile exists, say “Need both before and after profiles; run Report then Optimize, or provide two profile paths.”

2. **Outcome**
   - Ask or infer: “Did the session succeed (e.g. task completed) or fail (e.g. missing context)?” Set `--outcome success`, `failure`, or `unknown`.

3. **Run diff**
   - Run:
     `python scripts/diff.py --before scripts/profile_before.json --after scripts/profile_after.json --priors references/workflow-priors.yaml --outcome <success|failure|unknown>`
   - Display what was learned (e.g. new excludes, outline vs full decisions).

4. **Confirm prior update**
   - After diff.py updates `references/workflow-priors.yaml`, say: “Prior updated. X sessions recorded for workflow type \<type\>.”

---

## 4. Reset mode

**When:** User says `/context reset` or “clear priors for workflow X”.

1. Open `references/workflow-priors.yaml`.
2. For the chosen workflow key (e.g. `plan-executor`, `code-review`), set `sessions: 0` and clear or reset `avg_tokens_before`, `avg_tokens_after`, `p50_savings_pct`, and optionally `reliable_excludes` / `reliable_outlines` / `always_full` to defaults or empty.
3. Confirm: “Priors cleared for workflow \<type\>.”

---

## 5. Reference loading

- **load-levels.md:** Load `references/load-levels.md` only when explaining a *rebalancing decision* (e.g. why a file was moved to outline vs full) to a user who is unfamiliar with load levels.
- Do **not** load load-levels.md on every Report or Optimize invocation; use it on demand for explanation.

---

## Script reference (from skill root)

| Script | Purpose |
|--------|--------|
| `scripts/measure.py` | `--transcript <path> [--format json\|table] [--output <path>] [--budget N]` |
| `scripts/optimize.py` | `--profile <path> --priors references/workflow-priors.yaml` (omit `--apply` for dry-run) |
| `scripts/diff.py` | `--before <path> --after <path> --priors references/workflow-priors.yaml [--outcome success\|failure\|unknown]` |
