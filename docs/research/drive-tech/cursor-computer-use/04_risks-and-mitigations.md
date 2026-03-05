# Cursor Computer Use: Risks and Mitigations

**Prepared:** February 2026
**Scope:** Risks from integrating Cursor's computer use capabilities (Cloud Agents, screenshot MCP tools) with Drive.

---

## Risk register

### R1: Cursor API lock-in

| Field | Detail |
|---|---|
| **Severity** | High |
| **Likelihood** | High |
| **Impact** | Drive becomes dependent on Cursor-proprietary Cloud Agent infrastructure with no migration path. |

**Detail:** Cloud Agents have no public API, no open specification, and no alternative provider. If Cursor changes pricing, deprecates features, or pivots strategy, Drive's cloud execution capability would break with no fallback.

**Mitigations:**

1. **Abstraction layer.** Define a `CloudAgentClient` interface in Drive. All Cloud Agent interactions go through this interface. Swapping the implementation (e.g., to a self-hosted runner, GitHub Actions, or a future open standard) requires only a new implementation.

2. **Feature flag gating.** Ship all Cloud Agent features behind `cursorDrive.experimental.cloudDispatch`. Users opt in knowing the dependency. Disabling the flag degrades gracefully to local-only operators.

3. **Defer until API stabilizes.** Do not build against internal/undocumented APIs. Wait for a public, versioned API with deprecation guarantees.

4. **Monitor alternatives.** Track ACP (JetBrains/Zed), A2A protocol, and GitHub Agentic Workflows as potential alternative execution backends.

---

### R2: Cloud Agent execution cost

| Field | Detail |
|---|---|
| **Severity** | Medium |
| **Likelihood** | Medium |
| **Impact** | Uncontrolled cost accumulation when operators spawn Cloud Agents for tasks that could run locally. |

**Detail:** Each Cloud Agent consumes VM resources (compute, storage, network) billed to the user's Cursor subscription. Drive operators with `full` preset could spawn multiple Cloud Agents, each running for minutes. With 8 parallel agents, costs multiply.

**Mitigations:**

1. **Operator-level cost caps.** Add `maxCloudMinutes` to operator configuration. Enforce at dispatch time.

2. **Local-first routing.** Default to local execution. Only dispatch to cloud when the task requires it (e.g., long-running tests, multi-repo work, resource-intensive builds).

3. **Approval gate.** Add a `cloudDispatch` approval gate in `approvalGates.ts`. High-cost dispatches require user confirmation. Aligns with existing policy-pack gate pattern.

4. **Budget visibility.** Surface cumulative cloud execution time on the Agent Screen. Let users see cost impact in real time.

---

### R3: Screenshot tool reliability

| Field | Detail |
|---|---|
| **Severity** | Medium |
| **Likelihood** | Medium |
| **Impact** | False positives/negatives in visual verification lead to incorrect operator decisions. |

**Detail:** Screenshot-based verification is inherently fragile:
- Dynamic content (timestamps, animations, ads) causes false diffs.
- Anti-aliasing differences across platforms cause pixel-level noise.
- Loading states and race conditions mean screenshots may capture incomplete renders.
- Viewport size, DPI, and font rendering vary across environments.

**Mitigations:**

1. **Perceptual comparison, not pixel diff.** Use SSIM or perceptual hashing instead of exact pixel comparison. Set thresholds that tolerate anti-aliasing and minor rendering differences.

2. **Stabilization wait.** Before capturing, wait for network idle and DOM stability (no pending mutations for N ms). Community MCP tools like BrowserLoop support this.

3. **Region masking.** Exclude known-dynamic regions (timestamps, loading spinners, animated elements) from comparison.

4. **Human-in-the-loop for ambiguous results.** When the diff score is in the ambiguous range (neither clearly pass nor clearly fail), surface the screenshot to the user via Agent Screen rather than auto-deciding.

5. **Multiple captures.** Take 2–3 screenshots with short delays. Only flag a regression if the diff is consistent across captures (filters transient state).

---

### R4: Privacy — screen captures

| Field | Detail |
|---|---|
| **Severity** | Medium |
| **Likelihood** | Medium |
| **Impact** | Screenshots capture sensitive data (credentials, PII, proprietary code) and may be persisted, logged, or transmitted. |

**Detail:** Browser screenshots may capture:
- Login forms with pre-filled credentials.
- Database admin panels with production data.
- Internal dashboards with business-sensitive metrics.
- Error pages with stack traces containing secrets.

If these screenshots are stored in memory, logged, or transmitted to model providers, they become a data leak vector.

**Mitigations:**

1. **No persistence by default.** Screenshots are transient — held in memory for the duration of the operator's analysis, then discarded. Aligns with Drive's privacy-strict default (no raw audio retention, no transcript persistence).

2. **Redaction before model submission.** If screenshots are sent to a vision model for analysis, apply redaction to known sensitive regions (password fields, token displays). This is imperfect but reduces exposure.

3. **Consent gate.** First use of screenshot tools triggers a one-time user consent prompt: "Drive will capture browser screenshots for visual verification. Screenshots are not persisted. Continue?"

4. **Audit log.** Log the URL and timestamp of each screenshot capture (but not the image itself) to `agent_screen_activity`. Users can review what was captured.

5. **Scope restriction.** Screenshot tools only capture within the development browser context (localhost URLs, designated test environments). Block captures of external URLs by default. Allow-list via `cursorDrive.screenshotTools.allowedOrigins`.

---

### R5: Cloud Agent security — code execution in external VMs

| Field | Detail |
|---|---|
| **Severity** | Medium |
| **Likelihood** | Low |
| **Impact** | Proprietary code executes on Cursor-managed infrastructure. Supply chain or infrastructure compromise exposes source code. |

**Detail:** Cloud Agent VMs clone and execute the user's repository code. This means:
- Source code is present on Cursor's infrastructure.
- Build artifacts, test outputs, and intermediate files are generated on external VMs.
- Secrets in `.env` files or environment variables may be accessible to the agent process.

**Mitigations:**

1. **Trust boundary documentation.** Clearly document that Cloud Agents execute on Cursor infrastructure. Users who cannot accept this trust boundary should disable cloud dispatch.

2. **Secret filtering.** Do not pass local `.env` or workspace secrets to Cloud Agent VMs. Let the Cloud Agent use its own secret management (Cursor's Secrets feature).

3. **Read-only dispatch option.** Allow operators to dispatch with `readonly` preset to Cloud Agents — the agent can read and analyze but not write. Useful for code review and analysis tasks.

4. **Scope limitations.** Restrict which repositories and branches can be dispatched to Cloud Agents via configuration.

---

## Risk summary matrix

| ID | Risk | Severity | Likelihood | Mitigation quality | Residual risk |
|---|---|---|---|---|---|
| R1 | API lock-in | High | High | Good (abstraction + defer) | Medium |
| R2 | Execution cost | Medium | Medium | Good (caps + gates) | Low |
| R3 | Screenshot reliability | Medium | Medium | Moderate (heuristics) | Medium |
| R4 | Privacy (screenshots) | Medium | Medium | Good (no-persist + consent) | Low |
| R5 | Cloud security | Medium | Low | Moderate (trust boundary) | Low |

---

## Cross-references

- **R1 lock-in** relates to the DEFER recommendation in [03_decision.md](03_decision.md).
- **R2 cost** informs the `full`-preset-only gating for `cloudDispatch` in [02_implementation.md](02_implementation.md).
- **R4 privacy** aligns with Drive's privacy-strict default (policy-pack, ADR-0005).
- **R5 security** builds on Drive's existing operator permission model (`toolAllowlist.ts`).
