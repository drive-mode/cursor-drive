---
planId: cursor-drive-v1
planType: project
isProject: true
parentPlanId: null
childPlanIds:
  - agent-screen-implementation
  - drive-mode-full-build
  - mcp-apps-implementation
  - terminology-sas-overhaul
  - tangent-agent-ux-features
  - s-as-execution-command-discovery
  - repo-health-and-cleanup
  - readme-redesign
  - security-review-structure
  - voice-wake-word
  - orchestration
  - plan-governance
  - adr-prd-audit-and-graph
  - cursor-drive-automation-optimizer
  - cursor-drive-implementation
  - automation-plugin-strategy
  - agent-skills-review
  - extension-reinstall-automation
  - using-cursor-drive
  - cloudflare-setup-phases
  - chat-memory-proceed
  - black-box-terminal-popup-fix
  - cursor-primitives-complete-bootstrap
  - remove-github-push-code
  - push-repo-and-develop-branch
  - pr-merge-workflow-primitives
  - fork-branch-review-merge
dependsOn: []
overview: Root project for Cursor Drive extension V1. Orchestrates Agent Screen, Drive mode UX, MCP/plugins, voice, orchestration, repo health, and plan governance. Delivers a working voice-first, multi-operator pair-programming layer for Cursor.
todos:
  - id: sync-agent-screen
    content: Complete agent-screen-implementation child plan
    status: pending
  - id: sync-drive-mode
    content: Complete drive-mode-full-build (consolidated Drive UX)
    status: pending
  - id: sync-mcp
    content: Complete mcp-apps-implementation
    status: pending
  - id: sync-voice
    content: Complete voice-wake-word child project
    status: pending
  - id: sync-orchestration
    content: Complete orchestration child project
    status: pending
  - id: sync-plan-governance
    content: Complete plan-governance child project
    status: pending
  - id: sync-repo-health
    content: Complete repo health plans (audit, gitignore, security review)
    status: pending
---

# Cursor Drive V1 — Root Project

## Scope

Orchestrates all Cursor Drive extension work across:

- **Agent Screen (S-AS)**: Implementation, MCP Apps, Sync tab, terminology
- **Drive mode UX**: Full build, next sprint, polish, MCP auto-registration
- **Voice**: Wake word, sleep word, triggers (see voice-wake-word project)
- **Orchestration**: Parallel orchestration, subagent execution (see orchestration project)
- **Plan governance**: Plans audit, cleanup, simplification (see plan-governance project)
- **Repo health**: Audit, gitignore, security review

## Child plans

See `childPlanIds` in frontmatter. Run `/plan-sync` after edits.
