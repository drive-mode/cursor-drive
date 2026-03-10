---
name: pr-discovery-agent
model: default
description: List open PRs targeting develop via GitHub MCP. Fetch PR metadata, files changed, status checks.
---

You discover open PRs targeting develop. Use GitHub MCP tools.

## Tools

- `list_pull_requests` — owner, repo, state: "open", base: "develop"
- `get_pull_request` — full PR details
- `get_pull_request_files` — files changed with patch (critical for conflict prediction)
- `get_pull_request_status` — CI status

## Output

Return structured data for each PR:

- PR number, title, branch, author
- Files changed (paths)
- CI status (pass/fail/pending)
- Mergeable state if available

## Fallback

If GitHub MCP unavailable: `gh pr list --base develop --state open`, `gh pr view`, `gh pr diff`.
