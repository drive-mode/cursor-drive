# Extension source

This folder is the VS Code extension host. Entry point is `extension.ts`.

| File | Role |
|------|------|
| `extension.ts` | Entry point — commands, MCP server registration |
| `driveMode.ts` | Drive state (active, subMode, persistence) |
| `operatorRegistry.ts` | Operator pool — spawn, switch, merge, dismiss |
| `agentScreen.ts` | Agent Screen (S-AS) webview — activity feed, files, decisions |
| `statusBar.ts` | Status bar indicator and QuickPick |
| `mcpServer.ts` | Local MCP server — TTS, Agent Screen, operators, drive mode, cursor_cli_run, POST /run |
| `cursorCliRunner.ts` | Run Cursor CLI (`agent -p "..."`) for headless/scripted coding; used by cursor_cli_run and POST /run |
| `tts.ts` | OS-native speech (e.g. say.js) |
| `router.ts` | Intent routing (plan/run/direct/collab) |
| `modelSelector.ts` | Tiered model selection |
| `approvalGates.ts` | Pre/post dangerous-operation checks |
| `toolAllowlist.ts` | Per-operator capability enforcement |
| `sessionMemory.ts` | Per-workspace session context |
| `sanitizer.ts` | Prompt truncation and injection stripping |
| `fillerCleaner.ts` | Filler word removal |
| `glossaryExpander.ts` | Voice shortcut → intent mapping |
| `pluginInstaller.ts` | Install plugin assets into `.cursor/` |
| `apiDiscovery.ts` | Cursor API surface discovery |
| `index.ts` | Sandbox / experiment entry |

Operators and Agent Screen (S-AS) are the current names; see [ADR-0016](../docs/architecture/adr/ADR-0016-drive-terminology-and-hierarchy.md).
