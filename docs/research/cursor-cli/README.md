# Cursor CLI Research

**Cursor version:** `2.6.0-pre.30.patch.0` (commit `b7f1857a3b35e0b1f03073389bd4bfc4c43d0ef0`, x64)
**Captured:** 2026-02-23
**Platform:** Windows (PowerShell)
**CLI entrypoint:** `cursor` (subcommands: `serve-web`, `tunnel`, `agent`)

> Note: some environments may also expose an `agent` shim. On this install, `agent` is a `cursor` subcommand: `cursor agent`.

---

## Overview

The `cursor` CLI exposes three subcommands relevant to extension development and remote workflows:

| Command | Binary dispatched | Purpose |
|---|---|---|
| `cursor tunnel` | `cursor-tunnel.exe` | Expose machine via vscode.dev secure tunnel |
| `cursor serve-web` | `cursor-tunnel.exe serve-web` | **Run Cursor editor UI in a browser** |
| `cursor agent` | `cursor.exe` (no separate binary found) | Start Cursor agent in terminal (headless) |

---

## `cursor serve-web`

Runs a local web server that serves the full Cursor editor UI. Most useful for:
- **Extension development** — load the extension under test in a browser tab (no Extension Development Host window required)
- **Remote/headless environments** — edit in a browser pointed at a remote machine
- **Automated UI testing** — serve at a fixed port + token for browser automation

### Options

```
cursor serve-web [OPTIONS]

--host <HOST>                       Host to listen on (default: localhost)
--port <PORT>                       Port to listen on; 0 = random free port (default: 8000)
--socket-path <SOCKET_PATH>         UNIX socket path alternative to host:port
--connection-token <TOKEN>          Secret required in all requests
--connection-token-file <FILE>      File containing the connection token
--without-connection-token          No auth; only safe when connection is secured externally
--accept-server-license-terms       Non-interactive; auto-accepts license prompt
--server-base-path <PATH>           Path prefix for the web UI and code server
--server-data-dir <DIR>             Where server data is stored

GLOBAL OPTIONS:
--cli-data-dir <DIR>                CLI metadata directory [env: VSCODE_CLI_DATA_DIR]
--verbose                           Verbose output
--log <level>                       trace | debug | info | warn | error | critical | off
```

### Quick start for extension testing

```powershell
# Serve on default port 8000, no auth (local-only)
cursor serve-web --without-connection-token --accept-server-license-terms

# Serve on fixed port with token
cursor serve-web --port 3000 --connection-token mysecret --accept-server-license-terms

# Then open: http://localhost:3000/?tkn=mysecret
```

The browser UI is functionally equivalent to the desktop Cursor window. Extensions installed in the active Cursor profile are available. You can install a `.vsix` via `cursor --install-extension cursor-drive-*.vsix` before launching. Use `cursor --uninstall-extension <publisher.name>` to remove an extension; `cursor --install-extension <path> --force` to update.

### Troubleshooting: stuck on “server is downloading…”

If the browser page keeps showing “Cursor Server is downloading…” and never progresses, make sure the CLI is authenticated (it may need access to download the server bundle):

```powershell
cursor tunnel user login
```

### Relevance to Cursor Drive

- Load Cursor Drive in-browser to test the ShareScreen WebviewPanel, status bar, and Drive commands without launching a separate Extension Development Host process.
- The MCP server on `:7891` still needs to be started separately — the browser UI connects to it over localhost the same way the desktop client does.
- `--web-worker-exthost` (top-level flag, not a `serve-web` flag) runs web-capable extensions in a web worker host instead of Node — useful for testing `cursor-drive` with the web extension host target.

---

## `cursor tunnel`

Exposes the local machine through a vscode.dev secure tunnel, making the editor accessible from any browser without a direct network connection.

### Subcommands

```
cursor tunnel [OPTIONS] [COMMAND]

Commands:
  prune       Delete all servers not currently running
  kill        Stop any running tunnel
  restart     Restart any running tunnel
  status      Check if a tunnel is running
  rename      Rename the machine's tunnel identity
  unregister  Remove machine from port-forwarding service
  user        Account management (login / logout / show)
  service     (Preview) Manage tunnel as a system service
```

### `tunnel user` subcommands

```
cursor tunnel user login   # authenticate with Cursor/GitHub account
cursor tunnel user logout
cursor tunnel user show    # show current logged-in account
```

### `tunnel service` subcommands (preview)

```
cursor tunnel service install    # install as OS service (auto-start)
cursor tunnel service uninstall
cursor tunnel service log        # tail service logs
```

### Key options

```
--name <NAME>                 Machine name shown in vscode.dev
--random-name                 Randomize machine name
--no-sleep                    Prevent machine sleep while tunnel runs
--install-extension <ext-id>  Pre-install extensions on connecting servers
--server-data-dir <DIR>       Server data directory
--extensions-dir <DIR>        Extension root path
--accept-server-license-terms Non-interactive license acceptance
```

### Relevance to Cursor Drive

`cursor tunnel` is the remote-access path; `cursor serve-web` is the local-browser path. For Drive development, `serve-web` is preferred. Tunnel is useful if testing Drive from a machine without a monitor or over CI.

---

## `cursor agent`

Starts the Cursor agent in the terminal (headless, no IDE window).

### Behavior

- Running `cursor agent` with no arguments returns immediately with no output (exit 0). It does not block or print usage.
- `cursor agent --help` / `cursor agent -h` prints the top-level help output — no dedicated help page exists.
- There is no discoverable `--prompt`, `--model`, or flag set via the public CLI. The subcommand appears to be an interactive mode intended to be invoked from within a session context.

### Hypothesis

`cursor agent` likely reads from stdin or from an active Cursor session context (similar to how `gh copilot suggest` works). It may require an active auth token and session. Further investigation via process inspection or Cursor changelog is needed to map its full API surface.

---

## Top-level `cursor` flags useful for extension development

| Flag | Use |
|---|---|
| `--install-extension <path-to.vsix>` | Install a packaged extension before launching |
| `--enable-proposed-api <ext-id>` | Enable proposed VS Code APIs for your extension |
| `--inspect-extensions <port>` | Attach Node debugger to extension host |
| `--inspect-brk-extensions <port>` | Same, but paused at start (breakpoint on load) |
| `--disable-extensions` | Launch without any extensions (clean baseline) |
| `--disable-extension <ext-id>` | Disable a specific extension for one launch |
| `--web-worker-exthost` | Run web-capable extensions in web worker host |
| `--user-data-dir <dir>` | Isolated user data (useful for test profiles) |
| `--new-window` | Force new window (avoids reusing an existing instance) |
| `--chat` | Standalone chat window — no full IDE |
| `--add-mcp <json>` | Add MCP server definition to profile or workspace |

---

## Extension testing workflow (recommended)

```powershell
# 1. Compile the extension
npm run compile

# 2. Package it
npx vsce package

# 3. Install into Cursor
cursor --install-extension cursor-drive-*.vsix

# 4. Serve in browser (no new Electron window)
cursor serve-web --without-connection-token --accept-server-license-terms

# 5. Open http://localhost:8000 — Cursor Drive is loaded and available
```

For debuggable dev-host testing (with breakpoints), use F5 in Cursor with `launch.json` configured — that still uses the Electron host. `serve-web` is best for quick smoke tests and UI review.

---

## serve-web + extension dev path

**Question:** Does `--extensionDevelopmentPath` work with `cursor serve-web`? If yes, the compile→package→install cycle could be skipped — just recompile and reload the browser.

**Result: NOT SUPPORTED.**

| Test | Outcome |
|------|---------|
| `cursor serve-web --help` | No `--extensionDevelopmentPath` flag in options. Options: host, port, connection-token, without-connection-token, accept-server-license-terms, server-base-path, server-data-dir. |
| `cursor serve-web --extensionDevelopmentPath /path/to/repo --without-connection-token` | `error: unexpected argument '--extensionDevelopmentPath' found` — flag is rejected. |

**Conclusion:** The `.vsix` workflow is the only path for loading extensions in serve-web:

1. `npm run compile`
2. `npx vsce package --no-dependencies`
3. `cursor --install-extension <path-to.vsix>`
4. `cursor serve-web --without-connection-token --accept-server-license-terms`
5. Reload the browser window after code changes (re-run package→install).

---

## Open questions and findings

| Question | Result |
|---|---|
| Does `cursor agent` accept prompts via stdin? | No — piping stdin redirects to `cursor -` (file-from-stdin mode), not the agent. |
| Does `serve-web` expose `--extensionDevelopmentPath`? | **No.** Flag is rejected with `error: unexpected argument '--extensionDevelopmentPath' found`. See "serve-web + extension dev path" section. |
| Does `cursor tunnel` expose the MCP server on `:7891` to remote clients? | Unknown — needs live test. Likely only the editor port is tunnelled; MCP would need a separate port-forward. |
| Can `cursor agent` be used non-interactively for CI? | Unknown — the subcommand starts silently (no output, exit 0) and its protocol is not documented publicly. |
