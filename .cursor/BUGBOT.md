# Cursor Drive — BugBot Review Rules

> BugBot reads this file when reviewing PRs. Rules encode codebase-specific
> invariants that a generic reviewer would miss. Each rule names the relevant
> file(s) and states the invariant.

---

## Privacy & Security

- **No secret logging.** Never log, persist, or return in responses: API keys,
  passwords, tokens, user transcripts, or audio payloads. This is the project's
  #1 policy (see `policy-pack`).
- **SecretStorage for keys.** API keys (ElevenLabs, future providers) must use
  `vscode.SecretStorage`. Never store secrets in `vscode.workspace.getConfiguration()`
  or commit them to environment variable files.
- **Redact in logs.** All `console.log`/`console.error` output that could contain
  config values must redact sensitive fields. Follow the `redacted_dict()` pattern.
- **Webview CSP.** The Content-Security-Policy in `src/shareScreen.ts` must use
  nonce-based policies (`'nonce-${nonce}'`). Never use `'unsafe-inline'` or
  `'unsafe-eval'`. Every `<script>` and `<style>` tag must include the nonce.

---

## Architecture

- **Model selection via `modelSelector.ts` only.** All model selection must go
  through `selectModelForTier()` or `selectCheapModel()` in `src/modelSelector.ts`.
  No module should call `vscode.lm.selectChatModels()` directly.
- **MCP tool registration pattern.** Tools in `src/mcpServer.ts` must follow:
  `this.mcpServer.tool(name, description, zodSchema, asyncHandler)`. Every handler
  must return `{ content: [{ type: "text", text: string }] }`. Do not return
  bare strings or objects.
- **Router is pure.** `src/router.ts` must remain a pure synchronous function
  with no async, no `vscode` API calls, and no side effects. It accepts a
  `cleanContext` object and returns a `RouteDecision`.
- **FillerCleaner is pure.** `src/fillerCleaner.ts` must have zero side effects —
  no network calls, no VS Code API imports, no `console.log`. It is a deterministic
  text transform.
- **ShareScreen singleton.** `src/shareScreen.ts` uses a singleton pattern. Always
  access via `ShareScreenPanel.createOrShow()` or `ShareScreenPanel.getInstance()`.
  Never call `new ShareScreenPanel()` directly (its constructor is private).
- **Extension.ts is wiring only.** `src/extension.ts` registers commands and wires
  services. Business logic belongs in dedicated modules — not inline in `activate()`.

---

## Type Safety

- **`SubMode`** in `src/driveMode.ts` is exactly `"plan" | "agent" | "ask" | "direct"`.
  Adding a new value requires updating the `isSubMode()` guard, the QuickPick in
  `extension.ts`, the router's `driveSubMode` switch, and the status bar renderer.
- **`RouteMode`** in `src/router.ts` is exactly `"plan" | "run" | "direct" | "collab"`.
  Adding a value requires updating all `switch`/`case` and `tierForMode()` in
  `modelSelector.ts`.
- **`AgentStatus`** in `src/agentRegistry.ts` is exactly
  `"active" | "background" | "completed" | "merged" | "paused"`. Valid transitions:
  `active ↔ background`, `active/background → completed/merged`,
  `active/background → paused → active/background`. Any other transition is a bug.
- **`ModelTier`** in `src/modelSelector.ts` is exactly
  `"routing" | "planning" | "execution"`. Tier selection must use `tierForMode()`
  for consistency — don't hardcode tier strings outside this module.
- **`ActivityEvent.type`** in `src/shareScreen.ts` is exactly
  `"activity" | "file" | "decision" | "agentSwitch" | "clear"`. The webview
  `message` handler must have a case for every type.

---

## State Management

- **DriveMode must fire().** Every state mutation in `src/driveMode.ts` (`setActive`,
  `setSubMode`, `toggle`) must call `fire()` to emit the `onDidChange` event.
  Skipping `fire()` causes silent bugs — the status bar and other listeners won't
  update.
- **DriveMode must persist.** Both `drive.active` and `drive.subMode` must be saved
  via `ctx.workspaceState.update()` on every change so state survives reload.
- **One foreground agent.** `AgentRegistry` in `src/agentRegistry.ts` must maintain
  exactly one foreground agent at a time. `switchTo()` must set the previous
  foreground to `"background"` before setting the new one to `"active"`.
- **Bounded agent memory.** `updateMemory()` in `AgentRegistry` caps entries at 50.
  Any change to memory storage must respect this bound to prevent unbounded growth.

---

## Testing

- **Test every new module.** Every new `.ts` file in `src/` must have a
  corresponding `*.test.ts` file in `tests/`.
- **Use the vscode mock.** Tests must import vscode from `tests/__mocks__/vscode.ts`
  via the Jest `moduleNameMapper`. Never import the real `vscode` module in tests.
- **Pure modules skip vscode.** Test files for pure modules (`fillerCleaner.ts`,
  `router.ts`) must NOT import the vscode mock — they don't need it.
- **Cover edges.** Tests must cover: success path, error/edge cases, and boundary
  conditions (empty input, max values, type mismatches).

---

## Webview & UI

- **VS Code CSS variables only.** All colors in webview HTML (`src/shareScreen.ts`)
  must use `var(--vscode-*)` tokens. Zero hardcoded hex colors, `rgb()` values,
  or CSS color names. This ensures dark/light theme compatibility.
- **Nonce on script/style tags.** Every `<script>` and `<style>` in the webview
  must carry a `nonce="${nonce}"` attribute matching the CSP header.
- **ThemeColor for status bar.** `src/statusBar.ts` must use
  `new vscode.ThemeColor(...)` for status bar background — never raw color strings.
- **Codicon prefixes.** QuickPick items should use codicon prefixes
  (`$(play-circle)`, `$(circle-slash)`, etc.) for visual consistency with VS Code.

---

## Cost Awareness

- **Tier 1 for routing.** Routing operations (intent detection, filler detection,
  prompt optimization) must use the cheapest model: `selectCheapModel()` or
  `selectModelForTier("routing", ...)`.
- **Tier 2 for planning.** Clarification loops and plan generation must use
  `selectModelForTier("planning", ...)`.
- **Tier 3 for execution only.** Only code generation and multi-file edits should
  use the user's selected model (tier 3).
- **Pure functions are zero-cost.** `cleanFillerWords()` and `route()` must NEVER
  make model API calls. They are deterministic transforms — any model call in these
  functions is a cost bug.

---

## Approval Gates

- **Gate destructive ops.** Operations matching `rm -rf`, `git push --force`,
  `git reset --hard`, `DROP DATABASE`, `DROP TABLE`, `del /f /s /q`, `format c:`
  must be intercepted by approval gates before execution.
- **Never skip silently.** Approval gate results must be `"allowed"` or `"blocked"`.
  Never silently skip the check or return a default "allowed" on error.
- **Gate high-impact MCP tools.** MCP tools that modify files, git state, or run
  terminal commands must check approval gates before executing the operation.
