#!/usr/bin/env node
/**
 * Launch script for "Dev: Drive in browser" — starts cursor serve-web,
 * waits for server ready, opens browser. Run after preLaunchTask (compile, package, install).
 *
 * Env: SERVE_WEB_PORT (default 8000)
 */
import { spawn, exec } from "node:child_process";
import net from "node:net";
import { platform } from "node:os";

const PORT = parseInt(process.env.SERVE_WEB_PORT || "8000", 10);

function openBrowser(url) {
  const cmd = platform() === "win32" ? `start "" "${url}"` : platform() === "darwin" ? `open "${url}"` : `xdg-open "${url}"`;
  exec(cmd);
}

function waitForServer(port, maxAttempts = 30) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    function tryConnect() {
      attempts++;
      const socket = net.connect(port, "127.0.0.1", () => {
        socket.destroy();
        resolve();
      });
      socket.on("error", () => {
        if (attempts >= maxAttempts) reject(new Error(`Server not ready after ${maxAttempts} attempts`));
        else setTimeout(tryConnect, 1000);
      });
    }
    tryConnect();
  });
}

async function main() {
  const child = spawn("cursor", [
    "serve-web",
    "--without-connection-token",
    "--accept-server-license-terms",
    "--port",
    String(PORT),
  ], {
    stdio: "inherit",
    shell: true,
  });

  child.on("error", (e) => {
    console.error(`[launch-serve-web] Failed to start: ${e.message}`);
    process.exit(1);
  });

  try {
    await waitForServer(PORT);
    openBrowser(`http://localhost:${PORT}`);
  } catch (e) {
    console.error(`[launch-serve-web] ${e.message}`);
    child.kill();
    process.exit(1);
  }

  child.on("exit", (code) => process.exit(code ?? 0));
}

main();
