# Webview Development & Event Catalog

Quick guide for interactive webview development and event-driven extension features.

---

## Webview Hot Reload (Vite-like)

The Drive sidebar loads from `webview/drive-sidebar.html` and **hot-reloads** when you save changes — no window reload needed.

### Setup

1. Press **F5** → "Dev: Drive in sandbox"
2. Click the **Drive** icon in the Activity Bar to open the sidebar
3. Edit `webview/drive-sidebar.html` (HTML, CSS, or inline script)
4. Save

The panel updates automatically. You only need to reload the window when changing extension host code (TypeScript in `src/`).

### Template placeholders

The HTML file uses placeholders that the extension injects at runtime:

| Placeholder | Replaced with |
|-------------|---------------|
| `{{CSP_NONCE}}` | Random nonce for CSP |
| `{{CSP_SOURCE}}` | Webview CSP source |

### Adding more webviews

To add hot reload for another webview (e.g. Agent Screen):

1. Create `webview/<name>.html`
2. Use `{{CSP_NONCE}}` and `{{CSP_SOURCE}}` in the template
3. Load via `fs.readFileSync` + replace, and add a file watcher in dev mode

---

## Event Listener Breakpoints (DevTools)

When debugging webviews, use **DevTools** to inspect events:

1. Run `cursorDrive.openWebviewDevTools` (or focus the webview and use the command)
2. In DevTools → **Sources** → **Event Listener Breakpoints**
3. Expand categories (Mouse, Keyboard, etc.) and check the events you care about

Useful for debugging:

- **Mouse → click** — when buttons are clicked
- **Mouse → mousedown / mouseup** — for drag or custom interactions
- **Keyboard → keydown** — for shortcuts

---

## VS Code / Cursor Events We Can Use

Extensions can subscribe to many events. Here are high-value ones for Drive:

### Window & Editor

| Event | API | Use case |
|-------|-----|----------|
| Active editor change | `vscode.window.onDidChangeActiveTextEditor` | Update UI when user switches files |
| Text selection change | `vscode.window.onDidChangeTextEditorSelection` | Context-aware prompts (e.g. "refactor this") |
| Window state (focus) | `vscode.window.onDidChangeWindowState` | Pause/resume when Cursor loses focus |
| Terminal visibility | `vscode.window.onDidChangeTerminalState` | Sync with terminal activity |

### Workspace

| Event | API | Use case |
|-------|-----|----------|
| Config change | `vscode.workspace.onDidChangeConfiguration` | React to config updates |
| File save | `vscode.workspace.onDidSaveTextDocument` | Post-save hooks, validation |
| File open | `vscode.workspace.onDidOpenTextDocument` | Track file usage |
| File create/delete/change | `vscode.workspace.createFileSystemWatcher` | Hot reload (we use this), build triggers |

### Chat / Composer (Cursor-specific)

| Event | API | Use case |
|-------|-----|----------|
| Before submit | `vscode.chat.onDidSubmitPrompt` (if available) | Pipeline interception |
| Chat state | Cursor-specific APIs | Sync with chat visibility |

### Extension lifecycle

| Event | API | Use case |
|-------|-----|----------|
| Extension mode | `context.extensionMode` | Dev vs production behavior |
| Extension deactivate | `context.subscriptions` | Cleanup |

---

## Quick event wiring examples

```typescript
// React to config changes
vscode.workspace.onDidChangeConfiguration((e) => {
  if (e.affectsConfiguration("cursorDrive")) {
    // refresh UI
  }
});

// React to active editor
vscode.window.onDidChangeActiveTextEditor((editor) => {
  if (editor) {
    // update context for prompts
  }
});

// React to file save
vscode.workspace.onDidSaveTextDocument((doc) => {
  // run linter, update index, etc.
});
```

---

## References

- [drive-ui-surfaces-and-devtools.md](../design/ux/drive-ui-surfaces-and-devtools.md) — DevTools workflow, click logger
- [drive-tab-vision-and-voice-flow.md](../design/ux/drive-tab-vision-and-voice-flow.md) — Drive tab layout, settings, voice flow, layout constraints
- [VS Code Extension API: Events](https://code.visualstudio.com/api/references/vscode-api#events)
