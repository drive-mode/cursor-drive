# Configuration Schema Reference

All `cursorDrive.*` settings. Source: `package.json` contributes.configuration. A future `src/config.ts` will provide typed `readConfig()`.

---

## General

| Setting | Type | Default | Description |
|---|---|---|---|
| `cursorDrive.defaultSubMode` | `"plan" \| "agent" \| "ask" \| "direct"` | `"agent"` | Sub-mode applied when Drive activates |
| `cursorDrive.mcp.port` | number (1024–65535) | `7891` | Port for the Drive MCP server |
| `cursorDrive.mcp.enableApps` | boolean | `true` | Enable MCP Apps: `agent_screen_*` tools return `_meta.ui` for inline UI in chat (Cursor 2.6+). When false, tools return text only. |
| `cursorDrive.wakeWord` | string | `"hey drive"` | Voice phrase that activates Drive |
| `cursorDrive.submitWord` | string | `"send it"` | Voice phrase that confirms and submits the prompt |

---

## Voice I/O (PRD 1)

### TTS

| Setting | Type | Default | Description |
|---|---|---|---|
| `cursorDrive.tts.enabled` | boolean | `false` | Enable text-to-speech responses |
| `cursorDrive.tts.backend` | `"webSpeech" \| "piper" \| "elevenLabs"` | `"webSpeech"` | TTS engine (webSpeech = OS-native via say.js) |
| `cursorDrive.tts.voice` | string | `""` | Voice name override. macOS: `"Alex"`. Windows: `"Microsoft David Desktop"` |
| `cursorDrive.tts.speed` | number (0.5–2.0) | `1.0` | Speech rate multiplier |
| `cursorDrive.tts.maxSpokenSentences` | number (1–20) | `3` | Maximum sentences spoken per response |
| `cursorDrive.tts.interruptOnInput` | boolean | `true` | Stop speaking when user sends a new message |

### Prompt processing

| Setting | Type | Default | Description |
|---|---|---|---|
| `cursorDrive.sanitizer.maxLength` | number (100–10000) | `2000` | Maximum prompt length in characters before truncation |
| `cursorDrive.promptOptimizer.enabled` | boolean | `true` | Enable AI prompt rewriting |
| `cursorDrive.promptOptimizer.autoApprove` | boolean | `false` | Skip approval QuickPick; auto-use optimized prompt |

---

## Session + Persona (PRD 2)

| Setting | Type | Default | Description |
|---|---|---|---|
| `cursorDrive.agent.name` | string | `"Drive"` | Agent display name shown in status bar and chat |
| `cursorDrive.agent.verbosity` | `"terse" \| "normal" \| "verbose"` | `"terse"` | Response compression level |
| `cursorDrive.agent.offerElaboration` | boolean | `true` | Append "Want details?" to terse responses |
| `cursorDrive.agent.maxSpokenSentences` | number (1–20) | `3` | Max sentences spoken per agent response |
| `cursorDrive.agent.personality` | string | `""` | Custom personality addendum to system prompt |
| `cursorDrive.agent.sessionMemory.enabled` | boolean | `true` | Persist session context across turns |
| `cursorDrive.agent.sessionMemory.maxEntries` | number (5–500) | `50` | Maximum turns to keep in memory |
| `cursorDrive.agent.sessionMemory.tokenBudget` | number (50–5000) | `500` | Token budget for injected session context |
| `cursorDrive.agent.proactiveSteering.enabled` | boolean | `false` | Allow agent to suggest next actions unprompted |
| `cursorDrive.agent.proactiveSteering.idleSeconds` | number (5–300) | `30` | Seconds of idle before proactive suggestion fires |

---

## Multi-Operator (PRD 3)

| Setting | Type | Default | Description |
|---|---|---|---|
| `cursorDrive.operators.maxConcurrent` | number (1–10) | `3` | Max simultaneous Drive operators (senior workers that can spawn subagents) |
| `cursorDrive.operators.maxSubAgentsPerOperator` | number (1–16) | `4` | Max Cursor Task-tool subagents each operator can spawn |
| `cursorDrive.operators.defaultPermissionPreset` | `"standard" \| "readonly" \| "full"` | `"standard"` | Default permission preset for new operators |
| `cursorDrive.operators.namePool` | string[] | `["Alpha","Beta","Gamma","Delta","Epsilon","Zeta","Eta","Theta"]` | Names assigned when spawning (first available used) |
| `cursorDrive.agents.tangentKeyword` | string | `"tangent"` | Keyword that triggers operator spawning |
| `cursorDrive.agents.visibility` | `"isolated" \| "shared" \| "collaborative"` | `"isolated"` | Memory sharing policy between operators |
| `cursorDrive.agents.commsAgent.enabled` | boolean | `true` | Enable background operator update batching |
| `cursorDrive.agents.commsAgent.updateFrequency` | `"immediate" \| "batched" \| "onIdle"` | `"onIdle"` | When comms agent delivers updates |
| `cursorDrive.agents.interruptBehavior` | `"immediate" \| "finishSentence" \| "queue"` | `"immediate"` | How foreground operator handles interrupts |
| `cursorDrive.agents.messageTints` | string[] | `["blue","green","orange","purple"]` | Color tints per operator index |
| `cursorDrive.agents.showNameHeaders` | boolean | `true` | Show operator name headers in chat |
| `cursorDrive.operators.permissions.default` | `"readonly" \| "standard" \| "full"` | `"standard"` | Default tool permission preset for operators |
| `cursorDrive.operators.permissions.overrides` | `Record<string, preset>` | `{}` | Per-operator permission overrides by name |
| `cursorDrive.agents.subAgentApproval` | boolean | `true` | Require confirmation before spawning sub-agents |

---

## Safety + Configuration (PRD 4)

| Setting | Type | Default | Description |
|---|---|---|---|
| `cursorDrive.approvalGates.enabled` | boolean | `true` | Enable pre/post approval gate scanning |
| `cursorDrive.approvalGates.warnPatterns` | string[] | `["revert","force push",...]` | Patterns that trigger a warning confirmation |
| `cursorDrive.approvalGates.blockPatterns` | string[] | `["rm -rf","del /f /s /q",...]` | Patterns that are hard-blocked |
| `cursorDrive.modeSwitching.voiceEnabled` | boolean | `true` | Allow voice-triggered mode switches |
| `cursorDrive.modeSwitching.semanticEnabled` | boolean | `false` | Allow semantic intent to trigger mode switches |
| `cursorDrive.modeSwitching.requireConfirmation` | boolean | `true` | Show confirmation before switching modes |
| `cursorDrive.modeSwitching.allowedModes` | SubMode[] | `["ask","agent","plan","direct"]` | Modes the user is allowed to switch to |
| `cursorDrive.privacy.transcriptPersistence` | boolean | `false` | Persist session transcripts (disabled by default per policy) |
| `cursorDrive.privacy.debugMode` | boolean | `false` | Enable verbose logging (may include prompt content) |
| `cursorDrive.audit.enabled` | boolean | `false` | Write audit log |
| `cursorDrive.audit.path` | string | `".cursor/drive-audit.log"` | Path for audit log |
| `cursorDrive.audit.maxSizeMB` | number (0.1–100) | `1` | Max audit log size before rotation |

Default block patterns: `rm -rf`, `del /f /s /q`, `format c:`, `rmdir /s`

Default warn patterns: `revert`, `undo all`, `hard reset`, `reset --hard`, `force push`, `push --force`, `push -f`, `delete branch`, `drop database`, `drop table`

---

## Cursor Integration (PRD 5)

| Setting | Type | Default | Description |
|---|---|---|---|
| `cursorDrive.agentScreen.enabled` | boolean | `true` | Enable the Agent Screen (S-AS) panel |
| `cursorDrive.agentScreen.autoOpen` | boolean | `false` | Auto-open Agent Screen when Drive activates |
| `cursorDrive.agentScreen.displayMode` | `"tab" \| "panel" \| "bottomLog"` | `"tab"` | How the Agent Screen is displayed. `tab`: webview beside editor. `panel`: same as tab (legacy). `bottomLog`: Output Channel, text-only — recommended for terminal-first/CLI users. |
| `cursorDrive.agentScreen.clickBehavior` | `"openInEditor" \| "openInNewWindow"` | `"openInEditor"` | Behavior when clicking file paths in the Agent Screen |
| `cursorDrive.agentScreen.showPlanProgress` | boolean | `true` | Show plan progress overlay (active plan, TODO counts) |
| `cursorDrive.statusBar.showAgentName` | boolean | `true` | Show active operator name in status bar |
| `cursorDrive.statusBar.showMode` | boolean | `true` | Show active mode in status bar |
| `cursorDrive.theme.agentTintOpacity` | number (0–1) | `0.08` | Background tint opacity for agent messages |
| `cursorDrive.blame.enabled` | boolean | `false` | Track which agent made each file change |

---

## TypeScript types

`src/config.ts` exports `readConfig(): DriveConfig` for a validated subset (mcp.port, agentScreen.displayMode, defaultSubMode). Other types remain inline until full migration.

```typescript
type SubMode = "plan" | "agent" | "ask" | "direct"
type VerbosityLevel = "terse" | "normal" | "verbose"
type AgentVisibility = "isolated" | "shared" | "collaborative"
type CommsUpdateFrequency = "immediate" | "batched" | "onIdle"
type InterruptBehavior = "immediate" | "finishSentence" | "queue"
type PermissionPreset = "readonly" | "standard" | "full"
type TtsBackend = "webSpeech" | "piper" | "elevenLabs"
```

Modules may still use `vscode.workspace.getConfiguration("cursorDrive")` directly until full migration.
