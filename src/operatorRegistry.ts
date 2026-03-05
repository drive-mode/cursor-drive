import * as vscode from "vscode";
import { EventEmitter } from "events";
import type { SyncState } from "./syncTypes.js";

export type OperatorStatus = "active" | "background" | "completed" | "merged" | "paused";

/**
 * Semantic roles for operators. Each role carries a default permission preset
 * and a system prompt hint that shapes the operator's behavior.
 */
export type OperatorRole = "implementer" | "reviewer" | "tester" | "researcher" | "planner";

export interface RoleTemplate {
  defaultPreset: PermissionPreset;
  description: string;
  systemHint: string;
}

export const ROLE_TEMPLATES: Record<OperatorRole, RoleTemplate> = {
  implementer: {
    defaultPreset: "standard",
    description: "Writes and modifies code",
    systemHint: "You are an implementer. Write production-quality code, follow existing patterns, and report files touched via agent_screen_file.",
  },
  reviewer: {
    defaultPreset: "readonly",
    description: "Reviews code without modifying files",
    systemHint: "You are a reviewer. Analyze code for bugs, risks, and quality. Do NOT edit files. Report findings via agent_screen_decision.",
  },
  tester: {
    defaultPreset: "standard",
    description: "Writes and runs tests",
    systemHint: "You are a tester. Write test cases, run test suites, and verify behavior. Report test results via agent_screen_activity.",
  },
  researcher: {
    defaultPreset: "readonly",
    description: "Researches solutions and gathers context",
    systemHint: "You are a researcher. Explore the codebase, read documentation, and synthesize findings. Do NOT edit production files.",
  },
  planner: {
    defaultPreset: "readonly",
    description: "Creates plans and breaks down tasks",
    systemHint: "You are a planner. Analyze requirements, break tasks into actionable steps, and produce plan artifacts. Do NOT implement code.",
  },
};

export interface EscalationEvent {
  operatorId: string;
  operatorName: string;
  reason: string;
  severity: "info" | "warning" | "critical";
  timestamp: number;
}

export interface OperatorRegistryEvents {
  operatorCompleted: (id: string, summary: string) => void;
  operatorProgress: (id: string, message: string) => void;
  operatorError: (id: string, error: string) => void;
  taskDelegated: (fromId: string, toId: string, task: string) => void;
  operatorEscalated: (event: EscalationEvent) => void;
}

export type OperatorVisibility = "isolated" | "shared" | "collaborative";

/** Permission tiers. Higher index = more permissive. */
export type PermissionPreset = "readonly" | "standard" | "full";

const PRESET_ORDER: PermissionPreset[] = ["readonly", "standard", "full"];

/** Return the less-permissive of two presets ("deny always wins"). */
export function minPreset(a: PermissionPreset, b: PermissionPreset): PermissionPreset {
  const ai = PRESET_ORDER.indexOf(a);
  const bi = PRESET_ORDER.indexOf(b);
  return ai <= bi ? a : b;
}

export interface OperatorContext {
  id: string;
  name: string;
  voice: string | undefined;
  task: string;
  status: OperatorStatus;
  createdAt: number;
  memory: string[];
  visibility: OperatorVisibility;
  /**
   * Spawn depth: 0 = user-spawned (top-level), 1 = spawned by an operator, etc.
   * Depth-1+ operators default to "readonly" and can never exceed parent's preset.
   */
  depth: number;
  /** ID of the operator that spawned this one, if any. */
  parentId?: string;
  /** Effective permission preset stored at spawn time (cascade applied). */
  permissionPreset: PermissionPreset;
  /** Semantic role (optional). When set, provides default preset and system prompt hint. */
  role?: OperatorRole;
  /** System prompt hint derived from role template. Injected by consumers (MCP server, pipeline). */
  systemHint?: string;

  // ── Workspace isolation fields (mob-programming cockpit) ────────────────
  /** Absolute path to this operator's isolated worktree. */
  worktreePath?: string;
  /** Git branch name for this operator's worktree. */
  branchName?: string;
  /** Base commit (fork point) for this operator's work. */
  baseCommit?: string;
  /** Head commit of this operator's branch. */
  headCommit?: string;
  /** Current sync state relative to the user branch. */
  syncState?: SyncState;
}

export interface SpawnOptions {
  /** Explicit preset; will be capped to parent's effective preset if parentId is given. */
  preset?: PermissionPreset;
  /** ID of the parent operator delegating to this one. */
  parentId?: string;
  /** Override spawn depth (normally derived from parent). */
  depth?: number;
  /** Semantic role — sets default preset and system hint from ROLE_TEMPLATES. */
  role?: OperatorRole;
}

const FALLBACK_NAMES = ["Alpha", "Beta", "Gamma", "Delta", "Epsilon", "Zeta", "Eta", "Theta"];

function getNamePool(): string[] {
  const cfg = vscode.workspace.getConfiguration("cursorDrive");
  const pool = cfg.get<string[]>("operators.namePool", FALLBACK_NAMES);
  return Array.isArray(pool) && pool.length > 0
    ? pool.filter((n) => typeof n === "string" && n.trim().length > 0).map((n) => String(n).trim())
    : FALLBACK_NAMES;
}

type RegistryListener = () => void;

export class OperatorRegistry {
  private operators: Map<string, OperatorContext> = new Map();
  private nameToId: Map<string, string> = new Map();
  private foregroundId: string | undefined;
  private listeners: Set<RegistryListener> = new Set();
  readonly events = new EventEmitter();

  onDidChange(listener: RegistryListener): { dispose: () => void } {
    this.listeners.add(listener);
    return {
      dispose: () => {
        this.listeners.delete(listener);
      },
    };
  }

  private emitChange(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }

  spawn(name?: string, task = "", options?: SpawnOptions): OperatorContext {
    const id = `operator-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    // Resolve name, then ensure case-insensitive uniqueness.
    let resolvedName = name?.trim() || this.nextAvailableName();
    if (this.nameToId.has(resolvedName.toLowerCase())) {
      resolvedName = this.nextAvailableNameFrom(resolvedName);
    }

    // Validate parentId — if provided but not found, treat as no parent (fail-safe).
    const requestedParentId = options?.parentId;
    const parentId = requestedParentId && this.operators.has(requestedParentId)
      ? requestedParentId
      : undefined;
    if (requestedParentId && !parentId) {
      console.warn(`[OperatorRegistry] spawn: parentId "${requestedParentId}" not found; spawning without parent.`);
    }

    const depth = options?.depth ?? (parentId ? (this.operators.get(parentId)!.depth) + 1 : 0);
    const role = options?.role;
    const roleTemplate = role ? ROLE_TEMPLATES[role] : undefined;

    // Role provides a default preset; depth and explicit preset override.
    let preset: PermissionPreset =
      options?.preset
      ?? roleTemplate?.defaultPreset
      ?? (depth > 0 ? "readonly" : "standard");

    // Cascade: child can never be more permissive than parent.
    if (parentId) {
      const parent = this.operators.get(parentId)!;
      preset = minPreset(preset, parent.permissionPreset);
    }

    const op: OperatorContext = {
      id,
      name: resolvedName,
      voice: undefined,
      task,
      status: "active",
      createdAt: Date.now(),
      memory: [],
      visibility: "shared",
      depth,
      parentId,
      permissionPreset: preset,
      role,
      systemHint: roleTemplate?.systemHint,
    };
    this.operators.set(id, op);
    this.nameToId.set(resolvedName.toLowerCase(), id);

    // First operator becomes foreground; subsequent ones start in background.
    if (!this.foregroundId) {
      this.foregroundId = id;
    } else {
      op.status = "background";
    }
    this.emitChange();
    return op;
  }

  private nextAvailableName(): string {
    for (const name of getNamePool()) {
      if (!this.nameToId.has(name.toLowerCase())) { return name; }
    }
    return `Operator${this.operators.size + 1}`;
  }

  /** Return a unique variant of `base` when `base` already exists (case-insensitive). */
  private nextAvailableNameFrom(base: string): string {
    let candidate = base;
    let suffix = 2;
    while (this.nameToId.has(candidate.toLowerCase())) {
      candidate = `${base}${suffix}`;
      suffix++;
    }
    return candidate;
  }

  getForeground(): OperatorContext | undefined {
    if (!this.foregroundId) { return undefined; }
    return this.operators.get(this.foregroundId);
  }

  /**
   * Switch foreground to the operator matching the given name or id.
   * Previous foreground moves to background.
   */
  switchTo(nameOrId: string): OperatorContext | undefined {
    const target = this.findByNameOrId(nameOrId);
    if (!target) { return undefined; }

    const prevId = this.foregroundId;
    if (prevId && prevId !== target.id) {
      const prev = this.operators.get(prevId);
      if (prev && prev.status === "active") {
        prev.status = "background";
      }
    }

    this.foregroundId = target.id;
    target.status = "active";
    this.emitChange();
    return target;
  }

  pause(nameOrId: string): boolean {
    const op = this.findByNameOrId(nameOrId);
    if (!op) { return false; }
    op.status = "paused";
    if (this.foregroundId === op.id) {
      this.foregroundId = this.pickNextForeground(op.id);
    }
    this.emitChange();
    return true;
  }

  resume(nameOrId: string): boolean {
    const op = this.findByNameOrId(nameOrId);
    if (!op || op.status !== "paused") { return false; }
    op.status = this.foregroundId ? "background" : "active";
    if (!this.foregroundId) { this.foregroundId = op.id; }
    this.emitChange();
    return true;
  }

  dismiss(nameOrId: string): boolean {
    const op = this.findByNameOrId(nameOrId);
    if (!op) { return false; }
    op.status = "completed";
    this.events.emit("operatorCompleted", op.id, op.task || "completed");
    if (this.foregroundId === op.id) {
      this.foregroundId = this.pickNextForeground(op.id);
    }
    // Cascade dismiss: all operators spawned by this one are also completed.
    for (const child of this.operators.values()) {
      if (child.parentId === op.id && child.status !== "completed" && child.status !== "merged") {
        child.status = "completed";
        this.events.emit("operatorCompleted", child.id, `Cascade dismiss from ${op.name}`);
        if (this.foregroundId === child.id) {
          this.foregroundId = this.pickNextForeground(child.id);
        }
      }
    }
    this.emitChange();
    return true;
  }

  /** Emit progress for an operator (call from MCP tools or workers). */
  emitProgress(idOrName: string, message: string): void {
    const op = this.findByNameOrId(idOrName);
    if (op) { this.events.emit("operatorProgress", op.id, message); }
  }

  /** Emit error for an operator. */
  emitError(idOrName: string, error: string): void {
    const op = this.findByNameOrId(idOrName);
    if (op) { this.events.emit("operatorError", op.id, error); }
  }

  /** Emit task delegation (fromId delegated to toId). */
  emitTaskDelegated(fromId: string, toId: string, task: string): void {
    this.events.emit("taskDelegated", fromId, toId, task);
  }

  /**
   * Merge source operator's memory/task context into target, then deactivate source.
   */
  merge(sourceName: string, targetName: string): boolean {
    const src = this.findByNameOrId(sourceName);
    const tgt = this.findByNameOrId(targetName);
    if (!src || !tgt) { return false; }
    const summary = `[Merged from ${src.name}] Task: ${src.task}. Notes: ${src.memory.join("; ")}`;
    tgt.memory.push(summary);
    src.status = "merged";
    if (this.foregroundId === src.id) {
      this.foregroundId = tgt.id;
      tgt.status = "active";
    }
    this.emitChange();
    return true;
  }

  list(): OperatorContext[] {
    return [...this.operators.values()];
  }

  getActive(): OperatorContext[] {
    return [...this.operators.values()].filter(
      (o) => o.status !== "completed" && o.status !== "merged"
    );
  }

  activeCount(): number {
    return this.getActive().length;
  }

  updateTask(idOrName: string, task: string): boolean {
    const op = this.findByNameOrId(idOrName);
    if (!op) { return false; }
    op.task = task;
    this.emitChange();
    return true;
  }

  updateMemory(idOrName: string, entry: string): void {
    const op = this.findByNameOrId(idOrName);
    if (!op) { return; }
    op.memory.push(entry);
    // Keep last 50 entries to bound memory usage.
    if (op.memory.length > 50) {
      op.memory = op.memory.slice(-50);
    }
    this.emitChange();
  }

  setVisibility(idOrName: string, visibility: OperatorVisibility): boolean {
    const op = this.findByNameOrId(idOrName);
    if (!op) { return false; }
    op.visibility = visibility;
    this.emitChange();
    return true;
  }

  /**
   * Delegate a task from one operator to another.
   * The delegated operator is spawned at depth+1 with at most "readonly" permissions.
   * Spawns target if it doesn't exist.
   */
  delegate(fromIdOrName: string, toIdOrName: string, task: string): OperatorContext | undefined {
    const from = this.findByNameOrId(fromIdOrName);
    if (!from) { return undefined; }
    let to = this.findByNameOrId(toIdOrName);
    if (!to) {
      to = this.spawn(toIdOrName, task, {
        parentId: from.id,
        depth: from.depth + 1,
        preset: "readonly",
      });
    } else {
      to.task = task;
      this.emitChange();
    }
    this.emitTaskDelegated(from.id, to.id, task);
    return to;
  }

  /**
   * Compute the effective permission preset for an operator, applying the full
   * parent cascade. Returns the most restrictive preset in the ancestry chain.
   */
  effectivePreset(idOrName: string): PermissionPreset {
    const op = this.findByNameOrId(idOrName);
    if (!op) { return "readonly"; }
    let preset = op.permissionPreset;
    let current = op;
    while (current.parentId) {
      const parent = this.operators.get(current.parentId);
      if (!parent) { break; }
      preset = minPreset(preset, parent.permissionPreset);
      current = parent;
    }
    return preset;
  }

  /**
   * Operator signals it needs help or is blocked. Emits an escalation event
   * that consumers (commsAgent, Agent Screen) can act on.
   */
  escalate(idOrName: string, reason: string, severity: EscalationEvent["severity"] = "warning"): boolean {
    const op = this.findByNameOrId(idOrName);
    if (!op) { return false; }
    const event: EscalationEvent = {
      operatorId: op.id,
      operatorName: op.name,
      reason,
      severity,
      timestamp: Date.now(),
    };
    this.events.emit("operatorEscalated", event);
    op.memory.push(`[Escalation/${severity}] ${reason}`);
    this.emitChange();
    return true;
  }

  /**
   * Update workspace-tracking metadata for an operator.
   * Triggers change notification on successful update.
   */
  updateWorkspaceState(
    idOrName: string,
    state: Partial<{
      worktreePath: string;
      branchName: string;
      baseCommit: string;
      headCommit: string;
      syncState: SyncState;
    }>
  ): boolean {
    const op = this.findByNameOrId(idOrName);
    if (!op) { return false; }
    if (state.worktreePath !== undefined) { op.worktreePath = state.worktreePath; }
    if (state.branchName !== undefined) { op.branchName = state.branchName; }
    if (state.baseCommit !== undefined) { op.baseCommit = state.baseCommit; }
    if (state.headCommit !== undefined) { op.headCommit = state.headCommit; }
    if (state.syncState !== undefined) { op.syncState = state.syncState; }
    this.emitChange();
    return true;
  }

  /** Get the role template for a given role name (if valid). */
  static getRoleTemplate(role: OperatorRole): RoleTemplate {
    return ROLE_TEMPLATES[role];
  }

  findByNameOrId(nameOrId: string): OperatorContext | undefined {
    const byId = this.operators.get(nameOrId);
    if (byId) { return byId; }
    const idByName = this.nameToId.get(nameOrId.toLowerCase());
    return idByName ? this.operators.get(idByName) : undefined;
  }

  private pickNextForeground(excludeId: string): string | undefined {
    for (const o of this.operators.values()) {
      if (o.id !== excludeId && (o.status === "active" || o.status === "background")) {
        o.status = "active";
        return o.id;
      }
    }
    return undefined;
  }
}
