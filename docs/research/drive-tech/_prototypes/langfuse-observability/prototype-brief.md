# Prototype Brief: Langfuse Operator Observability

## Hypothesis

Langfuse (self-hosted) can provide meaningful observability into Drive operator behavior — model call tracing, cost tracking, and response quality measurement — with <100ms overhead per traced call and full compliance with ADR-0005 (privacy-strict).

## Success Criteria (measurable)

1. An `src/observability.ts` module wraps `modelSelector.ts` / `modelUtils.ts` calls with tracing spans.
2. Each operator's model calls are traced with: prompt (redacted), response summary, model tier, latency, token count.
3. Traces are exported to a local Langfuse instance (Docker) with <100ms overhead per call.
4. No raw prompts or responses leave the local machine (redaction applied before export).
5. A Langfuse dashboard shows per-operator cost breakdown and latency distribution.
6. Tracing can be disabled entirely via `cursorDrive.observability.enabled` (default: `false`).

## Minimal Implementation Steps

1. Add `langfuse-node` as an optional dependency (lazy-loaded when enabled).
2. Create `src/observability.ts` with `traceModelCall(operatorId, tier, prompt, response)`.
3. Apply prompt/response redaction (strip secrets, truncate to summary) before trace export.
4. Wrap `selectTierModel()` in `modelUtils.ts` with tracing.
5. Provide a `docker-compose.observability.yml` for local Langfuse (Postgres + Langfuse server).
6. Gate behind `cursorDrive.observability.enabled` config flag.

## Instrumentation / Evals

- Measure tracing overhead (P50, P95 latency added per model call).
- Verify redaction completeness: no raw prompts in Langfuse traces.
- Measure Langfuse Docker resource consumption (CPU, memory, disk).
- Test with 100+ operator model calls to verify stability.

## Exit Criteria

| Outcome | Criteria | Next step |
|---------|----------|-----------|
| **Adopt** | Overhead <100ms, redaction verified, dashboard useful | Ship as opt-in observability layer |
| **Reject** | Overhead >200ms or redaction gaps | Explore lighter alternatives (custom trace file) |
| **Iterate** | Partial success | Address specific failures, re-prototype |

## References

- `docs/research/drive-tech/other-relevant-tech/02_implementation.md` — Langfuse implementation
- `docs/research/drive-tech/_synthesis/05_security-ops-review.md` — privacy requirements
- ADR-0005: Privacy-Strict Default
- Langfuse docs: https://langfuse.com/docs/tracing
