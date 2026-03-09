# Agent Screen (S-AS) — Vision & Priorities

**Critical feature:** Live view of what the operator is doing — files in focus + operator thinking stream.

---

## Current State

- **Tabs:** Activity | Files | Decisions | Sync
- **Data sources:** `logActivity`, `logFile`, `logDecision`, `cliStream` (text_delta, tool_call, user, error), `planProgress`, `syncStatus`
- **cliStream** carries the operator's response stream (text_delta = "thinking" / assistant output)
- **Files** are logged via `logFile` when the operator touches a file

## Target: Live Share View

### Primary layout: **Live** (default tab)

1. **Files in focus** — Compact horizontal strip or vertical list at top
   - Shows files the operator is currently working on (from `logFile`)
   - Click to open in editor
   - Auto-scrolls / updates as new files are touched

2. **Operator thinking** — Main streaming area
   - Real-time text from `cliStream` type `text_delta` (assistant output)
   - Tool calls shown inline (e.g. "🔧 read_file: src/foo.ts")
   - User prompts shown (italic)
   - Errors highlighted

3. **Operator badge** — Who is "driving" (foreground operator)

### Secondary tabs

- **Activity** — Full chronological log (all event types)
- **Files** — Dedicated file list (same data, full view)
- **Decisions** — Recorded decisions
- **Sync** — Mob-programming sync status (when enabled)

## Modern UI Targets

- Card-based sections (align with Drive sidebar)
- Clear typography hierarchy
- Sticky "Files in focus" when in Live tab
- Streaming text with subtle animation (cursor/blink when active)
- Plan progress bar (when in Plan mode) — compact, collapsible

## Data Flow (no changes needed)

- MCP server receives CLI events → `AgentScreenPanel.postEvent({ type: "cliStream", ... })`
- Pipeline / extension call `logActivity`, `logFile`, `logDecision`
- Webview receives `postMessage` and renders

## Future: Snapshot Feed

- `snapshotFeed.ts` defines `SnapshotFrameEvent` (screenshot, terminal, diff)
- When implemented: add "Screenshot" or "Terminal" tab showing live capture
- Privacy: respect `cursorDrive.privacy` settings
