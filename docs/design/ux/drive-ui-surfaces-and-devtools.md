# Drive UI Surfaces and DevTools Workflow

Drive interacts with **more than three** UI surfaces: it *owns* three and *interacts with* several Cursor/VS Code surfaces. This doc lists all of them and ties in the recommended DevTools workflow for targeting and testing (from Chromium DevTools, VS Code/Cursor developer commands, and extension logging).

---

## Surfaces Drive Owns (3)

| # | Surface | Type | Location | Notes |
|---|---------|------|----------|--------|
| 1 | **Status bar item** | `StatusBarItem` | Left status bar | Click → `cursorDrive.setSubMode` QuickPick |
| 2 | **Agent Screen (S-AS)** | `WebviewPanel` or `OutputChannel` | Tab beside editor, or bottom panel, or "Drive Agent Screen" output | `displayMode`: tab \| panel \| bottomLog |
| 3 | **Audio feedback** | Hidden WebView | Not visible | Chimes via Web Audio API |

---

## Surfaces Drive Interacts With (Cursor/VS Code)

| # | Surface | How Drive uses it |
|---|---------|-------------------|
| 4 | **Chat / Composer** | Pipeline intercepts submit via `beforeSubmitPrompt`. Voice: `workbench.action.chat.startVoiceChat`, `stopListeningAndSubmit`. Optional: `composer.addfilestocomposer`, `composer.startComposerPrompt2`. |
| 5 | **Command Palette** | All `cursorDrive.*` commands (toggle, setSubMode, showAgentScreen, diagnose, etc.). |
| 6 | **QuickPicks** | `setSubMode` (plan/agent/ask/debug/off), `diagnose` (Show Logs, Extension Monitor), `operators` (list/switch/dismiss), `spawnOperator` (task/name), prompt optimizer (approve/edit). |
| 7 | **Input boxes** | Diagnose custom prompt, spawn operator (task, name), prompt optimizer edit. |
| 8 | **Toast messages** | `showInformationMessage` / `showWarningMessage` / `showErrorMessage` (MCP start, mode switch, errors, etc.). |
| 9 | **Output panel** | Channels: "Cursor Drive", "Drive Agent Screen", "Drive API Discovery". Diagnose can open: MCP Logs, Cursor Agent Exec, Cursor Agent, Cursor Plugins. |
| 10 | **Native Agents panel** | `cursorDrive.focusAgentView` → `workbench.action.openAgentsView` + `cursor.tryAgentLayout`. Drive’s operators appear in the *Agent Screen* webview, not in Cursor’s native Agents list. |
| 11 | **Mode selector (Composer mode)** | `composerMode.plan | agent | chat | debug` when `syncNativeMode` is true. |
| 12 | **Webview DevTools** | `cursorDrive.openWebviewDevTools` → `workbench.action.webview.openDeveloperTools` for Agent Screen HTML/CSS debugging. |

So in total there are **12 distinct interaction points** (3 owned + 9 we rely on or trigger).

---

## What Extensions Cannot Do

- **Globally intercept all workbench UI clicks** — not part of the extension API.
- **Reliably target internal Cursor/VS Code DOM** — no supported way to inject into the IDE chrome; such targeting is fragile across versions.

What we *can* do: log everything *our* code does (commands, views, webviews, QuickPicks), and use Cursor’s own tooling to map “what was clicked” to **commands** and **context keys**.

---

## Recommended DevTools Workflow (High Signal)

Order of operations for building and testing Drive UI:

1. **Screencast Mode** — Shows mouse and keystrokes on screen. Use for demos and for agent/developer “here’s what I clicked” guidance.
2. **Developer: Inspect Context Keys** — Run from Command Palette, then hover/click UI. Prints **active context keys** to the Developer Tools Console. Use this to understand why a menu item is enabled/disabled and which context gates behavior. More actionable than raw DOM selectors for the workbench.
3. **Extension structured logs** — Use an **Output channel** (and optionally **LogOutputChannel** with `log: true`) so you get levels (trace/debug/info/warn/error) and can change verbosity via **Developer: Set Log Level…** without code changes. Write JSONL to `ExtensionContext.logUri` for shareable “interaction bundles” for agents.
4. **Playwright / Electron** — Use only for **minimal regression** and capture flows (e.g. “toggle Drive → status bar text”). Do not rely on it for full IDE chrome discovery; it’s brittle across Cursor versions.

### Commands to know

| Command | Purpose |
|---------|---------|
| `workbench.action.toggleScreencastMode` | Toggle Screencast (mouse + keys on screen). |
| `workbench.action.inspectContextKeys` | Inspect context keys under cursor (Console output). |
| `workbench.action.setLogLevel` | Set log level per extension (e.g. “Cursor Drive” → Trace). |
| `workbench.action.webview.openDeveloperTools` | DevTools for the focused webview (e.g. Agent Screen). |
| `workbench.action.toggleDevTools` | Main Chromium DevTools for the window. |

**Validation:** Command IDs can differ by Cursor/VS Code version. Run `cursorDrive.discoverAllCommands`, open `.cursor/cursor-commands-full.json`, and search for `Screencast`, `Context`, `Log Level`, `webview`, `DevTools` to confirm IDs in your build.

---

## Heap / Memory vs Click Logging

- **Heap profile / Live Heap Profile** — For **memory** (leaks, growth). Use when you suspect “every click leaks” or “this panel grows heap.” Not for building a list of UI targets.
- **Click logging** — For building a list of “what I clicked” and candidate selectors. Use **DevTools Recorder** (record/replay) or a **drop-in click logger** in the Console (or inside a webview you control).

---

## Click Logger (For Surfaces We Control)

For the **Agent Screen webview** we own the DOM. To build a list of targets (e.g. for automation or accessibility):

- **Option A — DevTools Recorder**
  Open DevTools for the webview (`cursorDrive.openWebviewDevTools`), use Recorder to record a flow, export for replay or documentation.

- **Option B — Console click logger**
  With DevTools focused on the Agent Screen webview (run `cursorDrive.openWebviewDevTools` first), paste this into the Console to log every click and build a JSON list. Use `__clickLog.copy()` to copy the log, `__clickLog.stop()` to stop.

```js
(function() {
  function cssEscape(s) {
    return (window.CSS && CSS.escape) ? CSS.escape(s) : String(s).replace(/([^\w-])/g, "\\$1");
  }
  function selectorFor(el) {
    if (!(el instanceof Element)) return "";
    if (el.id) return "#" + cssEscape(el.id);
    var parts = [], cur = el;
    while (cur && cur.nodeType === 1 && cur !== document.documentElement) {
      var part = cur.localName.toLowerCase();
      var cls = [].slice.call(cur.classList).find(function(c) {
        return c && c.length < 40 && !/[A-Fa-f0-9]{8,}/.test(c);
      });
      if (cls) part += "." + cssEscape(cls);
      var parent = cur.parentElement;
      if (parent) {
        var same = [].slice.call(parent.children).filter(function(n) { return n.localName === cur.localName; });
        if (same.length > 1) part += ":nth-of-type(" + (same.indexOf(cur) + 1) + ")";
        if (parent.id) { parts.unshift(part, "#" + cssEscape(parent.id)); break; }
      }
      parts.unshift(part);
      cur = parent;
    }
    return parts.join(" > ");
  }
  var logs = [];
  function handler(e) {
    var el = e.target;
    if (!(el instanceof Element)) return;
    logs.push({
      ts: new Date().toISOString(),
      tag: el.tagName.toLowerCase(),
      text: (el.textContent || "").trim().slice(0, 80),
      selector: selectorFor(el)
    });
    console.log("[CLICK]", logs[logs.length - 1]);
  }
  document.addEventListener("click", handler, true);
  window.__clickLog = { logs: logs, stop: function() { document.removeEventListener("click", handler, true); }, copy: function() { copy(JSON.stringify(logs, null, 2)); }, clear: function() { logs.length = 0; } };
  console.log("Click logging ON. __clickLog.stop(), __clickLog.copy(), __clickLog.clear()");
})();
```

Selector stability: prefer `data-testid`, `aria-label`, or semantic IDs in `buildHtml()` over generated class names.

---

## LogOutputChannel vs OutputChannel

- **OutputChannel** — What we use today for "Cursor Drive", "Drive Agent Screen", "Drive API Discovery". Append-only; no log levels.
- **LogOutputChannel** — `vscode.window.createOutputChannel("Cursor Drive", { log: true })` gives:
  - `log.trace()`, `log.debug()`, `log.info()`, `log.warn()`, `log.error()`
  - **Developer: Set Log Level…** → choose "Cursor Drive" → Trace/Debug/Info/etc. No code change to get more verbosity.

**Implemented:** The main "Cursor Drive" channel is created with `createOutputChannel("Cursor Drive", { log: true })`, so it is a `LogOutputChannel`. Use **Developer: Set Log Level…** → "Cursor Drive" → Trace/Debug/Info to increase verbosity without code changes. A few `debug()` calls were added at activation and MCP start; more can be added at pipeline/command level over time.

---

## Breadcrumbs

Breadcrumbs (e.g. editor path/symbol bar) are **secondary navigation**. Drive does not add a breadcrumb provider. For our own UI (e.g. Agent Screen), if we add a breadcrumb trail, use `<nav aria-label="Breadcrumb">` and `aria-current="page"` for the current item.

---

## One-Page “Operating Manual” Summary

| Goal | Tool |
|------|------|
| See what I clicked (for agents/humans) | Screencast Mode |
| See why UI is enabled/disabled | Developer: Inspect Context Keys |
| Get auditable trace of our extension | LogOutputChannel + Set Log Level |
| Build list of targets in our webview | Recorder or click logger in Agent Screen DevTools |
| Regression tests on IDE UI | Playwright + serve-web (minimal flows only) |
| Memory issues | Heap snapshot / Live Heap Profile (not click logging) |

---

## References

- [drive-layout-integration.md](./drive-layout-integration.md) — Layouts, keybindings, where Drive’s three owned surfaces live.
- [cursor-native-commands.md](../../reference/cursor-native-commands.md) — Native commands Drive uses or may use.
- [extension-compatibility.md](./extension-compatibility.md) — Keybinding and coexistence with other extensions.
