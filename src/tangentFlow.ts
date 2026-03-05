/**
 * Tangent agent introduction and confirmation flow.
 * When a tangent agent spawns, it introduces itself, summarizes tasks,
 * and waits for user confirmation before executing.
 */

import * as vscode from "vscode";
import { speak } from "./tts.js";
import type { OperatorContext } from "./operatorRegistry.js";

export type TangentConfirmResult =
  | { confirmed: true; task: string }
  | { confirmed: false; reason: "cancelled" | "edited_cancelled" };

let pendingResolve: ((value: "confirm") => void) | undefined;

/**
 * Resolve a pending tangent confirmation (e.g. from hotkey or MCP).
 * Returns true if there was a pending confirmation to resolve.
 */
export function resolvePendingTangentConfirm(): boolean {
  if (pendingResolve) {
    pendingResolve("confirm");
    pendingResolve = undefined;
    return true;
  }
  return false;
}

/**
 * Check if a tangent confirmation is currently pending.
 */
export function hasPendingTangentConfirm(): boolean {
  return !!pendingResolve;
}

/**
 * Run the tangent agent confirmation flow: intro TTS, modal, optional timeout re-prompt.
 * Returns confirmed + final task (may be edited), or cancelled.
 */
export async function confirmTangentAgent(
  op: OperatorContext,
  task: string,
  options: {
    timeoutMs?: number;
    onTimeoutReprompt?: () => void;
    updateTask?: (newTask: string) => void;
  } = {}
): Promise<TangentConfirmResult> {
  const cfg = vscode.workspace.getConfiguration("cursorDrive");
  const timeoutMs = options.timeoutMs ?? cfg.get<number>("agents.tangentConfirmationTimeout", 5000);

  const intro = `${op.name} here. So you'd like me to ${task}?`;
  speak(intro);

  const runConfirmation = (): Promise<"confirm" | "edit" | "cancel"> => {
    return new Promise<"confirm" | "edit" | "cancel">((resolve) => {
      const choice = vscode.window.showInformationMessage(
        `Drive: ${op.name} — ${task}`,
        { modal: true, detail: "Confirm to let the agent begin, or edit the task." },
        "Confirm",
        "Edit Tasks",
        "Cancel"
      );
      choice.then((answer) => {
        if (answer === "Confirm") { resolve("confirm"); }
        else if (answer === "Edit Tasks") { resolve("edit"); }
        else { resolve("cancel"); }
      });
    });
  };

  const runWithTimeout = (): Promise<"confirm" | "edit" | "cancel"> => {
    return new Promise<"confirm" | "edit" | "cancel">((resolve) => {
      let settled = false;
      const settle = (v: "confirm" | "edit" | "cancel") => {
        if (settled) return;
        settled = true;
        pendingResolve = undefined;
        resolve(v);
      };

      pendingResolve = () => settle("confirm");

      const timer = setTimeout(() => {
        if (settled) return;
        options.onTimeoutReprompt?.();
        speak("Before I begin, I need your confirmation. What are you thinking?");
      }, timeoutMs);

      void runConfirmation().then((v) => {
        clearTimeout(timer);
        settle(v);
      });
    });
  };

  let currentTask = task;
  for (;;) {
    const result = await runWithTimeout();
    if (result === "confirm") {
      return { confirmed: true, task: currentTask };
    }
    if (result === "cancel") {
      return { confirmed: false, reason: "cancelled" };
    }
    // Edit
    const edited = await vscode.window.showInputBox({
      prompt: "Edit the task for this tangent agent",
      value: currentTask,
      validateInput: (v) => (v.trim() ? null : "Task cannot be empty"),
    });
    if (edited === undefined) {
      return { confirmed: false, reason: "edited_cancelled" };
    }
    currentTask = edited.trim();
    options.updateTask?.(currentTask);
  }
}
