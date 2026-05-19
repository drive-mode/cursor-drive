# Contributing to Cursor Drive

Thanks for your interest in contributing to Cursor Drive! This guide covers the
branching model, PR workflow, code quality expectations, and release process.

---

## Branch Strategy

| Branch | Purpose | Merge target |
|--------|---------|-------------|
| `master` | Stable releases. Tagged versions. Protected. | — |
| `develop` | Integration branch. All feature work lands here first. | `master` |
| `feature/<name>` | New features | `develop` |
| `bugfix/<name>` | Bug fixes | `develop` |
| `release/<name>` | Release prep (optional) | `develop` → `master` |
| `hotfix/<name>` | Urgent production fixes | `master` (then back-merge to `develop`) |

### Branch naming convention

Branch names must match one of these prefixes:

```
feature/   bugfix/   release/   hotfix/   cursor/   dependabot/
```

CI will reject PRs from branches that don't follow this convention.

### Merge strategy

| Direction | Strategy | Rationale |
|-----------|----------|-----------|
| Feature → develop | **Squash merge** | Clean, linear history on develop |
| Develop → master | **Merge commit** | Preserves integration boundary |
| Hotfix → master | **Merge commit** | Then cherry-pick or merge back to develop |

---

## Workflow

### 1. Create a branch

```bash
git checkout develop
git pull origin develop
git checkout -b feature/my-feature
```

### 2. Make changes

- Follow the code quality guidelines below
- Commit with conventional commit messages (see format below)
- Push early and often

### 3. Open a PR

- Target: `develop` (not `master`)
- Fill in the PR template with a description and testing notes
- CI runs automatically on PR creation and every push

### 4. Review

- CI must pass (compile + test + VSIX package)
- BugBot reviews the PR automatically using rules in `.cursor/BUGBOT.md`
- Address BugBot comments before requesting human review
- Get at least 1 approving review

### 5. Merge

- Use **squash merge** into develop
- Delete the feature branch after merge

---

## Commit Message Format

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): description
```

**Types:**

| Type | When to use |
|------|------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `style` | Formatting, no code change |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `test` | Adding or updating tests |
| `chore` | Tooling, config, dependencies |
| `ci` | CI/CD workflow changes |

**Scope** (optional): module name or area — `router`, `tts`, `mcpServer`,
`agentRegistry`, `shareScreen`, `plugin`, `ci`, `docs`.

**Examples:**

```
feat(agentRegistry): add agent persistence on workspace close
fix(tts): handle missing say.js binary gracefully
ci: add develop branch to CI triggers
test(router): cover driveSubMode edge cases
docs: update branch strategy in CONTRIBUTING.md
```

---

## Code Quality

Before opening a PR, verify:

```bash
npm run compile        # TypeScript compilation — zero errors
npm test               # All Jest unit tests pass
npm run test:integration   # (Optional) Integration tests in Extension Host — runs on CI
```

See [live-testing.md](docs/guides/live-testing.md#review-while-developing) for the full review-while-developing checklist.

### Verify MVP (smoke test)

1. Press **F5** to launch the Extension Development Host (or `npm run reinstall:dev-sandbox` for a clean install).
2. Toggle Drive with **Ctrl+Shift+D** (or click the status bar).
3. Submit a prompt (e.g. `hello` or *"Call agent_screen_activity and log a short status"*).
4. Confirm the model responds and the **Agent Screen** shows activity (tab or inline MCP App).

See [docs/guides/live-testing.md](docs/guides/live-testing.md) for the full smoke test suite. Setup: [getting-started.md](docs/guides/getting-started.md).

### Before you push — no secrets

**Never commit or push:**

- `.env`, `.env.local`, `.env.*.local`
- `secrets.json`, `secrets.*.json`, `private.*`, `identity.*`, `tokens.*`, `auth.*`
- Any file containing real API keys, tokens, or passwords (placeholders like `your-token` or test mocks like `test-key` are fine)

These paths are in `.gitignore`; if you add new secret-bearing paths, add them there too. Never log secrets (see `.cursor/rules/policy-pack.mdc`). Before pushing, run `git diff --cached` and spot-check that no real credentials are staged.

### Rules

- Every new `.ts` file in `src/` must have a corresponding `*.test.ts` in `tests/`.
- Tests use the vscode mock at `tests/__mocks__/vscode.ts` — never import real
  vscode in tests.
- Follow existing patterns in the codebase. See `.cursor/rules/policy-pack.mdc`
  for the project's minimal-diff and privacy policies.
- Prefer the smallest safe change. Avoid unnecessary churn across files.

---

## BugBot Review

[BugBot](https://cursor.com/docs/bugbot) automatically reviews every PR using
codebase-specific rules defined in `.cursor/BUGBOT.md`.

### What BugBot checks

- **Privacy**: no secret logging, nonce-based CSP, SecretStorage for API keys
- **Architecture**: model selection via `modelSelector.ts`, MCP tool patterns,
  router purity, singleton patterns
- **Type safety**: enum exhaustiveness for `SubMode`, `RouteMode`, `AgentStatus`,
  `ModelTier`, `ActivityEvent.type`
- **State management**: `fire()` on DriveMode changes, foreground agent invariant
- **Cost awareness**: correct model tier usage, pure functions stay zero-cost
- **Testing**: new modules have tests, correct mock usage

### Triggering a manual review

Comment `cursor review` on any PR to trigger a fresh BugBot analysis.

### Updating rules

If you find BugBot is missing issues or producing false positives, update
`.cursor/BUGBOT.md` and include the change in your PR.

---

## Release Process

### Promoting develop → master

1. Go to **GitHub Actions → "Promote develop → master"**
2. Click **"Run workflow"**
3. Select a version bump (`patch`, `minor`, `major`, or `none`)
4. The workflow:
   - Runs full CI on develop
   - Bumps `package.json` version (if requested)
   - Creates a PR from `develop` → `master`
5. Review and merge the PR
6. CI builds and uploads a VSIX artifact on the `master` push

### Version tagging

After merging a release PR to master:

```bash
git checkout master
git pull origin master
VERSION=$(node -p "require('./package.json').version")
git tag "v${VERSION}"
git push origin "v${VERSION}"
```

---

## Branch Protection (Admin Setup)

These rules should be configured by a repo admin in **GitHub → Settings →
Branches → Branch protection rules**:

### `master` branch

- ✅ Require pull request before merging
- ✅ Require at least 1 approving review
- ✅ Require status checks to pass: `build-and-test`
- ✅ Require branches to be up to date before merging
- ❌ Do not allow force pushes
- ❌ Do not allow deletions

### `develop` branch

- ✅ Require pull request before merging
- ✅ Require status checks to pass: `build-and-test`
- ✅ Allow squash merging only
- ❌ Do not allow force pushes

---

## Questions?

Open an issue or start a discussion on the repo. For BugBot rule suggestions,
include the pattern you want caught and an example diff.
