# Cursor Drive Repository Audit

Full discovery audit of the cursor-drive repository. Exact file paths, line numbers, and code snippets.

---

## 1. Full Directory Tree

Excluding `node_modules` and `.git`:

```
.agents/
.agents/skills/agent-browser/, compound-workflow, doc-reviewer, doc-reviewer, doc-sync, doc-writer,
  drive-concise, drive-modes, drive-persona, drive-ui-test, electron, plan-audit-deps, plan-complete,
  plan-next, plan-split, plan-start, plan-sync, plan-system-maintainer, reconciliation-generator,
  switch, tangent, update-docs/
.cursor/
.cursor/agents/ (drive-operator.md, drive-reviewer.md, plan-governor.md, plan-orchestrator.md, verifier.md)
.cursor/commands/drive-research/ (01-05_*.md)
.cursor/hooks/ (dep-auditor.py, drive-preprocessor.py, plan-frontmatter-changed.py, plan-runner.py)
.cursor/hooks.json
.cursor/mcp.json
.cursor/plans/ (registry.yaml, plan-master.diagram.md, task-graph.yaml, *.plan.md, archive/)
.cursor/rules/ (architecture-before-coding.mdc, doc-maintenance.mdc, hh-policy-pack.mdc,
  operator-hierarchy.mdc, plan-governance.mdc, policy-pack.mdc, tiered-model-routing.mdc, vision-invariants.mdc)
.cursor/scripts/ (start-github-mcp.ps1)
.cursor/settings.json
.cursor/skills/ (agent-browser, compound-workflow, create-plan, cursor-drive-handoff, doc-review, doc-reviewer,
  doc-sync, doc-writer, drive-concise, drive-modes, drive-persona, drive-ui-test, electron, execute-plans,
  merge, plan-audit-deps, plan-complete, plan-next, plan-split, plan-start, plan-sync, plan-system-maintainer,
  reconciliation-generator, switch, tangent, update-docs/
.cursorignore
.cursor-plugin/ (mirrors .cursor/ structure: agents, hooks, rules, skills, commands, assets, plugin.json)
docs/ (architecture/, design/, guides/, plans/, prd/, reference/, research/)
.github/workflows/ (ci.yml, pr-checks.yml, develop-to-main.yml, reinstall.yml, cloudflare-token-test.yml)
sandbox/
scripts/ (build-plugin.mjs, bundle-mcp-app.mjs, reinstall-extension.mjs, create-cloudflare-token.mjs, etc.)
src/
src/agentScreen.ts, agentScreenApp.ts, apiDiscovery.ts, approvalGates.ts, audioFeedback.ts, clarificationHandler.ts,
  cloudAgentClient.ts, commsAgent.ts, cursorCliRunner.ts, driveMode.ts, driveSidebar.ts, extension.ts,
  fillerCleaner.ts, glossaryExpander.ts, gitService.ts, index.ts, integrationQueue.ts, mcpServer.ts,
  modelSelector.ts, modelUtils.ts, ndjsonParser.ts, operatorRegistry.ts, persistentMemory.ts,
  pipeline.ts, pluginInstaller.ts, promptOptimizer.ts, sanitizer.ts, sessionMemory.ts, snapshotFeed.ts,
  stateSyncCoordinator.ts, statusBar.ts, syncLedger.ts, syncTypes.ts, tangentFlow.ts, tangentNameExtractor.ts,
  tts.ts, voiceCommands.ts, worktreeManager.ts, toolAllowlist.ts
src/cursor-sdk/ (index.ts, errors.ts, permissionBroker.ts, sessionAccumulator.ts, toolCallTracker.ts)
src/governance/ (aiSummary.ts, cli.ts, entropy.ts, focusGuard.ts, fsUtils.ts, paths.ts, projectGraph.ts,
  scan.ts, schemas.ts, taskLedger.ts)
tests/ (47 *.test.ts files)
tests/browser/ (smoke.spec.ts, drive-ui-integration.spec.ts, sharescreen.spec.ts, test-1.spec.ts)
tests/governance/ (aiSummary, entropy, focusGuard, fsUtils, projectGraph, taskLedger)
package.json, tsconfig.json, tsconfig.test.json, README.md, CONTRIBUTING.md, LICENSE
```

---

## 2. package.json — Dependencies, Scripts, Engine

**File:** [package.json](package.json)

```json
"engines": { "vscode": "^1.85.0" },
"main": "./out/extension.js",
"activationEvents": ["onStartupFinished"]
```

**dependencies:**
- `@agentclientprotocol/sdk` ^0.14.1
- `@modelcontextprotocol/ext-apps` ^1.1.2
- `@modelcontextprotocol/sdk` ^1.26.0
- `zod` ^4.3.6

**devDependencies:**
- `@playwright/test` ^1.58.2, `@types/jest` ^30.0.0, `@types/node` ^20, `@types/vscode` ^1.85.0
- `@vscode/vsce` ^3.7.1, `jest` ^30.2.0, `ts-jest` ^29.4.6, `typescript` ^5.3.0

**optionalDependencies:**
- `say` ^0.16.0 (TTS)

**scripts:**
```json
"build:plugin": "node scripts/build-plugin.mjs",
"bundle:mcp-app": "node scripts/bundle-mcp-app.mjs",
"vscode:prepublish": "npm run bundle:mcp-app && npm run compile",
"compile": "tsc -p ./",
"watch": "tsc -watch -p ./",
"test": "jest",
"dev-loop": "node sandbox/dev-loop.mjs",
"reinstall": "node scripts/reinstall-extension.mjs",
"test:browser": "playwright test",
"cloudflare:create-token": "node scripts/create-cloudflare-token.mjs",
"cloudflare:trigger": "node scripts/trigger-cloudflare-test.mjs",
"cloudflare:verify": "node scripts/verify-cloudflare-token.mjs"
```

---

## 3. tsconfig.json / jsconfig.json

**File:** [tsconfig.json](tsconfig.json) (lines 1–19)

```json
{
  "compilerOptions": {
    "module": "Node16",
    "target": "ES2022",
    "lib": ["ES2022", "DOM"],
    "sourceMap": true,
    "rootDir": "src",
    "outDir": "out",
    "strict": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"]
}
```

**tsconfig.test.json:** extends main config, `rootDir` `.`, `isolatedModules` true, `include` src + tests.

**jsconfig.json:** Not present.

---

## 4. .cursorrules, .cursorignore, cursor-drive.config.*

| File | Status |
|------|--------|
| `.cursorrules` | Not present (rules in `.cursor/rules/*.mdc`) |
| `.cursorignore` | Present — 39 lines (build, runtime, secrets, logs, IDE) |
| `cursor-drive.config.*` | Not present |

**`.cursorignore`** ([.cursorignore](.cursorignore)): excludes `node_modules/`, `out/`, `*.vsix`, `.cursor/drive-bridge.json`, `.env`, `secrets.*`, `*.log`, `.cache/`, `.DS_Store`, etc.

---

## 5. README.md — Full Contents

**File:** [README.md](README.md) — 170 lines.

Key sections: voice-first multi-operator pair programming, installation (Node 20+, F5 dev host), MCP setup, architecture (extension + plugin + MCP :7891), design choices (no cloud, config-first, Cursor-native), source modules table, tangent flow, docs layout.

---

## 6. beforeSubmitPrompt — Implementation

**File:** [.cursor/hooks/drive-preprocessor.py](.cursor/hooks/drive-preprocessor.py) (lines 99–185)

**Behavior:** Invoked by Cursor on `beforeSubmitPrompt` with event name in `argv[1]`. Reads JSON from stdin (`prompt` field). Does **not** block or modify the prompt; only adds context via `details`.

```python
# Lines 99–104
event = sys.argv[1] if len(sys.argv) > 1 else "beforeSubmitPrompt"

if event != "beforeSubmitPrompt":
    emit("allow", "drive preprocessor: pass-through")
    return
```

Steps:
1. **Filler analysis** (123–132): strips fillers, computes density; if >15%, adds `drive_cleaned_prompt` and `drive_filler_density`
2. **Tangent detection** (134–150): looks for "tangent", infers role, adds hint to spawn parallel operator
3. **Escalation detection** (152–160): looks for "escalat", "blocked", "stuck", etc.
4. **Mode-switch detection** (162–168): looks for plan/agent/ask/debug, adds `drive_set_mode` hint
5. **Submit-word detection** (171–175): looks for "send it", "go ahead", etc.

Emits: `{"decision": "allow", "message": "...", "details": {...}}`.

---

## 7. Cursor Hook Registrations

**File:** [.cursor/hooks.json](.cursor/hooks.json) (lines 1–28)

```json
{
  "version": 1,
  "hooks": {
    "beforeSubmitPrompt": [
      { "command": "python .cursor/hooks/drive-preprocessor.py beforeSubmitPrompt" },
      { "command": "python .cursor/hooks/plan-runner.py beforeSubmitPrompt" }
    ],
    "sessionStart": [
      { "command": "python .cursor/hooks/plan-runner.py sessionStart" }
    ],
    "stop": [
      { "command": "python .cursor/hooks/plan-runner.py stop" }
    ],
    "subagentStop": [
      { "command": "python .cursor/hooks/plan-runner.py subagentStop" }
    ]
  }
}
```

**Additional:** `.cursor-plugin/hooks/hooks.json` (lines 4–7) — `beforeSubmitPrompt` → `drive-preprocessor.py`
**Programmatic:** `src/pluginInstaller.ts` (238–257) — `ensureHookConfig()` adds drive-preprocessor to workspace `.cursor/hooks.json`

---

## 8. Drive Mode Activation Entry Point

**Flow:**

1. **package.json** (17–21): `activationEvents: ["onStartupFinished"]` → extension loads after startup
2. **src/extension.ts** (56–65): `activate()` → `createDriveModeManager(context)` → `createDriveStatusBar(driveMgr, operatorRegistry)`
3. **src/driveMode.ts** (23–66): `createDriveModeManager()` creates manager; initial `_active` from `ctx.workspaceState.get("drive.active", false)`
4. **package.json** (141–145): Keybinding `Ctrl+Shift+D` / `Cmd+Shift+D` → `cursorDrive.toggle`
5. **src/extension.ts** (354–400): `cursorDrive.toggle` → `driveMgr.toggle()` → when on: opens chat, Agent Screen, and optionally mic

```typescript
// src/extension.ts:354–365
vscode.commands.registerCommand("cursorDrive.toggle", async () => {
  driveMgr.toggle();
  const nowActive = driveMgr.active;
  const state = nowActive ? `Drive ON — ${driveMgr.subMode} mode` : "Drive OFF";
  void vscode.window.showInformationMessage(state);
  if (nowActive && ttsEnabled()) { speak(state); }
  // ...
});
```

---

## 9. Agent/Plan/Ask/Debug Operators — Implemented or Stubbed

**Sub-modes (implemented):** Agent/Plan/Ask/Debug are Drive sub-modes, not operator types. They map to Cursor native modes.

**File:** [src/driveMode.ts](src/driveMode.ts) (line 3)

```typescript
export type SubMode = "plan" | "agent" | "ask" | "debug" | "off";
```

**File:** [src/extension.ts](src/extension.ts) (417–444)

```typescript
{ label: "$(book) Plan", description: "Clarify goals, generate plan artifact" },
{ label: "$(rocket) Agent", description: "Execute autonomously" },
{ label: "$(search) Ask", description: "Read-only exploration" },
{ label: "$(bug) Debug", description: "Diagnose issues, evidence-first debugging" },
const modeMap: Record<string, SubMode> = {
  Plan: "plan", Agent: "agent", Ask: "ask", Debug: "debug",
};
```

**Operator roles (implemented):** `OperatorRegistry` uses semantic roles: implementer, reviewer, tester, researcher, planner (see [src/operatorRegistry.ts](src/operatorRegistry.ts) lines 19–45).

---

## 10. Routing/Classification Logic — Decision Points

**File:** [src/router.ts](src/router.ts) (lines 8–59)

```typescript
export function route(cleanContext: {
  prompt: string;
  command?: string;
  driveSubMode?: string;
}): RouteDecision {
  const { prompt, command, driveSubMode } = cleanContext;
  const lower = prompt.toLowerCase().trim();

  // Slash command overrides (highest priority)
  if (command === "plan") return { mode: "plan", reason: "Explicit /plan command" };
  if (command === "run") return { mode: "agent", reason: "Explicit /run command" };
  if (command === "drive") return { mode: "agent", reason: "Explicit /drive—Drive mode" };

  // Drive sub-mode hint
  if (driveSubMode !== undefined) {
    switch (driveSubMode) {
      case "plan": return { mode: "plan", reason: "Drive sub-mode: plan" };
      case "agent": return { mode: "agent", reason: "Drive sub-mode: agent" };
      case "ask": return { mode: "ask", reason: "Drive sub-mode: ask" };
      case "direct": return { mode: "ask", reason: "Drive sub-mode: direct (mapped to ask)" };
      case "debug": return { mode: "debug", reason: "Drive sub-mode: debug" };
    }
  }

  // Keyword-based routing
  const planKeywords = ["plan", "clarify", "requirements", "design", "architecture", "break down"];
  const agentKeywords = ["add", "implement", "fix", "create", "write", "refactor", "run", "execute"];
  const debugKeywords = ["debug", "diagnose", "trace", "breakpoint", "why does", "why is"];
  if (planKeywords.some((k) => lower.includes(k))) return { mode: "plan", reason: "..." };
  if (debugKeywords.some((k) => lower.includes(k))) return { mode: "debug", reason: "..." };
  if (agentKeywords.some((k) => lower.includes(k))) return { mode: "agent", reason: "..." };

  return { mode: "ask", reason: "No strong signal—ask model pass-through" };
}
```

**Pipeline stages:** `src/pipeline.ts` — wake word, drive-active gate, tangent keyword, submit word, approval gate, route, model select.

---

## 11. Tangent / Switch / Merge Flows

**Tangent — implemented:**
- [src/pipeline.ts](src/pipeline.ts) (216–274): `tangent <task>` → spawn operator, early return
- [src/tangentFlow.ts](src/tangentFlow.ts): TTS intro, modal confirm, optional timeout
- [src/mcpServer.ts](src/mcpServer.ts) (889–897): `operator_spawn` MCP tool
- [src/extension.ts](src/extension.ts) (726–730): `cursorDrive.confirmTangent`

**Switch — implemented:**
- [src/operatorRegistry.ts](src/operatorRegistry.ts) (246–263): `switchTo(nameOrId)`
- [src/mcpServer.ts](src/mcpServer.ts) (850–856): `operator_switch` MCP tool
- [src/extension.ts](src/extension.ts) (534–555): QuickPick to switch operator

**Merge — implemented:**
- [src/operatorRegistry.ts](src/operatorRegistry.ts) (324–336): `merge(sourceName, targetName)`
- [src/mcpServer.ts](src/mcpServer.ts) (881–884, 1036–1042): `operator_merge` MCP tool

---

## 12. STT (Speech-to-Text) Integration

**No STT module in `src/`.** Drive uses Cursor's built-in hold-to-speak STT; the extension receives only the final transcribed text.

| Location | Notes |
|----------|-------|
| No `src/stt.ts` | No STT implementation |
| `docs/design/ux/voice-mic-vs-wake-word-model.md` | "Cursor's built-in STT and composer do not separate 'listening' from 'dictating to chat'" |
| `.cursor/plans/voice_input_modes_feature_plan.md` | P2: WebView `SpeechRecognition` for real-time wake word (not implemented) |

---

## 13. TTS Implementation

| File | Lines | Snippet |
|------|-------|---------|
| **src/tts.ts** | 1–136 | Main TTS; uses `say.js` (OS-native) |
| | 75–96 | `speak()` — truncates to `maxSpokenSentences`, calls `say.speak()` |
| | 98–119 | `speakFull()` — speaks full text |
| | 121–131 | `stop()` — stops current utterance |
| **src/audioFeedback.ts** | 1–29 | Chime playback; AgentScreen WebView or TTS fallback |
| **src/agentScreen.ts** | 879–903 | `playChimes(count)` — Web Audio sine tones (880 Hz) |
| **src/mcpServer.ts** | 242–259 | `tts_speak`, `tts_stop` MCP tools |

**TTS backend:** Only `say.js` (OS-native). Piper and ElevenLabs are described in docs but not in `src/`.

---

## 14. Filler-Word Cleaning Logic

**File:** [src/fillerCleaner.ts](src/fillerCleaner.ts) (lines 7–58)

```typescript
const FILLER_WORDS = [
  "uhh", "uh", "umm", "um", "err", "hmm",
  "like", "you know", "you know what i mean",
  "kinda", "sorta", "sort of", "kind of",
  "basically", "literally", "actually",
  "i mean", "i guess", "i think maybe",
  "or whatever", "or something", "or anything",
  "right\\?", "right$",
  "does that make sense\\?",
  "if that makes sense",
  "i don't know", "idk", "not sure",
  "maybe", "perhaps",
];

export function cleanFillerWords(raw: string): CleanResult {
  // ... strips fillers, collapses duplicates, collapses whitespace
  return { cleaned: text.trim() || raw.trim(), original: raw, wasModified };
}
```

**Pipeline usage:** [src/pipeline.ts](src/pipeline.ts) (276–277): `cleanFillerWords(text)` → `text = fillerResult.cleaned`

**Hook (context only):** [.cursor/hooks/drive-preprocessor.py](.cursor/hooks/drive-preprocessor.py) (21–72): `_strip_fillers()` mirrors filler logic; adds `drive_cleaned_prompt` and `drive_filler_density` to details.

---

## 15. S-AS (Agent Screen) UI Panel / Webview

**File:** [src/agentScreen.ts](src/agentScreen.ts)

```typescript
// Lines 32–36
export class AgentScreenPanel {
  public static readonly viewType = "cursorDrive.agentScreen";
  private static instance: AgentScreenPanel | undefined;
  private readonly panel: vscode.WebviewPanel | undefined;
```

```typescript
// Lines 86–94
const panel = vscode.window.createWebviewPanel(
  AgentScreenPanel.viewType,
  "Drive — Agent Screen",
  column,
  { enableScripts: true, retainContextWhenHidden: true, localResourceRoots: [extensionUri] }
);
```

**Display mode:** `displayMode === "bottomLog"` uses `vscode.window.createOutputChannel("Drive Agent Screen")` (80–82).

**Command:** `cursorDrive.showAgentScreen` — [src/extension.ts](src/extension.ts) (471–477)

**Drive sidebar (separate):** [package.json](package.json) (169–185) — `viewsContainers` + `views` for `cursorDrive.panel` webview view.

---

## 16. Broadcast / Shared-State Between Operators

**File:** [src/operatorRegistry.ts](src/operatorRegistry.ts)

```typescript
// Line 2
import { EventEmitter } from "events";

// Lines 139–141
readonly events = new EventEmitter();

// Lines 54–60
export interface OperatorRegistryEvents {
  operatorCompleted: (id: string, summary: string) => void;
  operatorProgress: (id: string, message: string) => void;
  operatorError: (id: string, error: string) => void;
  taskDelegated: (fromId: string, toId: string, task: string) => void;
  operatorEscalated: (event: EscalationEvent) => void;
}
```

**Emits:** `operatorCompleted`, `operatorProgress`, `operatorError`, `taskDelegated`, `operatorEscalated`

**Subscribers:** `src/extension.ts` (125), `src/commsAgent.ts` (62–63), `src/mcpServer.ts` (1609–1612)

**DriveMode state:** `src/driveMode.ts` — `vscode.EventEmitter<DriveState>` for active/subMode changes.

---

## 17. Config Schema — What Is Configurable

**File:** [package.json](package.json) (lines 187–486): `contributes.configuration` with `title: "Cursor Drive"`

**Schema keys (partial):**

| Section | Keys |
|--------|------|
| General | `defaultSubMode`, `wakeWord`, `submitWord`, `syncNativeMode` |
| TTS | `tts.enabled`, `tts.voice`, `tts.speed`, `tts.maxSpokenSentences`, `tts.interruptOnInput` |
| Operators | `operators.maxConcurrent`, `operators.maxSubAgentsPerOperator`, `operators.defaultPermissionPreset`, `operators.namePool`, `operators.autoInjectOpenFiles` |
| Agent Screen | `agentScreen.enabled`, `agentScreen.autoOpen`, `agentScreen.displayMode`, `agentScreen.clickBehavior`, `agentScreen.showPlanProgress` |
| Status Bar | `statusBar.showModeLabel`, `statusBar.activeBackground` |
| Composer | `composer.driveActiveBorderColor` |
| MCP | `mcp.port`, `mcp.enableApps` |
| Cursor CLI | `cursorCli.command`, `cursorCli.timeoutSeconds` |
| Voice | `voice.autoActivateMicOnToggle`, `voice.chatOpenCommand`, `voice.micCommand`, `voice.stopCommand`, etc. |
| Prompt | `promptOptimizer.enabled`, `promptOptimizer.autoApprove` |
| Agents | `agents.tangentKeyword`, `agents.tangentConfirmationTimeout`, `agents.autoConfirmTangent`, `agents.delegateConfirmation` |
| Privacy | `privacy.transcriptPersistence`, `privacy.transcriptRetentionDays` |

**Config keys used in code but not in package.json schema:** `cursorDrive.agents.permissions`, `cursorDrive.approvalGates`, `cursorDrive.steering`, `cursorDrive.sanitizer.maxLength`, `cursorDrive.glossary`, `cursorDrive.agent.sessionMemory`, `cursorDrive.agent.proactiveSteering`, `cursorDrive.agents.commsAgent`, `cursorDrive.modeSwitching.requireConfirmation`, `cursorDrive.cloudAgents.apiBaseUrl`

---

## 18. Config Loading and Validation

**Loading:** Direct `vscode.workspace.getConfiguration("cursorDrive")` — no shared config module.

**Validation:** None. No zod, no runtime schema checks. VS Code uses `package.json` schema for UI. Call sites use `.get<T>(key, default)` and rely on defaults.

**Change listeners:** `onDidChangeConfiguration` in `approvalGates.ts`, `glossaryExpander.ts`, `tts.ts`, `statusBar.ts`.

---

## 19. External API Calls

| File | Line | Call | Destination |
|------|------|------|-------------|
| **src/cloudAgentClient.ts** | 82 | `fetch(url, { ...options, headers })` | `config.apiBaseUrl` (default `https://api.cursor.com`) |
| **src/cloudAgentClient.ts** | 102–111 | `fetchWithAuth` → `fetch` | `{base}/v0/agents` (POST) |
| **src/cloudAgentClient.ts** | 161–166 | `fetchWithAuth` → `fetch` | `{base}/v0/agents/{id}` (GET) |
| **src/cloudAgentClient.ts** | 211–216 | `fetchWithAuth` → `fetch` | `{base}/v0/agents/{id}/conversation` (GET) |
| **src/cloudAgentClient.ts** | 256–261 | `fetchWithAuth` → `fetch` | `{base}/v0/agents/{id}/artifacts` (GET) |
| **src/cloudAgentClient.ts** | 305–310 | `fetchWithAuth` → `fetch` | `{base}/v0/agents/{id}/artifacts/download?path=...` (GET) |
| **src/agentScreenApp.ts** | 13 | `import('https://esm.sh/@modelcontextprotocol/ext-apps')` | `https://esm.sh` (when bundle not provided) |

**Note:** No `axios`. All HTTP uses native `fetch` or Node `http.request`.

---

## 20. Audit Logging and Data-Egress Guards

**Audit logging:** Documented in `docs/reference/config-schema.md` (`cursorDrive.audit.enabled`, `path`, `maxSizeMB`) — **not implemented**. No `auditLog.ts`, no `drive-audit` references in `src/`.

**Data-egress guards:** None. No code that restricts or monitors outbound network calls.

**CSP:** [src/agentScreen.ts](src/agentScreen.ts) (291–292) — `img-src` and `media-src` allow `https://api.cursor.com`, `https://*.githubusercontent.com`, `https://*.amazonaws.com` for artifact media.

---

## 21. Test Files and Coverage

| Path | Coverage |
|------|----------|
| `tests/pluginInstaller.test.ts` | installDrivePluginToWorkspace, parseSkillRequires, checkSkillRequires |
| `tests/pipeline.test.ts` | runPipeline: Drive gate, filler, approval gate, wake word, submit word, tangent, block/warn |
| `tests/operatorRoles.test.ts` | OperatorRegistry role templates, escalation, duplicate names |
| `tests/mcpServer.test.ts` | DriveMcpServer start/stop, /health, /tasks, SSE, MCP tools, permission checks |
| `tests/extension.test.ts` | activate: commands, output channel, disposables |
| `tests/agentScreen.test.ts` | AgentScreenPanel activity formatting, syncStatus, switchAgent, playChime |
| `tests/cloudAgentClient.test.ts` | launchAgent, getAgentStatus, getAgentConversation, getAgentArtifacts, 201/404/429/500 |
| `tests/driveSidebar.test.ts` | DriveSidebarProvider view ID, resolveWebviewView |
| `tests/agentScreenApp.test.ts` | buildAgentScreenAppHtml, DOCTYPE, activity-feed |
| `tests/governance/*.test.ts` | taskLedger, focusGuard, fsUtils, projectGraph, aiSummary, entropy |
| `tests/tangentNameExtractor.test.ts` | extractTangentNameAndTask regex, model fallback |
| `tests/tangentFlow.test.ts` | confirmTangentAgent, TTS intro, updateTask |
| `tests/clarificationHandler.test.ts` | maybeStopTtsOnInput, handleClarification |
| `tests/commsAgent.test.ts` | queue flush, cap, auto-flush, model summary |
| `tests/router.test.ts` | route: slash commands, drive sub-mode, keyword routing |
| `tests/toolAllowlist.test.ts` | checkPermission, getEffectivePreset, operator-aware API |
| `tests/tts.test.ts` | speak, stop, speakFull, truncation |
| `tests/driveMode.test.ts` | createDriveModeManager, toggle, persisted state |
| `tests/fillerCleaner.test.ts` | cleanFillerWords, looksLikeDictation |
| `tests/approvalGates.test.ts` | checkPrompt block/warn, checkResponse |
| `tests/browser/smoke.spec.ts` | serve-web smoke: localhost:8000, Drive status bar, MCP health |
| `tests/browser/drive-ui-integration.spec.ts` | Drive UI: status bar, toggle, Agent Screen, MCP health |

**Total:** 47 Jest test files + 4 Playwright browser specs.

---

## 22. CI/CD Configuration

**File:** [.github/workflows/ci.yml](.github/workflows/ci.yml)

```yaml
name: CI
on:
  push: { branches: [master, develop] }
  pull_request: { branches: [master, develop] }
jobs:
  build-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: "20", cache: "npm" }
      - run: npm ci
      - run: npm run compile
      - run: npm test
      - name: Package VSIX
        run: npx vsce package --allow-missing-repository
      - name: Upload VSIX artifact
        if: github.ref == 'refs/heads/master'
        uses: actions/upload-artifact@v4
        with: { name: cursor-drive-vsix, path: "*.vsix", retention-days: 30 }
```

**Other workflows:**
- `pr-checks.yml` — labeler, branch naming enforcement
- `develop-to-main.yml` — manual promote develop → master, version bump
- `reinstall.yml` — manual reinstall extension
- `cloudflare-token-test.yml` — manual Cloudflare API token verification

---

## 23. TODO / FIXME / HACK / NOTE Comments

| File | Line | Full comment text |
|------|------|--------------------|
| `tests/governance/entropy.test.ts` | 19 | `// TODO: remove` (inside a string literal used as test fixture content) |

This is the only developer-style TODO/FIXME/HACK/NOTE. It appears in simulated file content for entropy detection, not as a real source comment.

---

## 24. GitHub Issues Referenced in Code

| File | Line | Reference |
|------|------|-----------|
| `README.md` | 166 | [GitHub Issues](https://github.com/drive-mode/cursor-drive/issues) |
| `docs/design/README-redesign-plan.md` | 201 | [GitHub Issues](https://github.com/drive-mode/cursor-drive/issues) |
| `.cursor/plans/sdk_and_protocol_research_6c42aa0c.plan.md` | 115 | `issue #1040` — Copilot CLI |
| `docs/research/technology-landscape-2026.md` | 198–199 | [Cursor GitHub issue: MCP server API gaps](https://github.com/cursor/cursor/issues/3549), [header support](https://github.com/cursor/cursor/issues/3536) |

**External issue references:**
- **#1040** — `github/copilot-cli` (MCP servers not loaded in ACP mode)
- **#3549** — `cursor/cursor` (MCP server API gaps)
- **#3536** — `cursor/cursor` (header support)

---

## Gap Analysis

### What's Built

| Area | Status |
|------|--------|
| Extension activation | `extension.ts` → Drive mode manager, status bar |
| beforeSubmitPrompt | drive-preprocessor.py (context only), plan-runner.py |
| Drive mode toggle | Ctrl+Shift+D, status bar click, QuickPick |
| Sub-modes | plan/agent/ask/debug, QuickPick, mode sync |
| Router | Slash commands, drive sub-mode, keyword routing |
| Tangent/switch/merge | Full pipeline, MCP tools, registry |
| Filler cleaning | fillerCleaner.ts, drive-preprocessor.py |
| TTS | say.js, tts_speak/tts_stop MCP |
| Agent Screen | WebviewPanel, Drive sidebar |
| Operator registry | EventEmitter, spawn/switch/merge/delegate |
| Config | package.json schema, vscode.workspace.getConfiguration |
| MCP server | :7891, /health, /tasks, /run, tools |
| Cloud agent client | api.cursor.com |
| Tests | 47 Jest + 4 Playwright |
| CI | npm ci, compile, test, VSIX packaging |

### What's Missing

| Area | Status |
|------|--------|
| STT | Relies on Cursor built-in; no extension STT |
| Audit logging | Documented in config-schema, not implemented |
| Data-egress guards | No monitoring or restriction of outbound calls |
| Config validation | No runtime schema validation |
| Config schema for some keys | approvalGates, agents.permissions, sanitizer, glossary, etc. in code but not in package.json |
| `src/config.ts` | Referenced in docs; does not exist |
| Prompt optimizer | Tracked in mvp-gaps; partially implemented |

### What's Stubbed

| Area | Status |
|------|--------|
| Slash commands `/plan`, `/run`, `/drive` | Router supports them; pipeline does not pass `command` |
| Piper / ElevenLabs TTS | Docs only |
| WebView SpeechRecognition | P2 in voice_input_modes plan |

---

## Priority Build List

Ranked by dependency order:

1. **Add missing config schema keys** — package.json schema for `approvalGates`, `agents.permissions`, `sanitizer`, `glossary`, `agent.sessionMemory`, `proactiveSteering`, `commsAgent`, `modeSwitching.requireConfirmation`, `cloudAgents.apiBaseUrl` — unblocks config UI and validation.

2. **Config validation module** — `src/config.ts` with zod schema for runtime validation; single source of truth for defaults.

3. **Audit logging** — Implement `cursorDrive.audit.enabled`, `path`, `maxSizeMB`; log high-impact actions (pr_create, code_change) per policy.

4. **Wire slash commands to pipeline** — Pass `command` from Composer/chat input to `route()` so `/plan`, `/run`, `/drive` take effect.

5. **Data-egress guard** — Optional module to log or restrict outbound fetch destinations; configurable allowlist.

6. **Prompt optimizer completion** — Finish prompt optimizer wiring; ensure it is invoked when Drive is active and not skipped.

7. **STT fallback / WebView SpeechRecognition** — P2 prototype for real-time wake word when Cursor built-in is insufficient.

8. **Alternative TTS backends** — Piper (local) or ElevenLabs (optional) for users who need more control.

9. **Plan governance sync** — Ensure plan-runner and registry sync are robust; document completion gate.

10. **Browser test coverage** — Expand Playwright specs for Agent Screen, share screen, and Drive UI flows.
