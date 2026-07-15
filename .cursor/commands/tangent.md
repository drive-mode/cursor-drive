---
name: tangent
description: Spawn a parallel Drive operator for a side task without losing the current thread.
---

# /tangent

Spawn a new parallel operator to handle the specified task.

```
/tangent <task description>
```

Example: `/tangent explore Clerk auth integration options`

When the Cursor Drive extension (VSIX) is running, the Agent Screen updates with the new operator. Without the extension, treat this as a request to start a parallel investigation in chat.
