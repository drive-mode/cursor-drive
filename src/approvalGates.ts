import * as vscode from "vscode";

export type GateAction = "allow" | "log" | "warn" | "block";

export interface GateResult {
  action: GateAction;
  reason?: string;
  pattern?: string;
}

/**
 * Runtime stats for steering monitoring. Tracks gate activations per action type
 * and per-operator action counts for throttling decisions.
 */
export interface SteeringStats {
  totalChecks: number;
  actionCounts: Record<GateAction, number>;
  operatorActionCounts: Map<string, Record<GateAction, number>>;
  recentBlocks: Array<{ pattern: string; timestamp: number; operatorId?: string }>;
}

const stats: SteeringStats = {
  totalChecks: 0,
  actionCounts: { allow: 0, log: 0, warn: 0, block: 0 },
  operatorActionCounts: new Map(),
  recentBlocks: [],
};

const MAX_RECENT_BLOCKS = 50;

/** Get a snapshot of current steering statistics. */
export function getSteeringStats(): Readonly<SteeringStats> {
  return stats;
}

export interface ThrottleStatus {
  throttled: boolean;
  reason?: string;
  warnCount: number;
  blockCount: number;
}

/**
 * Check if an operator should be throttled based on recent gate activations.
 * Returns a throttle recommendation if the operator has exceeded thresholds.
 */
export function getThrottleStatus(operatorId: string): ThrottleStatus {
  const opStats = stats.operatorActionCounts.get(operatorId);
  if (!opStats) {
    return { throttled: false, warnCount: 0, blockCount: 0 };
  }

  const { warn: warnCount, block: blockCount } = opStats;

  if (blockCount >= 3) {
    return {
      throttled: true,
      reason: "Operator has been blocked 3+ times this session — suggest escalation to user",
      warnCount,
      blockCount,
    };
  }

  if (warnCount >= 5) {
    return {
      throttled: true,
      reason: "Operator has triggered 5+ warnings this session — suggest role change to reviewer",
      warnCount,
      blockCount,
    };
  }

  return { throttled: false, warnCount, blockCount };
}

/** Clear an operator's accumulated action counts (e.g. on dismiss or reset). */
export function resetOperatorStats(operatorId: string): void {
  stats.operatorActionCounts.delete(operatorId);
}

/** Record a gate activation for stats tracking. */
function recordAction(action: GateAction, pattern?: string, operatorId?: string): void {
  stats.totalChecks++;
  stats.actionCounts[action]++;

  if (operatorId) {
    let opStats = stats.operatorActionCounts.get(operatorId);
    if (!opStats) {
      opStats = { allow: 0, log: 0, warn: 0, block: 0 };
      stats.operatorActionCounts.set(operatorId, opStats);
    }
    opStats[action]++;
  }

  if ((action === "block" || action === "warn") && pattern) {
    stats.recentBlocks.push({ pattern, timestamp: Date.now(), operatorId });
    if (stats.recentBlocks.length > MAX_RECENT_BLOCKS) {
      stats.recentBlocks.shift();
    }
  }
}

const CODE_BLOCK_RE = /```[\s\S]*?```/g;

let gateConfigCache: {
  blockPatterns: RegExp[];
  warnPatterns: RegExp[];
  logPatterns: RegExp[];
  enabled: boolean;
} | null = null;

vscode.workspace.onDidChangeConfiguration((e) => {
  if (e.affectsConfiguration("cursorDrive.approvalGates") || e.affectsConfiguration("cursorDrive.steering")) {
    gateConfigCache = null;
  }
});

const DEFAULT_WARN_PATTERNS: RegExp[] = [
  /\brevert\b/i,
  /undo\s+all/i,
  /hard\s+reset/i,
  /reset\s+--hard/i,
  /force\s+push/i,
  /push\s+--force/i,
  /push\s+-f\b/i,
  /delete\s+branch/i,
  /drop\s+database/i,
  /drop\s+table/i,
];

const DEFAULT_BLOCK_PATTERNS: RegExp[] = [
  /rm\s+-rf/i,
  /del\s+\/f\s+\/s\s+\/q/i,
  /format\s+c:/i,
  /rmdir\s+\/s/i,
];

const DEFAULT_LOG_PATTERNS: RegExp[] = [
  /sudo\b/i,
  /npm\s+publish/i,
  /git\s+push/i,
];

function compilePatterns(patterns: string[]): RegExp[] {
  return patterns.map((p) => {
    try { return new RegExp(p, "i"); } catch { return null; }
  }).filter((r): r is RegExp => r !== null);
}

function getCachedGateConfig() {
  if (gateConfigCache) { return gateConfigCache; }
  const cfg = vscode.workspace.getConfiguration("cursorDrive.approvalGates");
  const steeringCfg = vscode.workspace.getConfiguration("cursorDrive.steering");
  gateConfigCache = {
    enabled: cfg.get<boolean>("enabled", true),
    blockPatterns: [
      ...DEFAULT_BLOCK_PATTERNS,
      ...compilePatterns(cfg.get<string[]>("blockPatterns", [])),
    ],
    warnPatterns: [
      ...DEFAULT_WARN_PATTERNS,
      ...compilePatterns(cfg.get<string[]>("warnPatterns", [])),
    ],
    logPatterns: [
      ...DEFAULT_LOG_PATTERNS,
      ...compilePatterns(steeringCfg.get<string[]>("logPatterns", [])),
    ],
  };
  return gateConfigCache;
}

/**
 * Evaluate text against the graduated gate policy chain: block → warn → log → allow.
 * Optionally accepts an operatorId for per-operator stats tracking.
 */
export function getGateResult(text: string, operatorId?: string): GateResult {
  const { enabled, blockPatterns, warnPatterns, logPatterns } = getCachedGateConfig();
  if (!enabled) {
    recordAction("allow", undefined, operatorId);
    return { action: "allow" };
  }

  for (const re of blockPatterns) {
    const m = text.match(re);
    if (m) {
      recordAction("block", m[0], operatorId);
      return { action: "block", reason: "blocked by safety policy", pattern: m[0] };
    }
  }

  for (const re of warnPatterns) {
    const m = text.match(re);
    if (m) {
      recordAction("warn", m[0], operatorId);
      return { action: "warn", reason: "potentially destructive operation", pattern: m[0] };
    }
  }

  for (const re of logPatterns) {
    const m = text.match(re);
    if (m) {
      recordAction("log", m[0], operatorId);
      return { action: "log", reason: "notable operation logged", pattern: m[0] };
    }
  }

  recordAction("allow", undefined, operatorId);
  return { action: "allow" };
}

export async function checkPrompt(prompt: string): Promise<boolean> {
  const result = getGateResult(prompt);
  return applyGate(result, `Prompt contains "${result.pattern}".`);
}

export async function checkResponse(responseText: string): Promise<boolean> {
  // Extract content from code blocks (``` ... ```) for targeted scanning.
  CODE_BLOCK_RE.lastIndex = 0;
  const blocks = responseText.match(CODE_BLOCK_RE) ?? [];
  const targets = blocks.length > 0 ? blocks.join("\n") : responseText;

  const result = getGateResult(targets);
  if (result.action === "allow") { return true; }
  return applyGate(result, `Response contains "${result.pattern}".`);
}

async function applyGate(result: GateResult, context: string): Promise<boolean> {
  if (result.action === "allow") { return true; }

  if (result.action === "log") {
    console.info(`[Drive Steering] ${context} (${result.pattern ?? ""})`);
    return true;
  }

  if (result.action === "block") {
    void vscode.window.showErrorMessage(
      `Drive blocked: ${context} This operation is not allowed by safety policy.`
    );
    return false;
  }

  // warn — show Proceed / Cancel dialog
  const choice = await vscode.window.showWarningMessage(
    `Drive: ${context} This looks potentially destructive. Proceed?`,
    { modal: true },
    "Proceed",
    "Cancel"
  );
  return choice === "Proceed";
}
