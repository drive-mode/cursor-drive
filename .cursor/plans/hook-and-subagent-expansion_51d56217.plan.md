---
name: hook-and-subagent-expansion
overview: Expand hook coverage with prompt optimization and pre/post tool hooks, while preserving existing validations and documenting the updated behavior.
todos: []
isProject: false
---

# Hook Coverage Expansion Plan

## Defaults Used
- Five hook examples = stop hook improvements, beforeSubmitPrompt optimization, beforeMCPExecution, afterMCPExecution, and shared pre/post tool scripts used for before/afterShellExecution.
- Prompt optimization targets = GPT-5.* family plus fast models using generic heuristics.

## Steps

- Review current hook setup and scripts to ensure we only extend, not replace:
  - [.cursor/hooks.json](.cursor/hooks.json)
  - [.cursor/hooks/validate-git-command.js](.cursor/hooks/validate-git-command.js)
  - [.cursor/hooks/log-shell-execution.js](.cursor/hooks/log-shell-execution.js)
  - [.cursor/hooks/final-validation.js](.cursor/hooks/final-validation.js)

- Add prompt-optimization hook components:
  - Create a prompt optimization config at [.cursor/hooks/prompt-optimization.json](.cursor/hooks/prompt-optimization.json) with model pattern keys (gpt-5.* and fast) and concise instruction snippets.
  - Add a beforeSubmitPrompt hook script at [.cursor/hooks/optimize-prompt.js](.cursor/hooks/optimize-prompt.js) that:
    - Reads hook payload safely (supports `prompt` or `messages` if present).
    - Detects the model name from common fields.
    - Applies the matching optimization snippet.
    - Returns `permission: allow` and the modified prompt/messages only when possible; otherwise leaves unchanged.

- Add PreToolUse/PostToolUse hooks for MCP and shell:
  - Create [.cursor/hooks/pre-tool-use.js](.cursor/hooks/pre-tool-use.js) to run on:
    - `beforeMCPExecution`
    - `beforeShellExecution` (in addition to the existing git validation)
  - Create [.cursor/hooks/post-tool-use.js](.cursor/hooks/post-tool-use.js) to run on:
    - `afterMCPExecution`
    - `afterShellExecution` (in addition to existing logging)
  - Add a tool policy config at [.cursor/hooks/tool-policy.json](.cursor/hooks/tool-policy.json) for allow/deny patterns and logging behavior.

- Enhance stop hook behavior in [.cursor/hooks/final-validation.js](.cursor/hooks/final-validation.js):
  - Extend summary output to include hook/log pointers and a concise warning list.
  - Optionally emit a follow-up message when blocking issues are detected (only when safe to do so).

- Update hook registrations in [.cursor/hooks.json](.cursor/hooks.json):
  - Register `beforeSubmitPrompt`, `beforeMCPExecution`, `afterMCPExecution`.
  - Add pre/post tool scripts to existing `beforeShellExecution`/`afterShellExecution` while preserving current git validation and logging.

- Update documentation to reflect new hooks:
  - Update the Hooks section in [AGENTS.md](AGENTS.md) to list the new hook events and scripts.

- Verification plan (post-implementation):
  - Run local Node executions with sample payloads to confirm each hook script returns valid JSON.
  - Confirm hooks.json loads without errors and existing validations still run.

## Files to Add or Update
- Add: [.cursor/hooks/optimize-prompt.js](.cursor/hooks/optimize-prompt.js)
- Add: [.cursor/hooks/prompt-optimization.json](.cursor/hooks/prompt-optimization.json)
- Add: [.cursor/hooks/pre-tool-use.js](.cursor/hooks/pre-tool-use.js)
- Add: [.cursor/hooks/post-tool-use.js](.cursor/hooks/post-tool-use.js)
- Add: [.cursor/hooks/tool-policy.json](.cursor/hooks/tool-policy.json)
- Update: [.cursor/hooks.json](.cursor/hooks.json)
- Update: [.cursor/hooks/final-validation.js](.cursor/hooks/final-validation.js)
- Update: [AGENTS.md](AGENTS.md)

## Notes
- The plan preserves existing git validation and logging hooks by appending new scripts rather than replacing existing ones.
- Prompt optimization is implemented via a config file to keep model-specific rules editable without code changes.