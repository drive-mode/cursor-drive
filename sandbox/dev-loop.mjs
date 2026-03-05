#!/usr/bin/env node
/**
 * Dev-loop: compile → package → install extension for local Drive development.
 * Supports port automation for MCP (S-AS/Drive) and serve-web.
 *
 * Env vars:
 *   DRIVE_MCP_PORT     MCP server port (default: 7891). Extension reads from cursorDrive.mcp.port.
 *   SERVE_WEB_PORT     serve-web port (default: 8000). Used when --serve-web is passed.
 *
 * Usage:
 *   node sandbox/dev-loop.mjs              # compile, package, install
 *   node sandbox/dev-loop.mjs --serve-web  # also start cursor serve-web
 *   DRIVE_MCP_PORT=7892 node sandbox/dev-loop.mjs
 */

import { execSync, spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import net from "node:net";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");

const DEFAULT_MCP_PORT = 7891;
const DEFAULT_SERVE_WEB_PORT = 8000;

function log(msg) {
  console.log(`[dev-loop] ${msg}`);
}

function err(msg) {
  console.error(`[dev-loop] ${msg}`);
}

/** Find a free port in [base, base+range). Returns first free port or base if all busy. */
function findFreePort(base, range = 10) {
  return new Promise((resolve) => {
    let tried = 0;
    function tryPort(port) {
      if (tried >= range) {
        resolve(base);
        return;
      }
      const server = net.createServer();
      server.once("error", () => {
        tried++;
        tryPort(base + tried);
      });
      server.once("listening", () => {
        server.close(() => resolve(port));
      });
      server.listen(port, "127.0.0.1");
    }
    tryPort(base);
  });
}

/** Resolve MCP port: env override, else auto-find free port from default. */
async function resolveMcpPort() {
  const envPort = process.env.DRIVE_MCP_PORT;
  if (envPort) {
    const p = parseInt(envPort, 10);
    if (!Number.isNaN(p) && p >= 1024 && p <= 65535) return p;
    err(`Invalid DRIVE_MCP_PORT "${envPort}", using auto-select`);
  }
  const free = await findFreePort(DEFAULT_MCP_PORT);
  if (free !== DEFAULT_MCP_PORT) log(`MCP port ${DEFAULT_MCP_PORT} in use, using ${free}`);
  return free;
}

/** Resolve serve-web port: env override, else auto-find free port from default. */
async function resolveServeWebPort() {
  const envPort = process.env.SERVE_WEB_PORT;
  if (envPort) {
    const p = parseInt(envPort, 10);
    if (!Number.isNaN(p) && p >= 1024 && p <= 65535) return p;
    err(`Invalid SERVE_WEB_PORT "${envPort}", using auto-select`);
  }
  const free = await findFreePort(DEFAULT_SERVE_WEB_PORT);
  if (free !== DEFAULT_SERVE_WEB_PORT) log(`serve-web port ${DEFAULT_SERVE_WEB_PORT} in use, using ${free}`);
  return free;
}

/** Ensure sandbox/.vscode/settings.json has cursorDrive.mcp.port. */
function writeSandboxMcpPort(mcpPort) {
  const vscodeDir = path.join(REPO_ROOT, "sandbox", ".vscode");
  const settingsPath = path.join(vscodeDir, "settings.json");
  let settings = {};
  if (fs.existsSync(settingsPath)) {
    try {
      settings = JSON.parse(fs.readFileSync(settingsPath, "utf8"));
    } catch (_) {
      log("Could not parse sandbox/.vscode/settings.json, will overwrite");
    }
  }
  if (!fs.existsSync(vscodeDir)) fs.mkdirSync(vscodeDir, { recursive: true });
  settings["cursorDrive.mcp.port"] = mcpPort;
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), "utf8");
  log(`Wrote cursorDrive.mcp.port=${mcpPort} to sandbox/.vscode/settings.json`);
}

/** Update .cursor/mcp.json so MCP client connects to the resolved port. */
function writeMcpJson(mcpPort) {
  const mcpPath = path.join(REPO_ROOT, ".cursor", "mcp.json");
  let mcp = { mcpServers: {} };
  if (fs.existsSync(mcpPath)) {
    try {
      mcp = JSON.parse(fs.readFileSync(mcpPath, "utf8"));
      if (!mcp.mcpServers) mcp.mcpServers = {};
    } catch (_) {
      log("Could not parse .cursor/mcp.json, will overwrite drive entry");
    }
  }
  mcp.mcpServers.drive = { ...mcp.mcpServers.drive, url: `http://127.0.0.1:${mcpPort}/mcp` };
  if (!fs.existsSync(path.dirname(mcpPath))) fs.mkdirSync(path.dirname(mcpPath), { recursive: true });
  fs.writeFileSync(mcpPath, JSON.stringify(mcp, null, 2), "utf8");
  log(`Updated .cursor/mcp.json drive URL to port ${mcpPort}`);
}

function run(cmd, opts = {}) {
  log(`Running: ${cmd}`);
  execSync(cmd, { cwd: REPO_ROOT, stdio: "inherit", ...opts });
}

async function main() {
  const args = process.argv.slice(2);
  const serveWeb = args.includes("--serve-web");

  const mcpPort = await resolveMcpPort();
  writeSandboxMcpPort(mcpPort);
  writeMcpJson(mcpPort);

  run("npm run compile");
  run("npx vsce package --no-dependencies");
  const vsixFiles = fs.readdirSync(REPO_ROOT).filter((f) => f.endsWith(".vsix"));
  if (vsixFiles.length === 0) {
    err("No .vsix produced");
    process.exit(1);
  }
  const vsixPath = path.join(REPO_ROOT, vsixFiles[0]);
  run(`cursor --install-extension "${vsixPath}"`);
  log("Extension installed. Reload the Extension Development Host or serve-web window to pick up changes.");

  if (serveWeb) {
    const port = await resolveServeWebPort();
    log(`Starting cursor serve-web on port ${port}...`);
    const child = spawn("cursor", [
      "serve-web",
      "--without-connection-token",
      "--accept-server-license-terms",
      "--port",
      String(port),
    ], {
      cwd: REPO_ROOT,
      stdio: "inherit",
      shell: true,
    });
    child.on("error", (e) => {
      err(`serve-web failed: ${e.message}`);
      process.exit(1);
    });
    child.on("exit", (code) => process.exit(code ?? 0));
  }
}

main().catch((e) => {
  err(e.message);
  process.exit(1);
});
