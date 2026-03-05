# Drive Mode User Journey

## Overview

**Drive mode** — voice-first collaboration with an AI pair-programming driver that listens patiently, asks clarifying questions, and drives execution while respecting developer feedback. Built on **Cursor primitives** (Agent, Composer, Chat, @codebase, Rules, MCP, mic, model selector).

---

## 1. Installation & Onboarding

### 1.1 Install Extension

- User installs **Cursor Drive** extension.
- Extension opens a **first-run guide** that walks through settings.

### 1.2 Settings Guide

| Setting | Purpose |
|--------|---------|
| **Voice mode** | Enable voice input (on/off). |
| **Drive mode** | Enable continuous pair-programming driver mode (on/off). |
| **Activation phrase** | Phrase that activates Drive (user-configurable, e.g. "hey drive", "cursor"). |
| **Submit phrase** | Phrase that submits the current prompt (user-configurable, e.g. "go", "execute"). |
| **Audio output** | TTS for Drive responses (on/off). |

Step-by-step guide with examples.

---

## 2. Mic Interaction: Voice Mode Selection

See [docs/reference/config-schema.md](../../reference/config-schema.md) for all voice settings.

---

## 3. Drive Mode Activation

User activates Drive mode by:
1. Pressing `Ctrl+Shift+D` — toggles Drive mode on/off
2. Clicking the status bar item — opens QuickPick to select mode
3. Saying the activation phrase ("hey drive" by default)

When Drive is active, the `beforeSubmitPrompt` hook intercepts prompts. Status bar shows: `Drive > Agent | Alpha`.

---

## 4. Voice Input Flow

```
User speaks
  → Cursor STT (hold-to-speak mic)
  → Raw transcription: "uhh like maybe refactor the auth module"
  → fillerCleaner: "Refactor the auth module"
  → promptOptimizer (if dictation detected): "Refactor auth module: extract AuthService class"
  → User approves in QuickPick
  → Router: subMode=agent → RouteMode=run
  → Main model call with Drive persona
  → Response formatted to configured verbosity
  → TTS speaks summary (if enabled)
```

---

## 5. Multi-Agent Flow

```
User: "tangent — explore Clerk integration in parallel"

1. Drive detects "tangent" keyword
2. Spawns Agent Beta: task="explore Clerk integration"
3. Status bar: Drive > Agent | Alpha  (Beta in background)
4. Alpha continues current task

Beta completes:
5. CommsAgent notifies: "Beta finished Clerk research"
6. User: "/switch Beta"
7. Status bar: Drive > Agent | Beta
8. User: "/merge Beta into Alpha"
9. Alpha receives Beta's findings
```

---

## 6. Version Control Integration (Future)

Drive tracks which files each agent touches. The share-screen shows:
- Files read/written per agent
- Key decisions made
- Summary ready to commit as a change description

---

## 7. Interface Principles

From [Drive Mode Analysis & UX](drive-mode-analysis-and-ux.md):

1. **Blend into Cursor** — use existing mode selector, chat panel, mic icon
2. **Easy to identify** — visible in mode selector, clear description
3. **Not flashy** — subtle indicators, quiet by default

---

## Product Naming

- **Product**: Cursor Drive
- **Mode**: Drive mode
- **Entry**: beforeSubmitPrompt hook when Drive active
- **Tagline**: "Your AI driver. Voice-first, patient, version-aware."

---

## References

- [Cursor Drive: Extension Design](../architecture/cursor-native-system-design.md)
- [Drive Mode Analysis & UX](drive-mode-analysis-and-ux.md) — Mode vs mic dropdown; blend-in principles
- [Cursor Drive Feature Plan](../../../.cursor/plans/cursor-drive.plan.md) — Prioritized actions
- [Cursor-Aligned Naming](../naming/cursor-aligned-naming.md)
- [ADR-0001: Cursor-Native Ingress Strategy](../../architecture/adr/ADR-0001-cursor-native-ingress-strategy.md)
