# Security & Operations Review — Drive Technology Radar

**Prepared:** February 2026
**Scope:** Staff-level security and operations assessment across all 11 technologies under consideration for Cursor Drive.
**Reviewer classification:** Internal review, not for external distribution.

---

## Table of Contents

1. [Threat Model Deltas](#1-threat-model-deltas)
2. [Permission Model Changes](#2-permission-model-changes)
3. [Data Handling & Privacy](#3-data-handling--privacy)
4. [Supply Chain & Licensing](#4-supply-chain--licensing)
5. [Operational Implications](#5-operational-implications)
6. [Mitigations & Required Controls](#6-mitigations--required-controls)
7. [Summary Risk Matrix](#7-summary-risk-matrix)

---

## 1. Threat Model Deltas

Drive's current threat model is narrow by design: a local-only VS Code extension with no cloud backend, no database, and an MCP server bound to `127.0.0.1:7891` (`src/mcpServer.ts:767`). Security enforcement is layered across three modules:

- **`src/toolAllowlist.ts`** — Capability enforcement per operator via readonly/standard/full presets with parent cascade (`checkPermissionForOperator()`, line 89).
- **`src/approvalGates.ts`** — Regex-based block/warn scanning of prompts and responses (`DEFAULT_BLOCK_PATTERNS`, `DEFAULT_WARN_PATTERNS`, lines 20–39).
- **`src/sanitizer.ts`** — Injection pattern stripping and prompt truncation (`INJECTION_PATTERNS`, lines 10–17).

Each technology introduces new threat vectors relative to this baseline.

### 1.1 MCP Apps (PROTOTYPE)

| Threat | Vector | Severity | Existing control |
|--------|--------|----------|-----------------|
| **XSS via iframe content** | Malicious HTML/JS injected into MCP App UI resource served by Drive's MCP server | Medium | Host-enforced CSP sandbox (`sandbox="allow-scripts"`, no `allow-same-origin`). See `mcp-apps/04_risks-and-mitigations.md` R1. |
| **Data exfiltration through UI** | App iframe reads operator activity events (file paths, decisions, plan content) and sends them to an external origin via `postMessage` to parent host | Low | Iframe sandbox blocks `allow-top-navigation` and `allow-popups`. `postMessage` goes only to the host, which is the MCP client (trusted). No `fetch()`/`XMLHttpRequest` from `null` origin. |
| **Clickjacking** | Embedding Drive's MCP App inside an attacker-controlled page to trick user interactions | Very Low | MCP App iframes are served within the host's UI (Claude Desktop, ChatGPT). Attacker cannot embed them in arbitrary pages. |
| **CSP bypass** | Crafted HTML that evades host-enforced Content Security Policy | Low | Drive generates self-contained HTML with inline styles/scripts; no external resource loads. Nonces are host-managed. |

**Delta summary:** MCP Apps introduce a new **rendering surface** that transforms text-only MCP responses into interactive HTML. The trust boundary shifts: instead of text passing through an MCP client, HTML is rendered in a sandboxed iframe. The incremental risk is low because the iframe is host-sandboxed and the data is identical to what `agent_screen_activity` tool calls already transmit as text.

### 1.2 Cursor Computer Use (DEFER)

| Threat | Vector | Severity | Existing control |
|--------|--------|----------|-----------------|
| **Screen capture privacy** | Screenshots capture credentials, PII, proprietary code from browser or IDE | High | None today. Proposed: consent gate, scope restriction to localhost URLs, transient storage only. See `cursor-computer-use/04_risks-and-mitigations.md` R4. |
| **Cloud execution trust** | Source code cloned and executed on Cursor-managed VMs (Cloud Agents) | High | None today. Deferred specifically because no public API exists and lock-in risk is highest-scored negative. |
| **Screenshot-based prompt injection** | Crafted visual content (text rendered as image) tricks vision model into executing unintended actions | Medium | No control. Would require visual input sanitization (research-stage). |
| **Cloud Agent secret leakage** | `.env` files or workspace secrets accessible to agent processes running on external infrastructure | Medium | Proposed: secret filtering at dispatch time. Do not pass local secrets to cloud VMs. |

**Delta summary:** Computer Use is the highest-risk technology in the radar. It introduces **two new trust boundaries**: (1) screenshot data flowing to vision models, and (2) code execution on external infrastructure. The DEFER recommendation (`cursor-computer-use/03_decision.md`) is the correct security posture. No implementation should proceed without a public, versioned API and explicit trust boundary documentation.

### 1.3 Agent Steering (ADOPT)

| Threat | Vector | Severity | Existing control |
|--------|--------|----------|-----------------|
| **Policy bypass via YAML injection** | Malformed or crafted `.cursor/drive-policies.yaml` disables safety patterns | Medium | Proposed: JSON Schema validation at startup; fall back to hard-coded defaults on parse error. See `agent-steering/04_risks-and-mitigations.md` R3. |
| **Config tampering** | Attacker modifies `cursorDrive.approvalGates.*` VS Code settings to disable all gates | Low | VS Code settings are local-only. Requires local filesystem access (already game over). `approvalGates.ts` hard-codes `DEFAULT_BLOCK_PATTERNS` (line 34) which are always applied regardless of config. |
| **False-positive fatigue** | Overly broad regex patterns cause users to reflexively dismiss warnings, then disable gates entirely | High (UX) | Conservative defaults. `checkResponse()` already scopes warn-pattern matching to code blocks only (line 93). |
| **Runtime monitor overhead** | Continuous monitoring of operator events adds latency | Low | Event-driven, O(1) per event. Phase 3 only. |

**Delta summary:** Steering formalizes what already exists in `approvalGates.ts` and `toolAllowlist.ts`. The main new threat is **configuration surface expansion** (YAML policy files). Mitigated by schema validation and "VS Code settings always win" precedence rule.

### 1.4 Agent Teams (ADOPT)

| Threat | Vector | Severity | Existing control |
|--------|--------|----------|-----------------|
| **Privilege escalation via role manipulation** | Operator requests elevated preset through `operator_escalate` MCP tool, bypassing parent cascade | Medium | Escalation is a notification, not a grant. User approval required. Rate-limited to 3 per operator per session. See `agent-teams/04_risks-and-mitigations.md` R4. |
| **Depth bypass** | Spawning an operator without a parent to circumvent depth-based permission restriction | Low | `operatorRegistry.spawn()` defaults depth-0 to `"standard"`, depth-1+ to `"readonly"` (line 89). Parent cascade is enforced at spawn time via `minPreset()` (line 95). |
| **Cross-operator context leakage** | Operator in "shared" visibility reads sensitive context from another operator's memory | Low | Visibility modes (`isolated`, `shared`, `collaborative`) are opt-in. Default is `"shared"` which allows memory read but not write. Merge is explicit via `operator_merge` tool. |

**Delta summary:** Teams adds role templates and escalation, both of which interact with the existing permission hierarchy in `operatorRegistry.ts`. The cascade enforcement (`minPreset()` at line 20) is sound. The key control gap is that escalation must never auto-grant — it must always flow through user approval gates.

### 1.5 Plugins & MCP Server (ADOPT)

| Threat | Vector | Severity | Existing control |
|--------|--------|----------|-----------------|
| **Dynamic registration spoofing** | Rogue extension calls `vscode.cursor.mcp.registerServer()` with Drive's server name to intercept tool calls | Low | Feature flag (`cursorDrive.mcp.dynamicRegistration`, default `false`). Falls back to static `.cursor/mcp.json`. |
| **Plugin staleness** | Workspace `.cursor/` files lag behind VSIX version, causing stale hooks to process prompts incorrectly | Medium | `.drive-version` marker + `isUpToDate()` check. Auto-install on activation. |
| **Port collision DoS** | Another process binds port 7891 before Drive's MCP server starts, preventing all AI tool calls | Low | Port is configurable via `cursorDrive.mcp.port`. `cursorDrive.diagnose` reports port status. |

**Delta summary:** MCP server is already implemented and bound to `127.0.0.1` only (`src/mcpServer.ts:767`). The loopback binding is critical — it prevents remote access. Future dynamic registration should preserve this invariant.

### 1.6 VSCode Extensions (ADOPT)

| Threat | Vector | Severity | Existing control |
|--------|--------|----------|-----------------|
| **LM Tools dual registration** | Same tool visible via both MCP and LM Tools API, potentially allowing bypass of MCP-level enforcement | Low | Different naming prefixes (`cursorDrive_` vs `drive_`). Feature detection guards (`typeof vscode.lm.registerTool === 'function'`). |
| **Webview ARIA injection** | Malicious ARIA attributes cause assistive technology to read misleading content | Very Low | ARIA attributes are metadata; they do not affect rendering or execute code. |

**Delta summary:** VSCode extension API enhancements are additive and low-risk. LM Tools registration is purely optional and guarded by feature detection.

### 1.7 WhisperKit (PROTOTYPE)

| Threat | Vector | Severity | Existing control |
|--------|--------|----------|-----------------|
| **Microphone access persistence** | Continuous listening mode keeps microphone active, potentially capturing ambient conversations | High | ADR-0012 specifies mute/unmute model. Strict mode (ADR-0005) is default: no audio retention, no transcript persistence. |
| **Model poisoning** | Compromised Whisper model produces manipulated transcriptions (e.g., injecting commands) | Medium | Proposed: SHA-256 checksum verification on model download. Version pinning. Air-gapped installation support. |
| **Audio data in memory** | Raw audio buffers in Node.js process memory could be accessed by other extensions or leaked via core dumps | Low | Transient buffers; processed and discarded immediately. No persistence. Strict mode prohibits retention. |
| **Cross-platform audio capture** | OS-specific audio capture code introduces platform-dependent vulnerabilities | Medium | macOS-first strategy. Well-maintained audio library abstraction. |

**Delta summary:** WhisperKit is **privacy-compliant by design** — all processing is on-device, aligning with ADR-0005. The primary threat is microphone access itself, which is mitigated by the mute/unmute model and strict-mode defaults. The model supply chain requires checksum verification before adoption.

### 1.8 OpenAI Realtime API (PROTOTYPE)

| Threat | Vector | Severity | Existing control |
|--------|--------|----------|-----------------|
| **Audio sent to OpenAI servers** | Raw voice biometric data transmitted to cloud, violating ADR-0005 privacy-strict default | **Critical** | **None by default.** Must require explicit opt-in with session-scoped consent. See `other-relevant-tech/04_risks-and-mitigations.md` R2. |
| **Pipeline bypass** | Realtime API handles voice→model→voice in a single call, bypassing `sanitizer.ts`, `approvalGates.ts`, `fillerCleaner.ts`, and `modelSelector.ts` | High | Proposed: post-hoc validation via transcript side-channel. Weaker than pre-hoc pipeline. See R12. |
| **Vendor lock-in** | No equivalent speech-to-speech API from other providers | High | Backend abstraction (`SttBackend` interface). WhisperKit default; Realtime API opt-in only. |
| **Audio token cost** | Uncontrolled cloud voice usage accumulates unexpected costs | Medium | Proposed: per-session budget caps. Cost visibility on Agent Screen. |

**Delta summary:** The Realtime API is the **highest-privacy-risk technology** in the radar. It fundamentally conflicts with ADR-0005 when used as default. The only acceptable integration path is as an explicit opt-in mode with session-scoped consent, clear disclosure, and post-hoc pipeline validation. It must **never** be the default voice backend.

### 1.9 A2A Protocol (ADOPT)

| Threat | Vector | Severity | Existing control |
|--------|--------|----------|-----------------|
| **Unauthenticated agent communication** | Any process on localhost can POST to `/tasks` and spawn operators | Medium | MCP server bound to `127.0.0.1` (line 767). Requires local access. No authentication on A2A endpoints currently. |
| **Task description injection** | External agent sends crafted task description containing prompt injection patterns | Medium | Existing `sanitizer.ts` does not run on A2A task descriptions. The `operator_spawn` path in `/tasks` handler (line 643) directly uses the task text. |
| **Agent Card information disclosure** | `/.well-known/agent.json` (line 611) reveals server capabilities, version, and skill descriptions to any local process | Low | Agent Card is designed to be public per A2A spec. No sensitive data included. |
| **Task status polling** | Malicious local process polls `/tasks/:id` to monitor operator activity | Low | Requires knowing task IDs (opaque, generated from operator IDs). Loopback-only access. |

**Delta summary:** A2A introduces **unauthenticated HTTP endpoints** on the MCP server. While loopback-bound, any local process can create tasks. The critical gap is that A2A task descriptions are not passed through `sanitizer.ts` before being used as operator task context.

### 1.10 Langfuse (PROTOTYPE)

| Threat | Vector | Severity | Existing control |
|--------|--------|----------|-----------------|
| **Trace data containing sensitive prompts** | Full prompt text, model responses, and code context captured in Langfuse spans | High | Proposed: redact sensitive content; log structure not full text. Self-hosted only by default. TTL on trace data. |
| **Langfuse cloud exfiltration** | If cloud Langfuse is configured, trace data leaves the user's machine | High | Default `cursorDrive.observability.langfuseEnabled: false`. Self-hosted only as default. |
| **Trace data persistence** | PostgreSQL/ClickHouse stores traces that may contain API keys, secrets, or PII from prompts | Medium | Proposed: TTL-based auto-deletion (default 30 days). Redaction of known secret patterns before trace submission. |
| **SDK supply chain** | Compromised `langfuse` npm package could exfiltrate data or inject code | Low | Feature flag containment. Version pinning. `npm audit` in CI. |

**Delta summary:** Langfuse introduces a **persistent data store** into an architecture that currently has zero persistence (all state is in-memory or workspace files). Self-hosted Langfuse is privacy-compatible, but the default must be disabled. Trace redaction must use the same patterns as `sanitizer.ts`.

### 1.11 Parallel Tool Calling (ADOPT)

| Threat | Vector | Severity | Existing control |
|--------|--------|----------|-----------------|
| **Race conditions in parallel tool execution** | Multiple MCP tools modify shared state concurrently (e.g., two `operator_spawn` calls exceeding `maxConcurrent`) | Low | `operator_spawn` checks `activeCount() >= maxConcurrent` before spawn (line 283). Check is not atomic, but race window is negligible for local HTTP. |
| **Incorrect dependency analysis** | Model parallelizes tools that have order dependencies, causing state corruption | Low | MCP tools are designed for independent invocation. State-mutating tools (`operator_spawn`, `operator_dismiss`) have no cross-dependencies. |

**Delta summary:** Parallel tool calling is the lowest-risk technology in the radar. It is already supported by Cursor's agent harness. Drive's MCP tools are designed for independent invocation.

---

## 2. Permission Model Changes

### 2.1 Current Capability Model

`src/toolAllowlist.ts` defines seven capabilities across three presets:

```
readonly:  fileRead, gitRead, modelCall
standard:  + fileWrite, terminalExecute, gitWrite
full:      + webSearch
```

The `Capability` type (line 7) and `PRESET_CAPABILITIES` map (line 16) are the single source of truth. Operator-aware enforcement uses `checkPermissionForOperator()` (line 89) with cascade via `getEffectivePresetForOperator()` (line 69).

### 2.2 New Capabilities Required

The technology radar introduces four new capability types that do not exist in the current model:

| Capability | Needed by | Justification |
|------------|-----------|---------------|
| `audioCapture` | WhisperKit, Realtime API | Microphone access is a distinct permission from file or terminal access. An operator with `standard` preset should not automatically gain mic access. |
| `screenCapture` | Computer Use (deferred) | Screenshot tools capture visual data that may include credentials or PII. Must be independently gated. |
| `networkAccess` | Realtime API, Langfuse (cloud), A2A (external) | Sending data to external servers (OpenAI, Langfuse cloud) is a fundamentally different trust level from local-only operations. Current `webSearch` is the closest analog but is semantically different. |
| `traceExport` | Langfuse | Exporting structured trace data (prompts, responses, token counts) to an observability backend requires explicit consent. |

### 2.3 Proposed Preset Extensions

| Preset | Current capabilities | Proposed additions |
|--------|---------------------|-------------------|
| `readonly` | fileRead, gitRead, modelCall | *(no change)* |
| `standard` | + fileWrite, terminalExecute, gitWrite | *(no change)* |
| `full` | + webSearch | + audioCapture, networkAccess |
| *(new)* `trusted` | *(all of full)* | + screenCapture, traceExport |

**Rationale:** `audioCapture` and `networkAccess` require user opt-in (ADR-0005 compliance). They belong in `full` because they are active operations with privacy implications. `screenCapture` and `traceExport` are relegated to a hypothetical `trusted` preset because they involve capturing and persisting sensitive data — a step beyond `full`.

**Alternative:** Instead of a new preset, add per-capability feature flags (e.g., `cursorDrive.capabilities.audioCapture.enabled: false`). This is more granular but adds configuration surface.

### 2.4 Role Template Permissions

Agent Teams introduces role templates. Security-relevant mappings:

| Role | Base preset | Additional capabilities | Rationale |
|------|------------|------------------------|-----------|
| `reviewer` | `readonly` | *(none)* | Read and analyze only. Code review, architecture review. |
| `implementer` | `standard` | *(none)* | File write, terminal execute, git write. Core coding role. |
| `tester` | `standard` | + `screenCapture` (when Computer Use is adopted) | Needs visual verification for UI testing. |
| `researcher` | `readonly` | + `webSearch` | Needs external information access but should not modify files. |
| `planner` | `readonly` | + `modelCall` | Already in readonly. Plans but does not implement. |

### 2.5 MCP-Level Access Control (AgentBound)

AgentBound proposes manifest-based permissions at the MCP protocol level, complementing Drive's application-level `toolAllowlist.ts`. Current assessment:

- **Status:** Deferred (not in MCP core spec, no production adoption).
- **Drive's position is ahead:** `toolAllowlist.ts` already enforces per-operator, depth-cascaded permissions — more advanced than AgentBound's flat manifest model.
- **Future alignment:** If MCP core spec adopts permission primitives, Drive should publish a permission manifest in its Agent Card (`mcpServer.ts:576`, `buildAgentCard()`). This would declare Drive's required permissions to MCP clients.
- **No code changes needed now.** Monitor MCP spec evolution.

---

## 3. Data Handling & Privacy

### 3.1 Audio Data

| Aspect | WhisperKit (local) | Realtime API (cloud) |
|--------|-------------------|---------------------|
| **Processing location** | On-device (CoreML/CUDA) | OpenAI servers |
| **ADR-0005 compliance** | ✅ Fully compliant | ❌ Violates strict default |
| **Audio transmission** | None — audio never leaves machine | Raw audio sent over WebSocket/WebRTC |
| **Audio retention** | None (transient buffers, discarded after transcription) | Depends on OpenAI data processing agreement. Zero-retention DPA available but must be explicitly configured. |
| **Transcript persistence** | None (ADR-0005 strict mode) | Transcript available as side-channel; must not be persisted under strict mode |
| **Biometric risk** | Low — no data leaves device | High — voice is biometric data, more sensitive than text |
| **Required consent** | Microphone access permission (OS-level) | Explicit opt-in with disclosure: "Audio will be sent to OpenAI." Session-scoped consent (expires at session end). |

**Recommendation:** WhisperKit is the default and only privacy-compliant STT option. Realtime API is opt-in only, with session-scoped consent and clear disclosure. Configuration:

```
cursorDrive.voice.sttBackend: "whisperkit" | "realtime-api" | "off"
cursorDrive.voice.sttBackend default: "off" (STT not yet implemented)
```

When Realtime API is selected:
1. Show one-time disclosure: "Audio will be sent to OpenAI for processing. Voice data is biometric. Proceed?"
2. Consent expires at session end.
3. Audit log entry: "Cloud voice enabled at [timestamp]" (never log audio content).

### 3.2 Trace Data (Langfuse)

| Aspect | Self-hosted | Cloud |
|--------|------------|-------|
| **Data location** | User's infrastructure | Langfuse managed servers |
| **ADR-0005 compliance** | ✅ With redaction | ❌ Needs review per data processing terms |
| **What's captured** | Prompt structure (tier, route), token counts, latency, cost. NOT full prompt text by default. | Same, but leaves user's machine. |
| **Persistence** | PostgreSQL + ClickHouse with configurable TTL (default: 30 days) | Langfuse cloud retention policy |
| **Secret exposure** | Prompts may contain API keys, file paths, code context. Redaction required. | Same risk, amplified by third-party storage. |

**Redaction strategy:** Before submitting trace spans to Langfuse, apply the same injection pattern detection from `sanitizer.ts` (line 10, `INJECTION_PATTERNS`) plus additional redaction patterns:

- API key formats: `sk-...`, `ghp_...`, `AKIA...`, `xoxb-...`
- Environment variable values from `.env` files
- File paths containing known sensitive directories (`.ssh/`, `.gnupg/`)

**Configuration:**

```
cursorDrive.observability.langfuseEnabled: false (default)
cursorDrive.observability.langfuseHost: "" (self-hosted URL)
cursorDrive.observability.tracePromptText: false (default — log structure only)
cursorDrive.observability.traceRetentionDays: 30
```

### 3.3 MCP App UI Data

The MCP App iframe displays the same data as the existing Agent Screen webview (`src/agentScreen.ts`):
- Operator activity events (text descriptions of actions)
- File paths touched
- Decision summaries
- Plan progress (plan name, TODO counts)

**Privacy analysis:**
- **No new data exposure.** MCP App UI resources serve the same events already returned by `agent_screen_activity`, `agent_screen_file`, and `agent_screen_decision` MCP tools as text.
- **Strict mode filtering:** When `cursorDrive.privacy.strictMode` is enabled, sensitive details are omitted from UI resources (same filtering applied to tool text responses).
- **No persistent storage in iframe.** Sandbox blocks `localStorage`/`sessionStorage` (origin is `null`).
- **Feature flag:** `cursorDrive.mcp.enableApps` must be explicitly enabled. Off by default.

### 3.4 A2A Task Descriptions

A2A task descriptions (`/tasks` POST body) may contain sensitive code context when external agents delegate work to Drive. For example:

```json
{ "message": "Review the authentication bypass in src/auth.ts line 42" }
```

This description is used as the operator's task string (`operatorRegistry.spawn(undefined, taskDesc)` at `mcpServer.ts:643`) and logged to the Agent Screen.

**Gap:** A2A task descriptions are not currently passed through `sanitizer.ts`. They should be.

**Required control:** Sanitize A2A task descriptions through `sanitizePrompt()` before using as operator context. Add to the `/tasks` POST handler in `mcpServer.ts`.

---

## 4. Supply Chain & Licensing

### 4.1 Current Dependencies

Drive's current dependency tree is minimal (from `package.json`):

| Package | Version | License | Purpose |
|---------|---------|---------|---------|
| `@modelcontextprotocol/sdk` | ^1.26.0 | MIT | MCP server implementation |
| `say` | ^0.16.0 | MIT | OS-native TTS |
| `zod` | ^4.3.6 | MIT | Schema validation for MCP tools |

All current dependencies are MIT-licensed and well-maintained.

### 4.2 New Dependencies by Technology

| Technology | New dependency | License | Size | Risk |
|------------|---------------|---------|------|------|
| **MCP Apps** | `@modelcontextprotocol/ext-apps` | MIT (expected, same org) | ~12 KB | Low — maintained by MCP core team |
| **WhisperKit** | `whisperkit` or custom subprocess wrapper | MIT (WhisperKit) | Model files: ~1.5 GB | Medium — model distribution supply chain |
| **Realtime API** | `openai` (existing SDK) | MIT | ~200 KB | Low — well-maintained, widely audited |
| **Langfuse** | `langfuse` | MIT | ~150 KB + transitive deps | Low-Medium — review transitive tree |
| **A2A** | None (HTTP endpoints, no SDK) | N/A | 0 | None |
| **Agent Steering** | None (YAML parsing via existing `js-yaml` or custom) | N/A | 0 | None |
| **Agent Teams** | None (extends existing `operatorRegistry.ts`) | N/A | 0 | None |
| **Parallel Tool Calling** | None (Cursor-native) | N/A | 0 | None |
| **Computer Use** | Deferred — community MCP tools would add Puppeteer/Playwright | Various | Large | High (deferred) |

### 4.3 License Compatibility

All proposed dependencies are MIT-licensed, which is compatible with Drive's MIT license. No GPL, AGPL, or copyleft concerns.

### 4.4 Dependency Pinning Requirements

| Dependency | Pinning strategy | Rationale |
|------------|-----------------|-----------|
| `@modelcontextprotocol/ext-apps` | Exact version during prototype (`"1.0.1"`) | Early SDK; avoid surprise breaking changes |
| `langfuse` | Exact version (`"X.Y.Z"`) | Feature-flagged; minimize exposure surface |
| `openai` | Semver range (`"^4.x"`) | Stable, widely used; major version pin is sufficient |
| WhisperKit models | SHA-256 checksum + version pin | Binary artifacts require integrity verification |

**CI enforcement:** `npm audit` must run in CI. Block publish on critical/high vulnerabilities. Current CI (`.github/workflows/ci.yml`) should add this step.

---

## 5. Operational Implications

### 5.1 Self-Hosting Requirements

| Component | Infrastructure | Complexity | Who manages |
|-----------|---------------|------------|-------------|
| **Langfuse** | Docker Compose (PostgreSQL + ClickHouse + Langfuse server) | Medium — requires Docker knowledge, port management, persistent volumes | User/team |
| **WhisperKit models** | Local file storage (~1.5 GB per model variant) | Low — one-time download, checksum verification | Automatic (extension handles download) |
| **Drive MCP server** | In-process (extension host), localhost:7891 | None — already implemented, zero infrastructure | Automatic |

**Langfuse self-hosting detail:** Langfuse requires three services (PostgreSQL, ClickHouse, Langfuse web). Docker Compose is the recommended deployment. For Drive users who are individual developers (primary persona), this is significant operational overhead. Recommendation: provide a `docker-compose.langfuse.yaml` template but default to disabled.

### 5.2 Cost Analysis

| Technology | Cost model | Estimated cost per session | Notes |
|------------|-----------|---------------------------|-------|
| **OpenAI Realtime API** | Per-audio-token (input + output) | $0.30–$2.00 per 10-minute voice session | Varies by model (gpt-4o-realtime vs mini). Audio tokens are ~3x text token cost. |
| **Cloud Agents** (deferred) | Per-VM-minute (Cursor subscription) | $0.50–$5.00 per agent dispatch | Depends on VM tier and duration. 8 parallel agents = 8x cost. |
| **Langfuse Cloud** | Per-trace (if cloud hosted) | ~$0.001 per trace | Negligible per session. Self-hosted = $0. |
| **WhisperKit** | Electricity/compute (local) | ~$0 marginal | GPU VRAM contention may degrade other workloads. |
| **Everything else** | $0 | $0 | Local-only, no external APIs. |

**Cost controls:** Per-session budget caps should be implemented for Realtime API and Cloud Agents (when adopted). Expose cumulative cost on Agent Screen (`agent_screen_plan_update` tool could be extended to show cost).

### 5.3 Uptime & Reliability

| Component | Failure mode | Impact | Recovery |
|-----------|-------------|--------|----------|
| **MCP server (localhost:7891)** | Port occupied; extension deactivated; process crash | All AI tool calls fail; Drive is non-functional | Auto-restart on extension reactivation. Port config override. `cursorDrive.diagnose` for troubleshooting. |
| **WhisperKit subprocess** | Model load failure; audio device unavailable; GPU OOM | STT disabled; voice input unavailable | Graceful fallback to text input. Error message with troubleshooting. |
| **Realtime API** | OpenAI outage; rate limit; network failure | Cloud voice unavailable | Fallback to WhisperKit (local). Session consent resets. |
| **Langfuse** | Self-hosted service down | No trace collection | Silent degradation — `langfuseEnabled: false` equivalent. No impact on Drive functionality. |

### 5.4 Observability Gap Analysis

| Capability | Current state | Needed | Technology |
|-----------|--------------|--------|-----------|
| Per-operator tracing | ❌ None | ✅ Required for multi-operator debugging | Langfuse |
| Model call cost tracking | ❌ None | ✅ Required for budget enforcement | Langfuse + `modelSelector.ts` integration |
| Tool call latency | ⚠️ `console.log` only | ✅ Structured metrics | Langfuse spans |
| Operator lifecycle events | ✅ `operatorRegistry.events` emitter | ✅ Already exists | Extend with Langfuse trace export |
| Pipeline stage timing | ❌ None | ⚠️ Nice-to-have | Langfuse spans wrapping each `pipeline.ts` stage |
| Error rate by operator | ❌ None | ✅ Required for escalation decisions | Langfuse error annotations |
| Audio processing metrics | ❌ None | ⚠️ Nice-to-have (when STT ships) | Custom metrics (latency, WER estimation) |

---

## 6. Mitigations & Required Controls

### P0 — Must implement before any technology adoption

| # | Control | Where | Risk addressed | Notes |
|---|---------|-------|---------------|-------|
| P0-1 | **Sanitize A2A task descriptions** | `src/mcpServer.ts` `/tasks` POST handler (line 643) | A2A injection (§1.9) | Call `sanitizePrompt(taskDesc)` before passing to `operatorRegistry.spawn()`. |
| P0-2 | **Add `audioCapture` and `networkAccess` capabilities** | `src/toolAllowlist.ts` `Capability` type (line 7) and `PRESET_CAPABILITIES` (line 16) | WhisperKit mic access, Realtime API data transmission (§2.2) | New capabilities must be opt-in and not included in `standard` preset. |
| P0-3 | **Session-scoped consent for cloud voice** | New `src/voiceConsent.ts` module | Realtime API privacy (§1.8, §3.1) | Consent dialog with disclosure text. Expires at session end. Audit log entry. |
| P0-4 | **WhisperKit model checksum verification** | New `src/modelVerifier.ts` or within STT module | Model supply chain (§1.7) | SHA-256 verification on download. Block model load on checksum mismatch. |
| P0-5 | **YAML policy schema validation** | New `drive-policies.schema.json` + validation in `approvalGates.ts` | Policy bypass (§1.3) | JSON Schema validation at startup. Fall back to defaults on parse error. |

### P1 — Must implement before production use

| # | Control | Where | Risk addressed | Notes |
|---|---------|-------|---------------|-------|
| P1-1 | **Langfuse trace redaction** | New `src/traceRedactor.ts` | Trace data privacy (§1.10, §3.2) | Reuse `INJECTION_PATTERNS` from `sanitizer.ts`. Add API key regex patterns. Apply before trace submission. |
| P1-2 | **Realtime API pipeline post-validation** | `src/pipeline.ts` + new voice mode branch | Pipeline bypass (§1.8) | Run transcript through `sanitizePrompt()` + `checkPrompt()` after Realtime API returns. Interrupt via `tts_stop` on block. |
| P1-3 | **Escalation rate limiting** | `src/operatorRegistry.ts` or new `src/escalationPolicy.ts` | Privilege escalation (§1.4) | Max 3 escalation requests per operator per session. Log all attempts. |
| P1-4 | **npm audit in CI** | `.github/workflows/ci.yml` | Supply chain (§4.4) | Add `npm audit --audit-level=high` step. Fail on high/critical vulnerabilities. |
| P1-5 | **MCP App CSP compliance testing** | `tests/` or manual test checklist | XSS via iframe (§1.1) | Validate no CSP violations in target hosts during prototype. |
| P1-6 | **Cost budget enforcement** | New config `cursorDrive.voice.maxCloudMinutesPerSession` | Realtime API cost (§5.2) | Enforce at API call time. Surface remaining budget on Agent Screen. |

### P2 — Implement when technology reaches ADOPT

| # | Control | Where | Risk addressed | Notes |
|---|---------|-------|---------------|-------|
| P2-1 | **A2A authentication** | `src/mcpServer.ts` HTTP handler | Unauthenticated A2A (§1.9) | Bearer token or shared secret for A2A endpoints. Defer until external agents actually connect. |
| P2-2 | **Screenshot consent gate** | New `src/screenshotConsent.ts` | Screen capture privacy (§1.2) | One-time user consent on first screenshot tool use. Scope to localhost URLs by default. |
| P2-3 | **AgentBound permission manifest** | `src/mcpServer.ts` `buildAgentCard()` (line 576) | MCP-level access control (§2.5) | Add permission declarations to Agent Card when MCP spec adopts the standard. |
| P2-4 | **Langfuse self-host template** | `docker-compose.langfuse.yaml` | Operational complexity (§5.1) | Provide pre-configured Docker Compose for Drive users. |
| P2-5 | **Cloud Agent trust boundary docs** | `docs/guides/` | Cloud execution trust (§1.2) | Document what data leaves the machine, who has access, and how to opt out. |

---

## 7. Summary Risk Matrix

| Technology | Recommendation | Threat Level | Privacy Impact | Supply Chain Risk | Operational Cost | Overall Risk |
|------------|---------------|-------------|---------------|-------------------|-----------------|-------------|
| **MCP Apps** | PROTOTYPE | Low | Low | Low (1 new dep, ~12KB) | None | **Low** |
| **Computer Use** | DEFER | High | High (screenshots, cloud VMs) | High (deferred) | High (cloud VMs) | **High** ⚠️ |
| **Agent Steering** | ADOPT | Low-Medium | None | None (no new deps) | None | **Low** |
| **Agent Teams** | ADOPT | Low-Medium | Low (cross-operator context) | None (no new deps) | None | **Low** |
| **Plugins & MCP** | ADOPT | Low | None | Low (SDK update) | None | **Low** |
| **VSCode Extensions** | ADOPT | Very Low | None | None | None | **Very Low** |
| **WhisperKit** | PROTOTYPE | Medium | Low (on-device, ADR-0005 compliant) | Medium (model files) | Low (local compute) | **Low-Medium** |
| **Realtime API** | PROTOTYPE | **High** | **Critical** (cloud audio, ADR-0005 violation) | Low (OpenAI SDK) | Medium ($0.30–$2/session) | **High** ⚠️ |
| **A2A Protocol** | ADOPT | Medium | Low (task descriptions) | None (no new deps) | None | **Low-Medium** |
| **Langfuse** | PROTOTYPE | Medium | Medium (trace data) | Low-Medium (npm dep) | Medium (self-host infra) | **Medium** |
| **Parallel Tool Calling** | ADOPT | Very Low | None | None | None | **Very Low** |

### Risk-Ranked Priority

1. **OpenAI Realtime API** — Highest privacy risk. Must not become default. Session-scoped consent mandatory.
2. **Cursor Computer Use** — Correctly deferred. Do not implement without public API and trust boundary documentation.
3. **Langfuse** — Medium risk managed by self-host default and redaction. Disabled by default.
4. **A2A Protocol** — Sanitize task descriptions (P0-1). Add authentication when external agents connect.
5. **WhisperKit** — Model checksum verification required (P0-4). Otherwise privacy-friendly.
6. **MCP Apps** — Low risk. Host-managed sandboxing is adequate.
7. **Agent Steering/Teams/Plugins/VSCode/Parallel** — Low to very low risk. Standard extension patterns.

### Key Invariants

These must hold regardless of which technologies are adopted:

1. **ADR-0005 is non-negotiable.** No cloud transmission of audio, transcripts, or traces without explicit, session-scoped user consent.
2. **Pipeline stages are not optional.** Any new input path (Realtime API voice, A2A tasks) must pass through `sanitizer.ts` and `approvalGates.ts` before reaching operator context.
3. **Permission cascade is the law.** Child operators cannot exceed parent preset. `minPreset()` in `operatorRegistry.ts` (line 20) is the enforcement point.
4. **Loopback binding is sacred.** MCP server at `127.0.0.1:7891` (`mcpServer.ts:767`) must never bind to `0.0.0.0` or any non-loopback address.
5. **Feature flags gate risk.** Every privacy-impacting technology ships behind a flag defaulting to `false`.

---

## Cross-References

| Document | Relevance |
|----------|-----------|
| `docs/architecture/adr/ADR-0005-privacy-strict-default.md` | Privacy baseline — all technologies assessed against this |
| `docs/architecture/adr/ADR-0010-tiered-model-routing.md` | Cost model — Realtime API and Langfuse affect tier routing |
| `docs/architecture/adr/ADR-0012-voice-input-integration.md` | Voice pipeline — WhisperKit and Realtime API integration points |
| `docs/architecture/adr/ADR-0014-agent-orchestration-strategy.md` | A2A adoption rationale and agent teams architecture |
| `docs/architecture/adr/ADR-0003-mcp-bridge-pattern.md` | MCP server architecture — localhost binding, tool contract |
| `docs/architecture/adr/ADR-0004-multi-agent-registry.md` | Operator registry — permission cascade, spawn model |
| `docs/prd/prd-safety-config.md` | Safety requirements — approval gates, tool allowlist, privacy defaults |
| `src/toolAllowlist.ts` | Capability enforcement implementation |
| `src/approvalGates.ts` | Block/warn pattern scanning |
| `src/sanitizer.ts` | Injection pattern stripping |
| `src/operatorRegistry.ts` | Operator hierarchy with depth cascade |
| `src/mcpServer.ts` | MCP + A2A server implementation |
| `docs/research/drive-tech/*/04_risks-and-mitigations.md` | Per-technology risk analysis (inputs to this synthesis) |
