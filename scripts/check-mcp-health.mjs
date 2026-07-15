#!/usr/bin/env node
/**
 * Hard health check for Drive MCP HTTP /health.
 * Exit 0 on ok; exit 1 on any failure.
 */
const DEFAULT_URL = "http://127.0.0.1:7891/health";

function parseUrl(argv) {
  const i = argv.indexOf("--url");
  if (i >= 0 && argv[i + 1]) {
    return argv[i + 1];
  }
  return DEFAULT_URL;
}

async function main() {
  const url = parseUrl(process.argv.slice(2));
  let res;
  try {
    res = await fetch(url, { method: "GET", signal: AbortSignal.timeout(5000) });
  } catch (err) {
    console.error(`[check-mcp-health] GET ${url} failed: ${err instanceof Error ? err.message : err}`);
    process.exit(1);
  }
  if (!res.ok) {
    console.error(`[check-mcp-health] GET ${url} → HTTP ${res.status}`);
    process.exit(1);
  }
  let body;
  try {
    body = await res.json();
  } catch {
    console.error(`[check-mcp-health] GET ${url} → non-JSON body`);
    process.exit(1);
  }
  if (body?.status !== "ok") {
    console.error(`[check-mcp-health] unexpected body: ${JSON.stringify(body)}`);
    process.exit(1);
  }
  console.log(`[check-mcp-health] ok ${url}`);
  process.exit(0);
}

void main();
