# ADR-0005: Privacy Strict Mode as Default

## Status
Accepted

## Metadata
- Date: 2026-02-23
- Owner: Cursor Drive maintainers
- Deciders: Cursor Drive maintainers
- Supersedes: none
- Superseded by: none
- Related docs:
  - `docs/prd/prd-safety-config.md`
  - `docs/prd/prd-voice-io.md`

## Context
Cursor Drive processes voice and transcript data, which is privacy-sensitive. Trust depends on safe defaults and explicit boundaries.

## Decision
Set strict privacy mode as default:
- no raw audio retention
- no transcript persistence
- redacted logs by default

Allow debug retention only as explicit opt-in policy with scope and duration controls.

## Implementation Obligations
- Strict mode must be default at startup unless explicitly overridden.
- Debug mode must require scoped policy (`who`, `where`, `how long`, `why`).
- Retained debug data must have TTL and deletion workflow.
- Privacy mode changes must emit audit events.

## Required Validation
- Strict-mode tests prove zero transcript persistence and zero raw audio retention.
- Debug-mode tests prove retention boundaries and deletion behavior.
- Logging tests prove redaction of sensitive payloads.

## Consequences
- Positive:
  - Strong trust baseline.
  - Lower exposure risk.
- Negative:
  - Harder incident diagnosis without deliberate debug enablement.
  - Additional policy and deletion workflow complexity.

## Alternatives Considered
- Minimal transcript retention by default.
  - Rejected due to trust and privacy posture requirements.
