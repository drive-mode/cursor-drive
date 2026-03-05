---
name: drive-ui-test
description: Test Cursor Drive extension UI in the Cursor IDE using agent-browser Electron automation. Use when testing Drive status bar, Agent Screen, QuickPicks, commands, or any visual/interactive element of the Drive extension. Triggers include "test the Drive UI", "check status bar", "verify Agent Screen", "test Drive mode toggle", "visual test", "UI test".
requires:
  bins: [agent-browser]
allowed-tools: Bash(agent-browser:*), Bash(npx agent-browser:*)
---

# Cursor Drive UI Testing with agent-browser

Test the Cursor Drive extension's UI surfaces directly in the Cursor IDE using `agent-browser` Electron automation. Cursor is an Electron app — connect via Chrome DevTools Protocol (CDP) to snapshot and interact with Drive's UI.

## Prerequisites

```bash
# agent-browser must be installed globally
npm install -g agent-browser
agent-browser install  # Downloads Chromium (one-time)
```

## Setup: Connect to Cursor

Cursor must be launched with `--remote-debugging-port`. If already running, quit and relaunch:

```bash
# Linux
cursor --remote-debugging-port=9222

# macOS
open -a "Cursor" --args --remote-debugging-port=9222

# Windows
"%LOCALAPPDATA%\Programs\cursor\Cursor.exe" --remote-debugging-port=9222
```

Wait for Cursor to fully start, then connect:

```bash
sleep 5
agent-browser connect 9222
```

## Drive UI Surfaces to Test

Cursor Drive owns 3 UI surfaces and interacts with 9 Cursor-native surfaces. Key testable elements:

### 1. Status Bar Item

The Drive status bar item shows mode and operator info.

```bash
# Snapshot the status bar area
agent-browser snapshot -i

# Look for elements containing "Drive" text
# When inactive: "Drive (off)"
# When active: "Drive > Agent | Alpha"
```

**data-testid attributes** (in Agent Screen webview only — status bar is native VS Code):
- Status bar text changes on toggle

### 2. Agent Screen Webview

The Agent Screen is Drive's primary visual surface with tabs and interactive elements.

All key elements have `data-testid` attributes for reliable targeting:

| Element | data-testid | Description |
|---------|------------|-------------|
| Title | `agent-screen-title` | "Agent Screen" or "Drive" when active |
| Operator badge | `operator-badge` | Shows foreground operator name |
| Activity tab | `tab-activity` | Activity feed tab button |
| Files tab | `tab-files` | Files touched tab button |
| Decisions tab | `tab-decisions` | Decisions tab button |
| Sync tab | `tab-sync` | Sync status tab button |
| Activity panel | `panel-activity` | Activity feed content |
| Files panel | `panel-files` | Files list content |
| Decisions panel | `panel-decisions` | Decisions list content |
| Sync panel | `panel-sync` | Sync status content |
| Plan progress | `plan-progress` | Plan progress overlay |
| Activity items | `activity-item` | Individual activity entries |
| File items | `file-item` | Individual file entries |
| Decision items | `decision-item` | Individual decision entries |
| File links | `file-link` | Clickable file path links |

**ARIA attributes** for accessibility testing:
- Tabs have `role="tab"` and `aria-label`
- Tab container has `role="tablist"`
- Panels have `role="tabpanel"` and `aria-label`
- File items have `role="button"` and `aria-label`
- Active tab has `aria-selected="true"`

### 3. Command Palette Commands

Drive registers these commands (testable via Command Palette):

| Command | Shortcut | What it does |
|---------|----------|--------------|
| `Toggle Drive Mode` | Ctrl+Shift+D | Toggle Drive on/off |
| `Set Drive Mode` | (click status bar) | Mode picker QuickPick |
| `Show Agent Screen` | Ctrl+Shift+S | Open Agent Screen panel |
| `Manage Operators` | — | Operator QuickPick |
| `Spawn New Operator` | — | Spawn dialog |
| `Activate Voice Input` | Ctrl+Shift+M | Open chat + mic |
| `Diagnose Drive APIs` | — | API diagnostics modal |

## Test Workflows

### Smoke Test: Toggle Drive Mode

```bash
agent-browser connect 9222
agent-browser snapshot -i

# Open Command Palette
agent-browser press "Control+Shift+p"
agent-browser wait 500
agent-browser snapshot -i

# Type "Toggle Drive" and press Enter
agent-browser keyboard type "Toggle Drive Mode"
agent-browser wait 300
agent-browser press Enter
agent-browser wait 1000

# Snapshot to verify status bar changed
agent-browser snapshot -i
agent-browser screenshot drive-toggled.png
```

### Open Agent Screen

```bash
agent-browser connect 9222

# Use keyboard shortcut
agent-browser press "Control+Shift+s"
agent-browser wait 1500

# Switch to Agent Screen webview tab
agent-browser tab  # List all tabs/webviews
# Switch to the Agent Screen webview
agent-browser tab --url "*Agent Screen*"

# Snapshot the Agent Screen
agent-browser snapshot -i
agent-browser screenshot agent-screen.png
```

### Test Agent Screen Tabs

```bash
# After connecting to the Agent Screen webview
agent-browser snapshot -i

# Click Files tab (using data-testid)
agent-browser click "[data-testid='tab-files']"
agent-browser wait 300
agent-browser snapshot -i

# Click Decisions tab
agent-browser click "[data-testid='tab-decisions']"
agent-browser wait 300
agent-browser snapshot -i

# Click Sync tab
agent-browser click "[data-testid='tab-sync']"
agent-browser wait 300

# Back to Activity
agent-browser click "[data-testid='tab-activity']"
agent-browser screenshot tabs-tested.png
```

### Test Mode Picker QuickPick

```bash
agent-browser connect 9222

# Click Drive status bar item to open mode picker
agent-browser snapshot -i
# Find and click the Drive status bar element
agent-browser click @eN  # Use the ref from snapshot for the Drive status bar item

agent-browser wait 500
agent-browser snapshot -i
# QuickPick should show: Plan, Agent, Ask, Debug, Off

agent-browser screenshot mode-picker.png
agent-browser press Escape  # Dismiss
```

### Verify MCP Server Health

```bash
# From a terminal (not agent-browser)
curl -s http://127.0.0.1:7891/health | python3 -m json.tool
# Expected: {"status": "ok", "name": "cursor-drive", "port": 7891}
```

### Screenshot Full IDE Layout

```bash
agent-browser connect 9222
agent-browser screenshot --full full-ide-layout.png
agent-browser screenshot --annotate annotated-layout.png
```

## Tips

- **Multiple webviews**: Cursor has many webview targets. Use `agent-browser tab` to list them and `agent-browser tab N` or `agent-browser tab --url "pattern"` to switch.
- **Dark mode**: Set `AGENT_BROWSER_COLOR_SCHEME=dark` or use `agent-browser --color-scheme dark` to preserve Cursor's dark theme.
- **Wait after actions**: UI transitions take time. Use `agent-browser wait 500` or `agent-browser wait --load networkidle` between actions.
- **Chain commands**: Use `&&` to chain commands that don't need intermediate output: `agent-browser press "Control+Shift+d" && agent-browser wait 1000 && agent-browser screenshot`.
- **Re-snapshot after changes**: Always `agent-browser snapshot -i` after clicking, navigating, or triggering UI changes to get fresh element refs.

## Troubleshooting

- **Cannot connect**: Quit Cursor fully, relaunch with `--remote-debugging-port=9222`, wait 5s
- **Wrong webview**: Use `agent-browser tab` to find the right target (main window vs. extension host vs. webview)
- **Element not found**: Re-snapshot; DOM refs change after any interaction
- **Agent Screen not visible**: Run `Ctrl+Shift+S` to open it first, then switch to its webview target
