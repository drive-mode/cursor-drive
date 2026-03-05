import * as cp from "child_process";
import * as crypto from "crypto";
import * as fs from "fs/promises";
import * as path from "path";
import * as vscode from "vscode";

export const DRIVE_HOOK_COMMAND = ".cursor/hooks/drive-preprocessor.py beforeSubmitPrompt";

const DRIVE_PLUGIN_DIRS = ["agents", "commands", "rules"] as const;

export const PLUGIN_VERSION = "0.3.0";

const VERSION_STAMP_FILE = ".drive-plugin-version";

interface VersionStamp {
  version: string;
  installedAt: string;
  hash: string;
}

export interface PluginInstallResult {
  workspaceRoot: string;
  installedPaths: string[];
  skippedSkills?: string[];
  upToDate?: boolean;
}

// ── Skill gating ──────────────────────────────────────────────────────────

/**
 * Requirements declared in a SKILL.md `requires:` frontmatter block.
 *
 * Example SKILL.md frontmatter:
 * ```yaml
 * ---
 * name: my-skill
 * requires:
 *   bins: [git, node]
 *   env: [MY_API_KEY]
 *   os: [darwin, linux]
 * ---
 * ```
 */
export interface SkillRequires {
  /** Binary names that must be in PATH. */
  bins?: string[];
  /** Environment variable names that must be non-empty. */
  env?: string[];
  /**
   * Allowed OS platform values (Node `process.platform`):
   * "darwin", "linux", "win32", etc.
   */
  os?: string[];
}

/**
 * Parse the YAML frontmatter block from a SKILL.md string.
 * Returns an empty object if no frontmatter is present or parsing fails.
 * Deliberately minimal — only handles the `requires:` section we care about.
 */
export function parseSkillRequires(skillMd: string): SkillRequires {
  // Extract frontmatter (--- ... ---)
  const fmMatch = skillMd.match(/^---\n([\s\S]*?)\n---/);
  if (!fmMatch) { return {}; }
  const fm = fmMatch[1];
  const lines = fm.split("\n");

  // Find the `requires:` line and collect the indented block following it.
  let inRequires = false;
  const requiresLines: string[] = [];
  for (const line of lines) {
    if (!inRequires) {
      if (/^requires:\s*$/.test(line)) {
        inRequires = true;
      }
    } else {
      // Indented line = part of the requires block.
      if (/^\s+/.test(line) || line === "") {
        requiresLines.push(line);
      } else {
        break; // Non-indented line = end of requires block.
      }
    }
  }

  if (!inRequires) { return {}; }
  const requiresBlock = requiresLines.join("\n");

  /**
   * Parse a list value for a given key from the requires block.
   * Supports inline syntax:  key: [a, b, c]
   * Supports multi-line:     key:\n    - a\n    - b
   */
  function parseList(key: string): string[] {
    // Inline: `  bins: [git, node]`
    const inlineMatch = requiresBlock.match(
      new RegExp(`\\b${key}:\\s*\\[([^\\]]+)\\]`)
    );
    if (inlineMatch) {
      return inlineMatch[1]
        .split(",")
        .map((s) => s.trim().replace(/['"]/g, ""))
        .filter(Boolean);
    }

    // Multi-line: collect `- item` lines after the key.
    const keyIdx = requiresBlock.indexOf(`${key}:`);
    if (keyIdx !== -1) {
      const afterKey = requiresBlock.slice(keyIdx + key.length + 1);
      const items = afterKey
        .split("\n")
        .filter((l) => /^\s+-\s+/.test(l))
        .map((l) => l.replace(/^\s+-\s+/, "").trim())
        .filter(Boolean);
      if (items.length > 0) { return items; }
    }

    return [];
  }

  return {
    bins: parseList("bins"),
    env: parseList("env"),
    os: parseList("os"),
  };
}

/** Check whether a binary exists in PATH. */
function binExists(bin: string): boolean {
  try {
    const cmd = process.platform === "win32" ? "where" : "which";
    cp.execSync(`${cmd} ${bin}`, { stdio: "ignore", timeout: 3000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Check whether a skill's requirements are satisfied on the current machine.
 * Returns an array of unmet requirements (empty = all satisfied).
 */
export function checkSkillRequires(requires: SkillRequires): string[] {
  const unmet: string[] = [];

  for (const bin of requires.bins ?? []) {
    if (!binExists(bin)) {
      unmet.push(`bin "${bin}" not found in PATH`);
    }
  }

  for (const envVar of requires.env ?? []) {
    if (!process.env[envVar]) {
      unmet.push(`env var "${envVar}" is not set`);
    }
  }

  if ((requires.os ?? []).length > 0) {
    if (!requires.os!.includes(process.platform)) {
      unmet.push(`platform "${process.platform}" not in [${requires.os!.join(", ")}]`);
    }
  }

  return unmet;
}

/**
 * Evaluate a skill directory: read SKILL.md and check requires.
 * Returns `{ ok: true }` or `{ ok: false, reason }`.
 */
async function evaluateSkill(
  skillDir: string
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const skillMdPath = path.join(skillDir, "SKILL.md");
  let content: string;
  try {
    content = await fs.readFile(skillMdPath, "utf8");
  } catch {
    // No SKILL.md — no requirements to check, pass through.
    return { ok: true };
  }

  const requires = parseSkillRequires(content);
  const unmet = checkSkillRequires(requires);
  if (unmet.length > 0) {
    return { ok: false, reason: unmet.join("; ") };
  }
  return { ok: true };
}

// ── JSON / file helpers ───────────────────────────────────────────────────

function jsonOrDefault<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function readJsonFile<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return jsonOrDefault(raw, fallback);
  } catch {
    return fallback;
  }
}

async function writeJsonFile(filePath: string, value: unknown): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function copyDirectory(sourceDir: string, targetDir: string): Promise<void> {
  await fs.mkdir(path.dirname(targetDir), { recursive: true });
  await fs.cp(sourceDir, targetDir, { recursive: true, force: true });
}

async function ensureMcpConfig(extensionPath: string, cursorDir: string): Promise<void> {
  const sourcePath = path.join(extensionPath, "mcp.json");
  const targetPath = path.join(cursorDir, "mcp.json");

  const source = await readJsonFile<{ mcpServers?: Record<string, unknown> }>(sourcePath, {});
  const target = await readJsonFile<{ mcpServers?: Record<string, unknown> }>(targetPath, {});

  const merged = {
    ...target,
    mcpServers: {
      ...(target.mcpServers ?? {}),
      ...(source.mcpServers ?? {}),
    },
  };

  await writeJsonFile(targetPath, merged);
}

async function ensureHookConfig(cursorDir: string): Promise<void> {
  const hooksPath = path.join(cursorDir, "hooks.json");
  const existing = await readJsonFile<{
    version?: number;
    hooks?: { beforeSubmitPrompt?: Array<{ command: string }> };
  }>(hooksPath, { version: 1, hooks: {} });

  const beforeSubmitPrompt = existing.hooks?.beforeSubmitPrompt ?? [];
  const hasDriveHook = beforeSubmitPrompt.some((entry) => entry.command === DRIVE_HOOK_COMMAND);
  const nextBeforeSubmitPrompt = hasDriveHook
    ? beforeSubmitPrompt
    : [...beforeSubmitPrompt, { command: DRIVE_HOOK_COMMAND }];

  await writeJsonFile(hooksPath, {
    version: existing.version ?? 1,
    hooks: {
      ...(existing.hooks ?? {}),
      beforeSubmitPrompt: nextBeforeSubmitPrompt,
    },
  });
}

async function ensureHookScript(extensionPath: string, cursorDir: string): Promise<void> {
  const sourcePath = path.join(extensionPath, ".cursor", "hooks", "drive-preprocessor.py");
  const targetPath = path.join(cursorDir, "hooks", "drive-preprocessor.py");

  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.copyFile(sourcePath, targetPath);
}

// ── Skills installation with gating ──────────────────────────────────────

/**
 * Install skills from the extension's `.cursor/skills/` directory into the
 * workspace's `.cursor/skills/`. Skills with unmet `requires:` are skipped.
 *
 * Returns the list of skipped skill names.
 */
async function installSkillsWithGating(
  extensionPath: string,
  cursorDir: string,
  installedPaths: string[]
): Promise<string[]> {
  const sourceSkillsDir = path.join(extensionPath, ".cursor", "skills");
  const targetSkillsDir = path.join(cursorDir, "skills");
  const skipped: string[] = [];

  let skillDirs: string[];
  try {
    skillDirs = await fs.readdir(sourceSkillsDir);
  } catch {
    // No skills directory — nothing to install.
    return skipped;
  }

  for (const skillName of skillDirs) {
    const sourceDir = path.join(sourceSkillsDir, skillName);
    const stat = await fs.stat(sourceDir).catch(() => null);
    if (!stat?.isDirectory()) { continue; }

    const evaluation = await evaluateSkill(sourceDir);
    if (!evaluation.ok) {
      console.warn(`[Drive Plugin] Skipping skill "${skillName}": ${evaluation.reason}`);
      skipped.push(skillName);
      continue;
    }

    const targetDir = path.join(targetSkillsDir, skillName);
    await copyDirectory(sourceDir, targetDir);
    installedPaths.push(targetDir);
  }

  return skipped;
}

// ── Version checking ─────────────────────────────────────────────────────

/**
 * Read the version stamp from a workspace's `.cursor/` directory.
 * Returns `null` if the file is missing or unparseable.
 */
async function readVersionStamp(workspaceRoot: string): Promise<VersionStamp | null> {
  const stampPath = path.join(workspaceRoot, ".cursor", VERSION_STAMP_FILE);
  return readJsonFile<VersionStamp | null>(stampPath, null);
}

/**
 * Compute a SHA-256 hash over the concatenated contents of all installed files
 * (sorted by relative path for determinism).
 */
async function computeContentHash(installedPaths: string[]): Promise<string> {
  const sorted = [...installedPaths].sort();
  const hash = crypto.createHash("sha256");
  for (const filePath of sorted) {
    try {
      const stat = await fs.stat(filePath);
      if (stat.isDirectory()) {
        const entries = await collectFiles(filePath);
        for (const entry of entries.sort()) {
          hash.update(await fs.readFile(entry));
        }
      } else {
        hash.update(await fs.readFile(filePath));
      }
    } catch {
      // Skip files that can't be read.
    }
  }
  return hash.digest("hex");
}

/** Recursively collect all file paths under a directory. */
async function collectFiles(dir: string): Promise<string[]> {
  const results: string[] = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...(await collectFiles(full)));
    } else {
      results.push(full);
    }
  }
  return results;
}

/**
 * Check whether the plugin in the workspace needs updating.
 * Returns `true` if versions differ or the stamp file is missing.
 */
export async function shouldUpdatePlugin(workspaceRoot: string): Promise<boolean> {
  const stamp = await readVersionStamp(workspaceRoot);
  if (!stamp || stamp.version !== PLUGIN_VERSION) {
    return true;
  }
  return false;
}

/** Write the version stamp after a successful installation. */
async function writeVersionStamp(
  workspaceRoot: string,
  installedPaths: string[]
): Promise<void> {
  const stampPath = path.join(workspaceRoot, ".cursor", VERSION_STAMP_FILE);
  const hash = await computeContentHash(installedPaths);
  const stamp: VersionStamp = {
    version: PLUGIN_VERSION,
    installedAt: new Date().toISOString(),
    hash,
  };
  await writeJsonFile(stampPath, stamp);
}

// ── Main installer ────────────────────────────────────────────────────────

export async function installDrivePluginToWorkspace(
  context: vscode.ExtensionContext
): Promise<PluginInstallResult> {
  const folder = vscode.workspace.workspaceFolders?.[0];
  if (!folder) {
    throw new Error("Open a workspace folder before installing the Drive plugin.");
  }

  const workspaceRoot = folder.uri.fsPath;

  if (!(await shouldUpdatePlugin(workspaceRoot))) {
    return { workspaceRoot, installedPaths: [], upToDate: true };
  }

  const cursorDir = path.join(workspaceRoot, ".cursor");
  const installedPaths: string[] = [];

  await fs.mkdir(cursorDir, { recursive: true });

  for (const dirName of DRIVE_PLUGIN_DIRS) {
    const sourceDir = path.join(context.extensionPath, dirName);
    const targetDir = path.join(cursorDir, dirName);
    await copyDirectory(sourceDir, targetDir);
    installedPaths.push(targetDir);
  }

  await ensureMcpConfig(context.extensionPath, cursorDir);
  installedPaths.push(path.join(cursorDir, "mcp.json"));

  await ensureHookScript(context.extensionPath, cursorDir);
  installedPaths.push(path.join(cursorDir, "hooks", "drive-preprocessor.py"));

  await ensureHookConfig(cursorDir);
  installedPaths.push(path.join(cursorDir, "hooks.json"));

  // Install skills with gating: skip skills whose `requires:` are unmet.
  const skippedSkills = await installSkillsWithGating(
    context.extensionPath,
    cursorDir,
    installedPaths
  );

  await writeVersionStamp(workspaceRoot, installedPaths);

  return { workspaceRoot, installedPaths, skippedSkills };
}
