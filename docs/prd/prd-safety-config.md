# PRD 4: Safety + Configuration

## Problem

AI agents in an IDE have access to powerful tools: file editing, terminal commands, git operations, and destructive actions like `rm -rf`, `git push --force`, or `DROP DATABASE`. Users need granular control; the system blocks dangerous operations by default.

Drive Mode is a complex product with dozens of behaviors. Every behavior must be configurable for different user preferences, skill levels, and trust thresholds. "Strict by default, opt-in to autonomy" keeps new users safe while power users can unlock full capabilities.

## Solution

Configuration-first: every behavior is a setting with a safe default, plus three active safety systems:

1. **Approval gates**: scan prompts and model responses for dangerous operation patterns; block or confirm before proceeding.
2. **Tool allowlist**: per-agent permissions defining which VS Code APIs and system capabilities each agent can use.
3. **Mode switching controls**: strict settings governing whether and how Drive can change modes (voice, semantic, or manual only).

Single config schema. Extension reads config at startup and on `onDidChangeConfiguration`. Modules instantiate based on config; disabled features never load.

```
User prompt --> Approval Gate (pre-routing)
  --> Route to agent
  --> Agent generates response
  --> Approval Gate (post-response, scans for dangerous commands)
  --> Response to user
  --> Audit log (if enabled)
```

## User Stories

- As a user, I want the agent to ask me before running `git push --force` or any destructive command.
- As a user, I want to completely block `rm -rf` and similar filesystem-nuking commands with no override.
- As a user, I want to control which agents can edit files vs only read them.
- As a user, I want a master list of every setting, its current value, and what it does.
- As a user, I want mode switching to require my confirmation by default (no silent mode changes).
- As a user, I want no transcripts or audio stored unless I explicitly enable debug mode.
- As a user, I want API keys stored securely and never logged.
- As a user, I want an optional audit log showing what each agent did and when.
- As a user, I want safe defaults on every setting so I can install and use Drive without configuring anything.

## Phased Milestones

### P0: Config-first architecture + approval gates

- Define the master config schema: every setting across all 5 PRDs, with type, default, and description
- Implement a centralized config reader (`config.ts`):
  - Reads all `cursorDrive.*` settings from `vscode.workspace.getConfiguration`
  - Exposes a typed config object to all modules
  - Listens to `onDidChangeConfiguration` and notifies subscribers
  - Validates values (range checks, enum membership)
- Implement approval gates module (`approvalGates.ts`):
  - **Pre-routing gate**: scans the user's prompt for dangerous intent patterns
  - **Post-response gate**: scans the model's response for dangerous commands in code blocks
  - Pattern categories:
    - `warn`: show `vscode.window.showWarningMessage` with Proceed/Cancel ("This looks like a force push -- proceed?")
    - `block`: hard block, no proceed option ("rm -rf detected -- blocked by policy")
  - Default patterns:

    | Pattern | Level |
    |---|---|
    | `revert`, `undo all`, `hard reset`, `reset --hard` | warn |
    | `force push`, `push --force`, `push -f` | warn |
    | `delete branch`, `drop database`, `drop table` | warn |
    | `rm -rf`, `del /f /s /q`, `format c:`, `rmdir /s` | block |

  - Patterns are configurable: users can add/remove warn and block patterns
- Implement mode switching controls:
  - `modeSwitching.voiceEnabled`: can voice commands switch modes (default `true`)
  - `modeSwitching.semanticEnabled`: can the AI suggest mode changes (default `false`)
  - `modeSwitching.requireConfirmation`: confirm before switching (default `true`)
  - `modeSwitching.allowedModes`: which modes are permitted (default: all)
- Privacy defaults:
  - No transcript persistence (session memory stores summaries, not raw text)
  - No audio recording or storage
  - API keys in `vscode.SecretStorage`
  - Config values logged with secrets redacted

### P1: Tool allowlist + per-agent permissions

- Implement tool allowlist module (`toolAllowlist.ts`):
  - Defines capabilities: `fileRead`, `fileWrite`, `terminalExecute`, `gitRead`, `gitWrite`, `webSearch`, `modelCall`
  - Each agent has a permissions set (configurable per-agent or using a default)
  - Before an agent uses a capability, the allowlist checks permission
  - Denied actions: log the denial, notify the user, suggest alternative
- Default permission presets:
  - `readonly`: `fileRead`, `gitRead`, `modelCall` only
  - `standard`: readonly + `fileWrite`, `gitWrite`, `terminalExecute`
  - `full`: all capabilities (opt-in only)
- Per-agent permission overrides:
  - The agent registry (PRD 3) stores permissions per agent
  - User can restrict specific agents: "Beta should only research, not edit files"
  - Config: `agents.permissions.default`, `agents.permissions.overrides`
- Sub-agent approval:
  - When an agent wants to spawn a sub-task (delegation, PRD 3), require user approval
  - Config: `agents.subAgentApproval` (default `true`)

### P2: Audit log + policy engine

- Implement audit log:
  - Optional, off by default
  - Records: timestamp, agent name, action type, target (file/command/git op), outcome (allowed/warned/blocked)
  - Stored in workspace `.cursor/drive-audit.log` (configurable path)
  - Rotated by size (configurable max size, default 1MB)
  - No PII, no file contents, no secrets in log entries
  - Config: `audit.enabled`, `audit.path`, `audit.maxSizeMB`
- Implement policy engine:
  - Composable rules that combine approval gates + tool allowlist + mode controls
  - Rules can reference agent name, action type, file path patterns, time of day
  - Example rule: "Agent Beta can only write to `tests/` and `docs/`"
  - Rules defined in config or in a `.cursor/drive-policy.yaml` file
- Implement config export/import:
  - `cursorDrive.exportConfig` command: exports all Drive settings to a JSON file
  - `cursorDrive.importConfig` command: imports settings from a JSON file
  - Enables sharing configurations across machines or team members

## Technical Constraints

- **SecretStorage for API keys.** ElevenLabs API key and any other secrets must use `vscode.SecretStorage`. Never read them into config objects that might be logged.
- **Approval gates must not block the UI thread.** `showWarningMessage` is async; the pipeline awaits the user's decision before proceeding.
- **Config validation.** Invalid values (negative numbers, unknown enums) fall back to defaults with a warning, not crash.
- **Audit log must not contain sensitive data.** File paths are OK; file contents, prompt text, and model responses are NOT logged. Only action summaries.
- **Backward compatibility.** Adding new settings must not break existing configs. All settings have defaults. Unknown settings are ignored.

## Config Schema (master list -- all PRDs)

Canonical reference for every `cursorDrive.*` setting. Individual PRDs list their own; this is the unified view.

### Voice I/O (PRD 1)

| Setting | Type | Default | Description |
|---|---|---|---|
| `tts.enabled` | boolean | `false` | Enable text-to-speech |
| `tts.backend` | enum | `"webSpeech"` | TTS engine: `webSpeech`, `piper`, `elevenLabs` |
| `tts.voiceId` | string | `""` | Voice identifier |
| `tts.speed` | number | `1.0` | Speech rate (0.5-2.0) |
| `tts.maxSpokenSentences` | number | `3` | Max sentences spoken per response |
| `tts.interruptOnInput` | boolean | `true` | Stop speech on user input |
| `tts.voices` | array | `[]` | Up to 10 named voice slots |
| `wakeWord` | string | `"hey drive"` | Activation phrase |
| `submitWord` | string | `"send it"` | Confirmation phrase |

### Session + Persona (PRD 2)

| Setting | Type | Default | Description |
|---|---|---|---|
| `agent.name` | string | `"Drive"` | Primary agent name |
| `agent.verbosity` | enum | `"terse"` | Response compression: `terse`, `normal`, `verbose` |
| `agent.offerElaboration` | boolean | `true` | Append elaboration offer |
| `agent.maxSpokenSentences` | number | `3` | TTS sentence cap |
| `agent.personality` | string | `""` | Personality description for system prompt |
| `agent.sessionMemory.enabled` | boolean | `true` | Track context across turns |
| `agent.sessionMemory.maxEntries` | number | `50` | Max memory entries |
| `agent.sessionMemory.tokenBudget` | number | `500` | Max tokens for context injection |
| `agent.proactiveSteering.enabled` | boolean | `false` | Suggest next steps when idle |
| `agent.proactiveSteering.idleSeconds` | number | `30` | Idle timeout for nudges |

### Multi-Agent (PRD 3)

| Setting | Type | Default | Description |
|---|---|---|---|
| `agents.maxConcurrent` | number | `3` | Max simultaneous agents |
| `agents.defaultNames` | array | `["Alpha","Beta","Gamma","Delta"]` | Default agent names |
| `agents.tangentKeyword` | string | `"tangent"` | Spawn keyword |
| `agents.visibility` | enum | `"isolated"` | Agent context sharing: `isolated`, `shared`, `collaborative` |
| `agents.commsAgent.enabled` | boolean | `true` | Enable comms intermediary |
| `agents.commsAgent.updateFrequency` | enum | `"onIdle"` | When to deliver updates |
| `agents.interruptBehavior` | enum | `"immediate"` | How agents handle interruption |
| `agents.messageTints` | array | `["blue","green","orange","purple"]` | Agent message tint names |
| `agents.showNameHeaders` | boolean | `true` | Show agent name on messages |

### Safety + Configuration (PRD 4)

| Setting | Type | Default | Description |
|---|---|---|---|
| `approvalGates.enabled` | boolean | `true` | Enable dangerous op scanning |
| `approvalGates.warnPatterns` | array | (see defaults above) | Patterns that trigger confirmation |
| `approvalGates.blockPatterns` | array | (see defaults above) | Patterns that are hard-blocked |
| `modeSwitching.voiceEnabled` | boolean | `true` | Allow voice mode switching |
| `modeSwitching.semanticEnabled` | boolean | `false` | Allow AI-suggested mode switches |
| `modeSwitching.requireConfirmation` | boolean | `true` | Confirm before switching |
| `modeSwitching.allowedModes` | array | `["ask","agent","plan","debug"]` | Permitted modes |
| `agents.permissions.default` | enum | `"standard"` | Default permission preset |
| `agents.permissions.overrides` | object | `{}` | Per-agent permission overrides |
| `agents.subAgentApproval` | boolean | `true` | Require approval for delegation |
| `privacy.transcriptPersistence` | boolean | `false` | Store raw transcripts |
| `privacy.debugMode` | boolean | `false` | Enable verbose debug logging |
| `audit.enabled` | boolean | `false` | Enable audit log |
| `audit.path` | string | `".cursor/drive-audit.log"` | Audit log file path |
| `audit.maxSizeMB` | number | `1` | Max audit log size before rotation |

### Cursor Integration (PRD 5)

| Setting | Type | Default | Description |
|---|---|---|---|
| `defaultMode` | enum | `"agent"` | Default Cursor mode when Drive activates |
| `shareScreen.enabled` | boolean | `true` | Enable share-screen webview |
| `shareScreen.showDiagrams` | boolean | `true` | Show research diagrams in share-screen |
| `statusBar.showAgentName` | boolean | `true` | Show agent name in status bar |
| `theme.agentTintOpacity` | number | `0.08` | Opacity for agent message tints |

## Acceptance Criteria

- [ ] Every setting has a type, default, and description in the master schema
- [ ] Config reader validates all values and falls back to defaults on invalid input
- [ ] Pre-routing approval gate blocks `rm -rf` with no override option
- [ ] Pre-routing approval gate shows confirmation for `force push` with Proceed/Cancel
- [ ] Post-response gate detects dangerous commands in code blocks and appends a warning
- [ ] Tool allowlist blocks `fileWrite` for agents with `readonly` permissions
- [ ] Mode switching requires confirmation by default (QuickPick)
- [ ] API keys are stored in SecretStorage and never appear in logs
- [ ] Audit log records action summaries without PII or file contents
- [ ] Config export/import roundtrips correctly

## Future Vision

- Team-level policy distribution: shared Drive configs deployed via `.cursor/` in a repo
- Compliance mode: enterprise settings that lock certain configurations
- AI-assisted config: "make Drive more autonomous" translates to specific setting changes with explanation
- Rate-limit awareness: automatically throttle agent activity when approaching API limits
- Cost dashboard: real-time display of token usage per agent per session

## Cross-References

- [PRD 1: Voice I/O](prd-voice-io.md) -- TTS settings, API key storage
- [PRD 2: Session + Persona](prd-session-persona.md) -- memory privacy, verbosity settings
- [PRD 3: Multi-Agent](prd-multi-agent.md) -- per-agent permissions, agent approval
- [PRD 5: Cursor Integration](prd-cursor-integration.md) -- mode controls, status bar settings
