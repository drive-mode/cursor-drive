/**
 * SessionAccumulator — live merged snapshot for Agent Screen rendering.
 * Ported from ACP Python SDK contrib/session_state.
 *
 * Receives session update events, merges tool call states with late-arrival
 * tolerance, tracks plan/mode/messages, emits immutable SessionSnapshot.
 */

import type { TrackedToolCallView } from "./toolCallTracker.js";

export interface SessionSnapshot {
  plan?: { entries?: Array<{ id: string; title?: string; status?: string }> };
  mode?: string;
  toolCalls: TrackedToolCallView[];
  userMessages: string[];
  agentMessages: string[];
}

/** Generic session update — compatible with ACP SessionNotification or Drive ActivityEvent. */
export type SessionUpdate = {
  type?: string;
  toolCall?: { externalId: string; name: string; args?: string; status?: string; result?: string; error?: string };
  toolCallUpdate?: { externalId: string; argsDelta?: string; resultDelta?: string; status?: string };
  plan?: SessionSnapshot["plan"];
  mode?: string;
  userMessage?: string;
  agentMessage?: string;
  sessionId?: string;
};

export class SessionAccumulator {
  private snapshot: SessionSnapshot = {
    toolCalls: [],
    userMessages: [],
    agentMessages: [],
  };
  private toolCallsMap = new Map<string, TrackedToolCallView>();
  private sessionId: string | undefined;
  private listeners: Array<(snapshot: SessionSnapshot) => void> = [];
  private autoResetOnSessionChange: boolean;

  constructor(options: { autoResetOnSessionChange?: boolean } = {}) {
    this.autoResetOnSessionChange = options.autoResetOnSessionChange ?? true;
  }

  /** Apply a session update; reconciles tool_call and tool_call_update with late-arrival tolerance. */
  apply(update: SessionUpdate): void {
    if (this.autoResetOnSessionChange && update.sessionId && update.sessionId !== this.sessionId) {
      this.sessionId = update.sessionId;
      this.reset();
    }

    if (update.toolCall) {
      const { externalId, name, args, status, result, error } = update.toolCall;
      const existing = this.toolCallsMap.get(externalId);
      const view: TrackedToolCallView = {
        externalId,
        name,
        status: (status as TrackedToolCallView["status"]) ?? (existing?.status ?? "in_progress"),
        args: args ?? existing?.args,
        result: result ?? existing?.result,
        error: error ?? existing?.error,
      };
      this.toolCallsMap.set(externalId, view);
    }

    if (update.toolCallUpdate) {
      const { externalId, argsDelta, resultDelta, status } = update.toolCallUpdate;
      const existing = this.toolCallsMap.get(externalId);
      if (existing) {
        const updated: TrackedToolCallView = {
          ...existing,
          args: argsDelta ? (existing.args ?? "") + argsDelta : existing.args,
          result: resultDelta ? (existing.result ?? "") + resultDelta : existing.result,
          status: (status as TrackedToolCallView["status"]) ?? existing.status,
        };
        this.toolCallsMap.set(externalId, updated);
      } else {
        // Late arrival: create placeholder
        this.toolCallsMap.set(externalId, {
          externalId,
          name: "unknown",
          status: (status as TrackedToolCallView["status"]) ?? "in_progress",
          args: argsDelta ?? undefined,
          result: resultDelta ?? undefined,
        });
      }
    }

    if (update.plan) this.snapshot.plan = update.plan;
    if (update.mode) this.snapshot.mode = update.mode;
    if (update.userMessage) this.snapshot.userMessages.push(update.userMessage);
    if (update.agentMessage) this.snapshot.agentMessages.push(update.agentMessage);

    this.snapshot.toolCalls = Array.from(this.toolCallsMap.values());
    this.notify();
  }

  /** Return immutable snapshot. */
  getSnapshot(): SessionSnapshot {
    return {
      ...this.snapshot,
      toolCalls: [...this.snapshot.toolCalls],
      userMessages: [...this.snapshot.userMessages],
      agentMessages: [...this.snapshot.agentMessages],
    };
  }

  /** Subscribe to snapshot updates. */
  subscribe(callback: (snapshot: SessionSnapshot) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  private reset(): void {
    this.toolCallsMap.clear();
    this.snapshot = {
      toolCalls: [],
      userMessages: [],
      agentMessages: [],
    };
  }

  private notify(): void {
    const snap = this.getSnapshot();
    for (const l of this.listeners) l(snap);
  }
}
