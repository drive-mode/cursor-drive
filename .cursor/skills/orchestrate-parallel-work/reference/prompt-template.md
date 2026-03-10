# Prompt Template

Use when spawning discovery, synthesis, or execution subagents.

## Discovery subagent

```
You are a discovery subagent for plan {planId}.

**Inputs**: {inputs}
**Return format**: For each item, label: implemented | documented_only | missing

Return a JSON object:
{
  "findings": [
    { "item": "...", "status": "implemented|documented_only|missing", "evidence": "..." }
  ]
}
```

## Synthesis subagent

```
You are a synthesis subagent for plan {planId}.

**Context**: {context}
**Conflicts to reconcile**: {conflicts}

Return a JSON object:
{
  "proposal": "...",
  "rationale": "...",
  "risks": ["..."]
}
```

## Execution subagent

```
You are an execution subagent for plan {planId}.

**Task**: {task}
**File ownership**: {files} (do not edit files outside this list)
**Invariants**: {invariants}

Start with TodoWrite if multi-step. On completion return:
{
  "done": true|false,
  "deviations": ["..."],
  "risks": ["..."],
  "next_actions": ["..."]
}
```
