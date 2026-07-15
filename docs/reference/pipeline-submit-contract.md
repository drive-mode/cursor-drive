# Pipeline submit contract

How a user prompt reaches the TypeScript Drive pipeline.

## Entry points (authoritative)

| Entry | Who calls it | What runs |
|-------|--------------|-----------|
| MCP tool `drive_run_pipeline` | Cursor agent when Drive is active | `runPipeline` in `src/pipeline.ts` |
| HTTP `POST /pipeline` | Hook soft-bridge, scripts, tests | Same `runPipeline` |

Body shape: `{ "prompt": string, "operator_id"?: string }`.

Response is the pipeline JSON result (`ok`, `prompt`, `route`, `model`, or blocked/gate fields).

## Hook role (not the pipeline)

`.cursor/hooks/drive-preprocessor.py` on `beforeSubmitPrompt` adds context only. It may try a fail-soft HTTP POST to `/pipeline` (~1s timeout). That is a bridge, not a replacement for the agent calling `drive_run_pipeline`.

When the bridge succeeds, details may include `drive_pipeline_result`. When it fails, details include `drive_pipeline_hint` telling the agent to call `drive_run_pipeline`.

## Agent duty

When Drive is active and the user submitted a prompt, call `drive_run_pipeline` with that prompt. Do not assume the Python hook rewrote the prompt for Cursor.

## See also

- [hooks.md](./hooks.md)
- [f5-vsix-mcp-app-smoke.md](../guides/f5-vsix-mcp-app-smoke.md)
