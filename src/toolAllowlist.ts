import * as vscode from "vscode";
import type { OperatorContext, PermissionPreset } from "./operatorRegistry.js";

// Re-export so callers that previously imported PermissionPreset from here still work.
export type { PermissionPreset } from "./operatorRegistry.js";

export type Capability =
  | "fileRead"
  | "fileWrite"
  | "terminalExecute"
  | "gitRead"
  | "gitWrite"
  | "webSearch"
  | "modelCall";

const PRESET_CAPABILITIES: Record<PermissionPreset, Capability[]> = {
  readonly: ["fileRead", "gitRead", "modelCall"],
  standard: ["fileRead", "fileWrite", "terminalExecute", "gitRead", "gitWrite", "modelCall"],
  full: ["fileRead", "fileWrite", "terminalExecute", "gitRead", "gitWrite", "webSearch", "modelCall"],
};

// ── Config-based (name-only) API — backward compatible ─────────────────────

function getPreset(agentName: string): PermissionPreset {
  const cfg = vscode.workspace.getConfiguration("cursorDrive.agents.permissions");
  const overrides = cfg.get<Record<string, PermissionPreset>>("overrides", {});
  if (overrides[agentName]) { return overrides[agentName]; }
  return cfg.get<PermissionPreset>("default", "standard");
}

export function checkPermission(agentName: string, capability: Capability): boolean {
  const preset = getPreset(agentName);
  const allowed = PRESET_CAPABILITIES[preset];
  const permitted = allowed.includes(capability);

  if (!permitted) {
    const msg = `Drive: Agent "${agentName}" (preset: ${preset}) does not have "${capability}" permission.`;
    console.warn(`[Drive Allowlist] ${msg}`);
    void vscode.window.showWarningMessage(msg);
  }

  return permitted;
}

export function getAllowedCapabilities(agentName: string): Capability[] {
  const preset = getPreset(agentName);
  return PRESET_CAPABILITIES[preset];
}

export function getEffectivePreset(agentName: string): PermissionPreset {
  return getPreset(agentName);
}

// ── Operator-aware API — uses OperatorContext + layered cascade ─────────────
//
// Cascade rule: operator.permissionPreset (already pre-capped at spawn time)
// is the effective preset. Config-level overrides by agent name are applied
// on top — deny always wins (min preset wins).

/**
 * Get the effective preset for an operator.
 *
 * The operator's registry-stored preset (set at spawn, parent cascade already
 * applied) is authoritative.  An explicit per-name config override can only
 * further restrict — it can never grant more than the registry preset.
 * The global config "default" preset is intentionally NOT applied here: it is
 * only the fallback for the name-based `checkPermission()` path.
 */
export function getEffectivePresetForOperator(op: OperatorContext): PermissionPreset {
  const registryPreset = op.permissionPreset;
  // Apply only explicit per-name overrides, not the global default.
  const cfg = vscode.workspace.getConfiguration("cursorDrive.agents.permissions");
  const overrides = cfg.get<Record<string, PermissionPreset>>("overrides", {});
  const nameOverride = overrides[op.name];
  if (nameOverride) {
    const order: PermissionPreset[] = ["readonly", "standard", "full"];
    return order.indexOf(registryPreset) <= order.indexOf(nameOverride)
      ? registryPreset
      : nameOverride;
  }
  return registryPreset;
}

/**
 * Check whether an operator has a given capability.
 * Uses the registry-stored preset (depth cascade applied at spawn) plus
 * any config-level name override — deny always wins.
 */
export function checkPermissionForOperator(
  op: OperatorContext,
  capability: Capability
): boolean {
  const preset = getEffectivePresetForOperator(op);
  const allowed = PRESET_CAPABILITIES[preset];
  const permitted = allowed.includes(capability);

  if (!permitted) {
    const msg = `Drive: Operator "${op.name}" (depth: ${op.depth}, preset: ${preset}) does not have "${capability}" permission.`;
    console.warn(`[Drive Allowlist] ${msg}`);
    void vscode.window.showWarningMessage(msg);
  }

  return permitted;
}

/**
 * Return the full list of capabilities for an operator.
 */
export function getAllowedCapabilitiesForOperator(op: OperatorContext): Capability[] {
  const preset = getEffectivePresetForOperator(op);
  return PRESET_CAPABILITIES[preset];
}
