---
name: PR Merge Workflow Primitives
overview: Set up rules, commands, skills, and subagents to strategically merge open PRs into develop one at a time, with file-level merge plans for conflict handling. Includes both workflow-phase subagents and a coordinator that manages the Cursor primitives.
todos: []
isProject: false
---

# PR Merge Workflow Primitives Plan

## Architecture Overview

```mermaid
flowchart TD
    User[User] --> Cmd[/merge-prs-to-develop]
    Cmd --> Coord[PR Merge Coordinator]

    Coord --> PD[PR Discovery Agent]
    Coord --> CA[Conflict Analyst Agent]
    Coord --> MP[Merge Planner Agent]
    Coord --> ME[Merge Executor Agent]

    Coord --> Primitives[Primitives Manager]
    Primitives --> RulesMgr[Rules Manager]
    Primitives --> CmdMgr[Commands Manager]
    Primitives --> SkillMgr[Skills Manager]
    Primitives --> AgentMgr[Agents Manager]

    PD --> GitHub[GitHub MCP]
    CA --> Git[Git MCP]
    MP --> PlanDoc[Merge Plan Doc]
    ME --> Git
```



## 1. Rule: PR Merge Workflow

**File:** `[.cursor/rules/pr-merge-workflow.mdc](.cursor/rules/pr-merge-workflow.mdc)`

- **Globs:** None (loaded via skill/command context)
- **Purpose:** Standards when running PR merge workflow
- **Content:**
  - Target branch: `develop` only
  - Merge order: one PR at a time, no batch merges
  - Pre-merge: CI must pass, branch must be up to date
  - Merge method: prefer squash for feature branches
  - Conflict resolution: document strategy per file before attempting merge
  - Reference: [docs/guides/GIT_WORKFLOW_SETUP.md](docs/guides/GIT_WORKFLOW_SETUP.md) branch structure

## 2. Command: /merge-prs-to-develop

**File:** `[.cursor/commands/merge-prs-to-develop.md](.cursor/commands/merge-prs-to-develop.md)`

- **Purpose:** Orchestrate the full PR merge workflow
- **Steps:**
  1. Spawn PR Merge Coordinator with context (repo owner/name from git remote)
  2. Coordinator runs: Discovery → Analysis → Planning → (optional) Execution
  3. Output: merge plan document + per-PR file-level details
- **Modes:** `plan` (default, dry-run) | `execute` (perform merges)
- **Requirements:** `GITHUB_PERSONAL_ACCESS_TOKEN` for GitHub MCP; git MCP for local operations

## 3. Skill: pr-merge-strategy

**Location:** `[.cursor/skills/pr-merge-strategy/](.cursor/skills/pr-merge-strategy/)`

**SKILL.md:**

- Load when: PR merge, merge conflicts, strategic merge, "PRs into develop"
- Core workflow:
  1. List open PRs targeting develop (GitHub MCP `list_pull_requests`)
  2. For each PR: get files (`get_pull_request_files`), fetch develop diff
  3. Build file-overlap matrix (which PRs touch which files)
  4. Order PRs: fewest conflicts first, or by dependency
  5. Produce merge plan with per-file conflict notes

**Reference files:**

- `reference/merge-plan-format.md` - Schema for merge plan doc
- `reference/conflict-patterns.md` - Common conflict patterns and resolution strategies

**Merge plan document format** (stored in `docs/plans/merge-plan-YYYY-MM-DD.md`):

```markdown
# Merge Plan: YYYY-MM-DD

## PR Order
1. #N - title (branch) - [files count]
2. ...

## Per-PR File Details

### PR #N: title
- **Branch:** feat/xyz
- **Files changed:** path1, path2, ...
- **Conflict risk:** path1 (overlaps with develop changes in lines X–Y)
- **Resolution notes:** ...
```

## 4. Subagents

### 4a. Workflow-Phase Subagents


| Agent                      | File                                                                                   | Responsibility                                                                                                     |
| -------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| **PR Discovery Agent**     | `[.cursor/agents/pr-discovery-agent.md](.cursor/agents/pr-discovery-agent.md)`         | List open PRs targeting develop via GitHub MCP; fetch PR metadata, files changed, status checks                    |
| **Conflict Analyst Agent** | `[.cursor/agents/conflict-analyst-agent.md](.cursor/agents/conflict-analyst-agent.md)` | Compare PR branch vs develop; identify overlapping files; predict conflict hotspots; output file-level risk matrix |
| **Merge Planner Agent**    | `[.cursor/agents/merge-planner-agent.md](.cursor/agents/merge-planner-agent.md)`       | Order PRs for merge; produce merge plan doc with per-file details; suggest resolution strategies                   |
| **Merge Executor Agent**   | `[.cursor/agents/merge-executor-agent.md](.cursor/agents/merge-executor-agent.md)`     | Execute merge (Git MCP or `gh pr merge`); handle conflicts with documented strategy; verify post-merge             |


### 4b. Primitives Manager (Coordinator Subagent)

**File:** `[.cursor/agents/primitives-manager-agent.md](.cursor/agents/primitives-manager-agent.md)`

- **Purpose:** Manage rules, commands, skills, and agents for the PR merge workflow
- **Responsibilities:**
  - Ensure PR merge rule is loaded when workflow runs
  - Validate command invocation and parameters
  - Load pr-merge-strategy skill when coordinator runs
  - Know which subagents exist and when to delegate
- **Delegation:** Receives requests from PR Merge Coordinator; does not perform merges itself

### 4c. PR Merge Coordinator

**File:** `[.cursor/agents/pr-merge-coordinator.md](.cursor/agents/pr-merge-coordinator.md)`

- **Purpose:** Orchestrate the full workflow; delegate to workflow-phase agents and Primitives Manager
- **Flow:**
  1. Invoke Primitives Manager to validate/load primitives
  2. Spawn PR Discovery Agent → get open PRs
  3. Spawn Conflict Analyst Agent (per PR or batched) → get file overlap data
  4. Spawn Merge Planner Agent → produce merge plan doc
  5. If mode=execute: Spawn Merge Executor Agent for each PR in order
- **Integration:** Invoked by `/merge-prs-to-develop` command

## 5. Key Implementation Details

### GitHub MCP Tools Used

- `list_pull_requests` - owner, repo, state: "open", base: "develop"
- `get_pull_request` - full PR details
- `get_pull_request_files` - files changed with patch (critical for conflict prediction)
- `get_pull_request_status` - CI status
- `merge_pull_request` - when executing
- `update_pull_request_branch` - update branch before merge if needed

### Git MCP / gh CLI Fallback

- Git MCP: `git_diff`, `git_log`, `git_merge` for local conflict simulation
- gh CLI: `gh pr list --base develop --state open`, `gh pr diff`, `gh pr merge` (backup if MCP unavailable)

### Conflict Prediction Approach

1. Get `develop` HEAD and each PR branch HEAD
2. For each PR: `get_pull_request_files` gives changed paths
3. Build set of files touched by develop since PR branch point
4. Overlap = files in both sets → conflict risk
5. For high-risk files: fetch both versions, compare; document resolution strategy

### skill-usage.mdc Update

Add to **Context Signal Matching** table:


| Signal                                                                | Skill to Load       |
| --------------------------------------------------------------------- | ------------------- |
| "merge PRs", "PRs into develop", "strategic merge", "merge conflicts" | `pr-merge-strategy` |


## 6. File Summary


| Type        | Path                                                              |
| ----------- | ----------------------------------------------------------------- |
| Rule        | `.cursor/rules/pr-merge-workflow.mdc`                             |
| Command     | `.cursor/commands/merge-prs-to-develop.md`                        |
| Skill       | `.cursor/skills/pr-merge-strategy/SKILL.md`                       |
| Skill ref   | `.cursor/skills/pr-merge-strategy/reference/merge-plan-format.md` |
| Skill ref   | `.cursor/skills/pr-merge-strategy/reference/conflict-patterns.md` |
| Agent       | `.cursor/agents/pr-merge-coordinator.md`                          |
| Agent       | `.cursor/agents/pr-discovery-agent.md`                            |
| Agent       | `.cursor/agents/conflict-analyst-agent.md`                        |
| Agent       | `.cursor/agents/merge-planner-agent.md`                           |
| Agent       | `.cursor/agents/merge-executor-agent.md`                          |
| Agent       | `.cursor/agents/primitives-manager-agent.md`                      |
| Rule update | `.cursor/rules/skill-usage.mdc` (add pr-merge-strategy trigger)   |


## 7. Additional Suggestions

1. **Merge plan persistence:** Store plans in `docs/plans/` for audit trail and conflict-resolution reference.
2. **Dry-run default:** Command defaults to `plan` mode; require explicit `execute` to perform merges.
3. **Repo detection:** Derive owner/repo from `git remote get-url origin` or allow override in command.
4. **GitHub MCP deprecation:** Package is deprecated; consider migrating to `github/github-mcp-server` when stable.
5. **Coordinator in subagents reference:** Add PR Merge Coordinator and workflow agents to [docs/guides/subagents-reference.md](docs/guides/subagents-reference.md) and [docs/diagrams/cursor-primitives-architecture.diagram.md](docs/diagrams/cursor-primitives-architecture.diagram.md).
