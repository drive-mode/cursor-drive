import { execSync } from "node:child_process";
import fs from "node:fs";

const ENDPOINT = "http://127.0.0.1:7687/ingest/d6b4572d-5e2b-415d-b134-aefa30963305";
const SESSION_ID = "88c115";
const RUN_ID = `serveweb-probe-${Date.now()}`;

function safeExec(command) {
  try {
    const stdout = execSync(command, { encoding: "utf8" });
    return { ok: true, stdout: stdout.trim() };
  } catch (error) {
    return {
      ok: false,
      code: typeof error.status === "number" ? error.status : -1,
      stdout: (error.stdout ?? "").toString().trim(),
      stderr: (error.stderr ?? "").toString().trim(),
    };
  }
}

async function postLog(hypothesisId, location, message, data) {
  // #region agent log
  await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": SESSION_ID,
    },
    body: JSON.stringify({
      sessionId: SESSION_ID,
      runId: RUN_ID,
      hypothesisId,
      location,
      message,
      data,
      timestamp: Date.now(),
    }),
  }).catch(() => { });
  // #endregion
}

function extractResolvedCommit() {
  const terminalPath = "C:\\Users\\harri\\.cursor\\projects\\c-Users-harri-Documents-Coding-Projects-fun-cursor-drive\\terminals\\201954.txt";
  if (!fs.existsSync(terminalPath)) {
    return null;
  }
  const content = fs.readFileSync(terminalPath, "utf8");
  const match = content.match(/Resolved quality Stable to ([0-9a-f]{40})/);
  return match ? match[1] : null;
}

async function main() {
  const cursorHelp = safeExec("cursor --help");
  await postLog("H2", "serveweb-debug-probe.mjs:57", "cursor_help", {
    ok: cursorHelp.ok,
    hasServeWeb: cursorHelp.stdout.includes("serve-web"),
    hasAgentSubcommand: cursorHelp.stdout.includes("agent"),
  });

  const cursorAgentHelp = safeExec("cursor agent --help");
  await postLog("H5", "serveweb-debug-probe.mjs:64", "cursor_agent_help", {
    ok: cursorAgentHelp.ok,
    code: cursorAgentHelp.code ?? 0,
  });

  const agentHelp = safeExec("agent --help");
  await postLog("H5", "serveweb-debug-probe.mjs:70", "agent_help_entrypoint", {
    ok: agentHelp.ok,
    code: agentHelp.code ?? 0,
    stderr: agentHelp.stderr.slice(0, 180),
  });

  const tunnelVersion = safeExec("\"C:\\Users\\harri\\AppData\\Local\\Programs\\cursor\\resources\\app\\bin\\cursor-tunnel.exe\" --version");
  const cursorVersion = safeExec("cursor --version");
  await postLog("H5", "serveweb-debug-probe.mjs:78", "binary_versions", {
    tunnelVersion: tunnelVersion.stdout.split("\n")[0] ?? "",
    cursorVersion: cursorVersion.stdout.split("\n")[0] ?? "",
  });

  const updateCheck = safeExec("\"C:\\Users\\harri\\AppData\\Local\\Programs\\cursor\\resources\\app\\bin\\cursor-tunnel.exe\" update --check");
  await postLog("H6", "serveweb-debug-probe.mjs:85", "cli_update_check", {
    ok: updateCheck.ok,
    stdout: updateCheck.stdout.slice(0, 240),
    stderr: (updateCheck.stderr ?? "").slice(0, 240),
  });

  const resolvedCommit = extractResolvedCommit();
  await postLog("H1", "serveweb-debug-probe.mjs:92", "resolved_commit_from_serveweb_log", {
    resolvedCommit,
  });

  if (resolvedCommit) {
    const head = safeExec(`curl.exe -I -L --max-time 20 "https://api2.cursor.sh/updates/download/${resolvedCommit}/vscode-reh-win32-x64-web.tar.gz"`);
    const httpLines = `${head.stdout}\n${head.stderr}`
      .split("\n")
      .filter((line) => line.trim().startsWith("HTTP/"))
      .slice(0, 4);

    await postLog("H1", "serveweb-debug-probe.mjs:103", "download_head_status_chain", {
      ok: head.ok,
      statusChain: httpLines,
    });

    const cliHead = safeExec(`curl.exe -I --max-time 20 "https://cursor.blob.core.windows.net/remote-releases/${resolvedCommit}/cli-win32-x64.tar.gz"`);
    const cliHttpLines = `${cliHead.stdout}\n${cliHead.stderr}`
      .split("\n")
      .filter((line) => line.trim().startsWith("HTTP/"))
      .slice(0, 2);
    await postLog("H6", "serveweb-debug-probe.mjs:112", "cli_tarball_head_status", {
      ok: cliHead.ok,
      statusChain: cliHttpLines,
    });
  }
}

await main();
