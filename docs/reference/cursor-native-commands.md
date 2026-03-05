# Cursor Native Commands Reference

This document lists Cursor/VS Code native commands relevant to Drive integration.
Run `cursorDrive.discoverAllCommands` to generate a live enumeration from your Cursor instance.

## How to use from Drive extension code

```typescript
// Always wrap in try/catch — commands may not exist in all Cursor versions
vscode.commands.executeCommand("command.id", ...args).then(undefined, () => {
  // graceful degradation
});
```

## composerMode.* — Native mode switching

| Command | Purpose | Drive usage |
|---|---|---|
| `composerMode.plan` | Switch Cursor to Plan mode | Called by `setSubMode("plan")` when `syncNativeMode=true` |
| `composerMode.agent` | Switch to Agent mode | Called by `setSubMode("agent")` |
| `composerMode.chat` | Switch to Chat/Ask mode | Called by `setSubMode("ask")` |
| `composerMode.debug` | Switch to Debug mode | Called by `setSubMode("debug")` |
| `composerMode.background` | Switch to Background agent mode | Not used by Drive currently |

## composer.* — Composer/chat panel control

| Command | Purpose | Drive usage |
|---|---|---|
| `composer.addfilestocomposer` | Add files to current composer | `cursorDrive.injectFilesToComposer` |
| `composer.addsymbolstocomposer` | Add symbols to composer | Not used |
| `composer.addfilestonnewcomposer` | Add files to a NEW composer | Not used |
| `composer.createNew` | Create new composer tab | Not used |
| `composer.createNewBackgroundAgent` | Launch a new background agent | Future: Phase 2 cloud agent integration |
| `composer.openTerminalInWorktree` | Open terminal in agent worktree | Not used |
| `composer.exportChatAsMd` | Export current chat as Markdown | Not used |
| `composer.shareChat` | Share chat session | Not used |
| `composer.cancelChat` | Cancel current chat | Not used |
| `composer.focusComposer` | Focus the composer input | Not used |
| `composer.openComposer` | Open composer panel | Not used |
| `composer.openAsPane` | Open composer as pane | Not used |
| `composer.resetMode` | Reset composer mode | Not used |
| `composer.duplicateChat` | Duplicate current chat | Not used |
| `composer.startComposerPrompt2` | Start composer with a prompt string | Candidate for voice→chat injection (F10) |
| `composer.toggleVoiceDictation` | Toggle voice dictation | Candidate for voice mode |
| `composer.cancelVoiceDictation` | Cancel voice dictation | Not used |

## workbench.action.* — IDE workbench actions

| Command | Purpose | Drive usage |
|---|---|---|
| `workbench.action.chat.open` | Open chat panel | Used by `activateVoiceInput()` |
| `workbench.action.chat.startVoiceChat` | Start voice chat | Used by `activateVoiceInput()` (mic command) |
| `workbench.action.chat.stopListening` | Stop mic (cancel) | Used by `stopVoiceInput()` fallback |
| `workbench.action.chat.stopListeningAndSubmit` | Stop mic + submit | Used by `cursorDrive.stopVoice` |
| `workbench.action.openAgentsView` | Open native Agents panel | Used by `cursorDrive.focusAgentView` |
| `workbench.action.webview.openDeveloperTools` | Open DevTools for focused webview | Used by `cursorDrive.openWebviewDevTools` |
| `workbench.action.toggleDevTools` | Toggle main Chromium DevTools | Not used (full IDE DevTools) |
| `workbench.extensions.action.devtoolsExtensionHost` | DevTools for extension host | Not used |

## cursor.* — Cursor-specific commands

| Command | Purpose | Drive usage |
|---|---|---|
| `cursor.tryAgentLayout` | Apply standard agent panel layout | Used by `cursorDrive.focusAgentView` |
| `cursor.closeAgentChangesEditor` | Close agent changes editor | Not used |
| `cursor.toggleAgentWindowIDEUnification` | Toggle unified agent/IDE window | Not used |
| `cursor.browserView.navigate` | Navigate browser view | Not used directly |
| `cursor.browserView.takeScreenshot` | Screenshot browser view | Future: AgentScreen browser tab |
| `cursor.browserView.sendCDPCommand` | Send Chrome DevTools Protocol command | Future: deep browser automation |
| `cursor.browserView.executeJavaScript` | Execute JS in browser view | Future: webview interaction |
| `cursor.browserView.getConsoleLogs` | Get browser console logs | Future: debugging |
| `cursor.browserAutomation.captureWebviewScreenshot` | Screenshot webview | Future: UI capture |
| `cursor.ndjsonIngest.start` | Start Cursor's internal NDJSON ingest | Internal — NOT hookable from extension |
| `cursor.ndjsonIngest.stop` | Stop ingest | Internal |
| `cursor.ndjsonIngest.showStatus` | Show ingest status | Used in `cursorDrive.diagnose` (probe only) |
| `cursor.ndjsonIngest.copyCurl` | Copy curl command for ingest endpoint | Internal |
| `cursor.generateGitCommitMessage` | AI-generate a git commit message | Not used |
| `cursor.createRuleFromSelection` | Create rule from selected text | Not used |
| `cursor.installCli` | Install Cursor CLI (`agent` binary) | Not used |
| `cursor.selectBackend` | Select Cursor AI backend | Not used |
| `cursor.showSubscriptionTiersModal` | Show subscription info | Not used |

## glass.* — Agents view tabs

| Command | Purpose | Drive usage |
|---|---|---|
| `glass.openChangesTab` | Open changes tab in Agents view | Not used |
| `glass.openFilesTab` | Open files tab | Not used |
| `glass.openBrowserTab` | Open browser tab | Not used |
| `glass.nextTab` / `glass.previousTab` | Navigate tabs | Not used |
| `glass.saveFile` | Save file from agent changes | Not used |
| `glass.closeActiveTab` | Close active tab | Not used |

## mcp.* — MCP client management

| Command | Purpose | Drive usage |
|---|---|---|
| `mcp.reloadClient` | Reload MCP client connections | Used by `cursorDrive.reloadMcp` |

## cursorai.action.* — AI model and settings

| Command | Purpose | Drive usage |
|---|---|---|
| `cursorai.action.switchToModel` | Switch active AI model | Not used (future: model routing) |
| `cursorai.action.switchToModelSlug` | Switch by model slug | Not used |
| `cursorai.action.switchToDynamicModelSlug` | Switch to dynamic model | Not used |
| `cursorai.action.switchToProAuto` | Switch to Pro Auto | Not used |
| `cursorai.action.openAccountSettings` | Open account settings | Not used |
| `cursorai.action.showUsagePricingModal` | Show usage/pricing | Not used |
| `cursorai.action.addModelToSwitcher` | Add model to switcher | Not used |
| `cursorai.action.disableFallbackModels` | Disable fallback models | Not used |

## developer.* — Internal developer tools (use with caution)

| Command | Purpose | Drive usage |
|---|---|---|
| `developer.openAgentTranscript` | Open an agent transcript | Not used (future: AgentScreen "History" tab) |
| `workbench.action.openExtensionMonitor` | Open extension monitor | Used in `cursorDrive.diagnose` |
| `workbench.action.showRuntimeExtensions` | Show loaded extensions | Not used |
| `workbench.action.openExtensionLogsFolder` | Open extension logs | Not used |

## DevTools / UI discovery (for extension development)

Use these when targeting or debugging Drive UI; see [drive-ui-surfaces-and-devtools.md](../design/ux/drive-ui-surfaces-and-devtools.md).

| Command | Purpose | Drive usage |
|---|---|---|
| `workbench.action.inspectContextKeys` | Inspect context keys under cursor (Console) | Recommended: map workbench UI state to commands |
| `workbench.action.setLogLevel` | Set log level per extension (e.g. Cursor Drive → Trace) | Use with LogOutputChannel for verbosity without code change |
| `workbench.action.toggleScreencastMode` | Toggle Screencast (mouse + keys on screen) | Recommended: demos and "what I clicked" for agents |
| `workbench.action.webview.openDeveloperTools` | DevTools for focused webview | Used by `cursorDrive.openWebviewDevTools` (Agent Screen) |
| `workbench.action.toggleDevTools` | Toggle main window DevTools | Manual debugging |

## workbench.action.terminal.chat.* — Terminal AI chat

| Command | Purpose | Drive usage |
|---|---|---|
| `workbench.action.terminal.chat.start` | Start terminal AI chat | Not used (future: Debug mode) |
| `workbench.action.terminal.chat.runCommand` | Run AI-suggested command | Not used |
| `workbench.action.terminal.chat.insertCommand` | Insert command into terminal | Not used |

## Output channel shortcuts

These open specific Cursor output channels:

| Command | Channel |
|---|---|
| `workbench.action.output.show.anysphere.cursor-mcp.MCP Logs` | MCP connection logs |
| `workbench.action.output.show.anysphere.cursor-agent-exec.Cursor Agent Exec` | Agent execution logs |
| `workbench.action.output.show.extension-output-anysphere.cursor-agent-#1-Cursor Agent` | Cursor Agent output |
| `workbench.action.output.show.extension-output-anysphere.cursor-agent-exec-#1-Cursor Plugins` | Cursor Plugins output |

Used by `cursorDrive.diagnose` "Show Logs" picker.

## Discovery and validation

To get the live command list from your Cursor instance:

1. Open command palette (`Ctrl+Shift+P`)
2. Run `Drive: Discover All Cursor Commands (full list by prefix)`
3. Inspect `.cursor/cursor-commands-full.json` for the complete live list

To test whether a command exists and accepts no-arg invocation:

```typescript
async function probeCommand(id: string): Promise<boolean> {
  try {
    await vscode.commands.executeCommand(id);
    return true;
  } catch {
    return false;
  }
}
```

## CLI flags (`agent --help`)

The `agent` CLI (installed via `cursor.installCli`) accepts:

- `-p <prompt>` — prompt string
- `--output-format stream-json` — stream NDJSON events to stdout (used by Drive's streaming runner)
- `--model <slug>` — override model
- `--no-auto-accept-edits` — require confirmation for edits
- `--cwd <dir>` — working directory

Note: Run `agent --help` in terminal for the canonical list for your installed version.
