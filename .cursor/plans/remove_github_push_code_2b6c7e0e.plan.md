---
name: Remove GitHub Push Code
overview: "Remove all code related to pushing to GitHub: the plan-push-github feature (plans → issues), the pm-merge cursor-docs job that pushes auto-generated commits, and the push command from git_commit_tool.py."
todos: []
isProject: false
---

# Remove All Code Related to Pushing to GitHub

## Scope

Remove three categories of push-related code:

1. **Plan-push-github** — script and command that create GitHub issues from Cursor plans
2. **pm-merge cursor-docs job** — GHA job that commits and pushes auto-generated changelog to develop
3. **git_commit_tool.py push** — generic git push command in shadow script

---

## 1. Delete Plan-Push-Github Feature

**Delete files:**

- [scripts/plan_push_github.sh](scripts/plan_push_github.sh) — main script
- [.cursor/commands/plan-push-github.md](.cursor/commands/plan-push-github.md) — command definition

**Update [docs/status/plan-issue-mapping.md](docs/status/plan-issue-mapping.md):**

- Remove references to `/plan-push-github` and `scripts/plan_push_github.sh`
- Simplify to state that plan→issue mapping is deprecated or manual-only (or delete if redundant)

---

## 2. Remove pm-merge Cursor-Docs Push

**Edit [.github/workflows/pm-merge.yml](.github/workflows/pm-merge.yml):**

Remove the entire `cursor-docs` job (lines 74–124). That job:

- Runs Cursor CLI to update changelog and plan todos
- Commits and pushes to develop

Without the push, the job would create local commits that are discarded. Removing the whole job is cleaner than leaving a no-op.

The `close-issues` job (lines 16–72) stays — it updates project board status on merge; it does not push.

---

## 3. Remove Push from git_commit_tool.py

**Edit [docs/shadow/scripts/git_commit_tool.py](docs/shadow/scripts/git_commit_tool.py):**

- Remove `push()` function (lines 67–85)
- Remove `push` branch in `main()` (lines 108–115)
- Remove `push` from usage/help text (lines 9, 95, 120)
- Keep `commit` command only

---

## 4. Update References and Completion Criteria

**plan-graph.yaml** — [.cursor/plans/plan-graph.yaml](.cursor/plans/plan-graph.yaml):

- In `implement` completion_criteria, remove: `Every active plan has issue_ref mapping to roler-road-map`

**implement.plan.md** — [.cursor/plans/implement.plan.md](.cursor/plans/implement.plan.md):

- Remove Done Criterion #3: "Every active plan has an `issue_ref` mapping to `roler-road-map`"

**orchestrate command** — [.cursor/commands/orchestrate.md](.cursor/commands/orchestrate.md):

- Remove or soften the line: "Add `issue_ref` to newly created plans if GitHub issues exist"

**github_planning_orchestration plan** — [.cursor/plans/github_planning_orchestration_c1e92ec8.plan.md](.cursor/plans/github_planning_orchestration_c1e92ec8.plan.md):

- Update todo `plan-to-github-push` to `status: cancelled` with note that the tool was removed, or remove the todo

---

## 5. Documentation Updates (Optional / Light Touch)

- [docs/guides/pm-system.md](docs/guides/pm-system.md) — remove or update any "push plans to GitHub" / plan-push references
- [docs/adr/0021-planning-system-source-of-truth-split.md](docs/adr/0021-planning-system-source-of-truth-split.md) — add a short note that plan→GitHub push tooling was removed (optional; ADR describes design, not implementation)
- [docs/status/reconciliation-plans-issues-2026-02-23.md](docs/status/reconciliation-plans-issues-2026-02-23.md) — remove references to running plan_push_github (lines 100, 106)

---

## Out of Scope (Not Removed)

- **pm-sync.yml** — reacts to push events; does not perform push
- **deploy.yml** — triggers on push; does not push
- **src/roler/hooks/validator.py** — validates push targets (protected branches); defensive, does not push
- **issue_ref** field in plans** — convention remains; only the automated population tool is removed
- **GitHub MCP / merge tools** — used for PR merges, not direct push

---

## Verification

- `scripts/plan_push_github.sh` and `.cursor/commands/plan-push-github.md` no longer exist
- `pm-merge.yml` has no `cursor-docs` job
- `git_commit_tool.py` has no `push` command
- No broken references to plan-push-github in docs
- `pytest tests/` and lint pass for touched files
