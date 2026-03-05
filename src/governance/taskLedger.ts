import type { EntropyReport, Finding, Task, TaskLedger, TaskPriority } from "./schemas.js";

function severityRisk(sev: Finding["severity"]): number {
  switch (sev) {
    case "high": return 80;
    case "medium": return 50;
    case "low":
    default:
      return 20;
  }
}

function effortForEvidenceCount(n: number): Task["effortBand"] {
  if (n <= 1) return "xs";
  if (n <= 5) return "s";
  if (n <= 15) return "m";
  return "l";
}

function priorityForFinding(f: Finding): TaskPriority {
  if (f.severity === "high") return "p0";
  if (f.category === "dead_code" && f.severity !== "low") return "p0";
  if (f.category === "redundancy" && f.severity !== "low") return "p1";
  if (f.category === "test_gaps" && f.severity === "medium") return "p1";
  return "p2";
}

function taskTypeForFinding(f: Finding): Task["type"] {
  switch (f.category) {
    case "dead_code":
      return "delete";
    case "redundancy":
    case "abstraction":
    case "dependency_depth":
      return "refactor";
    case "test_gaps":
      return "test";
    case "todo_density":
    case "churn":
    case "focus":
    default:
      return "investigate";
  }
}

function rootCauseForFinding(f: Finding): string {
  switch (f.category) {
    case "dead_code":
      return "Files not reachable from current entrypoints (feature drift, abandoned spikes, or missing wiring).";
    case "redundancy":
      return "Duplicate implementations introduced during fast iteration (AI-assisted churn).";
    case "test_gaps":
      return "Source files without tests or without detected test-to-code mapping.";
    case "todo_density":
      return "Open-ended TODO/FIXME notes accumulating without ownership or plan linkage.";
    case "dependency_depth":
      return "Deep import chains in core paths, likely from wrapper layers or over-modularization.";
    case "abstraction":
      return "Abstractions may be speculative or not paying for themselves.";
    default:
      return "Governance finding requires investigation.";
  }
}

function impactForFinding(f: Finding): string {
  switch (f.category) {
    case "dead_code":
      return "Increases cognitive load and hides real ownership; slows refactors and reviews.";
    case "redundancy":
      return "Inconsistent behavior and higher maintenance cost; harder bug fixes.";
    case "test_gaps":
      return "Regressions are easier to introduce; refactors are risky.";
    case "todo_density":
      return "Creates unfinished threads and weakens focus discipline.";
    case "dependency_depth":
      return "Harder reasoning, more ripple effects, and longer build/test iterations.";
    case "abstraction":
      return "Premature patterns reduce clarity and make changes harder.";
    default:
      return "Potentially increases entropy.";
  }
}

function recommendedResolutionForFinding(f: Finding): string[] {
  // Prefer reusing suggested actions but ensure they are action-shaped.
  if (f.suggestedActions.length > 0) return f.suggestedActions;
  return ["triage", "pick canonical approach", "apply minimal change", "re-scan"];
}

export function generateTaskLedger(report: EntropyReport): TaskLedger {
  const tasks: Task[] = [];

  for (const f of report.findings) {
    // Skip low-signal placeholders
    if (f.category === "abstraction" && f.evidence.length === 0) { continue; }

    const evidence = f.evidence.slice(0, 25);
    const riskBase = severityRisk(f.severity);
    const riskScore = Math.max(0, Math.min(100, riskBase + Math.min(20, evidence.length)));

    tasks.push({
      id: `task-${f.id}`,
      type: taskTypeForFinding(f),
      title: f.title,
      rootCause: rootCauseForFinding(f),
      impact: impactForFinding(f),
      recommendedResolution: recommendedResolutionForFinding(f),
      effortBand: effortForEvidenceCount(evidence.length),
      priority: priorityForFinding(f),
      riskScore,
      evidence,
      sourceFindingId: f.id,
    });
  }

  const priorityOrder: Record<TaskPriority, number> = { p0: 0, p1: 1, p2: 2 };
  tasks.sort((a, b) => (
    priorityOrder[a.priority] - priorityOrder[b.priority]
    || b.riskScore - a.riskScore
    || a.id.localeCompare(b.id)
  ));

  return {
    version: 1,
    generatedAt: Date.now(),
    tasks,
  };
}

export function renderWorkboardMarkdown(ledger: TaskLedger): string {
  const lines: string[] = [];
  lines.push("# Governance Workboard");
  lines.push("");
  lines.push(`- Generated: ${new Date(ledger.generatedAt).toISOString()}`);
  lines.push(`- Tasks: ${ledger.tasks.length}`);
  lines.push("");

  const groups: Record<string, Task[]> = { p0: [], p1: [], p2: [] };
  for (const t of ledger.tasks) {
    groups[t.priority].push(t);
  }

  for (const prio of ["p0", "p1", "p2"] as const) {
    const items = groups[prio];
    lines.push(`## ${prio.toUpperCase()}`);
    lines.push("");
    if (items.length === 0) {
      lines.push("_None_");
      lines.push("");
      continue;
    }
    for (const t of items.slice(0, 20)) {
      lines.push(`- **${t.id}** [${t.type}] (risk ${t.riskScore}, effort ${t.effortBand}) — ${t.title}`);
      if (t.evidence.length > 0) {
        lines.push(`  - Evidence: ${t.evidence.slice(0, 5).map((e) => `\`${e}\``).join(", ")}${t.evidence.length > 5 ? " …" : ""}`);
      }
    }
    if (items.length > 20) {
      lines.push("");
      lines.push(`_(${items.length - 20} more in ${prio})_`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

