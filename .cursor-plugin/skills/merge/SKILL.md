---
name: merge
description: Merge a background operator's context and findings into another operator, then deactivate the source.
disable-model-invocation: true
---

Combine the work of two parallel operators.

## Usage

```
/merge <source operator> into <target operator>
```

## What this does

1. Calls `operator_merge` via the Drive MCP server
2. The source operator's task description and memory are summarized and injected into the target operator's context
3. The source operator is deactivated (status: merged)
4. The target operator receives a context update: "Merged from [source]: [summary]"
5. The Agent Screen logs the merge event

## Examples

- `/merge Beta into Alpha` — bring Beta's research findings into Alpha's context
- `/merge Researcher into Implementer` — give the implementer access to the researcher's notes

## Use cases

- You sent one operator to research a problem while another implemented a solution
- You want to combine the research findings before the implementer proceeds
- A tangent produced findings that the main operator needs

## Notes

- After merging, the target operator has both its own context and a summary of the source's work
- The source operator is deactivated — to continue its work, spawn a new tangent
- Merging does not transfer file edits — only memory and task context are merged
