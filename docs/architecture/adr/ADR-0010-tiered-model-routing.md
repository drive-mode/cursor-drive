# ADR-0010: Tiered Model Routing

- Status: Accepted
- Context owner: Cursor Drive maintainers

---

## Context

Every LLM call in an agentic system has three costs: tokens consumed, latency added, and an opportunity cost paid for "cheap reasoning" that could have been deterministic. In Cursor Drive, agent workflows touch plan governance, prompt processing, response formatting, multi-agent orchestration, and dependency analysis. Without a systematic routing policy, all of these default to whatever model the user has active — expensive, slow, and unnecessary.

The core tension: some operations require semantic reasoning; most do not. Routing everything to the most capable model is wasteful. Routing everything to a cheap model produces errors on complex tasks.

---

## Decision

All LLM-touching operations in Cursor Drive are assigned to one of four tiers. The tier determines which model class is used. Escalation to a higher tier requires an explicit condition.

### Tier 0 — Zero cost (pure deterministic)

**Model:** None. Python/TypeScript logic only.  
**Latency:** <10ms  
**Token cost:** 0

Used when the operation can be solved by rules, regex, YAML parsing, hashing, or arithmetic.

Examples:
- Filler word detection and removal (`fillerCleaner.ts`)
- Plan state computation from todo lists (`plan-runner.py`)
- Structural snapshot diff and change classification (`plan-runner.py`)
- MD5 hash check for plan file changes (`plan-runner.py`)
- Mermaid diagram generation from parsed graph (`plan-runner.py`)
- Registry YAML sync (`plan-runner.py`)
- Approval gate regex pattern matching (`approvalGates.ts`)
- Tool allowlist capability lookup (`toolAllowlist.ts`)
- Route mode classification for unambiguous inputs (`router.ts`)

**Rule:** If a decision can be made without understanding natural language semantics, it belongs at Tier 0.

---

### Tier 1 — Routing / cheap extraction

**Model:** Smallest/fastest available (Haiku-class, flash-class, mini-class)  
**Latency:** ~500ms–1s  
**Token cost:** ~100–500 tokens per call  
**Config:** `DRIVE_TRIAGE_MODEL` env var or `routing` tier in `modelSelector.ts`

Used for structured extraction, classification, and yes/no decisions where the input is small and the output is a short structured value.

Examples:
- Dependency edge triage: "given this structural diff, did dep edges change?" (`dep-auditor.py`)
- Prompt optimization: "rewrite this prompt for clarity, preserving all intent" (`promptOptimizer.ts`)
- Response compression: "summarize this in 1–3 sentences, name files changed" (`responseFormatter.ts`)
- CommsAgent update batching: "summarize these background agent updates" (`commsAgent.ts`)
- Intent disambiguation: "is this prompt asking to plan or execute?" (future: `router.ts` fallback)

**Rule:** Input must be bounded (diff, not full file set). Output must be a short structured value. Never use Tier 1 for code generation or multi-file reasoning.

**Escalation condition:** If the Tier 1 call returns `confidence: "low"`, surface a hint to the user and do not act. Do not auto-escalate to Tier 3.

---

### Tier 2 — Standard execution

**Model:** User's configured model in Cursor (whatever they selected)  
**Latency:** varies  
**Token cost:** varies  
**Config:** `execution` tier in `modelSelector.ts` — uses `request.model` directly

Used for the actual implementation work the user asked for: code generation, multi-file edits, plan authoring, test writing.

This is the default tier for all Drive mode responses when no specific tier is indicated.

Examples:
- Drive agent main response to user prompts
- Code generation in agent/plan/direct/ask modes
- Writing plan content (TODOs, criteria, descriptions)
- Running multi-file refactors

---

### Tier 3 — Reasoning / explicit request

**Model:** Highest-capability available (Opus-class, o1-class)  
**Latency:** 3–30s  
**Token cost:** ~2,000–20,000 tokens per call  
**Config:** `reasoning` tier in `modelSelector.ts`

Used for complex semantic analysis that Tier 1 cannot handle reliably. Always user-initiated — never auto-triggered by automation.

Examples:
- `/plan-audit-deps` when Tier 1 returns low confidence (explicit user invocation)
- Architectural decision analysis ("what should depend on what, and why?")
- Complex plan splitting decisions across multiple subsystems
- Hidden dependency discovery across large plan sets

**Rule:** Never trigger Tier 3 from a hook or automatic process. It is always behind an explicit user action.

---

## The routing decision tree

```
Is the decision fully deterministic (regex/YAML/hash/arithmetic)?
  YES → Tier 0. Zero tokens.

Is the input small (<500 tokens) and the output a short structured value?
  YES → Tier 1. Cheap model. Cap input with diff/snapshot, not full files.
  If confidence=low: surface hint, do not act, do not auto-escalate.

Is this the main user request (code, planning, implementation)?
  YES → Tier 2. User's model. This is the default.

Is this complex semantic reasoning explicitly requested by the user?
  YES → Tier 3. Reasoning model. Always user-initiated.
```

---

## Context minimisation principle

At every tier, context must be minimised to what is strictly needed:

- **Tier 1 inputs:** Send only the structural diff or the specific field that changed. Never send full plan files. Use `.plan-state-snapshot.json` as the baseline — not the full plan content.
- **Tier 3 inputs:** Use dynamic context discovery — ask a Tier 1 model "which plan IDs are relevant to this question?" before loading plan content. Load only the returned IDs.
- **Never put generated artifacts in agent context:** `plan-master.diagram.md`, `registry.yaml`, and `plan-graph.yaml` are for humans and deterministic scripts. They must not be loaded into an agent context window as a matter of routine.

---

## Implementation map

| Module | Tier | Trigger condition |
|---|---|---|
| `fillerCleaner.ts` | 0 | Always |
| `approvalGates.ts` | 0 | On every prompt/response |
| `toolAllowlist.ts` | 0 | On every MCP tool call |
| `plan-runner.py` (hash check) | 0 | `beforeSubmitPrompt` |
| `plan-runner.py` (state sync) | 0 | On plan file change |
| `plan-runner.py` (diagram gen) | 0 | After any sync |
| `dep-auditor.py` (rule-based) | 0 | Structural change, no API key |
| `dep-auditor.py` (Haiku) | 1 | Structural change, API key present |
| `promptOptimizer.ts` | 1 | Before routing, when dictation detected |
| `responseFormatter.ts` | 1 | After main response, for compression |
| `commsAgent.ts` | 1 | When background agent completes |
| `router.ts` (future) | 1 | Ambiguous intent only |
| Drive main response | 2 | All user prompts |
| Plan authoring | 2 | `/write-plan`, `/plan-split` |
| `/plan-audit-deps` | 3 | Explicit user invocation |
| Dep analysis (Tier 1 low confidence) | 3 | User confirms escalation |

---

## Consequences

**Positive:**
- Routine governance (every agent stop) costs 0 tokens
- Dep triage on plan changes costs ~300 tokens (Tier 1) vs. ~5,000 tokens (Tier 2/3)
- Agent context window is never polluted with governance artifacts
- The escalation path is explicit and user-controlled

**Negative:**
- `dep-auditor.py` requires `ANTHROPIC_API_KEY` for Tier 1 model calls; falls back to rule-based when absent
- Tier 1 rule-based fallback cannot detect implicit semantic dependencies (only explicit `dependsOn` changes)
- Dynamic context discovery (Tier 3 path) requires two model round trips

**Neutral:**
- `DRIVE_TRIAGE_MODEL` env var allows model swap without code changes (e.g., when a newer Haiku ships)
- Tier 0 snapshot/diff infrastructure adds ~5KB to workspace (`.plan-state-snapshot.json`)

---

## References

- `src/modelSelector.ts` — TypeScript tier implementation with `ModelTier` type
- `.cursor/hooks/plan-runner.py` — Tier 0 plan governance runner
- `.cursor/hooks/dep-auditor.py` — Tier 1 dependency triage script
- `.cursor/rules/tiered-model-routing.mdc` — always-apply rule for agent sessions
- `.cursor/skills/plan-system-maintainer/SKILL.md` — plan authoring and sync workflow
