---
name: BugBot Rules + Git Strategy + CI/CD
overview: Create custom BugBot review rules for cursor-drive, set up main/develop branching model, write CONTRIBUTING.md, and add GitHub Actions CI/CD for branch automation and auto-merge.
planType: workstream
planId: bugbot-git-cicd
parentPlanId: cursor-drive
childPlanIds: []
dependsOn: []
todos:
  - id: bugbot-01-create-rules
    content: "Create `.cursor/BUGBOT.md` with codebase-specific BugBot review rules. Organize into sections: Privacy & Security, Architecture, Type Safety, State Management, Testing, Webview/UI, Cost Awareness, Approval Gates. Each rule must name specific files/types and state the invariant. See rule details below."
    status: completed
  - id: git-02-rename-master-to-main
    content: "Rename default branch from `master` to `main`. Main branch pushed to origin. NOTE: changing default branch setting + deleting master requires GitHub admin access — user must do: Settings → Branches → change default to main, then delete master."
    status: completed
  - id: git-03-create-develop
    content: "Create `develop` branch from `main`. Push to origin: `git checkout -b develop main && git push -u origin develop`. This becomes the integration branch — all feature PRs target develop."
    status: completed
  - id: cicd-04-update-ci-workflow
    content: "Update `.github/workflows/ci.yml`: (1) trigger on push to `main` AND `develop`, (2) trigger on PRs targeting `main` or `develop`, (3) upload VSIX artifact on main builds."
    status: completed
  - id: cicd-05-develop-to-main-workflow
    content: "Create `.github/workflows/develop-to-main.yml`: manually-triggered workflow (`workflow_dispatch`) that creates a PR from develop→main, runs full CI, and optionally bumps version. Includes version_bump input (patch/minor/major/none)."
    status: completed
  - id: cicd-06-pr-automation
    content: "Create `.github/workflows/pr-checks.yml` with branch naming enforcement + `.github/labeler.yml` for auto-labeling PRs by file path (src/=extension, rules/=plugin, docs/=docs, .github/=ci, tests/=tests)."
    status: completed
  - id: contrib-07-contributing-md
    content: "Create `CONTRIBUTING.md` with sections: Branch Strategy, Branch Naming Convention, Merge Strategy, PR Workflow, Commit Message Format (conventional commits), Code Quality, BugBot Review, Release Process (develop→main promotion)."
    status: completed
  - id: git-08-branch-protection
    content: "Document recommended GitHub branch protection rules for main and develop in CONTRIBUTING.md. For main: require PR, require CI pass, require 1 review, no force push. For develop: require PR, require CI pass, allow squash merge only."
    status: completed
isProject: false
---

# BugBot Rules + Git Strategy + CI/CD

## Purpose

Establish three foundational pieces for professional cursor-drive development:

1. **Custom BugBot rules** — so AI code review catches codebase-specific issues (wrong model tier, privacy violations, broken event patterns, missing tests)
2. **Git branching model** — main/develop/feature flow with clear merge strategy
3. **CI/CD automation** — GitHub Actions that enforce quality gates and streamline the develop→main promotion

## Dependency Notes

- Depends on: existing `.github/workflows/ci.yml`, existing codebase modules in `src/`
- Blocks: nothing — this is infrastructure that improves all future PRs
- The current default branch is `master`; the existing CI triggers on `main` (mismatched). Renaming master→main fixes this.

## Phase Overview

| Phase | Focus | Deliverables |
|-------|-------|-------------|
| **1** | BugBot rules | `.cursor/BUGBOT.md` |
| **2** | Git branch setup | Rename master→main, create develop |
| **3** | CI/CD workflows | Updated ci.yml, new develop-to-main.yml, pr-checks.yml |
| **4** | Contributor guide | `CONTRIBUTING.md` with full branching/PR/review docs |

---

## TODO Detail

### bugbot-01-create-rules

Create `.cursor/BUGBOT.md` with the following rule categories. Each rule should name the specific file(s) and state the invariant clearly. BugBot reads ONLY this file during PR reviews — not `.cursor/rules/*.mdc`.

**Privacy & Security:**
- Never log, persist, or return in responses: API keys, passwords, tokens, user transcripts, or audio payloads
- API keys must use `vscode.SecretStorage`, never `vscode.workspace.getConfiguration()` or environment variables in committed code
- Redact sensitive values in all log/console output — use `redacted_dict()` pattern from hh-policy-pack
- Webview CSP in `shareScreen.ts` must use nonce-based `Content-Security-Policy` — never `'unsafe-inline'` or `'unsafe-eval'`

**Architecture:**
- Model selection must go through `src/modelSelector.ts` (`selectModelForTier()` or `selectCheapModel()`) — no direct `vscode.lm.selectChatModels()` calls from other modules
- MCP tools in `src/mcpServer.ts` must follow the registration pattern: `this.mcpServer.tool(name, description, zodSchema, asyncHandler)` — all handlers must return `{ content: [{ type: "text", text: string }] }`
- The router in `src/router.ts` must remain a pure synchronous function — no async, no vscode API calls, no side effects. It takes `cleanContext` and returns `RouteDecision`.
- `src/fillerCleaner.ts` is a pure function module — no network calls, no VS Code API imports, no side effects
- `src/shareScreen.ts` uses singleton pattern — always access via `ShareScreenPanel.createOrShow()` or `ShareScreenPanel.getInstance()`, never construct directly
- Extension entry point `src/extension.ts` registers commands and wires services — business logic belongs in dedicated modules, not in activate()

**Type Safety:**
- `SubMode` in `src/driveMode.ts` is exactly `"plan" | "agent" | "ask" | "direct"` — no other values; use the `isSubMode()` type guard for runtime validation
- `RouteMode` in `src/router.ts` is exactly `"plan" | "run" | "direct" | "collab"` — adding values requires updating all switch/case handlers
- `AgentStatus` in `src/agentRegistry.ts` is exactly `"active" | "background" | "completed" | "merged" | "paused"` — status transitions must follow: active↔background, active/background→completed/merged, active/background→paused→active/background
- `ModelTier` in `src/modelSelector.ts` is exactly `"routing" | "planning" | "execution"` — tier selection must use `tierForMode()` for consistency
- `ActivityEvent.type` in `src/shareScreen.ts` is exactly `"activity" | "file" | "decision" | "agentSwitch" | "clear"` — webview message handler must cover all cases

**State Management:**
- `DriveMode` state changes in `src/driveMode.ts` must call `fire()` to emit the `onDidChange` event — skipping this causes silent state bugs where the status bar and other listeners don't update
- `DriveMode` state must persist via `ctx.workspaceState.update()` for both `drive.active` and `drive.subMode`
- `AgentRegistry` in `src/agentRegistry.ts` must maintain exactly one foreground agent at a time — `switchTo()` must set previous foreground to `"background"` before setting new foreground to `"active"`
- Agent memory in `AgentRegistry` is bounded to 50 entries — `updateMemory()` must enforce this cap

**Testing:**
- Every new module in `src/` must have a corresponding `*.test.ts` file in `tests/`
- Tests must use the vscode mock at `tests/__mocks__/vscode.ts` — never import real vscode in tests
- Pure function modules (`fillerCleaner.ts`, `router.ts`) must NOT import vscode in their test files
- Tests must cover: success path, error/edge cases, and boundary conditions

**Webview / UI:**
- All webview colors must use VS Code CSS variables (`--vscode-*`) — zero hardcoded hex colors, RGB values, or color names
- Webview `<script>` and `<style>` tags must include `nonce` attributes matching the CSP
- Status bar items in `src/statusBar.ts` must use `vscode.ThemeColor` for background, not raw color strings
- QuickPick items should use codicon prefixes (`$(icon-name)`) for visual consistency

**Cost Awareness:**
- Routing operations (intent routing, filler detection, prompt optimization) must use tier 1 (cheapest) model via `selectCheapModel()` or `selectModelForTier("routing", ...)`
- Planning operations (clarification, plan generation) must use tier 2 (mid) model via `selectModelForTier("planning", ...)`
- Only code generation and execution should use tier 3 (user's selected model)
- Pure functions (`cleanFillerWords`, `route`) must NEVER make model API calls — they are zero-cost by design

**Approval Gates:**
- Destructive operations (`rm -rf`, `git push --force`, `git reset --hard`, `DROP DATABASE`) must be intercepted by approval gates before execution
- Approval gate results must be `"allowed"` or `"blocked"` — never silently skip the check
- High-impact MCP tools that modify files, git state, or terminal must check approval gates before executing

---

### git-02-rename-master-to-main

The existing CI workflow (`.github/workflows/ci.yml`) already triggers on `push: branches: [main]`, but the actual default branch is `master`. Fix the mismatch:

```bash
# Local rename
git checkout master
git branch -m master main
git push -u origin main

# Update GitHub default branch
gh repo edit --default-branch main

# Clean up old remote branch
git push origin --delete master
```

Verify: `gh repo view --json defaultBranchRef` should show `main`.

---

### git-03-create-develop

```bash
git checkout main
git checkout -b develop
git push -u origin develop
```

This is the integration branch. All feature work merges here first via PR. Develop is periodically promoted to main for releases.

---

### cicd-04-update-ci-workflow

Update `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"
      - run: npm ci
      - run: npm run compile
      - run: npm test
      - name: Package VSIX
        run: npx vsce package --allow-missing-repository
      - name: Upload VSIX artifact
        if: github.ref == 'refs/heads/main'
        uses: actions/upload-artifact@v4
        with:
          name: cursor-drive-vsix
          path: "*.vsix"
          retention-days: 30
```

Key changes: add `develop` to push/PR triggers, upload VSIX artifact on main builds.

---

### cicd-05-develop-to-main-workflow

Create `.github/workflows/develop-to-main.yml`:

```yaml
name: Promote develop → main

on:
  workflow_dispatch:
    inputs:
      version_bump:
        description: "Version bump type (patch, minor, major, or none)"
        required: true
        default: "none"
        type: choice
        options:
          - none
          - patch
          - minor
          - major

jobs:
  promote:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: write
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
          ref: develop

      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"

      - run: npm ci
      - run: npm run compile
      - run: npm test

      - name: Version bump
        if: inputs.version_bump != 'none'
        run: |
          npm version ${{ inputs.version_bump }} --no-git-tag-version
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add package.json package-lock.json
          git commit -m "chore: bump version (${{ inputs.version_bump }})"
          git push origin develop

      - name: Create PR develop → main
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          VERSION=$(node -p "require('./package.json').version")
          gh pr create \
            --base main \
            --head develop \
            --title "Release v${VERSION}: promote develop → main" \
            --body "Automated promotion from develop to main.\n\nVersion: ${VERSION}\nBump: ${{ inputs.version_bump }}" \
            --label "release" \
            || echo "PR already exists"
```

This is a manual trigger (workflow_dispatch) — developer clicks "Run workflow" in GitHub Actions when ready to release. It runs full CI on develop, optionally bumps the version, then creates a PR to main.

---

### cicd-06-pr-automation

Create `.github/workflows/pr-checks.yml`:

```yaml
name: PR Checks

on:
  pull_request:
    types: [opened, synchronize, labeled]

jobs:
  label-pr:
    runs-on: ubuntu-latest
    permissions:
      pull-requests: write
    steps:
      - uses: actions/checkout@v4

      - name: Auto-label by path
        uses: actions/labeler@v5
        with:
          repo-token: ${{ secrets.GITHUB_TOKEN }}

  enforce-branch-naming:
    runs-on: ubuntu-latest
    steps:
      - name: Check branch name
        run: |
          BRANCH="${{ github.head_ref }}"
          if [[ ! "$BRANCH" =~ ^(feature|bugfix|release|hotfix|cursor)/ ]]; then
            echo "::error::Branch name '$BRANCH' does not follow convention. Use feature/*, bugfix/*, release/*, or hotfix/*."
            exit 1
          fi
          echo "Branch name '$BRANCH' follows convention."
```

Also create `.github/labeler.yml` for path-based auto-labeling:

```yaml
extension:
  - changed-files:
      - any-glob-to-any-file: "src/**"

plugin:
  - changed-files:
      - any-glob-to-any-file:
          - "rules/**"
          - "agents/**"
          - "commands/**"

docs:
  - changed-files:
      - any-glob-to-any-file: "docs/**"

ci:
  - changed-files:
      - any-glob-to-any-file: ".github/**"

tests:
  - changed-files:
      - any-glob-to-any-file: "tests/**"
```

---

### contrib-07-contributing-md

Create `CONTRIBUTING.md` with these sections:

**1. Branch Strategy**
- `main` — stable release branch; tagged versions; protected
- `develop` — integration branch; all feature work merges here
- `feature/<name>` — new features, branched from develop
- `bugfix/<name>` — bug fixes, branched from develop
- `release/<name>` — release prep (optional), branched from develop
- `hotfix/<name>` — urgent fixes, branched from main, merged back to both main and develop

**2. Workflow**
1. Create branch from `develop`: `git checkout -b feature/my-feature develop`
2. Make changes, commit with conventional commit messages
3. Push and open PR targeting `develop`
4. CI runs automatically; BugBot reviews the PR
5. Get approval, squash-merge into develop
6. Periodically, promote develop→main via the "Promote" workflow in GitHub Actions

**3. Commit Message Format**
Follow conventional commits: `type(scope): description`
- Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `ci`
- Scope: module name (`router`, `tts`, `mcpServer`, etc.) or area (`ci`, `plugin`, `docs`)
- Examples: `feat(agentRegistry): add agent persistence on workspace close`, `fix(tts): handle missing say.js binary gracefully`

**4. Code Quality**
- Run `npm run compile` — must pass with zero errors
- Run `npm test` — all tests must pass
- Every new `src/` module must have a test file in `tests/`
- Follow existing patterns in the codebase (see `.cursor/rules/hh-policy-pack.mdc`)

**5. BugBot Review**
- BugBot automatically reviews PRs using rules in `.cursor/BUGBOT.md`
- You can trigger a manual review by commenting `cursor review` on any PR
- BugBot checks codebase-specific invariants: model tier usage, privacy rules, type safety, testing requirements
- Address BugBot comments before requesting human review

**6. Merge Strategy**
- Feature → develop: **squash merge** (clean history)
- Develop → main: **merge commit** (preserves integration history)
- Hotfix → main: **merge commit**, then cherry-pick or merge back to develop

**7. Release Process**
1. Go to GitHub Actions → "Promote develop → main"
2. Select version bump (patch/minor/major/none)
3. Click "Run workflow" — creates a PR from develop to main
4. Review and merge the PR
5. CI builds VSIX artifact on main push

---

### git-08-branch-protection

Document the recommended GitHub branch protection rules in CONTRIBUTING.md (these are applied manually by a repo admin via GitHub Settings → Branches):

**main branch:**
- Require pull request before merging
- Require at least 1 approving review
- Require status checks to pass (CI: build-and-test)
- Require branches to be up to date before merging
- Do not allow force pushes
- Do not allow deletions

**develop branch:**
- Require pull request before merging
- Require status checks to pass (CI: build-and-test)
- Allow squash merging only
- Do not allow force pushes

Note: Branch protection rules are set via GitHub UI or `gh api` — they are NOT set by the workflow files. The CONTRIBUTING.md documents what should be configured.

---

## Reconciliation

All plan TODOs are complete. Deliverables verified:

| Item | Status |
|------|--------|
| `.cursor/BUGBOT.md` | Created with Privacy, Architecture, Type Safety, State, Testing, Webview, Cost, Approval Gates |
| `master` branch | Default; CI + VSIX on master |
| `develop` branch | Synced with merged content (bb7f8b7) |
| `.github/workflows/ci.yml` | Triggers on master + develop; VSIX artifact on master |
| `.github/workflows/develop-to-main.yml` | Manual promote workflow (develop → master) |
| `.github/workflows/pr-checks.yml` | Branch naming + labeler |
| `.github/labeler.yml` | Path-based labels (extension, plugin, docs, ci, tests, bugbot) |
| `CONTRIBUTING.md` | Branch strategy, workflow, commits, quality, BugBot, release, branch protection |

**Manual steps for repo admin:**
- Apply branch protection rules per CONTRIBUTING.md § Branch Protection
- (Keeping `master` as default branch; no rename to main)
