# Cursor Drive

**Marketplace plugin** for Cursor: Drive persona, multi-operator skills (`/tangent`, `/switch`, `/merge`), rules, and the `drive-preprocessor` hook — useful without installing the extension.

**Full experience** (Agent Screen, TTS, live MCP tools, MCP Apps inline UI) comes from the optional **VSIX companion**.

[![CI](https://github.com/drive-mode/cursor-drive/actions/workflows/ci.yml/badge.svg)](https://github.com/drive-mode/cursor-drive/actions/workflows/ci.yml)

---

## Install (marketplace)

1. Install **cursor-drive** from the Cursor plugin marketplace (or copy `.cursor-plugin/` to `~/.cursor/plugins/local/cursor-drive` for local testing).
2. Start a chat — Drive persona and rules apply immediately.
3. Use `/tangent`, `/switch`, `/merge` (skills/commands) as needed.

No MCP server is required for the plugin SKU. If localhost MCP is unavailable, persona and hooks still work.

### Optional: VSIX companion (Agent Screen + MCP)

```bash
npm ci
npm run compile
npx vsce package
# Extensions → Install from VSIX → cursor-drive-*.vsix
```

Or use a CI-built VSIX artifact. Then:

- Toggle Drive (`Ctrl+Shift+D` / status bar).
- MCP listens on `127.0.0.1:7891` (auto-fallback if busy). Check **Output → Drive** for the actual port.
- With `cursorDrive.mcp.enableApps` (default **on**), `agent_screen_*` tools render the Agent Screen MCP App inline in chat (Cursor 2.6+).

Deep link (extension must be running): [Install Drive MCP](cursor://anysphere.cursor-deeplink/mcp/install?name=drive&config=eyJkcml2ZSI6eyJ1cmwiOiJodHRwOi8vMTI3LjAuMC4xOjc4OTEvbWNwIn19).

See [demo-mcp-apps](docs/guides/demo-mcp-apps.md).

---

## What you get

| Layer | Without VSIX | With VSIX |
|-------|--------------|-----------|
| Persona / rules / hooks | Yes | Yes |
| Slash skills | Yes (chat guidance) | Yes + operator registry |
| Agent Screen webview | — | Yes |
| MCP Apps inline UI | — | Yes (`enableApps`) |
| TTS / status bar | — | Yes |

---

## Architecture (advanced)

Extension (`src/`) hosts MCP `:7891` + UI. Plugin (`.cursor-plugin/`) is the marketplace SKU. They are designed to work together but **the plugin does not require MCP**. Sibling project *claude-drive* is inspiration only — this repo has **no runtime dependency** on it.

```
Cursor IDE
├── Plugin SKU (.cursor-plugin) — skills, rules, agents, commands, hooks
└── VSIX companion (optional) — MCP server, Agent Screen, TTS, MCP Apps
```

See [docs/architecture](docs/architecture/README.md) and [ADR-0019](docs/architecture/adr/ADR-0019-plugin-extension-strategy.md).

---

## Contributing / Extension development

```bash
git clone https://github.com/drive-mode/cursor-drive
cd cursor-drive
npm ci
npm run compile
# F5 → Extension Development Host
npm run build:plugin   # refresh marketplace SKU from allowlist
npm test
```

See [CONTRIBUTING.md](CONTRIBUTING.md) and [getting started](docs/guides/getting-started.md).

---

## License

MIT — see [LICENSE](LICENSE).
