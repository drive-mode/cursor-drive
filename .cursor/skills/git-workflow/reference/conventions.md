# Git Workflow Conventions

Branch naming and commit message standards. See `.cursor/rules/git-workflow.mdc` for the rule that enforces these.

## Branch naming

| Prefix | Use case | Example |
|--------|----------|---------|
| `feature/` | New feature | `feature/auth-oauth` |
| `fix/` | Bug fix | `fix/login-timeout` |
| `docs/` | Documentation | `docs/api-reference` |
| `chore/` | Maintenance | `chore/deps-update` |

Pattern: `{type}/{short-description}`. Use kebab-case for description.

## Commit message format

Conventional Commits:

```
type(scope): short description

Optional body. Wrap at 72 chars.
```

Types: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `style`.

## Workflow rules

- Always use feature branches; never commit directly to `main`/`master`
- Validate branch name before `git checkout -b`
- Validate commit message before `git commit`
- Hooks enforce validation; cannot bypass
