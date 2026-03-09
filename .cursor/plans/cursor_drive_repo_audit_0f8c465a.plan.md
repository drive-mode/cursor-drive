---
name: Cursor Drive Repo Audit
planId: cursor-drive-repo-audit
planType: task
parentPlanId: cursor-drive
overview: Full discovery audit of the cursor-drive repository covering structure, pipeline, operators, voice/TTS, S-AS, config, privacy, tests, and open TODOs — producing repo-audit.md with gap analysis and priority build list.
todos:
  - id: audit-01-structure
    content: "Write repo-audit.md section 1: extension + plugin + MCP architecture, package.json, tsconfig, .cursorignore; file paths and line refs."
    status: pending
  - id: audit-02-pipeline
    content: "Write section 2: beforeSubmitPrompt hooks (drive-preprocessor, plan-runner), Drive entry flow extension.ts → createDriveModeManager → cursorDrive.toggle."
    status: pending
  - id: audit-03-operators
    content: "Write section 3: Agent/Plan/Ask/Debug sub-modes, OperatorRegistry semantic roles, tangent/switch/merge implementation."
    status: pending
  - id: audit-04-voice
    content: "Write section 4: STT (Cursor built-in), TTS (tts.ts), fillerCleaner, drive-preprocessor voice flow."
    status: pending
  - id: audit-05-sas
    content: "Write section 5: WebviewPanel agentScreen, OperatorRegistry EventEmitter, Drive sidebar."
    status: pending
  - id: audit-06-config
    content: "Write section 6: package.json schema, vscode.workspace.getConfiguration usage, no runtime validation."
    status: pending
  - id: audit-07-privacy
    content: "Write section 7: cloudAgentClient api.cursor.com, agentScreenApp esm.sh, audit log gap, egress guards."
    status: pending
  - id: audit-08-tests
    content: "Write section 8: 50+ test files, CI workflows (ci.yml, pr-checks, develop-to-main, reinstall, cloudflare-token-test)."
    status: pending
  - id: audit-09-gap
    content: "Write Gap Analysis: built vs missing vs stubbed per domain."
    status: pending
  - id: audit-10-priority
    content: "Write Priority Build List: top 10 items ranked by dependency order."
    status: pending
isProject: false
---

# Cursor Drive Repository Audit Plan

## Audit Scope

Complete discovery audit answering 24 questions across 9 domains. All subagent findings have been collected. The plan is to synthesize these into `repo-audit.md` with:

- Exact file paths, line numbers, code snippets per question
- Gap Analysis: built vs missing vs stubbed
- Priority Build List: top 10 items ranked by dependency order

## Key Findings Summary (from subagents)

**Structural:** Extension + plugin + MCP architecture; package.json v0.3.1; tsconfig Node16/ES2022; .cursorignore present; no .cursorrules or cursor-drive.config.*

**Pipeline:** `beforeSubmitPrompt` in `.cursor/hooks/drive-preprocessor.py` (adds context, does not block); plan-runner.py also hooks beforeSubmitPrompt; Drive entry: `extension.ts` → `createDriveModeManager` → `cursorDrive.toggle` (Ctrl+Shift+D)

**Operators:** Agent/Plan/Ask/Debug are sub-modes (not operator types); OperatorRegistry uses semantic roles (implementer, reviewer, etc.); tangent/switch/merge all implemented

**Voice:** No STT (uses Cursor built-in); TTS via say.js in `src/tts.ts`; filler cleaning in `src/fillerCleaner.ts` + drive-preprocessor.py

**S-AS:** WebviewPanel `cursorDrive.agentScreen`; OperatorRegistry EventEmitter for broadcast; Drive sidebar separate

**Config:** package.json schema; no runtime validation; vscode.workspace.getConfiguration() direct

**Privacy:** cloudAgentClient.ts → api.cursor.com; agentScreenApp.ts → esm.sh; no audit log impl; no egress guards

**Tests:** 50+ test files; CI (ci.yml, pr-checks.yml, develop-to-main.yml, reinstall.yml, cloudflare-token-test.yml)

**TODOs:** Only one developer TODO — in entropy.test.ts line 19 (inside test fixture string "// TODO: remove")

## Deliverable

Single file: `repo-audit.md` at repo root with all 24 sections, code blocks, Gap Analysis, and Priority Build List.