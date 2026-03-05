import * as crypto from "crypto";
import * as fs from "fs/promises";
import * as path from "path";
import type { Edge, EntropyMetrics, EntropyReport, FileNode, Finding, FindingCategory, ProjectGraphSnapshot } from "./schemas.js";

function clamp01(n: number): number {
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

function stableId(prefix: string, parts: string[]): string {
  const h = crypto.createHash("sha256").update(parts.join("\n")).digest("hex").slice(0, 10);
  return `${prefix}-${h}`;
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor(p * (sorted.length - 1))));
  return sorted[idx];
}

function buildAdjacency(edges: Edge[], type: "import"): Map<string, string[]> {
  const adj = new Map<string, string[]>();
  for (const e of edges) {
    if (e.type !== type) continue;
    const arr = adj.get(e.from) ?? [];
    arr.push(e.to);
    adj.set(e.from, arr);
  }
  for (const [k, arr] of adj) {
    adj.set(k, [...new Set(arr)].sort());
  }
  return adj;
}

function reachableFromEntrypoints(
  entrypoints: string[],
  adj: Map<string, string[]>,
  nodeByPath: Map<string, FileNode>
): Set<string> {
  const seen = new Set<string>();
  const q: string[] = [];
  for (const ep of entrypoints) {
    if (nodeByPath.has(ep)) {
      q.push(ep);
      seen.add(ep);
    }
  }
  while (q.length > 0) {
    const cur = q.shift()!;
    const next = adj.get(cur) ?? [];
    for (const to of next) {
      if (!nodeByPath.has(to)) continue;
      if (seen.has(to)) continue;
      seen.add(to);
      q.push(to);
    }
  }
  return seen;
}

function depthFromEntrypoints(
  entrypoints: string[],
  adj: Map<string, string[]>,
  nodeByPath: Map<string, FileNode>
): Map<string, number> {
  const depth = new Map<string, number>();
  const q: Array<{ p: string; d: number }> = [];
  for (const ep of entrypoints) {
    if (nodeByPath.has(ep)) {
      depth.set(ep, 0);
      q.push({ p: ep, d: 0 });
    }
  }
  while (q.length > 0) {
    const { p, d } = q.shift()!;
    const next = adj.get(p) ?? [];
    for (const to of next) {
      if (!nodeByPath.has(to)) continue;
      const prev = depth.get(to);
      if (prev !== undefined && prev <= d + 1) continue;
      depth.set(to, d + 1);
      q.push({ p: to, d: d + 1 });
    }
  }
  return depth;
}

function normalizeForDup(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith("//"))
    .join("\n");
}

async function hashFile(absPath: string): Promise<string | undefined> {
  try {
    const raw = await fs.readFile(absPath, "utf8");
    const norm = normalizeForDup(raw);
    return crypto.createHash("sha256").update(norm).digest("hex");
  } catch {
    return undefined;
  }
}

async function computeRedundancy(
  snapshot: ProjectGraphSnapshot,
  workspaceRoot: string
): Promise<{ redundancyIndex: number; findings: Finding[]; warnings: string[] }> {
  const warnings: string[] = [];
  const srcNodes = snapshot.nodes.filter((n) => n.kind === "src");
  if (srcNodes.length === 0) {
    return { redundancyIndex: 0, findings: [], warnings };
  }

  const byHash = new Map<string, string[]>();
  for (const n of srcNodes) {
    const h = await hashFile(path.join(workspaceRoot, n.path));
    if (!h) continue;
    const arr = byHash.get(h) ?? [];
    arr.push(n.path);
    byHash.set(h, arr);
  }

  const duplicateGroups = [...byHash.values()].filter((g) => g.length > 1);
  const dupExtra = duplicateGroups.reduce((acc, g) => acc + (g.length - 1), 0);
  const redundancyIndex = clamp01(dupExtra / srcNodes.length);

  const findings: Finding[] = duplicateGroups
    .sort((a, b) => b.length - a.length)
    .slice(0, 10)
    .map((group) => {
      const id = stableId("dup", group);
      return {
        id,
        category: "redundancy",
        severity: group.length >= 3 ? "high" : "medium",
        title: `Duplicate module content (${group.length} files)`,
        evidence: group.sort(),
        suggestedActions: ["choose canonical implementation", "migrate callsites", "delete duplicates"],
        metricImpact: { redundancyIndex },
      };
    });

  if (duplicateGroups.length > 10) {
    warnings.push(`Redundancy: ${duplicateGroups.length} duplicate groups found; report capped at 10.`);
  }

  return { redundancyIndex, findings, warnings };
}

async function computeTodoDensity(
  snapshot: ProjectGraphSnapshot,
  workspaceRoot: string
): Promise<{ todoDensity: number; todoCount: number; findings: Finding[] }> {
  const srcNodes = snapshot.nodes.filter((n) => n.kind === "src" || n.kind === "test");
  let todoCount = 0;
  let totalLoc = 0;

  for (const n of srcNodes) {
    totalLoc += n.loc;
    try {
      const raw = await fs.readFile(path.join(workspaceRoot, n.path), "utf8");
      const matches = raw.match(/\b(TODO|FIXME)\b/g);
      if (matches) todoCount += matches.length;
    } catch {
      // ignore
    }
  }

  const kloc = Math.max(1, totalLoc / 1000);
  const todoDensity = todoCount / kloc;

  const findings: Finding[] = todoCount > 0
    ? [{
      id: stableId("todo", [String(todoCount), String(totalLoc)]),
      category: "todo_density",
      severity: todoDensity >= 5 ? "high" : todoDensity >= 2 ? "medium" : "low",
      title: `TODO/FIXME density: ${todoDensity.toFixed(2)} per KLOC (${todoCount} total)`,
      evidence: [],
      suggestedActions: ["convert high-signal TODOs into plan items", "delete stale TODOs", "add acceptance criteria for remaining TODOs"],
      metricImpact: { todoDensity },
    }]
    : [];

  return { todoDensity, todoCount, findings };
}

function computeTestGapIndex(snapshot: ProjectGraphSnapshot): { testGapIndex: number; missing: string[] } {
  const src = snapshot.nodes.filter((n) => n.kind === "src");
  if (src.length === 0) return { testGapIndex: 0, missing: [] };

  const tested = new Set<string>();
  for (const e of snapshot.edges) {
    if (e.type === "testOf") tested.add(e.to);
  }

  const missing = src.map((n) => n.path).filter((p) => !tested.has(p)).sort();
  return { testGapIndex: clamp01(missing.length / src.length), missing };
}

function computeDeadCodeRatio(snapshot: ProjectGraphSnapshot): { deadCodeRatio: number; unreachable: string[] } {
  const nodeByPath = new Map(snapshot.nodes.map((n) => [n.path, n] as const));
  const adj = buildAdjacency(snapshot.edges, "import");
  const reachable = reachableFromEntrypoints(snapshot.entrypoints, adj, nodeByPath);

  const srcNodes = snapshot.nodes.filter((n) => n.kind === "src");
  if (srcNodes.length === 0) return { deadCodeRatio: 0, unreachable: [] };

  const unreachable = srcNodes
    .map((n) => n.path)
    .filter((p) => !reachable.has(p))
    .sort();

  return {
    deadCodeRatio: clamp01(unreachable.length / srcNodes.length),
    unreachable,
  };
}

function computeAbstractionIndex(snapshot: ProjectGraphSnapshot): { abstractionDepthIndex: number; interfaceFileCount: number } {
  const src = snapshot.nodes.filter((n) => n.kind === "src");
  if (src.length === 0) return { abstractionDepthIndex: 0, interfaceFileCount: 0 };
  const interfaceFiles = src.filter((n) => n.exports.some((e) => /^[A-Z]/.test(e)) && n.path.endsWith(".ts"));
  const ratio = interfaceFiles.length / src.length;
  return { abstractionDepthIndex: clamp01(ratio), interfaceFileCount: interfaceFiles.length };
}

function computeDepChainLenP95(snapshot: ProjectGraphSnapshot): number {
  const nodeByPath = new Map(snapshot.nodes.map((n) => [n.path, n] as const));
  const adj = buildAdjacency(snapshot.edges, "import");
  const depth = depthFromEntrypoints(snapshot.entrypoints, adj, nodeByPath);
  const srcDepths = snapshot.nodes
    .filter((n) => n.kind === "src")
    .map((n) => depth.get(n.path))
    .filter((d): d is number => typeof d === "number");
  return percentile(srcDepths, 0.95);
}

export async function computeEntropyReport(
  snapshot: ProjectGraphSnapshot,
  workspaceRoot: string
): Promise<EntropyReport> {
  const warnings: string[] = [];

  const { deadCodeRatio, unreachable } = computeDeadCodeRatio(snapshot);
  const { testGapIndex, missing } = computeTestGapIndex(snapshot);
  const depChainLenP95 = computeDepChainLenP95(snapshot);
  const { abstractionDepthIndex, interfaceFileCount } = computeAbstractionIndex(snapshot);
  const { todoDensity, findings: todoFindings } = await computeTodoDensity(snapshot, workspaceRoot);

  const redundancy = await computeRedundancy(snapshot, workspaceRoot);
  warnings.push(...redundancy.warnings);

  // churnVolatility placeholder (future): 0 with warning when git stats absent
  const churnVolatility = 0;
  warnings.push("Churn volatility not computed yet (v1).");

  const metrics: EntropyMetrics = {
    deadCodeRatio,
    redundancyIndex: redundancy.redundancyIndex,
    abstractionDepthIndex,
    depChainLenP95,
    testGapIndex,
    churnVolatility,
    todoDensity,
  };

  const depChainNorm = clamp01(depChainLenP95 / 10);

  const score = Math.round(100 * (
    0.25 * metrics.deadCodeRatio +
    0.20 * metrics.redundancyIndex +
    0.15 * metrics.abstractionDepthIndex +
    0.10 * depChainNorm +
    0.15 * metrics.testGapIndex +
    0.10 * metrics.churnVolatility +
    0.05 * clamp01(metrics.todoDensity / 10)
  ));

  const findings: Finding[] = [];

  if (unreachable.length > 0) {
    findings.push({
      id: stableId("dead", unreachable.slice(0, 50)),
      category: "dead_code",
      severity: deadCodeRatio >= 0.25 ? "high" : deadCodeRatio >= 0.10 ? "medium" : "low",
      title: `Unreachable src files from entrypoints: ${unreachable.length}/${snapshot.nodes.filter((n) => n.kind === "src").length}`,
      evidence: unreachable.slice(0, 20),
      suggestedActions: ["delete unreachable files", "wire into entrypoints", "add allowlist for dynamic entrypoints"],
      metricImpact: { deadCodeRatio },
    });
    if (unreachable.length > 20) {
      warnings.push(`Dead code: ${unreachable.length} unreachable files found; evidence capped at 20.`);
    }
  }

  if (missing.length > 0) {
    findings.push({
      id: stableId("testgap", missing.slice(0, 50)),
      category: "test_gaps",
      severity: testGapIndex >= 0.50 ? "high" : testGapIndex >= 0.20 ? "medium" : "low",
      title: `Src files without test mapping: ${missing.length}/${snapshot.nodes.filter((n) => n.kind === "src").length}`,
      evidence: missing.slice(0, 20),
      suggestedActions: ["add tests for high-churn/high-centrality files first", "explicitly mark files as low-test-priority if appropriate"],
      metricImpact: { testGapIndex },
    });
    if (missing.length > 20) {
      warnings.push(`Test gaps: ${missing.length} src files missing tests; evidence capped at 20.`);
    }
  }

  if (depChainLenP95 > 5) {
    findings.push({
      id: stableId("depdepth", [String(depChainLenP95)]),
      category: "dependency_depth",
      severity: depChainLenP95 >= 10 ? "high" : "medium",
      title: `Dependency depth p95: ${depChainLenP95}`,
      evidence: snapshot.entrypoints,
      suggestedActions: ["reduce import chain length in core paths", "collapse wrapper layers", "split large modules"],
      metricImpact: { depChainLenP95 },
    });
  }

  if (interfaceFileCount > 0) {
    findings.push({
      id: stableId("abst", [String(interfaceFileCount)]),
      category: "abstraction",
      severity: abstractionDepthIndex >= 0.5 ? "medium" : "low",
      title: `Abstraction signal: ${interfaceFileCount} src file(s) exporting named symbols (proxy)`,
      evidence: [],
      suggestedActions: ["audit one-impl abstractions", "collapse speculative interfaces", "prefer concrete helpers until reuse exists"],
      metricImpact: { abstractionDepthIndex },
    });
  }

  findings.push(...redundancy.findings);
  findings.push(...todoFindings);

  // Breakdown: allocate points by category contribution (approximate).
  const breakdown = [
    { category: "dead_code" as FindingCategory, points: Math.round(100 * 0.25 * metrics.deadCodeRatio), topFindingIds: findings.filter((f) => f.category === "dead_code").map((f) => f.id).slice(0, 3) },
    { category: "redundancy" as FindingCategory, points: Math.round(100 * 0.20 * metrics.redundancyIndex), topFindingIds: findings.filter((f) => f.category === "redundancy").map((f) => f.id).slice(0, 3) },
    { category: "test_gaps" as FindingCategory, points: Math.round(100 * 0.15 * metrics.testGapIndex), topFindingIds: findings.filter((f) => f.category === "test_gaps").map((f) => f.id).slice(0, 3) },
    { category: "dependency_depth" as FindingCategory, points: Math.round(100 * 0.10 * depChainNorm), topFindingIds: findings.filter((f) => f.category === "dependency_depth").map((f) => f.id).slice(0, 3) },
    { category: "abstraction" as FindingCategory, points: Math.round(100 * 0.15 * metrics.abstractionDepthIndex), topFindingIds: findings.filter((f) => f.category === "abstraction").map((f) => f.id).slice(0, 3) },
    { category: "todo_density" as FindingCategory, points: Math.round(100 * 0.05 * clamp01(metrics.todoDensity / 10)), topFindingIds: findings.filter((f) => f.category === "todo_density").map((f) => f.id).slice(0, 3) },
    { category: "churn" as FindingCategory, points: Math.round(100 * 0.10 * metrics.churnVolatility), topFindingIds: findings.filter((f) => f.category === "churn").map((f) => f.id).slice(0, 3) },
  ].filter((b) => b.points > 0 || b.topFindingIds.length > 0);

  return {
    version: 1,
    generatedAt: Date.now(),
    score: Math.max(0, Math.min(100, score)),
    metrics,
    breakdown,
    findings: findings.sort((a, b) => (b.severity.localeCompare(a.severity) || a.id.localeCompare(b.id))),
    warnings,
  };
}

export function renderEntropyMarkdown(report: EntropyReport): string {
  const lines: string[] = [];
  lines.push(`# Entropy Report`);
  lines.push("");
  lines.push(`- Generated: ${new Date(report.generatedAt).toISOString()}`);
  lines.push(`- Entropy score: **${report.score}/100**`);
  lines.push("");
  lines.push("## Metrics");
  lines.push("");
  lines.push("| Metric | Value |");
  lines.push("|---|---:|");
  lines.push(`| deadCodeRatio | ${report.metrics.deadCodeRatio.toFixed(3)} |`);
  lines.push(`| redundancyIndex | ${report.metrics.redundancyIndex.toFixed(3)} |`);
  lines.push(`| abstractionDepthIndex | ${report.metrics.abstractionDepthIndex.toFixed(3)} |`);
  lines.push(`| depChainLenP95 | ${report.metrics.depChainLenP95.toFixed(1)} |`);
  lines.push(`| testGapIndex | ${report.metrics.testGapIndex.toFixed(3)} |`);
  lines.push(`| churnVolatility | ${report.metrics.churnVolatility.toFixed(3)} |`);
  lines.push(`| todoDensity (per KLOC) | ${report.metrics.todoDensity.toFixed(2)} |`);
  lines.push("");
  lines.push("## Breakdown");
  lines.push("");
  for (const b of report.breakdown) {
    lines.push(`- **${b.category}**: ${b.points} points`);
  }
  lines.push("");
  lines.push("## Top findings");
  lines.push("");
  for (const f of report.findings.slice(0, 15)) {
    lines.push(`### ${f.id} — ${f.category} (${f.severity})`);
    lines.push(f.title);
    if (f.evidence.length > 0) {
      lines.push("");
      lines.push("Evidence:");
      for (const e of f.evidence.slice(0, 20)) {
        lines.push(`- \`${e}\``);
      }
    }
    if (f.suggestedActions.length > 0) {
      lines.push("");
      lines.push("Suggested actions:");
      for (const a of f.suggestedActions) {
        lines.push(`- ${a}`);
      }
    }
    lines.push("");
  }
  if (report.warnings && report.warnings.length > 0) {
    lines.push("## Warnings");
    lines.push("");
    for (const w of report.warnings) {
      lines.push(`- ${w}`);
    }
    lines.push("");
  }
  return lines.join("\n");
}

