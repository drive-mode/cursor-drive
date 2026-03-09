---
name: Drive Mode Full Build
overview: "Harden the Cursor Drive extension for a job application to Anysphere: add prompt optimizer, cost-aware model routing, Open VSX publishing, and produce thorough architecture documentation and visualizations showing how the extension realizes the original hh Discord bot vision."
todos:
  - id: feature-prompt-optimizer
    content: "Create extension/src/promptOptimizer.ts: filler cleaner + cheap-model optimization + approve/edit/skip flow"
    status: completed
  - id: feature-model-selector
    content: "Create extension/src/modelSelector.ts: 3-tier cost-aware model selection (routing/planning/execution)"
    status: completed
  - id: update-participant-new-features
    content: Update participant.ts to wire promptOptimizer + modelSelector before every model call
    status: pending
  - id: update-package-new-config
    content: "Update package.json: add cursorDrive.promptOptimizer.enabled and autoApprove config"
    status: pending
  - id: compile-verify
    content: Compile and verify zero TypeScript errors after new modules
    status: completed
  - id: docs-readme
    content: "Write extension/README.md: full architecture diagrams, feature docs, config reference, voice flow"
    status: completed
  - id: docs-walkthrough
    content: "Write docs/design/cursor-drive-walkthrough.md: module-by-module code walkthrough with diagrams"
    status: completed
  - id: docs-design-features
    content: Write docs/design/prompt-optimizer-design.md + model-cost-tiers.md
    status: pending
  - id: publishing-setup
    content: Add LICENSE, CHANGELOG.md, update .vscodeignore, add ovsx to devDeps, vsce package
    status: pending
  - id: open-vsx-publish
    content: Publish to Open VSX Registry using ovsx CLI (no Azure needed)
    status: pending
isProject: false
---

# Cursor Drive: Full Build for Anysphere Job Application

## Publishing: No Azure Required

The VS Code Marketplace PAT comes from **dev.azure.com** but only requires a free Microsoft or GitHub account — not a paid Azure subscription. However, the cleaner no-account path is **Open VSX Registry**:

```
npm install -g ovsx
ovsx create-namespace hh   # one-time, requires GitHub login at open-vsx.org
ovsx publish --pat $OVSX_PAT
```

Cursor reads Open VSX as a fallback when extensions aren't on the VS Code Marketplace. Users can also install the `.vsix` directly:
- Cursor: `Ctrl+Shift+P` → `Extensions: Install from VSIX...`
- CLI: `cursor --install-extension cursor-drive-0.1.0.vsix`

**Plan**: Publish to Open VSX (GitHub account only) AND add a GitHub Release with the `.vsix` attached. Both are gated in this plan.

---

## Architecture: How hh Discord Bot → Cursor Drive Extension

The core insight is that **hh was always an orchestration engine with two transports**: Discord (voice in / text out) and Cursor (chat in / code out). The extension realizes the original vision through the same core modules.

```mermaid
flowchart TD
  subgraph hh_original ["hh Discord Bot (Original Vision)"]
    discord_voice["Discord Voice\n(wake word detection)"]
    discord_text["Discord Text\n(/slash commands)"]
    intent_router_py["IntentRouter\n(Python mode_router.py)"]
    planning_engine["PlanningEngine\n(clarification loop)"]
    exec_orch["ExecutionOrchestrator\n(cloud/local)"]
    response_broker["CentralResponseBroker\n(ordered delivery)"]
    policy_engine["PolicyEngine\n(RBAC, approval gates)"]
    discord_voice --> intent_router_py
    discord_text --> intent_router_py
    intent_router_py --> planning_engine
    planning_engine --> exec_orch
    exec_orch --> response_broker
    policy_engine --> exec_orch
  end

  subgraph cursor_drive ["Cursor Drive Extension (This Build)"]
    voice_input["Voice Input\n(Cursor STT + activation word)"]
    chat_participant["@drive Chat Participant\n(participant.ts)"]
    drive_mode_mgr["DriveModeManager\n(driveMode.ts — overlay state)"]
    router_ts["router.ts\n(mirrors mode_router.py)"]
    prompt_optimizer["PromptOptimizer\n(NEW — show + approve)"]
    model_router["CostAwareModelRouter\n(NEW — cheap for routing)"]
    status_bar["StatusBar\n(Drive: PLAN/AGENT/ASK)"]
    voice_input --> chat_participant
    chat_participant --> drive_mode_mgr
    drive_mode_mgr --> router_ts
    router_ts --> prompt_optimizer
    prompt_optimizer --> model_router
    model_router --> chat_participant
    drive_mode_mgr --> status_bar
  end

  intent_router_py -.->|"same routing logic\n(ported to TS)"| router_ts
  planning_engine -.->|"same clarification UX\n(plan sub-mode)"| chat_participant
  policy_engine -.->|"approval gates\n(future f1-2)"| prompt_optimizer
```

**Key mapping**: The extension is not a thin wrapper — it IS the hh orchestration layer, just with Cursor as the transport instead of Discord. The Python backend powers the Discord side; the TypeScript extension powers the Cursor side. The same `RouteMode`, `PlanningArtifact`, and session lifecycle live in both.

---

## New Features to Build

### Feature 1: Prompt Optimizer (highest value for job application)

Before every model call, run the raw prompt through a cheap model (`gpt-4o-mini` / `claude-haiku`) to produce an optimized, clear version. Show it to the user in the chat stream with an **Approve / Edit / Skip** flow.

```mermaid
sequenceDiagram
  participant user as User
  participant participant as @drive participant
  participant optimizer as PromptOptimizer
  participant model as LLM (cheap)
  participant router as router.ts

  user->>participant: "drive agent uhh add like a login thing idk maybe also tests"
  participant->>optimizer: rawPrompt
  optimizer->>model: optimize(rawPrompt)
  model-->>optimizer: "Add login page with session auth and unit tests for auth flow"
  optimizer->>participant: OptimizeResult{optimized, original, approved:false}
  participant->>user: stream.markdown("**Optimized prompt:**\n> Add login page...")
  participant->>user: stream.button("✓ Use this") + stream.button("✗ Use original")
  user->>participant: clicks "✓ Use this"
  participant->>router: route(optimized, driveSubMode)
```

Config: `cursorDrive.promptOptimizer.enabled` (default `true`), `cursorDrive.promptOptimizer.autoApprove` (default `false`).

Voice-specific: when prompt contains filler words ("uhh", "like", "idk", "maybe", "kinda") — **always** optimize even if `autoApprove: false`.

### Feature 2: Cost-Aware Model Routing

Don't use the same expensive model for everything. Use a 3-tier system:

- **Tier 1 (routing)**: cheapest available (`gpt-4o-mini` / `claude-haiku`) — activation word detection, route decision, prompt optimization
- **Tier 2 (planning)**: mid-tier (`gpt-4o` / `claude-sonnet`) — plan mode clarification and artifact generation
- **Tier 3 (execution)**: user's selected model — only when actually executing

```mermaid
flowchart LR
  prompt["Prompt"] --> tier1["Tier 1: Route\ngpt-4o-mini"]
  tier1 -->|"mode=plan"| tier2["Tier 2: Plan\ngpt-4o"]
  tier1 -->|"mode=run"| tier3["Tier 3: Execute\nUser model"]
  tier1 -->|"mode=direct"| tier3
  tier2 -->|"artifact approved"| tier3
```

Implementation: `CostAwareModelSelector` reads from `request.model` (user's selected model) but overrides it for routing/planning tiers. Uses `vscode.lm.selectChatModels()` to pick the cheapest available.

### Feature 3: Filler Word Cleaner (voice-first UX)

Regex + heuristic pass before the optimizer runs. Strips common voice artifacts from transcribed speech:
- Filler words: "uhh", "umm", "like", "you know", "kinda", "sorta", "maybe", "I don't know"
- Repetitions: "can you can you" → "can you"
- Trailing uncertainty markers: "...right?" / "...or whatever"

This runs **client-side in the extension** (no API call needed), so zero cost.

### Feature 4: Drive Mode Persona Hardening

Update system prompts across all sub-modes to encode the pair-programmer persona:
- **Leads but is easily steered**: always ends responses with a clear recommendation + explicit "Or tell me to change course"
- **Cost-aware**: in agent mode, explicitly states "I'll use the cheapest model for this step" when downtiering
- **Approval before large actions**: in agent mode, before proposing multi-file changes, asks "This affects X files — proceed?"

---

## Documentation to Produce

### Docs to write:
- `extension/README.md` (full rewrite — architecture, features, voice flow, config reference)
- `docs/design/cursor-drive-walkthrough.md` (full code walkthrough for every module)
- `docs/design/prompt-optimizer-design.md` (design doc for the new feature)
- `docs/design/model-cost-tiers.md` (model routing rationale)

### Architecture diagrams to embed:
- Full system (Discord + Cursor transports, shared core) — in README
- Voice activation flow (activation word → sub-mode → optimizer → model) — in walkthrough
- Data flow for a full "drive agent add login page" session — in walkthrough
- Module dependency graph — in walkthrough

---

## Execution Plan (Sub-Agent Waves)

### Wave 0: Pre-work (main agent, direct writes)
- Add `extension/src/promptOptimizer.ts` (new module)
- Add `extension/src/modelSelector.ts` (new module)
- Add `extension/src/fillerCleaner.ts` (new module)
- Update `extension/src/participant.ts` to use all three

### Wave 1: Documentation (parallel sub-agents)
- Agent A: Write `extension/README.md` — full architecture + usage + config reference
- Agent B: Write `docs/design/cursor-drive-walkthrough.md` — module-by-module code walkthrough
- Agent C: Write `docs/design/prompt-optimizer-design.md` + `docs/design/model-cost-tiers.md`

### Wave 2: Publishing (main agent + verification)
- Add `ovsx` to devDependencies
- Update `.vscodeignore` and add `LICENSE` file
- `npm run compile && vsce package && ovsx publish`
- Create `CHANGELOG.md`
- GitHub Release instructions

---

## Anysphere Job Application Note

Their process: email `hiring@anysphere.inc` with resume + short note about a project you're proud of. This extension demonstrates:
- **Deep Cursor/VS Code internals knowledge** (Chat Participant API, LanguageModel API, StatusBar, WorkspaceState)
- **AI orchestration architecture** (routing tiers, planning artifacts, session lifecycle)
- **Voice-first UX thinking** (activation words, filler cleaning, prompt optimization approval flow)
- **Cost awareness** (3-tier model selection built into the architecture)
- **Real product thinking** (easily steered pair programmer persona, privacy-strict defaults)

The `extension/README.md` we write here IS the project description they'd read.
