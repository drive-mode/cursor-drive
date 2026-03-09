#!/usr/bin/env node
/**
 * Build Cursor plugin: copy components from .cursor/ to .cursor-plugin/
 * Run before marketplace submission. Keeps .cursor-plugin/ in sync with .cursor/.
 */
import { cpSync, mkdirSync, readFileSync, writeFileSync, existsSync, rmSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const cursor = join(root, ".cursor");
const plugin = join(root, ".cursor-plugin");

function copyDir(src, dest) {
  if (!existsSync(src)) return;
  mkdirSync(dest, { recursive: true });
  cpSync(src, dest, { recursive: true, force: true });
}

function copyFile(src, dest) {
  if (!existsSync(src)) return;
  mkdirSync(dirname(dest), { recursive: true });
  cpSync(src, dest, { force: true });
}

// Copy components
copyDir(join(cursor, "agents"), join(plugin, "agents"));
copyDir(join(cursor, "commands"), join(plugin, "commands"));
copyDir(join(cursor, "rules"), join(plugin, "rules"));
copyDir(join(cursor, "skills"), join(plugin, "skills"));
copyDir(join(cursor, "hooks"), join(plugin, "hooks"));

// User-facing hooks only (filter out plan-governor internals for marketplace)
const hooksSrc = join(cursor, "hooks.json");
const hooksDest = join(plugin, "hooks", "hooks.json");
if (existsSync(hooksSrc)) {
  const full = JSON.parse(readFileSync(hooksSrc, "utf8"));
  const filtered = {
    version: full.version ?? 1,
    hooks: {
      beforeSubmitPrompt: (full.hooks?.beforeSubmitPrompt ?? []).filter(
        (h) => h.command?.includes("drive-preprocessor")
      ),
    },
  };
  mkdirSync(dirname(hooksDest), { recursive: true });
  writeFileSync(hooksDest, JSON.stringify(filtered, null, 2) + "\n", "utf8");
}

// Copy drive-preprocessor.py (referenced by hooks)
copyFile(join(cursor, "hooks", "drive-preprocessor.py"), join(plugin, "hooks", "drive-preprocessor.py"));

// Remove __pycache__ (should not ship)
const pycache = join(plugin, "hooks", "__pycache__");
if (existsSync(pycache)) rmSync(pycache, { recursive: true });

// Logo for marketplace
copyDir(join(root, "assets"), join(plugin, "assets"));

// .mcp.json for MCP discovery
const mcp = { mcpServers: { drive: { url: "http://127.0.0.1:7891/mcp" } } };
writeFileSync(join(plugin, ".mcp.json"), JSON.stringify(mcp, null, 2) + "\n", "utf8");

console.log("[build:plugin] Synced .cursor/ -> .cursor-plugin/");
