#!/usr/bin/env node
/**
 * Copy ext-apps bundled client to out/ for CSP-compliant MCP App.
 * No external script loads — inlined at runtime.
 */
import { cpSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const src = join(root, "node_modules", "@modelcontextprotocol", "ext-apps", "dist", "src", "app-with-deps.js");
const dest = join(root, "out", "mcp-app-bundle.js");

if (!existsSync(src)) {
  console.warn("[bundle:mcp-app] app-with-deps.js not found; run npm install");
  process.exit(1);
}
mkdirSync(dirname(dest), { recursive: true });
cpSync(src, dest, { force: true });
console.log("[bundle:mcp-app] Copied app-with-deps.js -> out/mcp-app-bundle.js");
