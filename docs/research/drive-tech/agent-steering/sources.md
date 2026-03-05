# Agent Steering — Sources

References and source material for the agent steering research.

---

## Frameworks and Tools

### NVIDIA NeMo Guardrails

- **Repository:** https://github.com/NVIDIA/NeMo-Guardrails
- **Documentation:** https://docs.nvidia.com/nemo/guardrails/
- **Colang 2.0 language spec:** https://docs.nvidia.com/nemo/guardrails/colang-2/
- **License:** Apache 2.0
- **Key paper:** Rebedea et al., "NeMo Guardrails: A Toolkit for Controllable and Safe LLM Applications with Programmable Rails" (2023). arXiv:2310.10501.

### Guardrails AI

- **Repository:** https://github.com/guardrails-ai/guardrails
- **Documentation:** https://www.guardrailsai.com/docs
- **Guardrails Hub (validator library):** https://hub.guardrailsai.com/
- **License:** Apache 2.0

### Constitutional AI

- **Key paper:** Bai et al., "Constitutional AI: Harmlessness from AI Feedback" (2022). arXiv:2212.08073.
- **Anthropic blog:** https://www.anthropic.com/research/constitutional-ai-harmlessness-from-ai-feedback
- **False-refusal rate benchmark (0.38%):** Referenced in Anthropic system prompt safety evaluations (2024–2025).

---

## Research Frameworks

### MI9: Runtime Governance

- **Key concept:** Finite state machine (FSM) for agent runtime governance with drift detection and graduated containment.
- **Pattern:** Agent states (idle → planning → executing → reviewing → escalating) with policy-governed transitions.
- **Reference:** Runtime governance patterns for autonomous agents, agent safety research literature (2024–2025).

### AgentGuardian

- **Key concept:** Context-aware access control lists (ACLs) for multi-agent systems. Extends traditional ACLs with execution trace awareness.
- **Pattern:** Dynamic permission adjustment based on observed agent behavior — tool call sequences, frequency, and task scope adherence.
- **Reference:** Multi-agent security and permission management research (2024–2025).

### MiniScope

- **Key concept:** Automatic reconstruction of minimal permission hierarchies from observed agent behavior.
- **Key metric:** 1–6% runtime overhead for permission hierarchy inference.
- **Pattern:** Least-privilege enforcement via execution trace analysis, permission drift detection.
- **Reference:** Agent permission minimization research (2024–2025).

---

## Industry Standards and Patterns

### OWASP LLM Top 10

- **Website:** https://owasp.org/www-project-top-10-for-large-language-model-applications/
- **Relevance:** Prompt injection (LLM01) directly addressed by `sanitizer.ts`. Insecure output handling (LLM02) addressed by `checkResponse()` in `approvalGates.ts`.

### Garak (LLM vulnerability scanner)

- **Repository:** https://github.com/NVIDIA/garak
- **Documentation:** https://docs.garak.ai/
- **Relevance:** Adversarial testing tool for validating prompt injection defenses. Recommended for testing Drive's sanitizer and approval gate patterns.

---

## Drive Internal References

### Source Modules

| Module | Path | Role in agent steering |
|---|---|---|
| Approval gates | `src/approvalGates.ts` | Block/warn safety gates with regex pattern matching |
| Tool allowlist | `src/toolAllowlist.ts` | Permission preset enforcement (readonly/standard/full) |
| Sanitizer | `src/sanitizer.ts` | Injection pattern stripping and prompt truncation |
| Pipeline | `src/pipeline.ts` | Multi-stage prompt processing orchestration |
| Operator registry | `src/operatorRegistry.ts` | Operator lifecycle, permission cascade, event system |

### Architecture Decision Records

| ADR | Path | Relevance |
|---|---|---|
| ADR-0005: Privacy Strict Default | `docs/architecture/adr/ADR-0005-privacy-strict-default.md` | Privacy-by-default policy; steering must align |
| ADR-0010: Tiered Model Routing | `docs/architecture/adr/ADR-0010-tiered-model-routing.md` | Approval gates at Tier 0; potential Tier 1 classifier for ambiguous cases |
| ADR-0014: Agent Orchestration Strategy | `docs/architecture/adr/ADR-0014-agent-orchestration-strategy.md` | Multi-agent architecture; steering must scale with agent count |

### Test Suites

| Test | Path | Coverage |
|---|---|---|
| Approval gates tests | `tests/src/approvalGates.ts` | Block/warn pattern matching, gate result evaluation |
| Tool allowlist tests | `tests/src/toolAllowlist.ts` | Permission preset enforcement, operator-aware checks |
| Sanitizer tests | `tests/src/sanitizer.ts` | Injection stripping, truncation |

### Workspace Rules

| Rule | Path | Relevance |
|---|---|---|
| Operator hierarchy | `.cursor/rules/operator-hierarchy.mdc` | Permission presets, cascade rules |
| Tiered model routing | `.cursor/rules/tiered-model-routing.mdc` | Tier assignment for steering operations |
| Policy pack | `.cursor/rules/policy-pack.mdc` | Privacy defaults, approval gate requirements, testing expectations |
