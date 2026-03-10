---
name: Drive in composer mode dropdown
overview: Add "Drive" as a selectable mode in the chat composer unified dropdown (the pill that shows Agent / Plan / Debug / Ask) by injecting a Drive menu item that matches Cursor's structure and wires selection to Drive activation plus native composer mode.
todos: []
isProject: false
---

# Add Drive as a Mode in the Composer Mode Dropdown

## Goal

The **Drive mode button** should appear as a **mode option inside the chat interface box** — i.e. the same composer mode dropdown (pill with icon + label + chevron) that currently lists Agent, Plan, Debug, and Ask. Selecting "Drive" from that dropdown turns on Drive (listening mic, wake word) and keeps the session in a sensible native mode (e.g. Agent).

---

## Constraint: No Public API

Cursor does **not** expose an extension API to register a custom composer mode. The dropdown is internal Cursor UI; modes are not contributed via `package.json` or a `composerModesService` extension API. So we have two options:

- **A. DOM injection** — After the dropdown is rendered, find it in the DOM and inject a "Drive" item that looks and behaves like the existing modes. Document as best-effort; Cursor updates may break selectors.
- **B. Feature request only** — Ask Cursor for a contribution point (e.g. `composer.modes`) and keep the status bar as the primary Drive entry until then.

Recommendation: **Implement (A)** with clear guards and fallbacks, and add a short note in docs or a comment that we want a first-class API when available.

---

## Target Elements (from your paste)

- **Trigger (pill):**
  `div#...unifieddropdown.composer-unified-dropdown` with `data-mode="plan"`, contains icon (e.g. `codicon-todos`), label span ("Plan"), and `codicon-chevron-down`. We do **not** modify the pill; we only add an option in the menu.

- **Dropdown popover:**
  Container with class `typeahead-popover mentions-menu`, contains a scrollable list. Inside it, mode items have IDs like:
  - `composer-mode-{instanceId}-agent`
  - `composer-mode-{instanceId}-plan`
  - `composer-mode-{instanceId}-debug`
  - `composer-mode-{instanceId}-chat`

- **Single mode item structure:**
  Each item is a `div` with class `composer-unified-context-menu-item`, structure:
  - Icon: `span.codicon.codicon-{name}` (e.g. `codicon-infinity` Agent, `codicon-todos` Plan, `codicon-bug` Debug, `codicon-chat` Ask).
  - Label: `span.monaco-highlighted-label` with text "Agent" / "Plan" / "Debug" / "Ask".
  - Optional keybinding and checkmark.

We will **inject one new item** with the same classes and structure, icon `codicon-play-circle` (matches status bar), label "Drive", and optional keybinding `Ctrl+Shift+D` / `Cmd+Shift+D`.

---

## Approach: DOM Injection

1. **When to run**
   On extension activation, register a **MutationObserver** (or a short-interval poll) that watches for the dropdown popover to appear in the document. The popover is rendered in a portal (e.g. `position: fixed`), so we watch `document.body` for new nodes that match the dropdown container (e.g. a div that contains an element with `id` matching `composer-mode-.*-agent`).

2. **Finding the list container**
   - Query for an element with `id` matching regex `/^composer-mode-.+-agent$/` (or similar).
   - Traverse up to find the shared parent that contains all four mode items (agent, plan, debug, chat). That parent is the "list" we need (e.g. the `div.flex.flex-col.gap-0.5` that wraps the four `composer-mode-*-*` divs).
   - Check if we already injected Drive for this instance (e.g. a `data-drive-injected="true"` on that list, or an existing `[id$="-drive"]`). If so, skip.

3. **Creating the Drive item**
   - Clone the structure of an existing item (e.g. the Plan item) or build it from the same class names and structure.
   - Set icon to `codicon codicon-play-circle` (Drive icon).
   - Set label text to "Drive".
   - Set id to `composer-mode-{sameInstanceId}-drive` so we stay consistent with Cursor’s id pattern (optional; or use a data attribute to avoid collisions).
   - Add `data-drive-mode-item="true"` so we can identify our node.

4. **Click handler**
   - On click of the Drive item:
     - Run `vscode.commands.executeCommand("cursorDrive.toggle")` so Drive turns on (and status bar shows "Drive > …").
     - Run `vscode.commands.executeCommand("composerMode.agent")` so the underlying composer mode is Agent (and the pill can show "Agent"; our status bar will show "Drive > Agent").
     - Optionally try to close the dropdown (e.g. dispatch Escape or find Cursor’s close handler); if not possible, document that the dropdown may stay open and user can click outside.

5. **Pill label when Drive is on**
   For v1 we do **not** change the pill text. The pill continues to show the native mode (Agent / Plan / etc.); the status bar shows "Drive > Agent". Optionally in a later iteration we could try to replace the pill’s label with "Drive" when Drive is active (more invasive and fragile).

6. **Dispose**
   Extension deactivation should disconnect the MutationObserver / clear the interval and avoid leaking.

---

## Implementation Outline

- **New module:** e.g. [src/composerDriveInjection.ts](src/composerDriveInjection.ts)
  - Export `installComposerDriveInjection(context: vscode.ExtensionContext, driveMgr: DriveModeManager): vscode.Disposable`.
  - Use a MutationObserver on `document.body` (we need to get the webview/document — see below).
  - **Important:** The composer UI lives in the **host window’s DOM** (Electron/Chromium), not in an extension webview. Extensions run in the extension host process; they don’t have direct access to the workbench DOM. So we **cannot** use `document.body` from Node/extension code.
  - **Re-evaluation:** In VS Code/Cursor, extension code runs in a separate process. The workbench UI runs in the renderer. So **DOM injection from the extension is not possible** unless we use a **webview** that embeds a page that runs in the same context as the workbench (we don’t), or Cursor exposes an API (they don’t).

I need to verify: does Cursor or VS Code provide any way for an extension to run script in the workbench renderer (e.g. a "run in host" API)? If not, DOM injection from the extension is **not feasible** without a Cursor-side change.

---

## Correction: Extension vs Renderer

In VS Code/Cursor architecture:

- **Extension host** runs in a separate process; extension code (our `extension.ts`, `statusBar.ts`) runs there. It has no access to the workbench HTML/DOM.
- **Renderer process** owns the workbench (including the composer dropdown). Only code that runs in the renderer can touch that DOM.

So **we cannot inject into the composer dropdown from our extension** without one of:

1. **Cursor adds an API** — e.g. "register composer mode" or "add custom menu item to composer mode list."
2. **A Cursor/VS Code contribution point** — e.g. `contributes.composer.modes` in package.json that Cursor reads and uses to render the dropdown. (Currently none exists.)
3. **A Cursor fork or patch** — Not applicable for a public extension.

Therefore the **practical plan** is:

- **Short term:** Keep the **status bar** as the primary Drive entry (Drive mode button). Ensure it’s discoverable (docs, tooltip: "Drive — click to turn on; mic listens, wake word activates"). Optionally add a **Command Palette** entry like "Drive: Turn On Drive Mode" so users can open the mode list from there.
- **Ask Cursor for a first-class integration:** Document the desired behavior (add "Drive" to the composer mode dropdown) and propose a contribution point or API (e.g. `contributes.composer.modes` with label, icon, command) so that when Cursor supports it, we can implement it without DOM hacks.
- **If Cursor later adds a "run script in renderer" or "composer.modes" API:** Implement the Drive option in the dropdown as described above (same structure and behavior, but using the API).

---

## Recommended Next Steps

1. **Do not implement DOM injection** from the extension (impossible without renderer access).
2. **Document the product goal:** "Drive should appear as a mode in the chat composer dropdown" in the UX plan or a short "future integration" doc, with the HTML/structure you captured so that when an API exists we can implement it quickly.
3. **Improve discoverability of the current Drive entry:**
   - Status bar: keep "Drive (off)" / "Drive > Agent" and ensure tooltip is clear.
   - Optional: Add a **keybinding** reminder in the status bar tooltip (e.g. "Ctrl+Shift+D to toggle").
   - Optional: In the **Set Drive Mode** QuickPick, add a one-line note at the top: "You can also use the status bar Drive button or Ctrl+Shift+D."
4. **Draft a feature request** for Cursor: "Extension API or contribution point to add a custom composer mode (label, icon, command)" and reference the exact dropdown structure so Cursor can consider adding it.

If you have evidence that Cursor exposes a way for extensions to run code in the renderer or to contribute to the composer mode list, we can revise the plan to use that; otherwise the above is the only viable path without Cursor changes.
