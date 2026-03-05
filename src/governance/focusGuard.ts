import * as fs from "fs/promises";
import * as path from "path";

export interface FocusGuardConfig {
  enabled: boolean;
  maxActivePlans: number;
  maxActiveOperators: number;
}

export interface FocusGuardState {
  activePlans: number;
  activeOperators: number;
}

export interface FocusGuardDecision {
  allowed: boolean;
  reasons: string[];
}

export function evaluateFocusGuard(
  cfg: FocusGuardConfig,
  state: FocusGuardState
): FocusGuardDecision {
  if (!cfg.enabled) {
    return { allowed: true, reasons: [] };
  }

  const reasons: string[] = [];
  if (state.activeOperators >= cfg.maxActiveOperators) {
    reasons.push(`active operators (${state.activeOperators}) >= max (${cfg.maxActiveOperators})`);
  }
  if (state.activePlans >= cfg.maxActivePlans) {
    reasons.push(`active plans (${state.activePlans}) >= max (${cfg.maxActivePlans})`);
  }
  return { allowed: reasons.length === 0, reasons };
}

/**
 * Best-effort parser for `.cursor/plans/registry.yaml` to count active (todo_empty=false) plans.
 * This is intentionally dependency-free (no YAML library) and tolerant to extra fields.
 */
export async function countActivePlansFromRegistryYaml(
  workspaceRoot: string
): Promise<number> {
  const registryPath = path.join(workspaceRoot, ".cursor", "plans", "registry.yaml");
  let text = "";
  try {
    text = await fs.readFile(registryPath, "utf8");
  } catch {
    return 0;
  }

  // Parse plan entries from YAML-ish indentation.
  type PlanEntry = { todo_empty?: boolean; archived?: boolean; plan_type?: string };
  const entries: PlanEntry[] = [];
  let current: PlanEntry | null = null;

  for (const rawLine of text.split("\n")) {
    const line = rawLine.replace(/\t/g, "  ");
    const start = line.match(/^\s*-\s+id:\s+/);
    if (start) {
      if (current) entries.push(current);
      current = {};
      continue;
    }
    if (!current) continue;

    const m = line.match(/^\s+([a-zA-Z_]+):\s*(.+?)\s*$/);
    if (!m) continue;
    const key = m[1];
    const val = m[2];

    if (key === "todo_empty") {
      current.todo_empty = val === "true";
    } else if (key === "archived" || key === "_archived") {
      current.archived = val === "true";
    } else if (key === "plan_type") {
      current.plan_type = val;
    }
  }
  if (current) entries.push(current);

  const active = entries.filter((e) => {
    if (e.archived) return false;
    if (e.plan_type === "project") return false;
    return e.todo_empty === false;
  });
  return active.length;
}

