#!/usr/bin/env node
/**
 * Reinstall Cursor Drive extension: uninstall → compile → package → install.
 * Reusable automation for CI/CD and local dev testing.
 *
 * Env vars:
 *   DRIVE_MCP_PORT     MCP server port (default: 7891). Extension reads from cursorDrive.mcp.port.
 *   SERVE_WEB_PORT     serve-web port (default: 8000). Used when --serve-web is passed.
 *
 * Usage:
 *   node scripts/reinstall-extension.mjs                    # full reinstall
 *   node scripts/reinstall-extension.mjs --skip-compile    # package + install only (use existing out/)
 *   node scripts/reinstall-extension.mjs --serve-web        # reinstall + start cursor serve-web + open browser
 *   node scripts/reinstall-extension.mjs --dev-sandbox      # reinstall + launch Dev: Drive in sandbox (Extension Dev Host)
 *   node scripts/reinstall-extension.mjs --extension-id hh.cursor-drive  # uninstall specific ID
 *   node scripts/reinstall-extension.mjs --no-uninstall   # skip uninstall (install over existing)
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

/** Extension IDs to uninstall (both may exist; uninstall each separately). */
const DEFAULT_EXTENSION_IDS = ["drive-mode.cursor-drive", "hh.cursor-drive"];

/** Read extension ID (publisher.name) from package.json. */
function getExtensionId() {
  const pkg = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, "package.json"), "utf8"));
  return `${pkg.publisher}.${pkg.name}`;
}

function log(msg) {
  console.log(`[reinstall] ${msg}`);
}

function err(msg) {
  console.error(`[reinstall] ${msg}`);
}

function run(cmd, opts = {}) {
  log(`Running: ${cmd}`);
  execSync(cmd, { cwd: REPO_ROOT, stdio: "inherit", ...opts });
}

function runSilent(cmd, opts = {}) {
  try {
    execSync(cmd, { cwd: REPO_ROOT, stdio: "pipe", encoding: "utf8", ...opts });
    return true;
  } catch {
    return false;
  }
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

/** Uninstall extension by ID. Idempotent: no-op if not installed. */
function uninstallExtension(extId) {
  const ok = runSilent(`cursor --uninstall-extension "${extId}"`);
  if (ok) {
    log(`Uninstalled ${extId}`);
  } else {
    log(`Skipped uninstall ${extId} (not installed or already removed)`);
  }
}

/** Open URL in default browser. Cross-platform. */
function openBrowser(url) {
  const cmd = process.platform === "win32"
    ? `start "" "${url}"`
    : process.platform === "darwin"
      ? `open "${url}"`
      : `xdg-open "${url}"`;
  try {
    execSync(cmd, { stdio: "ignore", shell: true });
    log(`Opened ${url} in browser`);
  } catch (e) {
    err(`Could not open browser: ${e.message}`);
  }
}

/** Launch Extension Development Host with sandbox (Dev: Drive in sandbox). */
function launchDevSandbox() {
  const sandboxPath = path.join(REPO_ROOT, "sandbox");
  // Workaround: Cursor built-ins cursor-socket and cursor-resolver-helper fail with
  // "Cannot find module .../out/main" on some installs. We disable them so the dev host starts.
  // See docs/guides/dev-host-disabled-extensions.md
  const args = [
    sandboxPath,
    `--extensionDevelopmentPath=${REPO_ROOT}`,
    "--disable-extension=anysphere.cursor-socket",
    "--disable-extension=anysphere.cursor-resolver-helper",
  ];
  log(`Launching Dev: Drive in sandbox (Extension Development Host)...`);
  spawn("cursor", args, {
    cwd: REPO_ROOT,
    stdio: "ignore",
    detached: true,
    shell: true,
  }).unref();
  log("Extension Development Host started. Test Drive: Ctrl+Shift+P → Toggle Drive Mode, Ctrl+Shift+S → Agent Screen.");
}

async function main() {
  const args = process.argv.slice(2);
  const serveWeb = args.includes("--serve-web");
  const devSandbox = args.includes("--dev-sandbox");
  const skipCompile = args.includes("--skip-compile");
  const noUninstall = args.includes("--no-uninstall");

  const currentId = getExtensionId();
  let idsToUninstall = [...new Set([currentId, ...DEFAULT_EXTENSION_IDS])];
  const extIdIdx = args.indexOf("--extension-id");
  if (extIdIdx >= 0 && args[extIdIdx + 1]) {
    idsToUninstall = [args[extIdIdx + 1]];
  }

  const mcpPort = await resolveMcpPort();
  writeSandboxMcpPort(mcpPort);
  writeMcpJson(mcpPort);

  if (!noUninstall) {
    for (const extId of idsToUninstall) {
      uninstallExtension(extId);
    }
    await new Promise((r) => setTimeout(r, 500));
  }

  if (!skipCompile) {
    run("npm run compile");
  }

  run("npx vsce package --no-dependencies");
  const vsixFiles = fs.readdirSync(REPO_ROOT)
    .filter((f) => f.endsWith(".vsix"))
    .map((f) => ({ name: f, mtime: fs.statSync(path.join(REPO_ROOT, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime)
    .map((o) => o.name);
  if (vsixFiles.length === 0) {
    err("No .vsix produced");
    process.exit(1);
  }
  const vsixPath = path.join(REPO_ROOT, vsixFiles[0]);
  run(`cursor --install-extension "${vsixPath}" --force`);
  log("Extension installed. IMPORTANT: Reload Cursor to apply changes (Ctrl+Shift+P → Developer: Reload Window).");

  if (devSandbox) {
    launchDevSandbox();
  }

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
    // Open browser after serve-web has time to start
    setTimeout(() => {
      openBrowser(`http://127.0.0.1:${port}`);
    }, 3000);
  }
}

main().catch((e) => {
  err(e.message);
  process.exit(1);
});
