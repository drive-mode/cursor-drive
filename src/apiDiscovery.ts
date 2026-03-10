/**
 * apiDiscovery: Runtime introspection of the host IDE's extension API surface.
 *
 * Programmatically discovers what namespaces, methods, and commands are
 * available in the current environment (Cursor vs VS Code). This replaces
 * reliance on secondhand documentation and gives ground-truth data for any
 * host version.
 *
 * Key probes:
 *   1. Top-level `vscode` namespace enumeration
 *   2. Deep walk of `vscode.cursor` (Cursor-specific APIs)
 *   3. `vscode.lm` inspection (Language Model API availability)
 *   4. `vscode.chat` inspection (Chat Participant API availability)
 *   5. Registered commands filtered for `cursor.*` prefixes
 *   6. Host identity (Cursor vs VS Code, version)
 *
 * Output is both an OutputChannel (human-readable) and a JSON structure
 * that can be written to disk for diffing across environments/versions.
 */

import * as vscode from "vscode";
import { getAvailableModelsWithError } from "./modelUtils.js";

// ── Types ────────────────────────────────────────────────────────────────────

export interface PropertyInfo {
  path: string;
  type: string;
  value?: string; // stringified value for primitives
}

export interface NamespaceProbe {
  exists: boolean;
  properties: PropertyInfo[];
}

export interface LmProbe extends NamespaceProbe {
  selectChatModelsResult?: {
    success: boolean;
    modelCount: number;
    models: Array<{ id: string; name?: string; family?: string }>;
    error?: string;
  };
}

export interface CommandsProbe {
  total: number;
  cursorSpecific: string[];  // commands starting with "cursor."
  driveSpecific: string[];   // commands starting with "cursorDrive."
}

export interface DiscoveryReport {
  timestamp: string;
  hostIdentity: {
    appName: string;
    appRoot: string;
    uriScheme: string;
    version: string;
    isCursor: boolean;
  };
  vscodeNamespaces: string[];
  vscodeCursor: NamespaceProbe;
  vscodeLm: LmProbe;
  vscodeChat: NamespaceProbe;
  commands: CommandsProbe;
  namespaceTypeMap: Record<string, string>;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Recursively walk an object's own properties up to a max depth.
 * Returns a flat list of path → type mappings.
 */
function walkObject(
  obj: unknown,
  prefix: string,
  depth: number,
  maxDepth: number,
  seen: WeakSet<object> = new WeakSet()
): PropertyInfo[] {
  if (depth >= maxDepth || obj == null) { return []; }
  if (typeof obj !== "object" && typeof obj !== "function") { return []; }

  const target = obj as Record<string, unknown>;

  // Guard against circular references
  if (typeof obj === "object" && obj !== null) {
    if (seen.has(obj)) { return []; }
    seen.add(obj);
  }

  const results: PropertyInfo[] = [];

  let keys: string[];
  try {
    keys = Object.getOwnPropertyNames(target);
  } catch {
    return results;
  }

  for (const key of keys) {
    // Skip internal/noisy properties
    if (key === "__proto__" || key === "constructor" || key === "prototype") {
      continue;
    }

    const path = `${prefix}.${key}`;
    let type: string;
    let value: string | undefined;

    try {
      const val = target[key];
      type = typeof val;
      if (type === "string" || type === "number" || type === "boolean") {
        value = String(val);
      }
    } catch {
      type = "inaccessible";
    }

    results.push({ path, type, value });

    // Recurse into objects (not functions — those are leaf nodes for our purposes)
    if (type === "object" && depth < maxDepth - 1) {
      try {
        results.push(...walkObject(target[key], path, depth + 1, maxDepth, seen));
      } catch {
        // ignore traversal errors
      }
    }
  }

  return results;
}

/**
 * Probe a namespace on the vscode object.
 */
function probeNamespace(ns: unknown, prefix: string): NamespaceProbe {
  if (ns == null || ns === undefined) {
    return { exists: false, properties: [] };
  }
  return {
    exists: true,
    properties: walkObject(ns, prefix, 0, 3),
  };
}

/**
 * Detect whether the host is Cursor by checking known signals.
 */
function detectHostIdentity(): DiscoveryReport["hostIdentity"] {
  const env = vscode.env;
  const appName = env.appName ?? "unknown";
  const appRoot = env.appRoot ?? "unknown";
  const uriScheme = env.uriScheme ?? "unknown";
  const version = vscode.version ?? "unknown";

  // Cursor typically has "Cursor" in appName and/or uses "cursor" as uriScheme
  const isCursor =
    appName.toLowerCase().includes("cursor") ||
    uriScheme.toLowerCase() === "cursor" ||
    appRoot.toLowerCase().includes("cursor");

  return { appName, appRoot, uriScheme, version, isCursor };
}

// ── Main discovery function ──────────────────────────────────────────────────

/**
 * Run full API discovery and return a structured report.
 */
export async function discoverAPIs(): Promise<DiscoveryReport> {
  const hostIdentity = detectHostIdentity();

  // 1. Enumerate top-level vscode namespaces
  let vscodeNamespaces: string[] = [];
  const namespaceTypeMap: Record<string, string> = {};
  try {
    const vscodeObj = vscode as unknown as Record<string, unknown>;
    const keys = Object.getOwnPropertyNames(vscodeObj).sort();
    vscodeNamespaces = keys;
    for (const key of keys) {
      try {
        namespaceTypeMap[`vscode.${key}`] = typeof vscodeObj[key];
      } catch {
        namespaceTypeMap[`vscode.${key}`] = "inaccessible";
      }
    }
  } catch {
    // vscode object itself not enumerable (unlikely)
  }

  // 2. Probe vscode.cursor
  const vscodeObj = vscode as unknown as Record<string, unknown>;
  const vscodeCursor = probeNamespace(vscodeObj["cursor"], "vscode.cursor");

  // 3. Probe vscode.lm
  const lmObj = vscodeObj["lm"];
  const vscodeLm: LmProbe = {
    ...probeNamespace(lmObj, "vscode.lm"),
  };

  // Try calling selectChatModels if it exists (via modelUtils)
  if (vscodeLm.exists && typeof (lmObj as Record<string, unknown>)?.["selectChatModels"] === "function") {
    const { models, error } = await getAvailableModelsWithError();
    vscodeLm.selectChatModelsResult = error
      ? { success: false, modelCount: 0, models: [], error }
      : {
          success: true,
          modelCount: models.length,
          models: models.map((m) => ({
            id: m.id ?? "unknown",
            name: (m as unknown as Record<string, unknown>).name as string | undefined,
            family: m.family ?? undefined,
          })),
        };
  }

  // 4. Probe vscode.chat
  const vscodeChat = probeNamespace(vscodeObj["chat"], "vscode.chat");

  // 5. Enumerate commands
  let commands: CommandsProbe = { total: 0, cursorSpecific: [], driveSpecific: [] };
  try {
    const allCommands = await vscode.commands.getCommands(false);
    commands = {
      total: allCommands.length,
      cursorSpecific: allCommands
        .filter((c) => c.startsWith("cursor.") || c.startsWith("cursor-"))
        .sort(),
      driveSpecific: allCommands
        .filter((c) => c.startsWith("cursorDrive."))
        .sort(),
    };
  } catch {
    // command enumeration failed
  }

  return {
    timestamp: new Date().toISOString(),
    hostIdentity,
    vscodeNamespaces,
    vscodeCursor,
    vscodeLm,
    vscodeChat,
    commands,
    namespaceTypeMap,
  };
}

// ── Full command enumeration ─────────────────────────────────────────────────

export interface CommandsByPrefix {
  total: number;
  byPrefix: Record<string, string[]>;
  ungrouped: string[];
}

const KNOWN_PREFIXES = [
  "cursor.", "cursorDrive.", "cursorai.", "cursorAuth.", "cursorpyright.",
  "composer.", "composerMode.", "glass.", "developer.", "debug.",
  "workbench.", "editor.", "mcp.", "pw.", "aiSettings.", "aiServerConfigService.",
  "notebook.", "perf.", "signals.", "accessibility.", "remote-containers.",
  "issue.", "browserView.", "vscode-containers.",
];

/**
 * Enumerate ALL registered commands grouped by known prefix.
 * Commands that don't match any known prefix land in `ungrouped`.
 */
export async function discoverAllCommands(): Promise<CommandsByPrefix> {
  const allCommands = await vscode.commands.getCommands(false);
  const byPrefix: Record<string, string[]> = {};
  const ungrouped: string[] = [];

  for (const cmd of allCommands) {
    let matched = false;
    for (const prefix of KNOWN_PREFIXES) {
      if (cmd.startsWith(prefix)) {
        if (!byPrefix[prefix]) { byPrefix[prefix] = []; }
        byPrefix[prefix].push(cmd);
        matched = true;
        break;
      }
    }
    if (!matched) { ungrouped.push(cmd); }
  }

  return { total: allCommands.length, byPrefix, ungrouped };
}

// ── Output formatting ────────────────────────────────────────────────────────

/**
 * Format a discovery report as human-readable text for an OutputChannel.
 */
export function formatReport(report: DiscoveryReport): string {
  const lines: string[] = [];

  lines.push("═══════════════════════════════════════════════════");
  lines.push("  Drive API Discovery Report");
  lines.push("═══════════════════════════════════════════════════");
  lines.push("");

  // Host identity
  lines.push("▸ Host Identity");
  lines.push(`  App Name:   ${report.hostIdentity.appName}`);
  lines.push(`  Version:    ${report.hostIdentity.version}`);
  lines.push(`  URI Scheme: ${report.hostIdentity.uriScheme}`);
  lines.push(`  App Root:   ${report.hostIdentity.appRoot}`);
  lines.push(`  Is Cursor:  ${report.hostIdentity.isCursor ? "YES" : "NO"}`);
  lines.push("");

  // Top-level namespaces
  lines.push("▸ vscode Top-Level Namespaces");
  for (const ns of report.vscodeNamespaces) {
    const type = report.namespaceTypeMap[`vscode.${ns}`] ?? "?";
    lines.push(`  ${ns} (${type})`);
  }
  lines.push(`  Total: ${report.vscodeNamespaces.length}`);
  lines.push("");

  // vscode.cursor
  lines.push("▸ vscode.cursor (Cursor-Specific APIs)");
  if (!report.vscodeCursor.exists) {
    lines.push("  NOT FOUND — vscode.cursor namespace does not exist");
  } else {
    for (const prop of report.vscodeCursor.properties) {
      const suffix = prop.value !== undefined ? ` = ${prop.value}` : "";
      lines.push(`  ${prop.path} (${prop.type})${suffix}`);
    }
    if (report.vscodeCursor.properties.length === 0) {
      lines.push("  Exists but empty (no enumerable properties)");
    }
  }
  lines.push("");

  // vscode.lm
  lines.push("▸ vscode.lm (Language Model API)");
  if (!report.vscodeLm.exists) {
    lines.push("  NOT FOUND — vscode.lm namespace does not exist");
  } else {
    for (const prop of report.vscodeLm.properties) {
      lines.push(`  ${prop.path} (${prop.type})`);
    }
    if (report.vscodeLm.selectChatModelsResult) {
      const r = report.vscodeLm.selectChatModelsResult;
      lines.push(`  selectChatModels() → ${r.success ? "OK" : "FAILED"}, ${r.modelCount} model(s)`);
      if (r.error) {
        lines.push(`    Error: ${r.error}`);
      }
      for (const m of r.models) {
        lines.push(`    - ${m.id} (family: ${m.family ?? "?"}, name: ${m.name ?? "?"})`);
      }
    }
  }
  lines.push("");

  // vscode.chat
  lines.push("▸ vscode.chat (Chat Participant API)");
  if (!report.vscodeChat.exists) {
    lines.push("  NOT FOUND — vscode.chat namespace does not exist");
  } else {
    for (const prop of report.vscodeChat.properties) {
      lines.push(`  ${prop.path} (${prop.type})`);
    }
  }
  lines.push("");

  // Commands
  lines.push("▸ Registered Commands");
  lines.push(`  Total commands: ${report.commands.total}`);
  lines.push("");
  lines.push(`  Cursor-specific (${report.commands.cursorSpecific.length}):`);
  for (const cmd of report.commands.cursorSpecific) {
    lines.push(`    ${cmd}`);
  }
  if (report.commands.cursorSpecific.length === 0) {
    lines.push("    (none found)");
  }
  lines.push("");
  lines.push(`  Drive-specific (${report.commands.driveSpecific.length}):`);
  for (const cmd of report.commands.driveSpecific) {
    lines.push(`    ${cmd}`);
  }
  lines.push("");

  lines.push("═══════════════════════════════════════════════════");
  lines.push(`  Generated: ${report.timestamp}`);
  lines.push("═══════════════════════════════════════════════════");

  return lines.join("\n");
}
