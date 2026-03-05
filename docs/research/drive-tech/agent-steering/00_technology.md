# Agent Steering — Technology Landscape

**Prepared:** February 2026
**Topic:** Agent steering — policies, guardrails, control planes, and safety gates for LLM-powered coding agents.

---

## What Agent Steering Is

Agent steering is the practice of constraining, directing, and monitoring autonomous AI agents so they operate within defined safety and policy boundaries. In coding-agent systems like Cursor Drive, steering covers four concerns:

1. **Permission enforcement** — which tools and resources an agent may access.
2. **Content guardrails** — blocking or transforming unsafe, off-topic, or injection-laden prompts and responses.
3. **Policy governance** — declarative rules that map actions to allow/warn/block decisions.
4. **Runtime monitoring** — continuous observation of agent behavior during execution, with graduated intervention when drift is detected.

The field has matured rapidly since 2024. Early approaches hard-coded rules in application logic; the current generation favours programmable, declarative policy definitions that can be updated without redeploying the host system.

---

## Framework Landscape

### NVIDIA NeMo Guardrails

**What it is.** An open-source toolkit (Python, Apache 2.0) for adding programmable guardrails to LLM applications. Uses a domain-specific language called **Colang** to define conversational rails — sequences of expected and forbidden interaction patterns.

**Key capabilities:**

- **Colang rail definitions** — human-readable rules that intercept prompts and responses at configurable pipeline stages (input rails, output rails, dialog rails, retrieval rails).
- **Pipeline-stage architecture** — guardrails execute as ordered stages in a processing pipeline, each stage receiving the output of the previous one.
- **Programmable policies** — rails are configuration, not code. Adding a new policy means adding a `.co` file, not modifying application logic.
- **Action chaining** — rails can call external actions (API checks, database lookups) as part of their evaluation.

**Maturity:** Established. Production deployments at enterprise scale. Active community, regular releases, growing Colang 2.0 ecosystem.

**Relevance to Drive:** Validates the pipeline-stage guardrail pattern that Drive already implements in `pipeline.ts`. Colang's declarative approach is a reference for Drive's future YAML-based policy configuration.

### Guardrails AI

**What it is.** An open-source Python framework focused on structured output validation and safety checking for LLM outputs. Provides a library of pre-built "validators" (content safety, PII detection, toxicity, factual consistency) that can be composed into guardrail pipelines.

**Key capabilities:**

- **Validator library** — 50+ pre-built validators for common safety and quality checks.
- **Guard class** — wraps an LLM call with input/output validators; retry logic on validation failure.
- **Structured output enforcement** — validates that LLM responses conform to expected schemas (JSON, XML, RAIL spec).
- **Hub ecosystem** — community-contributed validators published to Guardrails Hub.

**Maturity:** Established. Strong adoption for output validation use cases. Less suited to real-time conversational guardrails compared to NeMo.

**Relevance to Drive:** The validator composition pattern informs how Drive could chain multiple safety checks (injection stripping, content policy, permission verification) without tight coupling.

### Constitutional AI / Classifier-Based Approaches

**What it is.** A paradigm originated by Anthropic where the model critiques its own outputs against a set of principles ("constitution"), then revises them. Extended by classifier-based approaches where lightweight models score outputs for safety before they reach the user.

**Key capabilities:**

- **Self-critique → revision loop** — the model generates a response, evaluates it against principles, and rewrites if necessary. No external rules engine required.
- **Classifier guardrails** — small, fast classifier models (often fine-tuned) evaluate safety inline. Reported **0.38% false-refusal rate** in production deployments.
- **Principle-driven** — policies are expressed as natural-language principles rather than regex or structured rules.

**Maturity:** Established. Core technique in Claude, GPT-4, and other frontier models. Classifier approaches are production-proven at scale.

**Relevance to Drive:** The low false-refusal rate is a benchmark for Drive's approval gates. The self-critique pattern could enhance Drive's prompt optimizer stage for safety-sensitive operations.

### MI9: Runtime Governance

**What it is.** A research framework for runtime governance of autonomous agents. Introduces a **finite state machine (FSM)** that models agent execution states and transitions, with governance rules attached to each transition.

**Key capabilities:**

- **Runtime governance FSM** — models agent lifecycle as states (idle, planning, executing, reviewing, escalating) with policy-governed transitions.
- **Drift detection** — monitors agent behavior against expected patterns; flags statistical deviation from baseline execution profiles.
- **Graduated containment** — responses escalate proportionally: log → warn → throttle → pause → terminate. No binary allow/block.
- **Execution trace monitoring** — records and analyses the sequence of actions an agent takes, enabling post-hoc audit and real-time anomaly detection.

**Maturity:** Research / early adoption. Concepts are sound and validated in controlled experiments. Not yet widely deployed in production coding-agent systems.

**Relevance to Drive:** MI9's graduated containment model is directly applicable to Drive's operator hierarchy. Currently, Drive only has binary block/warn decisions in `approvalGates.ts`. Graduated responses (log → warn → throttle → pause → dismiss) would align with the operator lifecycle states already defined in `operatorRegistry.ts`.

### AgentGuardian

**What it is.** A framework for context-aware access control in multi-agent systems. Extends traditional ACLs with awareness of agent context — what the agent is working on, which tools it has called, and what its execution history looks like.

**Key capabilities:**

- **Context-aware ACL** — permissions change based on runtime context (current task, recent actions, accumulated risk score), not just static role assignment.
- **Execution trace monitoring** — tracks the full sequence of tool calls an agent makes; policies can reference trace patterns (e.g., "block if agent has called `terminalExecute` more than N times in M seconds").
- **Dynamic permission adjustment** — permissions can be escalated or restricted mid-session based on observed behavior.

**Maturity:** Research / early adoption. Prototype implementations demonstrate the concept; production-scale validation is limited.

**Relevance to Drive:** Drive's `toolAllowlist.ts` enforces static permission presets. AgentGuardian's context-aware approach suggests an evolution where an operator's effective permissions could narrow if its behavior deviates from expected patterns — e.g., an operator that starts issuing rapid terminal commands could have `terminalExecute` temporarily revoked.

### MiniScope

**What it is.** A lightweight framework for automatically reconstructing and enforcing permission hierarchies in agent systems, based on observed behavior rather than manually configured ACLs.

**Key capabilities:**

- **Auto-reconstruct permission hierarchies** — analyses agent execution traces to infer the minimum set of permissions each agent actually needs.
- **Least-privilege enforcement** — automatically tightens permissions to match observed usage, with **1–6% runtime overhead**.
- **Permission drift detection** — flags when an agent requests capabilities outside its inferred scope.

**Maturity:** Research. Demonstrated in controlled experiments with low overhead. Not yet production-deployed.

**Relevance to Drive:** MiniScope's approach validates Drive's existing "children default to readonly" policy and suggests an automated path: instead of manually configuring presets, the system could infer optimal presets from execution history.

---

## Emerging Patterns

Four architectural patterns recur across the frameworks surveyed:

### 1. Pipeline-Stage Guardrails

Guardrails execute as ordered stages in a processing pipeline. Each stage has a single responsibility (input validation, content filtering, permission checking, output validation) and passes its result to the next stage. NeMo Guardrails pioneered this with its rail pipeline; Drive implements it in `pipeline.ts` (filler-clean → sanitize → approval-gate → route → model-select).

**Why it works:** Composable, testable, easy to add/remove stages. Each stage can be developed and tested in isolation.

### 2. Programmable Policies

Policies are expressed as declarative configuration (Colang files, YAML, JSON schemas) rather than hard-coded application logic. This enables non-developers to author and audit policies, and allows policies to be versioned, reviewed, and deployed independently of the application.

**Industry trend:** Moving from regex/code-based rules toward structured policy definitions. NeMo uses Colang; Guardrails AI uses RAIL spec; MI9 uses FSM transition rules.

### 3. Runtime Governance

Rather than only checking inputs and outputs, runtime governance continuously monitors agent behavior during execution. This includes tracking tool call sequences, measuring execution time, detecting behavioral drift, and intervening proactively.

**Gap in current tooling:** Most frameworks focus on input/output guardrails. Runtime governance (MI9, AgentGuardian) is still research-stage. This represents the next maturity step.

### 4. Least-Privilege and Permission Cascades

Agents receive the minimum permissions needed for their task. In hierarchical systems, child agents inherit at most the permissions of their parent. MiniScope automates this with trace analysis; Drive implements it manually via `operatorRegistry.ts` spawn-time cascade.

**Why it matters for coding agents:** A coding agent with unrestricted terminal access is a significant risk. Least-privilege ensures that delegation (lead → worker) does not accidentally escalate capabilities.

---

## Maturity Assessment

| Framework / Pattern | Maturity | Production-Ready | Drive Alignment |
|---|---|---|---|
| NeMo Guardrails | Established | Yes | High — validates pipeline-stage pattern |
| Guardrails AI | Established | Yes (output validation) | Medium — validator composition pattern |
| Constitutional AI / Classifiers | Established | Yes | Medium — benchmark for false-refusal rates |
| MI9 (runtime governance) | Research | No | High — addresses Drive's main gap |
| AgentGuardian (context-aware ACL) | Research | No | High — evolution of toolAllowlist |
| MiniScope (auto least-privilege) | Research | No | Medium — validates existing cascade design |
| Pipeline-stage pattern | Established | Yes | Already implemented |
| Programmable policies | Established | Partially | Gap — Drive uses code-based config |
| Runtime governance pattern | Emerging | Not yet | Gap — Drive has no continuous monitoring |
| Least-privilege cascade | Established | Yes | Already implemented |

**Summary:** The industry validates Drive's existing pipeline-stage and least-privilege patterns. The primary gaps are runtime governance (no continuous monitoring during operator execution) and programmable policies (policies are RegExp arrays in code and VS Code settings, not declarative config files).
