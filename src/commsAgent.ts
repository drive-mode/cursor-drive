/**
 * commsAgent: Lightweight intermediary that batches background operator notifications.
 *
 * Background operators complete tasks asynchronously. The comms agent:
 *   1. Queues completion/status updates from background operators
 *   2. Decides what is worth surfacing to the user
 *   3. Delivers batched updates at natural pauses (after user turn completes,
 *      or after idle timeout)
 *
 * Uses the routing tier (cheapest model) to summarize batched updates.
 * Falls back to raw updates if no model is available.
 *
 * Updates are delivered via the Agent Screen panel and optionally TTS.
 */

import * as vscode from "vscode";
import { OperatorRegistry } from "./operatorRegistry.js";
import { AgentScreenPanel } from "./agentScreen.js";
import { speak } from "./tts.js";
import { selectCheapModel } from "./modelSelector.js";

const MAX_QUEUE_SIZE = 100;

export interface OperatorUpdate {
  operatorName: string;
  operatorId: string;
  type: "completion" | "progress" | "error" | "sync";
  message: string;
  timestamp: number;
}

export class CommsAgent {
  private queue: OperatorUpdate[] = [];
  private idleTimer: ReturnType<typeof setTimeout> | undefined;
  private idleSeconds: number;
  private enabled: boolean;
  private eventDisposables: (() => void)[] = [];

  constructor(
    private registry: OperatorRegistry,
    private context: vscode.ExtensionContext
  ) {
    const cfg = vscode.workspace.getConfiguration("cursorDrive.agents.commsAgent");
    this.enabled = cfg.get<boolean>("enabled", true);
    this.idleSeconds = vscode.workspace
      .getConfiguration("cursorDrive.agent.proactiveSteering")
      .get<number>("idleSeconds", 30);

    const onCompleted = (id: string, summary: string) => this.notifyCompletion(id, summary);
    const onProgress = (id: string, message: string) => {
      const op = this.registry.list().find((o) => o.id === id);
      if (op) {
        this.enqueue({
          operatorName: op.name,
          operatorId: id,
          type: "progress",
          message,
          timestamp: Date.now(),
        });
      }
    };
    this.registry.events.on("operatorCompleted", onCompleted);
    this.registry.events.on("operatorProgress", onProgress);
    this.eventDisposables.push(
      () => this.registry.events.off("operatorCompleted", onCompleted),
      () => this.registry.events.off("operatorProgress", onProgress)
    );
  }

  /** Called by MCP tools or background operator workers to enqueue an update. */
  enqueue(update: OperatorUpdate): void {
    if (!this.enabled) { return; }
    this.queue.push(update);
    if (this.queue.length > MAX_QUEUE_SIZE) {
      this.queue = this.queue.slice(-MAX_QUEUE_SIZE);
    }
    this.scheduleDelivery();
  }

  /**
   * Flush pending updates immediately.
   * Call this at the end of each user turn (natural pause).
   */
  async flush(token?: vscode.CancellationToken): Promise<void> {
    if (this.queue.length === 0) { return; }
    this.clearIdleTimer();

    const updates = [...this.queue];
    this.queue = [];

    const summary = await this.summarize(updates, token);
    this.deliver(summary, updates);
  }

  /**
   * Enqueue a sync-related notification (proposal status change, apply result, etc.).
   * These are delivered alongside regular operator updates in batch summaries.
   */
  notifySyncEvent(operatorId: string, operatorName: string, message: string): void {
    this.enqueue({
      operatorName,
      operatorId,
      type: "sync",
      message,
      timestamp: Date.now(),
    });
  }

  /** Enqueue a background-operator completion notification. */
  notifyCompletion(operatorId: string, message: string): void {
    const op = this.registry.list().find((o) => o.id === operatorId);
    if (!op) { return; }
    this.enqueue({
      operatorName: op.name,
      operatorId,
      type: "completion",
      message,
      timestamp: Date.now(),
    });
  }

  private scheduleDelivery(): void {
    this.clearIdleTimer();
    this.idleTimer = setTimeout(() => {
      void this.flush();
    }, this.idleSeconds * 1000);
  }

  private clearIdleTimer(): void {
    if (this.idleTimer !== undefined) {
      clearTimeout(this.idleTimer);
      this.idleTimer = undefined;
    }
  }

  dispose(): void {
    this.clearIdleTimer();
    this.queue = [];
    for (const d of this.eventDisposables) { d(); }
    this.eventDisposables = [];
  }

  /** Summarize queued updates using routing-tier model, falling back to raw messages. */
  private async summarize(
    updates: OperatorUpdate[],
    token?: vscode.CancellationToken
  ): Promise<string> {
    if (updates.length === 1) {
      return `${updates[0].operatorName}: ${updates[0].message}`;
    }

    const raw = updates
      .map((u) => `[${u.operatorName}] ${u.message}`)
      .join("\n");

    try {
      const ct = token ?? new vscode.CancellationTokenSource().token;
      const model = await selectCheapModel(ct);
      if (!model) { return raw; }

      const messages = [
        vscode.LanguageModelChatMessage.Assistant(
          "You summarize background operator status updates for a pair-programming session. " +
          "Write 1-2 sentences telling the user what background operators finished and what they found. " +
          "Be specific but brief. Return ONLY the summary, nothing else."
        ),
        vscode.LanguageModelChatMessage.User(raw),
      ];

      const response = await model.sendRequest(messages, {}, ct);
      let summary = "";
      for await (const chunk of response.text) {
        summary += chunk;
      }
      return summary.trim() || raw;
    } catch {
      return raw;
    }
  }

  private deliver(summary: string, updates: OperatorUpdate[]): void {
    const panel = AgentScreenPanel.getInstance();
    if (panel) {
      panel.logActivity("Drive", `Background updates: ${summary}`);
    }

    const cfg = vscode.workspace.getConfiguration("cursorDrive.tts");
    if (cfg.get<boolean>("enabled", false)) {
      speak(summary);
    }

    // Show a non-intrusive information message in the IDE.
    const operatorNames = [...new Set(updates.map((u) => u.operatorName))].join(", ");
    void vscode.window.showInformationMessage(
      `Drive: ${operatorNames} finished. ${summary}`
    );
  }
}
