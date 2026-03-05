# OpenClaw Integration Analysis

Cursor Drive may use OpenClaw patterns for voice integration—Voice Wake, skills format—without runtime dependency.

## Cursor Drive Integration

### Option A: OpenClaw for Voice, Drive for Execution

- **OpenClaw**: Voice Wake, Talk Mode, STT, TTS
- **Drive**: Planning, execution via Cursor/GitHub
- **Bridge**: OpenClaw webhook or custom tool → Drive HTTP API

Flow: User speaks → OpenClaw transcribes → webhook to Drive → Drive runs plan/run → result to OpenClaw → TTS or chat.

**Requires**: Drive exposes a run endpoint. **Implemented:** Drive MCP server exposes `POST /run` (body `{ "prompt": "..." }`, optional `timeout_seconds`); returns `{ "stdout", "stderr", "exitCode", "timedOut", "error" }`. Drive also exposes MCP tool `cursor_cli_run` for in-Cursor use. See [OpenClaw strategy and minimal scrape](../design/openclaw-strategy-and-minimal-scrape.md).

### Option B: Drive as OpenClaw Skill

- Package Drive as `~/.openclaw/workspace/skills/drive/SKILL.md`
- Skill invokes Drive CLI or API for coding tasks
- OpenClaw handles channels, voice, UI

**Requires**: Drive CLI or API; skill definition.

### Option C: Reference Only (Patterns)

- Study OpenClaw Voice Wake, skills format, session model
- Apply patterns to Drive; no runtime dependency

**Recommended for Cursor Drive**: Start with Option C; phase to Option A when voice is priority.

## OpenClaw vs Agent Orchestration (Deferred)

**OpenClaw is a messaging gateway**, not a coding agent framework. It provides:

- **Channels**: WhatsApp, Telegram, Discord, voice
- **Voice Wake**: Wake-word activation, Talk Mode
- **Skills format**: `~/.openclaw/workspace/skills/` for defining capabilities

**Architecture mismatch for agent orchestration**:

| Aspect | OpenClaw | Cursor Drive |
|--------|----------|--------------|
| Primary use | Messaging gateway, voice channels | IDE-based coding agent orchestration |
| MCP support | None | Core (MCP server at :7891) |
| VS Code integration | None | Native extension |
| Agent-to-agent | N/A (messaging, not agent framework) | A2A, OperatorRegistry, lead+worker |

**Status**: **Deferred** for agent orchestration. OpenClaw patterns (Voice Wake, skills) may inform voice integration (ADR-0012) but do not apply to agent orchestration (ADR-0014).

**Possible future use**: Drive accessible via Telegram for mobile coding sessions — user sends a prompt via Telegram, OpenClaw webhook forwards to Drive, result returned. Would require Drive HTTP API for plan/run.

---

## License and “Literally Using” OpenClaw

### License

**OpenClaw is MIT licensed.** Copyright (c) 2025 Peter Steinberger. Use, copy, modify, merge, publish, distribute, sublicense, and sell are allowed under standard MIT terms. [LICENSE](https://github.com/openclaw/openclaw/blob/main/LICENSE)

### What Using OpenClaw Would Entail

To **literally use** OpenClaw as a feature (e.g. voice/channels) in our system:

1. **Run the OpenClaw Gateway (separate process).** It is the control plane; there is no “use OpenClaw” without it.
   - Install: `npm install -g openclaw@latest` then `openclaw onboard --install-daemon` (or run the gateway manually).
   - Gateway runs as a daemon (e.g. launchd on macOS); default WebSocket: `ws://127.0.0.1:18789`.
2. **No need to add OpenClaw as an npm dependency** for a Cursor extension unless you use the OpenClaw plugin SDK for writing OpenClaw plugins. For “talk to OpenClaw from the extension,” use the running Gateway:
   - **HTTP webhooks**: Gateway exposes `POST /hooks/wake`, `POST /hooks/agent` (token auth). [Webhook docs](https://docs.openclaw.ai/automation/webhook).
   - **WebSocket**: Connect to the daemon (e.g. port 18789); existing OpenClaw-VSCode extension uses this.
3. **What OpenClaw provides**: Voice Wake (e.g. “hey claw”), push-to-talk, STT (e.g. Whisper), TTS (e.g. ElevenLabs), Talk Mode; messaging channels (WhatsApp, Telegram, Slack, Discord, etc.). Voice Wake / push-to-talk are implemented in OpenClaw’s macOS (and mobile) apps, not in the VS Code extension — so “use OpenClaw for voice” today typically means the Mac app handles mic/wake word/TTS; an extension would send/receive text or trigger the agent via webhooks.

### Cursor Compatibility

**Using OpenClaw does not make the extension unusable with Cursor.** OpenClaw runs **alongside** Cursor.

- OpenClaw is **not an IDE replacement**. It is a personal AI assistant (multi-channel, optional voice). The core is the **Gateway** daemon.
- There is already an [OpenClaw-VSCode](https://marketplace.visualstudio.com/items?itemName=OwenLiuyuxuan.openclaw-vscode) extension that connects to the Gateway via WebSocket; Cursor (VS Code–based) can do the same.
- **Model**: OpenClaw runs in the background (voice, channels, agent); Cursor remains the IDE for editing and Cursor AI. A Cursor Drive extension could talk to the same Gateway (webhooks and/or WebSocket) for voice/channels while keeping Cursor for editing and AI.
- **Caveat (Windows)**: Gateway is typically run via WSL2; desktop voice features are macOS/iOS/Android. Cursor-on-Windows can still use HTTP/WebSocket to the Gateway for agent/channels; full “OpenClaw voice” is more limited on Windows.

**Full feature review and Cursor-native integration (Cursor CLI as backend, dark-mode Mermaid diagrams):** [openclaw-feature-review-and-cursor-integration.md](openclaw-feature-review-and-cursor-integration.md).
