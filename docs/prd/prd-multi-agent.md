# PRD 3: Multi-Operator Orchestration

## Problem

Real pair programming often involves more than two people. A tech lead might have one engineer refactoring auth while another researches rate-limiting patterns. They work in parallel, report back, and the lead steers.

Today's AI IDEs are single-threaded: one model, one conversation, one task at a time. If the user wants to explore a tangent, they either derail the current conversation or open a separate chat and lose context. There is no way to:

- Fork a side task without losing the main thread
- Have multiple AI "engineers" working in parallel
- Hear different operators report back in distinct voices
- Manage which operator is presenting and which is working in the background

## Solution

Multi-operator system when Drive is active. Users manage a pool of named operators like a tech lead manages engineers. Operator identity surfaces via Agent Screen (S-AS) and MCP tools, not chat participant.

**Tangent spawning**: the user says "tangent -- research rate limiting patterns" and a new operator context is forked with its own name, voice, task state, and memory. The original operator continues its work.

**Operator identity**: Without a chat participant, operator identity surfaces via Agent Screen (activity feed, files touched, decisions) and MCP tools. Status bar shows foreground operator. Extension commands `/tangent`, `/switch`, `/operators` work via extension commands, not chat slash commands.

**Comms agent**: an intermediary (cheap model) that batches status updates from background operators, decides what the user needs to hear, and delivers updates at natural pauses.

**Speaking priority**: strict rules prevent operators from talking over each other or the user.

```
User: "tangent -- research rate limiting"
  --> Drive detects "tangent" keyword
  --> OperatorRegistry.spawn("Beta", task="research rate limiting")
  --> Beta starts working (background)
  --> Alpha continues current task (foreground)

  Beta finishes:
  --> CommsAgent queues: "Beta finished rate limiting research. Wrote to docs/. Want details?"
  --> CommsAgent waits for natural pause
  --> CommsAgent delivers update (Beta's voice if TTS enabled)

User: "show me beta"
  --> Agent Screen switches to Beta's research trail
  --> Beta becomes foreground operator

User: "merge beta into alpha"
  --> Alpha receives Beta's context/findings
  --> Beta is deactivated
```

## User Stories

- As a user, I want to say "tangent" to fork a side task without losing my main conversation.
- As a user, I want each operator to have a distinct name and (optionally) voice so I can tell them apart.
- As a user, I want to see all operators' messages in one chat, with visual differentiation (colored borders/tints).
- As a user, I want to filter the chat to show only a specific operator's messages when I need to focus.
- As a user, I want background operators to notify me when they finish, but not interrupt my current work.
- As a user, I want to say "show me [name]" to switch which operator's work I'm watching.
- As a user, I want to say "merge [name] into [name]" to combine parallel work streams.
- As a user, I want to configure whether operators can see each other's context or work in isolation.
- As a user, I want a maximum concurrent operator limit to control cost.
- As a user, I want to configure default operator names so I don't have to name each one.

## Phased Milestones

### P0: Operator registry + tangent spawning

- Implement `OperatorRegistry` module:
  - Manages a pool of `OperatorContext` instances
  - Each context: `id`, `name`, `voice`, `task`, `status` (active/background/completed/merged), `memory`, `createdAt`
  - Tracks which operator is "foreground" (receiving user messages and displaying on Agent Screen)
  - Max concurrent operators setting (default: 3)
- Implement tangent detection in the input pipeline:
  - Keyword: `"tangent"` (configurable via glossary)
  - Everything after the keyword becomes the new operator's task description
  - New operator inherits the current workspace context but gets its own conversation history
- Implement operator switching:
  - `"show me [name]"` or `"switch to [name]"` changes the foreground operator
  - Previous foreground operator moves to background
- Implement operator naming:
  - Default names from config: `["Alpha", "Beta", "Gamma", "Delta", ...]`
  - User can override: `"tangent call it Refactor -- refactor the auth module"`
  - Name shown in chat messages and status bar
- Wire into Drive pipeline: route messages to the foreground operator; background operators process asynchronously

### P1: Group chat UX + comms agent

- Implement visual differentiation in chat output:
  - Each operator's messages prefixed with `**[OperatorName]**` header
  - Operator-specific tint applied via markdown or chat metadata
  - Tint colors assigned from a configurable palette of theme-aware color tokens (not hardcoded hex; uses VS Code CSS variables in webview, or markdown indicators in chat)
  - Filter: user can say `"focus [name]"` to show only that operator's messages; `"show all"` to restore
- Implement comms agent:
  - Lightweight intermediary running on routing-tier (cheapest) model
  - Receives status updates from all background operators
  - Batches updates and decides: what to say, when to say it, which voice to use
  - Prepares anticipated follow-up questions ("Beta found 3 patterns. Want me to compare them?")
  - Delivers at natural pauses (after user finishes a turn, or after idle timeout)
  - Configurable: enabled/disabled, update frequency
- Implement operator completion notifications:
  - When a background operator finishes its task, comms agent queues a one-line summary
  - If TTS enabled, spoken in the completing operator's voice
  - If TTS disabled, appears as a subtle chat message

### P2: Operator visibility + merge + advanced orchestration

- Implement operator visibility settings:
  - `isolated`: operators cannot see each other's context (default)
  - `shared`: operators can read each other's memory (not write)
  - `collaborative`: operators can read and reference each other's work
  - Configurable per-operator or globally
- Implement merge:
  - `"merge [source] into [target]"` command
  - Source operator's memory, findings, and file changes are summarized and injected into target's context
  - Source operator is deactivated (status: merged)
  - Target operator receives a system message: "Merged context from [source]: [summary]"
- Implement operator-to-operator delegation:
  - An operator can request: "I need someone to handle the tests while I refactor" (detected from model output)
  - Comms agent asks user: "Alpha wants to delegate testing. Spawn a new operator for that?"
  - User approves or declines
- Implement operator lifecycle:
  - Operators can be paused, resumed, or killed
  - `"pause [name]"`, `"resume [name]"`, `"dismiss [name]"`
  - Paused operators retain memory; dismissed operators are archived

## Technical Constraints

- **Hook-based pipeline.** Drive uses beforeSubmitPrompt when active. Multi-operator is internal; pipeline routes to the correct `OperatorContext`.
- **Async background work.** Background operators run model calls via `vscode.lm` asynchronously. Handle cancellation, timeouts, and rate limits gracefully.
- **Message ordering.** All operator messages arrive in the same chat stream. Include clear operator name headers; consider a thin separator between operators' messages.
- **Cost.** Each operator burns model tokens. Comms agent uses routing-tier (cheapest). Worker operators use their configured tier. Enforce `maxConcurrent` to prevent runaway costs.
- **Memory isolation.** When operators are `isolated`, their session memories must not cross-contaminate. Each `OperatorContext` has its own memory store.

## Config Schema

| Setting | Type | Default | Description |
|---|---|---|---|
| `cursorDrive.operators.maxConcurrent` | number | `3` | Maximum number of simultaneous operators |
| `cursorDrive.operators.namePool` | array of strings | `["Alpha","Beta","Gamma","Delta","Epsilon","Zeta","Eta","Theta"]` | Names assigned to new operators in order |
| `cursorDrive.agents.tangentKeyword` | string | `"tangent"` | Word that triggers operator spawning |
| `cursorDrive.agents.visibility` | enum: `isolated`, `shared`, `collaborative` | `"isolated"` | Whether operators can see each other's context |
| `cursorDrive.agents.commsAgent.enabled` | boolean | `true` | Enable the communications intermediary agent |
| `cursorDrive.agents.commsAgent.updateFrequency` | enum: `immediate`, `batched`, `onIdle` | `"onIdle"` | When comms agent delivers background updates |
| `cursorDrive.agents.interruptBehavior` | enum: `immediate`, `finishSentence`, `queue` | `"immediate"` | How operators respond to user interruption |
| `cursorDrive.agents.messageTints` | array of strings | `["blue","green","orange","purple"]` | Theme-aware tint names for operator message backgrounds |
| `cursorDrive.agents.showNameHeaders` | boolean | `true` | Show operator name before each message block |

## Acceptance Criteria

- [ ] Saying "tangent [task]" spawns a new named operator context without losing the current conversation
- [ ] Operator names appear as headers on their messages in chat
- [ ] "show me [name]" switches the foreground operator and Agent Screen focus
- [ ] Background operators complete tasks and queue completion notifications
- [ ] Comms agent delivers batched updates at natural pauses
- [ ] Operator filter hides/shows specific operators' messages
- [ ] "merge [source] into [target]" transfers context and deactivates source
- [ ] Max concurrent operators is enforced; attempting to spawn beyond limit shows a warning
- [ ] Isolated operators cannot access each other's memory
- [ ] Each operator uses its configured TTS voice (when TTS is enabled)

## Future Vision

- Operator specialization templates: pre-built operator types (Researcher, Implementer, Tester, Reviewer) with tuned system prompts and tool permissions
- Operator marketplace: community-contributed operator personas and configurations
- Cross-workspace operators: an operator working in one project can be "loaned" to another
- Operator collaboration protocols: operators can negotiate task boundaries and handoffs without user intervention
- Visual operator topology: a diagram showing which operators are active, their relationships, and task flow

## Cross-References

- [PRD 1: Voice I/O](prd-voice-io.md) -- each operator has a distinct TTS voice
- [PRD 2: Session + Persona](prd-session-persona.md) -- each operator has its own persona and memory
- [PRD 4: Safety + Config](prd-safety-config.md) -- per-operator permissions, cost controls
- [PRD 5: Cursor Integration](prd-cursor-integration.md) -- Agent Screen shows per-operator work, operator switcher QuickPick
