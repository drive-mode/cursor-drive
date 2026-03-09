---
planId: repo-health-and-cleanup
planType: task
parentPlanId: cursor-drive-v1
childPlanIds: []
dependsOn: []
name: Repo health and cleanup
overview: Gitignore/cursorignore cleanup, repo cleanup, project reset, and full repo audit (structure, pipeline, operators, voice, S-AS, config, privacy, tests, gap analysis, priority).
todos:
  - id: rhc-01
    content: "In .gitignore remove duplicate entries (.DS_Store, Thumbs.db, *.swp, *.swo, .idea/); remove invalid // line on line 49."
    status: completed
  - id: rhc-02
    content: "Restructure .gitignore into sections: Build/runtime, .cursor, OS, IDE/editor, Secrets/privacy, Local/misc; no duplicates."
    status: pending
  - id: rhc-03
    content: "Create .cursorignore with patterns: node_modules/, out/, *.tsbuildinfo, coverage/, .cursor/drive-bridge.json, .cursor/debug-*.log, .cursor/plans/.plan-frontmatter-hash, .cursor/plans/archive/, secrets.*, .env, etc."
    status: completed
  - id: rhc-04
    content: "Verify .cursor/rules, .cursor/plans/*.plan.md, .cursor/skills remain indexable; only runtime/generated .cursor paths ignored."
    status: pending
  - id: rhc-05
    content: Add OS, IDE, build, commit-rewrite artifact, .env variants to .gitignore
    status: pending
  - id: rhc-06
    content: Delete env-filter-rewrite.sh, scripts/rewrite-commit-dates.ps1, scripts/rewrite-commit-dates.sh
    status: pending
  - id: rhc-07
    content: Replace hhalperin with drive-mode/cursor-drive in README clone URL and package.json repository.url
    status: pending
  - id: rhc-08
    content: "(Optional) Rename hh-policy-pack.mdc and update publisher if targeting drive-mode org"
    status: pending
  - id: rhc-09
    content: Break accumulated changes into 4 logical commits (governance, skills/rules, source code, docs)
    status: pending
  - id: rhc-10
    content: "Fix 7 test failures: TTS mock gaps in pipelineStats + port conflict in mcpServer"
    status: pending
  - id: rhc-11
    content: Triage 7 empty-todo plans, reset orchestrator state, run plan-runner sync
    status: pending
  - id: rhc-12
    content: Integrate feat/drive-mode into develop per CONTRIBUTING.md branch strategy
    status: pending
  - id: rhc-13
    content: "Write repo-audit.md section 1: extension + plugin + MCP architecture, package.json, tsconfig, .cursorignore; file paths and line refs."
    status: pending
  - id: rhc-14
    content: "Write section 2: beforeSubmitPrompt hooks (drive-preprocessor, plan-runner), Drive entry flow extension.ts → createDriveModeManager → cursorDrive.toggle."
    status: pending
  - id: rhc-15
    content: "Write section 3: Agent/Plan/Ask/Debug sub-modes, OperatorRegistry semantic roles, tangent/switch/merge implementation."
    status: pending
  - id: rhc-16
    content: "Write section 4: STT (Cursor built-in), TTS (tts.ts), fillerCleaner, drive-preprocessor voice flow."
    status: pending
  - id: rhc-17
    content: "Write section 5: WebviewPanel agentScreen, OperatorRegistry EventEmitter, Drive sidebar."
    status: pending
  - id: rhc-18
    content: "Write section 6: package.json schema, vscode.workspace.getConfiguration usage, no runtime validation."
    status: pending
  - id: rhc-19
    content: "Write section 7: cloudAgentClient api.cursor.com, agentScreenApp esm.sh, audit log gap, egress guards."
    status: pending
  - id: rhc-20
    content: "Write section 8: 50+ test files, CI workflows (ci.yml, pr-checks, develop-to-main, reinstall, cloudflare-token-test)."
    status: pending
  - id: rhc-21
    content: "Write Gap Analysis: built vs missing vs stubbed per domain."
    status: pending
  - id: rhc-22
    content: "Write Priority Build List: top 10 items ranked by dependency order."
    status: pending
---

# Repo health and cleanup

- **Gitignore and cursorignore**: Dedupe/restructure .gitignore; add .cursorignore; verify indexable paths.
- **Repo cleanup**: Add .gitignore entries; delete commit-rewrite scripts; replace hhalperin with drive-mode/cursor-drive; optional publisher/rule rename.
- **Project reset**: Git triage (4 commits), fix 7 tests, plan reconciliation, branch cleanup.
- **Repo audit**: repo-audit.md sections 1–8, Gap Analysis, Priority Build List.

See todos rhc-01..rhc-22.
