#!/usr/bin/env node
/**
 * Build Cursor marketplace plugin SKU into .cursor-plugin/.
 * Copies only an explicit user-facing allowlist from .cursor/; fails if any path is missing.
 * Does NOT ship required MCP config — VSIX companion provides Agent Screen / MCP runtime.
 */
import {
  cpSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  existsSync,
  rmSync,
  readdirSync,
} from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const cursor = join(root, ".cursor");
const plugin = join(root, ".cursor-plugin");

/** Marketplace SKU allowlist — user-facing Drive components only. */
const ALLOWLIST = {
  skills: [
    "drive-persona",
    "tangent",
    "switch",
    "merge",
    "drive-modes",
    "drive-concise",
  ],
  rules: [
    "policy-pack.mdc",
    "operator-hierarchy.mdc",
    "tiered-model-routing.mdc",
    "drive-modes.mdc",
  ],
  agents: ["drive-operator.md", "drive-reviewer.md", "verifier.md"],
  commands: ["tangent.md", "switch.md", "merge.md"],
};

function fail(msg) {
  console.error(`[build:plugin] ERROR: ${msg}`);
  process.exit(1);
}

function requirePath(abs, label) {
  if (!existsSync(abs)) {
    fail(`Allowlisted path missing: ${label} (${abs})`);
  }
}

function wipeDirContents(dir) {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
    return;
  }
  for (const name of readdirSync(dir)) {
    rmSync(join(dir, name), { recursive: true, force: true });
  }
}

function copyAllowlisted(kind, names, srcSub, destSub, asDir) {
  const destRoot = join(plugin, destSub);
  wipeDirContents(destRoot);
  for (const name of names) {
    const src = join(cursor, srcSub, name);
    const dest = join(destRoot, name);
    requirePath(src, `${kind}/${name}`);
    if (asDir) {
      mkdirSync(dest, { recursive: true });
      cpSync(src, dest, { recursive: true, force: true });
    } else {
      mkdirSync(dirname(dest), { recursive: true });
      cpSync(src, dest, { force: true });
    }
  }
}

copyAllowlisted("skills", ALLOWLIST.skills, "skills", "skills", true);
copyAllowlisted("rules", ALLOWLIST.rules, "rules", "rules", false);
copyAllowlisted("agents", ALLOWLIST.agents, "agents", "agents", false);
copyAllowlisted("commands", ALLOWLIST.commands, "commands", "commands", false);

const hooksDir = join(plugin, "hooks");
wipeDirContents(hooksDir);
const preprocessorSrc = join(cursor, "hooks", "drive-preprocessor.py");
requirePath(preprocessorSrc, "hooks/drive-preprocessor.py");
cpSync(preprocessorSrc, join(hooksDir, "drive-preprocessor.py"), { force: true });

const hooksJson = {
  version: 1,
  hooks: {
    beforeSubmitPrompt: [
      {
        command: "python hooks/drive-preprocessor.py beforeSubmitPrompt",
      },
    ],
  },
};
writeFileSync(join(hooksDir, "hooks.json"), JSON.stringify(hooksJson, null, 2) + "\n", "utf8");

const pycache = join(hooksDir, "__pycache__");
if (existsSync(pycache)) rmSync(pycache, { recursive: true });

const logoSrc = join(root, "assets", "logo.svg");
requirePath(logoSrc, "assets/logo.svg");
const assetsDest = join(plugin, "assets");
mkdirSync(assetsDest, { recursive: true });
cpSync(logoSrc, join(assetsDest, "logo.svg"), { force: true });
const logoPng = join(root, "assets", "logo.png");
if (existsSync(logoPng)) {
  cpSync(logoPng, join(assetsDest, "logo.png"), { force: true });
}

const mcpPath = join(plugin, ".mcp.json");
if (existsSync(mcpPath)) {
  rmSync(mcpPath, { force: true });
}

const pluginJsonPath = join(plugin, "plugin.json");
requirePath(pluginJsonPath, "plugin.json");
const manifest = JSON.parse(readFileSync(pluginJsonPath, "utf8"));
if (manifest.logo) {
  requirePath(join(plugin, manifest.logo), `plugin.json logo → ${manifest.logo}`);
}

console.log("[build:plugin] Marketplace SKU synced:");
console.log(`  skills:   ${ALLOWLIST.skills.join(", ")}`);
console.log(`  rules:    ${ALLOWLIST.rules.join(", ")}`);
console.log(`  agents:   ${ALLOWLIST.agents.join(", ")}`);
console.log(`  commands: ${ALLOWLIST.commands.join(", ")}`);
console.log("  hooks:    drive-preprocessor only");
console.log("  mcp:      omitted (optional VSIX companion)");
