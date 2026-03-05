---
name: Fix extension activation
overview: "SUPERSEDED by quality-performance.plan.md (absorbed as first TODO qp-01). Output Channel is already added (add-output-channel completed). Remaining work carried forward to quality-performance."
planType: task
planId: fix-extension-activation
parentPlanId: cursor-drive
childPlanIds: []
dependsOn: []
todos:
  - id: add-output-channel
    content: Add Output Channel + try-catch to activate() in src/extension.ts. Log entry, each subsystem init result, and any error. No other files change.
    status: completed
  - id: f5-read-error
    content: "SUPERSEDED — see quality-performance TODO qp-01."
    status: cancelled
  - id: fix-root-cause
    content: "SUPERSEDED — see quality-performance TODO qp-01."
    status: cancelled
  - id: verify
    content: "SUPERSEDED — see quality-performance TODO qp-01."
    status: cancelled
isProject: false
---

# Fix Extension Activation

## Role

You are a senior TypeScript engineer working on a VS Code / Cursor extension. Implement changes rather than suggesting them. Read files before making claims about their contents. Ask before any destructive or irreversible operation.

## Current state

**Repo:** `c:\Users\harri\Documents\Coding Projects\fun\cursor-drive`

**What is broken:** The extension loads — Drive commands appear in the Command Palette because they are static `package.json` metadata — but `activate()` never runs. No status bar item appears. No `[Drive MCP]` log in the Debug Console of the first window.

**Why it is silent:** `src/extension.ts` compiles to `out/extension.js` with 13 top-level `require()` calls (lines 55–68 of the compiled output). If any one throws during module loading, the entire module fails before `activate()` is called. There is no error handling and no logging anywhere in the activation path.

**What we do not know yet:** Which import is failing. The Debug Console in the first Cursor window only shows Cursor internals. The actual error is in the dev-host window's own console (`Ctrl+Shift+I` in the second window > Console tab), which has not been checked.

**Build state:** `npm run compile` produces 0 errors. `npm test` passes 83 tests. The problem is runtime, not compile-time.

## Relevant files

- `src/extension.ts` — the only file to change
- `out/extension.js` — compiled output; do not edit directly
- `.vscode/launch.json` — F5 launch configs: "Dev: Drive in sandbox" and "Dev: Drive in repo root"
- `sandbox/` — minimal test workspace opened by the dev-host

**Current imports in `src/extension.ts` (lines 19–32):**

```typescript
import * as vscode from "vscode";
import { createDriveModeManager, SubMode } from "./driveMode.js";
import { createDriveStatusBar } from "./statusBar.js";
import { speak, stop as ttsStop, isEnabled as ttsEnabled } from "./tts.js";
import { ShareScreenPanel } from "./shareScreen.js";
import { AgentRegistry } from "./agentRegistry.js";
import { DriveMcpServer } from "./mcpServer.js";
import { CommsAgent } from "./commsAgent.js";
import { SessionMemory } from "./sessionMemory.js";
import { readConfig, onConfigChange } from "./config.js";
import { checkPrompt } from "./approvalGates.js";
import { cleanFillerWords } from "./fillerCleaner.js";
import { expandGlossary } from "./glossaryExpander.js";
import { sanitizePrompt } from "./sanitizer.js";
```

**Current `activate()` signature (line 34):**

```typescript
export function activate(context: vscode.ExtensionContext): void {
```

**TypeScript config:** `module: "Node16"`, `target: "ES2022"`, `strict: true`

## Task

Add a `vscode.OutputChannel` named "Cursor Drive" at the top of `activate()` in `src/extension.ts`. Wrap each subsystem initialization block in a try-catch that writes its result to the channel. This surfaces the exact failure without touching any other file.

Specifically:

1. Create the channel as the first statement in `activate()`:

```typescript
const out = vscode.window.createOutputChannel("Cursor Drive");
context.subscriptions.push(out);
out.appendLine("[Drive] activate() called");
```

1. Wrap the status bar block (lines ~35–39):

```typescript
let statusBar: ReturnType<typeof createDriveStatusBar>;
try {
  statusBar = createDriveStatusBar(driveMgr);
  context.subscriptions.push(statusBar);
  out.appendLine("[Drive] status bar: OK");
} catch (e) {
  out.appendLine(`[Drive] status bar FAILED: ${e}`);
  out.show(true);
  return;
}
```

1. Wrap the MCP server block (lines ~59–78):

```typescript
try {
  const mcpServer = new DriveMcpServer({ port: mcpPort, driveMgr, agentRegistry, onAgentChange: syncAgentName });
  void mcpServer.start().catch((err: Error) => {
    out.appendLine(`[Drive] MCP start error: ${err.message}`);
  });
  context.subscriptions.push({ dispose: () => { void mcpServer.stop(); } });
  out.appendLine("[Drive] MCP server: starting on port " + mcpPort);
} catch (e) {
  out.appendLine(`[Drive] MCP FAILED: ${e}`);
}
```

1. Add at the end of `activate()`:

```typescript
out.appendLine("[Drive] activate() complete");
```

## Constraints

- Change only `src/extension.ts`. Do not touch imports, other source files, `package.json`, or config files.
- The status bar is required. If it fails, log and return early — do not continue activating with no UI.
- MCP failure is non-fatal. Log it and continue — status bar and commands still work without MCP.
- Do not add lazy imports, do not restructure modules, do not add defensive stubs to `tts.ts` or `mcpServer.ts`. Those are speculative fixes for an unknown error. The Output Channel will tell us the actual error; fix that specific thing instead.

The reason for this constraint: spreading error handling across multiple modules violates Single Responsibility and masks bugs. One Output Channel in one place is the correct pattern.

## Verification

Run these in order after making the change:

1. `npm run compile` — must produce 0 errors
2. `npm test` — all 83 tests must still pass
3. F5 from repo root → select "Dev: Drive in sandbox" → a second Cursor window opens
4. In the second window: `View > Output > "Cursor Drive"`
5. Read the channel output line by line:
  - If `[Drive] activate() complete` appears with no FAILED lines: the extension is working. Check the status bar for `$(circle-slash) Drive (off)`.
  - If a FAILED line appears: that line contains the exact error. Fix that specific thing.
  - If the Output Channel does not appear at all: `activate()` was never called, meaning a top-level import failed. Open `Ctrl+Shift+I` in the second window > Console tab > find the red error.
6. After any fix: `$(circle-slash) Drive (off)` visible in status bar, `Ctrl+Shift+D` toggles it, `curl http://127.0.0.1:7891/health` returns `{"status":"ok","name":"cursor-drive","port":7891}`.

## What to do after reading the error

Do not speculate. Read the error, then fix only what it says. Common cases:

- `Cannot find module 'X'` — a package is missing from `node_modules`. Run `npm install` and retry.
- `X is not a constructor` / `X is not a function` — an ESM/CJS interop issue with a specific package. Wrap that one import in a try-catch or use a dynamic import.
- `TypeError: vscode.X is not a function` — a Cursor-specific API difference. Check which `vscode.*` API is unavailable in Cursor's extension host and use the fallback.

Fix the one thing the error identifies. Run `npm run compile` and `npm test` again. Then F5 again to confirm.

## Prevention going forward

Every `activate()` in this codebase gets an Output Channel from its first line. It costs nothing and makes every future activation failure immediately visible without opening Developer Tools. Apply this pattern to any new extension entry points.