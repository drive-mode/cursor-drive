# Agent Steering — Risks and Mitigations

**Prepared:** February 2026

---

## Risk 1: Over-Engineering Guardrails

### Description

Building a comprehensive steering engine (full FSM, ML-based anomaly detection, rich audit trail) that exceeds Drive's current scale. Drive supports 3–10 concurrent operators today. A governance system designed for hundreds of agents would add complexity without proportional value, slow down iteration, and increase the surface area for bugs.

### Likelihood: Medium

The temptation to adopt the full MI9/AgentGuardian pattern is real, especially given the research literature's emphasis on comprehensive runtime governance. The clean refactor (Option B) already trends toward this.

### Impact: Medium

Over-engineered steering would:
- Increase maintenance burden for every pipeline change.
- Add latency to operator actions from unnecessary monitoring.
- Distract from higher-impact features (voice pipeline, Agent Screen improvements).

### Mitigations

1. **Phase-gated rollout.** Each phase is independently useful and independently revertible. Do not start Phase 3 (runtime monitoring) until Phase 1 (YAML policies) is in production and real usage patterns are observed.
2. **Option A first.** The swap-first approach (Option A) extends existing modules rather than introducing a new architectural layer. Only refactor to Option B if three or more modules need coordinated policy access.
3. **Complexity budget.** Cap new steering code at ~300 lines for the first iteration. If the implementation exceeds this, re-scope.
4. **Metric-driven advancement.** Require quantitative evidence (operator count, drift incidents, user complaints about false positives) before advancing to the next phase.

---

## Risk 2: False-Positive Frustration

### Description

Guardrails that are too aggressive block legitimate operations, interrupting the user's flow. In a voice-first system where momentum matters, modal dialogs for safe operations are especially disruptive. The current regex-based pattern matching is inherently imprecise — `force push` matches in natural-language discussion about git, not just actual git commands.

### Likelihood: Medium-High

Regex pattern matching has a structural false-positive problem. Custom user patterns (added via VS Code settings or YAML policies) increase the risk, since users may write overly broad patterns without testing.

### Impact: High

False positives directly degrade user experience:
- Users learn to dismiss warnings reflexively, defeating the purpose of the safety gate.
- Users disable approval gates entirely (`cursorDrive.approvalGates.enabled: false`), removing all safety protections.
- Trust in the steering system erodes.

### Mitigations

1. **Conservative defaults.** Default block patterns should only match high-confidence destructive commands (current defaults are reasonable: `rm -rf`, `format c:`, etc.). Warn patterns should favour precision over recall.
2. **Graduated response.** The `log` action level (Phase 2) allows the system to record low-confidence matches without interrupting the user. This generates training data for refining patterns.
3. **Context-aware matching.** Currently, `checkPrompt()` scans the full prompt text. Improve precision by:
   - Only matching warn patterns in code blocks and terminal command contexts, not in natural language discussion.
   - `checkResponse()` already extracts code blocks for targeted scanning — apply the same principle to prompt scanning.
4. **Pattern testing toolset.** Ship a command (`cursorDrive.testPolicy`) that lets users test their custom patterns against example prompts before deploying.
5. **False-positive telemetry.** Track how often users click "Proceed" on warn dialogs. A high proceed rate for a specific pattern indicates a false-positive problem — surface this as a policy refinement suggestion.
6. **Benchmark target.** Aim for <1% false-positive rate on default patterns, measured against a corpus of real coding prompts. The Constitutional AI classifier benchmark of 0.38% is the aspirational target.

---

## Risk 3: Policy Configuration Complexity

### Description

Introducing a YAML policy file adds a new configuration surface. Users must understand:
- The YAML format and schema.
- Precedence rules (YAML vs. VS Code settings vs. hard-coded defaults).
- How patterns, presets, and escalation rules interact.

For individual users who currently configure block patterns via a single VS Code setting array, this is a complexity increase.

### Likelihood: Low-Medium

The YAML file is opt-in. Users who don't create it get the current behavior. Complexity primarily affects teams adopting structured policy management.

### Impact: Medium

Misconfigured policies could:
- Fail silently (malformed YAML loaded without error → no patterns active).
- Block unexpectedly (overly broad patterns in YAML that the user didn't test).
- Confuse precedence (user expects VS Code setting to override YAML but the merge logic works differently).

### Mitigations

1. **VS Code settings remain first-class.** The YAML file is an addition, not a replacement. Users who prefer settings UI are unaffected.
2. **JSON Schema validation.** Ship `drive-policies.schema.json` alongside the format definition. Editors with YAML language support (including Cursor) will provide autocompletion and validation.
3. **Clear precedence documentation.** Document and test the merge order: hard-coded defaults → YAML file → VS Code settings. VS Code settings always win (they are the user's explicit local override).
4. **Startup validation.** On activation, validate the YAML file against the schema. Surface parse errors as a diagnostic warning, not a silent failure. Fall back to defaults on parse error.
5. **Example template.** Ship `drive-policies.example.yaml` with inline comments explaining every field, realistic defaults, and common customization patterns.

---

## Risk 4: Runtime Monitoring Overhead

### Description

Continuous monitoring of operator behavior adds processing to every operator event. If the monitor is too heavy, it could:
- Add perceptible latency to tool call execution.
- Increase CPU usage, affecting VS Code responsiveness.
- Introduce garbage collection pressure from frequent object allocations.

### Likelihood: Low

Drive's monitoring needs are simple: counters, thresholds, and time-window checks. This is orders of magnitude lighter than the ML-based anomaly detection in research frameworks. MiniScope demonstrated 1–6% overhead for full permission hierarchy reconstruction, which is a more expensive operation.

### Impact: Medium

If overhead is noticeable, users will disable monitoring — negating the safety benefit. In a code editor, any perceivable latency on keystrokes or commands is unacceptable.

### Mitigations

1. **Event-driven, not polling.** Monitor reacts to `operatorRegistry.events` emissions, not periodic polling. Zero cost when no operator events occur.
2. **O(1) per event.** Each event check is a counter increment + threshold comparison. No iteration over history, no pattern matching, no string processing.
3. **Bounded state.** Per-operator monitoring state is a fixed-size struct: `{ toolCallCount: number, lastCallTime: number, warnCount: number }`. No unbounded arrays or maps.
4. **Performance gate.** Phase 3 implementation must include a benchmark test: process 1000 simulated operator events in <50ms. If the benchmark fails, the monitor is too heavy.
5. **Disable switch.** Runtime monitoring is off by default in Phase 3 (enabled via YAML policy or VS Code setting). Users opt in only when they need multi-operator governance.

---

## Risk Summary

| Risk | Likelihood | Impact | Primary Mitigation |
|---|---|---|---|
| Over-engineering guardrails | Medium | Medium | Phase-gated rollout, complexity budget |
| False-positive frustration | Medium-High | High | Conservative defaults, graduated response, context-aware matching |
| Policy configuration complexity | Low-Medium | Medium | VS Code settings fallback, JSON Schema validation, example template |
| Runtime monitoring overhead | Low | Medium | Event-driven O(1) checks, performance gate, opt-in by default |

**Overall risk posture: Low.** The highest-impact risk (false-positive frustration) is mitigated by the graduated response model and conservative defaults. The highest-likelihood risk is also false positives, which is addressed by multiple complementary mitigations. The remaining risks are low-likelihood and mitigated by phase-gated rollout and opt-in activation.
