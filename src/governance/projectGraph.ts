import * as fs from "fs/promises";
import * as path from "path";
import { getGovernancePaths } from "./paths.js";
import type { Edge, FileKind, FileNode, ProjectGraphSnapshot, RepoInfo } from "./schemas.js";

function detectKind(relPath: string): FileKind {
  if (relPath.startsWith("src/")) { return "src"; }
  if (relPath.startsWith("tests/") || relPath.includes("__tests__/")) { return "test"; }
  if (relPath.startsWith("docs/")) { return "doc"; }
  if (relPath.startsWith(".cursor/plans/")) { return "plan"; }
  if (relPath === "package.json" || relPath.startsWith(".cursor/")) { return "config"; }
  return "other";
}

async function listFilesRecursive(dirAbs: string, rootAbs: string): Promise<string[]> {
  const entries = await fs.readdir(dirAbs, { withFileTypes: true });
  const results: string[] = [];
  for (const ent of entries) {
    const abs = path.join(dirAbs, ent.name);
    if (ent.isDirectory()) {
      // Skip known heavy dirs
      if (ent.name === "node_modules" || ent.name === "out" || ent.name === ".git") { continue; }
      results.push(...await listFilesRecursive(abs, rootAbs));
    } else if (ent.isFile()) {
      const rel = path.relative(rootAbs, abs).replaceAll(path.sep, "/");
      results.push(rel);
    }
  }
  return results;
}

async function countLoc(absPath: string): Promise<number> {
  try {
    const text = await fs.readFile(absPath, "utf8");
    return text.split("\n").length;
  } catch {
    return 0;
  }
}

const IMPORT_FROM_RE = /^\s*import\s+[\s\S]*?\sfrom\s+["']([^"']+)["']\s*;?/gm;
const IMPORT_SIDE_EFFECT_RE = /^\s*import\s+["']([^"']+)["']\s*;?/gm;

const EXPORT_DECL_RE = /^\s*export\s+(?:async\s+)?(?:function|class|const|let|var|type|interface|enum)\s+([A-Za-z0-9_$]+)/gm;
const EXPORT_LIST_RE = /^\s*export\s*\{\s*([^}]+)\s*\}\s*(?:from\s+["'][^"']+["'])?\s*;?/gm;

function normalizeRelPath(p: string): string {
  return p.replaceAll(path.sep, "/");
}

async function resolveImport(
  fromFileRel: string,
  spec: string,
  workspaceRoot: string,
  knownFiles: Set<string>
): Promise<string | undefined> {
  if (!spec.startsWith(".")) { return undefined; }

  const fromDirAbs = path.join(workspaceRoot, path.dirname(fromFileRel));
  const targetAbsBase = path.resolve(fromDirAbs, spec);
  const relBase = normalizeRelPath(path.relative(workspaceRoot, targetAbsBase));

  const candidates: string[] = [];

  // If spec already ends with extension, try direct (and common TS swap).
  if (/\.[a-z]+$/i.test(relBase)) {
    candidates.push(relBase);
    if (relBase.endsWith(".js")) {
      candidates.push(relBase.slice(0, -3) + ".ts");
    }
  } else {
    candidates.push(relBase + ".ts");
    candidates.push(relBase + ".tsx");
    candidates.push(relBase + "/index.ts");
    candidates.push(relBase + "/index.tsx");
  }

  for (const c of candidates) {
    if (knownFiles.has(c)) { return c; }
  }

  // Fallback: check filesystem even if file wasn't included in snapshot filter.
  for (const c of candidates) {
    try {
      await fs.access(path.join(workspaceRoot, c));
      return c;
    } catch {
      // ignore
    }
  }

  return undefined;
}

function extractImportSpecs(text: string): string[] {
  const specs: string[] = [];
  IMPORT_FROM_RE.lastIndex = 0;
  IMPORT_SIDE_EFFECT_RE.lastIndex = 0;

  let m: RegExpExecArray | null;
  while ((m = IMPORT_FROM_RE.exec(text)) !== null) {
    specs.push(m[1]);
  }
  while ((m = IMPORT_SIDE_EFFECT_RE.exec(text)) !== null) {
    specs.push(m[1]);
  }
  return specs;
}

function extractExports(text: string): string[] {
  const exports: string[] = [];
  EXPORT_DECL_RE.lastIndex = 0;
  EXPORT_LIST_RE.lastIndex = 0;

  let m: RegExpExecArray | null;
  while ((m = EXPORT_DECL_RE.exec(text)) !== null) {
    exports.push(m[1]);
  }
  while ((m = EXPORT_LIST_RE.exec(text)) !== null) {
    const body = m[1];
    for (const part of body.split(",")) {
      const cleaned = part.trim();
      if (!cleaned) { continue; }
      // support "Foo as Bar"
      const name = cleaned.split(/\s+as\s+/i)[0]?.trim();
      if (name) { exports.push(name); }
    }
  }
  return [...new Set(exports)].sort();
}

async function tryGit(repoRoot: string, args: string[]): Promise<string | undefined> {
  try {
    const { execFile } = await import("child_process");
    const result: string = await new Promise((resolve, reject) => {
      execFile("git", args, { cwd: repoRoot }, (err, stdout) => {
        if (err) { reject(err); }
        else { resolve(String(stdout ?? "")); }
      });
    });
    return result.trim();
  } catch {
    return undefined;
  }
}

async function getRepoInfo(repoRoot: string): Promise<RepoInfo> {
  const head = (await tryGit(repoRoot, ["rev-parse", "HEAD"])) ?? "unknown";
  const branch = (await tryGit(repoRoot, ["rev-parse", "--abbrev-ref", "HEAD"])) ?? "unknown";
  return { root: ".", head, branch };
}

export async function buildProjectGraphSnapshot(
  workspaceRoot: string,
  options: {
    entrypoints?: string[];
    includeGlobs?: RegExp[];
  } = {}
): Promise<ProjectGraphSnapshot> {
  const paths = getGovernancePaths(workspaceRoot);
  void paths; // reserved for future incremental caching

  const entrypoints = options.entrypoints ?? ["src/extension.ts"];

  const all = await listFilesRecursive(workspaceRoot, workspaceRoot);
  const includeGlobs = options.includeGlobs ?? [
    /^src\/.*\.ts$/,
    /^tests\/.*\.ts$/,
    /^docs\/.*\.md$/,
    /^\.cursor\/plans\/.*\.plan\.md$/,
    /^package\.json$/,
  ];

  const filtered = all.filter((p) => includeGlobs.some((re) => re.test(p)));

  const nodes: FileNode[] = [];
  const fileSet = new Set(filtered);
  for (const rel of filtered.sort()) {
    const abs = path.join(workspaceRoot, rel);
    nodes.push({
      path: rel,
      kind: detectKind(rel),
      loc: await countLoc(abs),
      imports: [],
      exports: [],
      tags: [],
    });
  }

  const nodeByPath = new Map<string, FileNode>();
  for (const n of nodes) { nodeByPath.set(n.path, n); }

  const edges: Edge[] = [];
  const repo = await getRepoInfo(workspaceRoot);

  // Extract imports/exports for TS files.
  for (const node of nodes) {
    if (!node.path.endsWith(".ts") && !node.path.endsWith(".tsx")) { continue; }
    let text = "";
    try {
      text = await fs.readFile(path.join(workspaceRoot, node.path), "utf8");
    } catch {
      continue;
    }

    node.exports = extractExports(text);

    const specs = extractImportSpecs(text);
    for (const spec of specs) {
      const resolved = await resolveImport(node.path, spec, workspaceRoot, fileSet);
      if (!resolved) { continue; }
      node.imports.push(resolved);
      edges.push({ from: node.path, to: resolved, type: "import" });
    }

    node.imports = [...new Set(node.imports)].sort();
  }

  // Test mapping: if a test imports src files, create testOf edges.
  for (const node of nodes) {
    if (node.kind !== "test") { continue; }
    const importedSrc = node.imports.filter((p) => nodeByPath.get(p)?.kind === "src");
    if (importedSrc.length > 0) {
      for (const to of importedSrc) {
        edges.push({ from: node.path, to, type: "testOf" });
      }
      continue;
    }
    // Naming fallback: tests/foo.test.ts -> src/foo.ts
    const base = path.basename(node.path).replace(/\.test\.[tj]sx?$/i, "");
    const guess = `src/${base}.ts`;
    if (nodeByPath.has(guess)) {
      edges.push({ from: node.path, to: guess, type: "testOf" });
    }
  }

  const warnings = [
    "Imports/exports extracted with regex heuristics (no TypeScript typechecker).",
  ];

  return {
    version: 1,
    generatedAt: Date.now(),
    repo,
    entrypoints,
    nodes,
    edges,
    warnings,
    partial: false,
  };
}

