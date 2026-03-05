# Cursor Drive — Live Testing Guide

Live-test loop for the VS Code extension + Cursor plugin layer.

---

## Prerequisites

| Requirement | Notes |
|-------------|-------|
| Node.js ≥ 18 | For `npm` build |
| Python 3.x in PATH | For `.cursor/hooks/*.py` scripts |
| `pyyaml` installed | `pip install pyyaml` — needed for full plan governance in `plan-runner.py`; hooks are fail-soft without it |
| Port 7891 free | MCP server default port; override via `DRIVE_MCP_PORT` or `cursorDrive.mcp.port` |

---

## One-time setup

```powershell
# 1. Install deps
npm install

# 2. (Recommended) Create sandbox junction so skills/commands/hooks load in dev-host
.\sandbox\setup-drive-dev.ps1
```

---

## Dev loop

### Option A: F5 + watch (Extension Development Host)

### 1. Start the build watcher

```powershell
npm run watch
```

Leave this running. It recompiles `.ts` → `out/` on every save.

### 2. Launch the Extension Development Host

- Open this repo in Cursor.
- Press **F5**.
- Select **"Dev: Drive in sandbox"** (opens `sandbox/` as the dev-host workspace with Drive loaded).
  - Use **"Dev: Drive in repo root"** if you skipped the junction setup — all plugin files are already there.

A new Cursor window opens. This is the dev-host. Do all testing there.

### 3. Reload after edits

| What changed | How to reload |
|--------------|---------------|
| TypeScript source (`src/`) | Wait for `watch` to finish (`Found 0 errors. Watching...`), then **Developer: Reload Window** in dev-host (`Ctrl+Shift+P`) |
| `.cursor/skills/`, `.cursor/commands/`, `.cursor/hooks/` | **Developer: Reload Window** (or usually auto-picked-up) |
| `.cursor/mcp.json` | Reload window — MCP config is read on startup |
| Extension settings (`cursorDrive.*`) | Effective immediately via `onDidChangeConfiguration` |

### Option B: dev-loop script (package → install, serve-web)

For serve-web or packaged-extension testing:

```bash
npm run dev-loop              # compile, package, install
npm run dev-loop:serve        # same + start cursor serve-web
```

**Port selection** (MCP / S-AS): Auto-selects next free port if 7891 is busy. Override with `DRIVE_MCP_PORT` (PowerShell: `$env:DRIVE_MCP_PORT=7892`). The script updates `sandbox/.vscode/settings.json` and `.cursor/mcp.json` so extension and MCP client stay in sync. See `sandbox/README.md` and `sandbox/dev-env.example`.

### Browser Dev (cursor serve-web)

Use browser dev for faster iteration on webview UI (ShareScreen, status bar). Use F5 Electron dev-host for full extension host, MCP server, and TTS.

| Use case | Recommended |
|----------|-------------|
| ShareScreen webview, status bar, quick visual checks | Browser dev |
| Full extension host, MCP tools, TTS, hooks | F5 Electron dev-host |

**Step-by-step:**

1. `npm run compile`
2. `npx vsce package --no-dependencies --out out/cursor-drive.vsix`
3. `cursor --install-extension out/cursor-drive.vsix`
4. `cursor serve-web --without-connection-token --accept-server-license-terms --port 8000`
5. Open http://localhost:8000

**One-command:** `.\scripts\serve-web-dev.ps1` — compile, package, install, start serve-web, open browser.

**Known limitations:**

- serve-web may not support all VS Code APIs
- MCP server must be started separately (F5 in another Cursor window — no standalone MCP-only entry point)
- TTS unavailable in browser context

**Reload workflow:** After code changes, re-run package → install, then reload the browser window (Ctrl+Shift+P → Developer: Reload Window).

**Connection token:** Use `--without-connection-token` for local dev. For remote/CI, use `--connection-token` and append `?tkn=<token>` to the URL.

**Troubleshooting "server is downloading…":** The CLI may need to download the server bundle. Run `cursor tunnel user login` first.

---

## Smoke tests

Run these in the **dev-host window** Agent chat in order. Each test has a clear expected result.

### A — Extension UI surfaces

| Test | How | Expected |
|------|-----|----------|
| Diagnose | Command Palette → **"Drive: Diagnose Drive APIs"** | Modal shows ✅ LM models, MCP port 7891, Drive active/mode |
| Toggle | `Ctrl+Shift+D` | Status bar updates: `$(play-circle) Drive: AGENT` |
| Mode picker | Click status bar | QuickPick shows Plan / Agent / Ask / Direct / Off |
| ShareScreen | `Ctrl+Shift+S` | Share-screen webview panel opens beside editor |
| TTS | Command Palette → **"Drive: Test TTS Speak"** | Hear speech (if TTS enabled) or silent no-op |

### B — MCP server

```
# Confirm server is up (run in a terminal in dev-host)
# Bash / Cmd (or curl.exe on Windows):
curl http://127.0.0.1:7891/health
# PowerShell (avoids script-parsing prompt; use 7892 for sandbox):
Invoke-WebRequest -Uri http://127.0.0.1:7891/health -UseBasicParsing
# Expected: {"status":"ok","name":"cursor-drive","port":7891}
# Sandbox: use port 7892 and .\sandbox\check-mcp-health.ps1
```

In Agent chat, ask the agent to call a Drive MCP tool:

```
Use the share_screen_activity tool to log "MCP smoke test" with agent_name "Drive".
```

Expected:
- ShareScreen activity feed shows the entry.
- Extension host debug console shows the MCP request.

```
Use the tts_speak tool to say "hello from Drive".
```

Expected: TTS plays if `cursorDrive.tts.enabled` is true. No error if disabled.

### C — Plugin layer: commands

Type `/` in Agent chat. Confirm these commands appear:
- `tangent`
- `switch`
- `merge`

Run the tangent flow:

```
/tangent research rate limiting patterns for APIs
```

Expected:
- Agent calls `agent_spawn` on the MCP server.
- Status bar updates: `Drive > Agent | Beta` (or next default name).
- ShareScreen logs: `Spawned Beta: research rate limiting patterns for APIs`.

Switch back:

```
/switch Alpha
```

Expected: status bar shows `Alpha`, share-screen title updates.

Merge:

```
/merge Beta into Alpha
```

Expected: ShareScreen logs the merge, Beta deactivated.

### D — Plugin layer: drive-persona skill

In Agent chat:

```
/drive-persona
```

Expected: the `drive-persona` skill is invoked. Subsequent responses should follow the concise pattern (Outcome → Location → Offer).

Confirm MCP tool usage is automatic:

```
Explain what the greet function in src/index.ts does.
```

Expected:
- Agent calls `share_screen_file` for `src/index.ts`.
- ShareScreen "Files" tab shows `src/index.ts`.
- Response is ≤2 sentences (concise-first pattern).

### E — Hooks

Submit a prompt with filler words and a mode keyword:

```
uhh like maybe can we plan how to add a new feature you know
```

Expected (check Cursor hook output in dev-host):
- `drive-preprocessor.py` fires, adds `drive_cleaned_prompt` and `drive_mode_hint` context.
- `plan-runner.py` fires with a `reminder` about plan TODOs.

To test hooks directly from a terminal:

```powershell
echo '{"prompt":"uhh like plan the refactor"}' | python .cursor/hooks/drive-preprocessor.py beforeSubmitPrompt
# Expected JSON: {"decision":"allow","message":"...","details":{"drive_cleaned_prompt":...}}

python .cursor/hooks/plan-runner.py beforeSubmitPrompt
# Expected JSON: {"decision":"allow","reason":"plan governance active","details":{"reminder":"..."}}
```

---

## Where to find logs

| Log | Location |
|-----|----------|
| Extension host output | Dev-host → **Help > Toggle Developer Tools** → Console tab |
| MCP server messages | Same console — search for `[Drive MCP]` |
| Hook output | Cursor injects hook JSON into agent context; visible in prompt details |
| Test runner | Terminal running `npm test` |

---

## Troubleshooting

### Port 7891 in use

```powershell
netstat -ano | findstr 7891
taskkill /PID <pid> /F
```

Or change the port: Cursor Settings → `cursorDrive.mcp.port` → update `.cursor/mcp.json` to match.

### Hooks not firing

Cursor hooks require Python in PATH. Verify:

```powershell
python --version
```

If hooks still don't fire, check Cursor's hook execution log in Settings > Features > Hooks.

### PyYAML missing

```powershell
pip install pyyaml
```

`plan-runner.py` is fail-soft — if PyYAML is absent it emits a warning and passes through. Install it for full plan governance behavior.

### Extension not activating

- Ensure `npm run compile` (or `watch`) has produced `out/extension.js`.
- Reload window in dev-host (`Ctrl+Shift+P` → **Developer: Reload Window**).

### sandbox `.cursor/` not picking up skills/commands/hooks

The junction must be set up first:

```powershell
.\sandbox\setup-drive-dev.ps1
```

To verify:

```powershell
Get-Item sandbox\.cursor | Select-Object -ExpandProperty Attributes
# Should include: ReparsePoint
```

---

## Definition of "live testing works"

- [ ] `cursorDrive.diagnose` succeeds (LM models found, MCP port listed).
- [ ] `http://127.0.0.1:7891/health` returns `{"status":"ok"}`.
- [ ] At least one MCP tool call (`share_screen_activity`) produces a visible effect in ShareScreen.
- [ ] `/tangent` spawns an agent visible in the status bar.
- [ ] `drive-preprocessor.py` produces hook output when called directly.
