# OpenClaw Strategy and Minimal Scrape for Cursor Drive

**Goal:** Use OpenClaw in our system where it adds value, but keep the extension build light. If OpenClaw is too heavy to bundle, run it externally and build Drive by **scraping only the parts we need** — bare minimum.

---

## 1. Decision: OpenClaw External, Not In-Build

**Why not ship OpenClaw inside the extension:**

- OpenClaw is a **full stack**: Gateway daemon (Node/pnpm), CLI, macOS/iOS/Android apps, many channel adapters (WhatsApp, Telegram, Slack, etc.), voice (Voice Wake, Talk Mode, STT, TTS), agent runtime, skills, plugins. Adding it as a dependency or bundled process would:
  - Inflate the extension (large node_modules, native deps for voice).
  - Require running a separate daemon from the extension (lifecycle, ports, config).
  - Duplicate concerns we already have (TTS we have via say.js; prompt pipeline in Drive).
- Our **LLM is Cursor** (subscription). OpenClaw’s agent uses its own model providers; we’d only use OpenClaw for voice/channels and then **call out to Cursor CLI** for coding. So we don’t need OpenClaw’s agent runtime or model config in our build.

**Conclusion:** **Run OpenClaw externally** when the user wants full voice + channels (e.g. Telegram, Talk Mode). The extension stays a Cursor extension; we don’t add OpenClaw as a dependency or subprocess.

---

## 2. Minimal Scrape: What We Take From OpenClaw (Without Adding OpenClaw)

We adopt **patterns and capabilities** inspired by OpenClaw, implemented **inside Drive** with minimal new code. We do **not** copy OpenClaw source or depend on it.

| OpenClaw piece | Do we need it? | What we do in Drive |
|----------------|----------------|----------------------|
| **Gateway** | No | We already have MCP server + HTTP on :7891. No Gateway. |
| **Channels** (WhatsApp, Telegram, …) | Optional, external | Not in extension. User runs OpenClaw for channels; OpenClaw can call Drive via webhook/HTTP if we expose a small receiver. |
| **Voice Wake** | Nice-to-have | Config already has `cursorDrive.wakeWord`. Implementation: Cursor’s mic or future minimal detector; we don’t ship OpenClaw’s Porcupine stack. |
| **Talk Mode** (listen → STT → agent → TTS) | Nice-to-have | Cursor provides input; we have TTS. Full “Talk Mode” could be external (OpenClaw) or a later minimal STT path (e.g. Whisper API or browser SpeechRecognition). |
| **STT** | Not in Drive today | Voice input is Cursor’s (ADR-0012). For “scrape”: we don’t add STT to the extension for now; document that external OpenClaw can do STT and send us text. |
| **TTS** | Already have | We use say.js; optional ElevenLabs later. No OpenClaw code. |
| **Exec → Cursor CLI** | Yes | We need to run `agent -p "..."` so that **Cursor subscription** does the coding. OpenClaw does this via its exec tool; we do it **inside Drive** with a small **Cursor CLI runner** (child_process). |
| **Webhooks (inbound to OpenClaw)** | N/A | We don’t run OpenClaw. |
| **Webhook / HTTP into Drive** | Optional | So that **external** OpenClaw (or cron/script) can send a prompt to Drive and get a result. We add a minimal **POST /run** (or reuse/extend pipeline) that runs the Cursor CLI and returns stdout. |

**Minimal scrape list:**

1. **Cursor CLI runner** — Run `agent -p "<prompt>"` from the extension (or MCP server), capture stdout/stderr, return to caller. No OpenClaw dependency. Enables: in-editor “run this in Cursor CLI”, and external callers (e.g. OpenClaw via our HTTP) to use Cursor for coding.
2. **Optional webhook/HTTP receiver** — One endpoint (e.g. `POST /run`) that accepts `{ "prompt": "..." }`, runs the Cursor CLI runner, returns `{ "stdout", "stderr", "exitCode" }`. So OpenClaw (or any script) can POST to Drive and get Cursor’s output without running OpenClaw’s exec.
3. **No OpenClaw code in repo** — We don’t clone or depend on OpenClaw. We only document how to run OpenClaw externally and point it at Drive (and/or use our OpenClaw skill for exec → Cursor CLI when OpenClaw is used).

---

## 3. Setup Paths

### Path A: OpenClaw external + Drive (full voice + channels)

- User installs and runs **OpenClaw** (Gateway, optional macOS app for voice).
- User installs **Cursor** and **Cursor Drive** extension; Cursor CLI in PATH.
- OpenClaw is configured with a **Drive skill** (or agent instruction) that uses **exec** to run `agent -p "<user message>"` for coding tasks; Cursor subscription is used via CLI.
- Optionally: OpenClaw (or a bridge) **POSTs to Drive** `http://127.0.0.1:7891/run` with `{ "prompt": "..." }`; Drive runs Cursor CLI and returns the result so OpenClaw can show/speak it. That requires we implement the minimal `/run` endpoint.

### Path B: Drive-only, minimal (no OpenClaw)

- User uses **Cursor + Drive** only. Voice input = Cursor’s mic; TTS = Drive’s say.js; no channels.
- We add the **Cursor CLI runner** so that:
  - The AI (or a command) can run a prompt through Cursor CLI (e.g. for background or headless runs).
  - Later, if we add a tiny HTTP receiver, scripts or external tools can send prompts to Drive and get Cursor CLI output.

---

## 4. What We Implement (Minimal Scrape)

| Item | Description |
|------|-------------|
| **cursorCliRunner** | Module that spawns `agent -p "..."` (or `cursor agent -p "..."`) with configurable timeout and cwd; returns stdout, stderr, exitCode. Used by MCP tool and optionally by POST /run. |
| **MCP tool `cursor_cli_run`** | Tool that accepts `prompt` and optional `timeout_seconds`; calls cursorCliRunner; returns result (e.g. stdout or error). Allows the in-Cursor AI to run a prompt via Cursor CLI (e.g. in another workspace or headless). |
| **Config** | Optional: `cursorDrive.cursorCli.command` (default `"agent"` or `"cursor"`), `cursorDrive.cursorCli.timeoutSeconds` (default 300). |
| **POST /run** (optional) | HTTP endpoint on existing MCP server: body `{ "prompt": "..." }`, runs Cursor CLI, response `{ "stdout", "stderr", "exitCode" }`. So external OpenClaw or scripts can call Drive without OpenClaw’s exec. |
| **Docs** | Update OpenClaw integration docs: “Use OpenClaw externally; Drive provides Cursor CLI runner and optional /run for callbacks.” |

We **do not** add: OpenClaw package, Gateway, channels, Voice Wake, Talk Mode, or STT inside the extension. Those stay external (OpenClaw) or future minimal additions (e.g. STT later).

---

## 5. Summary

- **OpenClaw:** Use **externally** when you want full voice + channels; don’t bundle it.
- **Drive build:** **Bare minimum** = Cursor CLI runner + MCP tool `cursor_cli_run` + POST `/run` + docs. No OpenClaw code or dependency; we “scrape” only the **idea** of “run Cursor CLI for coding” and implement it ourselves.

This keeps the extension light and Cursor-native while still allowing a clean integration with OpenClaw when the user runs it separately.
