# Merge Plan Format

Merge plans are stored in `docs/plans/merge-plan-YYYY-MM-DD.md`.

## Schema

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

## Fields

| Section | Purpose |
|---------|---------|
| PR Order | Ordered list of PRs to merge; fewest conflicts first |
| Branch | PR head branch name |
| Files changed | Paths modified in the PR |
| Conflict risk | Files that overlap with develop; line ranges if known |
| Resolution notes | Strategy per file; see conflict-patterns.md |
