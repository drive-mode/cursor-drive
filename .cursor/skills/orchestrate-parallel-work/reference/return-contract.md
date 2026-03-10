# Return Contract

All subagents must return machine-readable JSON.

## Discovery

```json
{
  "findings": [
    {
      "item": "string",
      "status": "implemented | documented_only | missing",
      "evidence": "string"
    }
  ]
}
```

## Synthesis

```json
{
  "proposal": "string",
  "rationale": "string",
  "risks": ["string"]
}
```

## Execution handoff

```json
{
  "done": true,
  "deviations": ["string"],
  "risks": ["string"],
  "next_actions": ["string"]
}
```

## Verification

```json
{
  "passed": true,
  "checks": ["string"],
  "failures": ["string"]
}
```

## Orchestrator report

```json
{
  "delegated": ["string"],
  "changed": ["string"],
  "verification_status": "passed | failed | partial",
  "blockers": ["string"]
}
```
