#!/usr/bin/env node
/**
 * Wrapper for GitHub MCP server that loads GPAT from .env.
 * Use in .cursor/mcp.json:
 *   "command": "node",
 *   "args": ["scripts/mcp-github.mjs"]
 *
 * Requires .env in repo root with GPAT or GITHUB_PERSONAL_ACCESS_TOKEN.
 */

import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");

function loadEnv() {
  const envPath = path.join(REPO_ROOT, ".env");
  if (!fs.existsSync(envPath)) return {};
  const env = {};
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
  }
  return env;
}

const env = loadEnv();
const token = env.GPAT || env.GITHUB_PERSONAL_ACCESS_TOKEN || process.env.GPAT || process.env.GITHUB_PERSONAL_ACCESS_TOKEN;

if (!token) {
  console.error("[mcp-github] No token found. Set GPAT or GITHUB_PERSONAL_ACCESS_TOKEN in .env or environment.");
  process.exit(1);
}

const child = spawn("npx", ["-y", "@modelcontextprotocol/server-github"], {
  stdio: ["inherit", "inherit", "inherit"],
  env: { ...process.env, GITHUB_PERSONAL_ACCESS_TOKEN: token },
  cwd: REPO_ROOT,
});

child.on("error", (err) => {
  console.error("[mcp-github]", err);
  process.exit(1);
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
