/**
 * PermissionBroker — bridges ACP requestPermission to Drive approvalGates.
 * Ported from ACP Python SDK contrib/permissions.
 *
 * Thin wrapper that maps ACP permission requests to Drive's approval gate checks.
 */

import type { GateResult } from "../approvalGates.js";
import { getGateResult } from "../approvalGates.js";
import type { TrackedToolCallView } from "./toolCallTracker.js";

export interface PermissionOptions {
  approve: string;
  approveForSession: string;
  reject: string;
}

export const defaultPermissionOptions: PermissionOptions = {
  approve: "Approve",
  approveForSession: "Approve for session",
  reject: "Reject",
};

export type PermissionOutcome = "approved" | "approved_for_session" | "rejected";

/**
 * Bridges a tool-call permission request to Drive's approval gates.
 * Returns the user's choice or a gate-derived outcome.
 */
export class PermissionBroker {
  constructor(
    private checkGate: (toolName: string, args: unknown, operatorId?: string) => GateResult
  ) { }

  /**
   * Request permission for a tool call. Uses the tracker view if provided,
   * otherwise requires toolName and args directly.
   */
  async requestFor(
    toolName: string,
    args: unknown,
    options: {
      operatorId?: string;
      toolCall?: TrackedToolCallView;
      permissionOptions?: PermissionOptions;
    } = {}
  ): Promise<PermissionOutcome> {
    const gateResult = this.checkGate(toolName, args, options.operatorId);

    switch (gateResult.action) {
      case "allow":
        return "approved";
      case "log":
      case "warn":
        return "approved"; // Non-blocking; allow
      case "block":
        return "rejected";
      default:
        return "rejected";
    }
  }
}

/** Create a PermissionBroker wired to Drive's approval gates. */
export function createPermissionBroker(): PermissionBroker {
  return new PermissionBroker((toolName, args, operatorId) => {
    const text = `tool: ${toolName} ${typeof args === "string" ? args : JSON.stringify(args ?? {})}`;
    return getGateResult(text, operatorId);
  });
}
