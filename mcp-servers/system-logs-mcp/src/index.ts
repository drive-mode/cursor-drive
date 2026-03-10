#!/usr/bin/env node
/**
 * system-logs-mcp: MCP server for system logs observability.
 * Exposes tools for tailing and listing logs.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({
  name: "system-logs-mcp",
  version: "0.1.0",
});

server.tool(
  "tail_logs",
  "Return recent log entries (placeholder; extend to read from log files)",
  { lines: z.number().optional().describe("Number of lines to return").default(20) },
  async ({ lines }) => {
    const n = Math.min(lines ?? 20, 10);
    const sample = Array.from({ length: n }, (_, i) => ({
      ts: new Date().toISOString(),
      level: "info",
      msg: `Log entry ${i + 1} (system-logs-mcp placeholder)`,
    }));
    return { content: [{ type: "text" as const, text: JSON.stringify(sample, null, 2) }] };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
