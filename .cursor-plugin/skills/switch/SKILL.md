---
name: switch
description: Switch the foreground Drive operator. The Agent Screen panel updates to show the switched operator's work.
disable-model-invocation: true
---

Switch the active foreground operator to the specified operator by name.

## Usage

```
/switch <operator name>
```

## What this does

1. Calls `operator_switch` via the Drive MCP server
2. The selected operator becomes the foreground operator
3. The previous foreground operator moves to background (continues working)
4. The Agent Screen panel title updates to show the new operator's name
5. Subsequent conversation messages go to the new foreground operator

## Examples

- `/switch Beta`
- `/switch Researcher`
- `/switch Alpha` — switch back to the original operator

## Listing operators

If you're not sure which operators are active, say "list operators" or use the `cursorDrive.operators` command (Drive > Manage Operators in the Command Palette).

## Notes

- You can also say "show me Beta" or "switch to Beta" in natural language — Drive detects this pattern
- The foreground operator is the one shown in the status bar: `Drive > Agent | Beta`
