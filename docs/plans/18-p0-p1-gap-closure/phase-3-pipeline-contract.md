# Phase 3 — Submit-path pipeline contract

Back: [overview.md](./overview.md)

## Goal

Stop claiming the Python hook *is* the TypeScript pipeline. Enforce `drive_run_pipeline` / `POST /pipeline` as the TS entry. Soft-bridge the hook so submit is not only tribal knowledge.

## Changes

- Add `docs/reference/pipeline-submit-contract.md` stating entry points, hook limits, and agent duty to call `drive_run_pipeline` when Drive is active.
- Correct `docs/reference/hooks.md` opening claim ("primary pipeline entry") to match reality: context hints + optional HTTP bridge.
- Soft-wire `.cursor/hooks/drive-preprocessor.py`: when `DRIVE_MCP_URL` or default `http://127.0.0.1:7891` `/pipeline` is reachable, POST the prompt (fail-soft) and attach `drive_pipeline_result` / hint to call `drive_run_pipeline` if MCP is down.
- Jest contract: `drive_run_pipeline` tool registered; existing `POST /pipeline` test remains green.

## Data structures

HTTP body `{ prompt: string, operator_id?: string }` → pipeline JSON result already implemented on MCP server.

## Verification

```powershell
npm test -- --testPathPattern="mcpServer|pipeline"
# with MCP up: python .cursor/hooks/drive-preprocessor.py beforeSubmitPrompt  (stdin JSON)
```
