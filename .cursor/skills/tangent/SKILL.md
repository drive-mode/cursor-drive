---
name: tangent
description: Spawn a parallel Drive operator to explore or work on a side task without losing the current conversation thread.
disable-model-invocation: true
---

Spawn a new parallel operator to handle the specified task.

## Usage

```
/tangent <task description>
```

## What this does

1. Calls `operator_spawn` via the Drive MCP server to create a new named operator (Beta, Gamma, etc.)
2. The new operator starts working on the specified task in the background
3. The current foreground operator (Alpha) continues with the original work
4. The new operator reports back via the Agent Screen and comms updates when it finishes

## Examples

- `/tangent research rate limiting patterns for our API`
- `/tangent write unit tests for the auth module while I refactor it`
- `/tangent check if there are any security issues in the payment flow`
- `/tangent look up the best way to implement WebSocket reconnection`

## Operator naming

New operators are assigned names from the default pool: Alpha, Beta, Gamma, Delta, Epsilon...
You can also name them: `/tangent call it Researcher — explore GraphQL vs REST for our use case`

## Switching focus

After spawning, use `/switch <name>` to bring a background operator to the foreground.
Use `/merge <source> into <target>` to combine their work.

## Notes

- Maximum concurrent operators is configurable via `cursorDrive.operators.maxConcurrent` (default: 3)
- Each operator has its own memory and task context
- Operators are isolated by default — they cannot see each other's context unless configured
