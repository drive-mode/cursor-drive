---
name: Cursor Drive Repo Audit
overview: Full discovery audit of the cursor-drive repository covering structure, pipeline, operators, voice/TTS, S-AS, config, privacy, tests, and open TODOs — producing repo-audit.md with gap analysis and priority build list.
todos: []
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