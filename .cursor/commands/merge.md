---
name: merge
description: Merge a background operator's context into another, then deactivate the source.
---

# /merge

Combine the work of two parallel operators.

```
/merge <source operator> into <target operator>
```

Example: `/merge Beta into Alpha`

Requires the Cursor Drive extension for operator registry merge. Without it, summarize the source thread into the target conversation.
