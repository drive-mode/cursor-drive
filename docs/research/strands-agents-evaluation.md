# AWS Strands Agents TypeScript SDK Evaluation

Evaluation of AWS Strands Agents TypeScript SDK as a worker agent runtime for Cursor Drive.

## Overview

Strands Agents is an open source SDK for building AI agents. The TypeScript SDK provides `McpClient` for connecting to MCP servers. Drive's MCP server at `http://127.0.0.1:7891/mcp` uses Streamable HTTP transport.

## SDK Version

- **Package**: `@strands/agent` (preview)
- **Docs**: https://strandsagents.com/latest/documentation/docs/api-reference/typescript/
- **Note**: SDK is in preview; exact npm version not verified in this eval.

## McpClient API

| Method | Purpose |
|--------|---------|
| `connect(reconnect?)` | Connect to MCP server (lazy before ops) |
| `disconnect()` | Close connection |
| `listTools()` | Return available tools as McpTool instances |
| `callTool(tool, args)` | Invoke tool on server |

Config: `McpClientConfig` passed to constructor.

## MCP Transport Compatibility

**Finding**: Strands Agents (Python) uses `streamablehttp_client(url)` for Streamable HTTP MCP transport (per AWS blog). The TypeScript SDK's `McpClient` accepts `McpClientConfig`; transport type is configurable.

**Drive's server**: Streamable HTTP at `http://127.0.0.1:7891/mcp`. Standard MCP Streamable HTTP spec.

**Verdict**: **Likely compatible**. The TS SDK has McpClient for MCP; Streamable HTTP is the common remote transport. A concrete spike would require installing `@strands/agent` and testing `McpClient` with Drive's URL.

## Minimal Spike (Proposed)

```typescript
import { McpClient } from "@strands/agent";

const client = new McpClient({
  // Config for Streamable HTTP - exact shape TBD from SDK
  url: "http://127.0.0.1:7891/mcp",
});

await client.connect();
const tools = await client.listTools();
// Call operator_spawn, agent_screen_activity
const result = await client.callTool(
  tools.find(t => t.name === "operator_spawn")!,
  { task: "Research rate limiting", name: "Beta" }
);
await client.disconnect();
```

## Go/No-Go Recommendation

**Go** (proceed with spike): The SDK has native MCP client support. AWS blog confirms Streamable HTTP works with Strands. A short spike (install, connect to Drive, call `operator_spawn` and `agent_screen_activity`) would validate TS SDK + Drive MCP compatibility.

**Risks**: Preview SDK may have breaking changes; `McpClientConfig` shape for HTTP transport needs verification from SDK source or docs.

## References

- [Strands Agents TypeScript SDK](https://strandsagents.com/latest/documentation/docs/api-reference/typescript/)
- [McpClient API](https://strandsagents.com/latest/documentation/docs/api-reference/typescript/classes/McpClient.html)
- [AWS: Strands Agents & MCP](https://aws.amazon.com/blogs/opensource/open-protocols-for-agent-interoperability-part-3-strands-agents-mcp/)
- ADR-0014: Agent Orchestration Strategy
