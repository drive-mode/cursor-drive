# PRD 2: Session + Persona

## Problem

Current AI chat in Cursor is stateless per-turn: the model dumps its entire response, forgets everything between sessions, and has no persistent identity. This creates three problems for pair programming:

1. **Overwhelming responses.** The model explains everything in every response. On a real call, a senior engineer says "done, changes in `src/auth/`, want details?" -- not a 500-word essay.
2. **No memory.** The model doesn't know what you discussed last turn, what tasks are pending, or what you said you'd do next. A real pair-programming partner tracks this.
3. **No identity.** The model has no name, no consistent personality, no voice. Users can't build a working relationship with an anonymous assistant.

## Solution

Three interconnected systems:

**Agent Persona**: named, configurable identity with consistent communication style. User can name the agent, set default verbosity, and define personality traits. Drive references `.cursor/agents/` definitions when present.

**Concise-First Response Pattern**: a post-processing layer that compresses the model's full output to the user's configured verbosity level before it's spoken or displayed. Full response stays in chat; spoken/summary version is capped.

**Session Memory**: per-conversation state tracking what's been discussed, active tasks, pending items, and user commitments. Enables proactive steering ("you mentioned adding tests -- should I do that now?").

```
Model generates full response
  --> responseFormatter (cheap model call)
      - Compresses to verbosity level
      - Names files/locations
      - Ends with offer to elaborate
  --> formatted text to TTS (PRD 1)
  --> full text to chat panel
```

## User Stories

- As a user, I want my agent to have a name so I can refer to it naturally ("Alpha, switch to plan mode").
- As a user, I want terse responses by default: outcome, location, offer to elaborate.
- As a user, I want to switch to verbose mode when I need deep explanations.
- As a user, I want the agent to remember what we discussed earlier in the session without me repeating context.
- As a user, I want the agent to nudge me if I said I'd do something and haven't ("you mentioned deploying -- ready for that?").
- As a user, I want to configure the agent's personality (direct vs friendly, technical level, etc.) via settings or `.cursor/agents/` definitions.
- As a user, I want the full response always available in chat even when the spoken version is compressed.

## Phased Milestones

### P0: Named agent + concise-first responses

- Add `agent.name` setting (default: `"Drive"`). Prompt user to name their agent on first activation if no name is configured.
- Implement response formatter module:
  - Takes the full model response text
  - Calls routing-tier (cheapest) model with a compression prompt
  - Compression prompt rules: state the outcome in 1-2 sentences, name any files or locations changed, end with "Want details?" or similar offer
  - Respects `verbosity` setting: `terse` (1-3 sentences), `normal` (paragraph), `verbose` (full response passed through)
  - Returns both formatted and full versions
- Wire formatter into participant pipeline: formatted version goes to TTS, full version goes to chat stream
- Add `agent.offerElaboration` setting: when true, append "Want me to go into more detail?" to terse/normal responses
- Add `agent.maxSpokenSentences` setting: cap how many sentences TTS speaks (remainder in chat only)

### P1: Session memory

- Implement session memory store:
  - Per-workspace, persisted to `workspaceState`
  - Tracks: conversation turns (summarized, not full text), active tasks (name + status), pending actions, decisions made
  - Memory window: configurable max entries (default 50), oldest entries summarized and compressed
- Inject relevant memory context into system prompt:
  - "Previous context: [summarized recent turns]. Active tasks: [list]. Pending: [list]."
  - Context injection uses routing-tier model to summarize (not raw history dump)
- Add `agent.sessionMemory.enabled` setting (default `true`)
- Add `agent.sessionMemory.maxEntries` setting (default `50`)

### P2: Proactive steering

- Implement idle detection: if N seconds pass after agent completes a response and user hasn't responded:
  1. Wait configured duration
  2. Agent suggests next action based on session memory and pending tasks
  3. If user still doesn't respond, agent explains why it's suggesting that action
- Implement commitment tracking: when the user says "I'll do X" or "let's do X next", store as a pending action. On next session start or after a task completes, remind: "You mentioned X -- ready for that?"
- Add `agent.proactiveSteering.enabled` setting (default `false` -- opt-in only)
- Add `agent.proactiveSteering.idleSeconds` setting (default `30`)
- Integrate with `.cursor/agents/` definitions: if agent definitions exist with personality traits, Drive reads and applies them to the system prompt

**Proactive behavior beyond idle detection** (see `.cursor/skills/drive-persona/SKILL.md` and `docs/design/philosophy/senior-engineer-pair-programming.md`):

- During active work: if Drive notices a bug in a file it's reading (not the file it was asked to change), mention it in one sentence at the end: "Also noticed: missing null check at line 47 in auth.ts — want me to fix that too?"
- Prioritization: security > correctness > performance > style. Surface at most one proactive observation per response.
- Proactive course correction: if user asks for X but X will clearly break Y, say so before executing: "This will break the auth tests — want me to update those too, or should I skip X?"
- Proactive is NOT: volunteering opinions on code style, suggesting rewrites of working code, or adding unsolicited features.

## Technical Constraints

- **Response formatter is a model call.** Adds latency. Use the cheapest model (routing tier). If none available, skip formatting and pass through.
- **Session memory must not leak PII.** Summaries in `workspaceState` must not contain secrets, file contents, or credentials. Summarization prompt instructs: "Do not include code snippets, secrets, or file contents in the summary."
- **Memory context injection must be bounded.** Injected context stays within configurable token budget (default: 500) to preserve context window.
- **Proactive steering must be non-intrusive.** Subtle chat message, not a modal. TTS speaks it only when TTS and `proactiveSteering` are enabled.

## Config Schema

| Setting | Type | Default | Description |
|---|---|---|---|
| `cursorDrive.agent.name` | string | `"Drive"` | Display name for the primary agent |
| `cursorDrive.agent.verbosity` | enum: `terse`, `normal`, `verbose` | `"terse"` | Response compression level |
| `cursorDrive.agent.offerElaboration` | boolean | `true` | Append "want details?" to compressed responses |
| `cursorDrive.agent.maxSpokenSentences` | number | `3` | Max sentences TTS speaks per response |
| `cursorDrive.agent.personality` | string | `""` | Free-text personality description injected into system prompt |
| `cursorDrive.agent.sessionMemory.enabled` | boolean | `true` | Track conversation context across turns |
| `cursorDrive.agent.sessionMemory.maxEntries` | number | `50` | Max memory entries before oldest are compressed |
| `cursorDrive.agent.sessionMemory.tokenBudget` | number | `500` | Max tokens for memory context injection |
| `cursorDrive.agent.proactiveSteering.enabled` | boolean | `false` | Agent suggests next steps when idle |
| `cursorDrive.agent.proactiveSteering.idleSeconds` | number | `30` | Seconds of idle before agent nudges |
| `cursorDrive.agent.agentDefinitionsPath` | string | `".cursor/agents/"` | Path to agent definition files |

## Acceptance Criteria

- [ ] Agent displays its configured name in chat messages and status bar
- [ ] First activation prompts user to name the agent if no name is set
- [ ] `terse` verbosity compresses responses to 1-3 sentences + file references + elaboration offer
- [ ] `verbose` verbosity passes the full response through unmodified
- [ ] Full response is always visible in chat regardless of verbosity
- [ ] Session memory persists across messages within a workspace session
- [ ] Memory context injected into system prompt stays within token budget
- [ ] Proactive steering suggests next actions after idle timeout (when enabled)
- [ ] No PII, secrets, or code snippets appear in stored memory summaries

## Future Vision

- Long-term memory across sessions (persisted to disk, encrypted)
- Agent personality evolution: agent adapts its communication style to the user's preferences over time
- Multiple personality presets ("mentor", "peer", "junior") that change the agent's behavior
- Integration with project management tools: agent knows your sprint goals and adjusts suggestions accordingly
- Emotional awareness: agent detects frustration in tone/wording and adjusts (more supportive, less technical)

## Cross-References

- [PRD 1: Voice I/O](prd-voice-io.md) -- response formatter feeds TTS pipeline
- [PRD 3: Multi-Agent](prd-multi-agent.md) -- each agent has its own persona and memory
- [PRD 4: Safety + Config](prd-safety-config.md) -- privacy constraints on memory, config schema
- [PRD 5: Cursor Integration](prd-cursor-integration.md) -- agent name in status bar and chat UI
