/**
 * ToolCallTracker — stateful tool call state without ad-hoc maps.
 * Ported from ACP Python SDK contrib/tool_calls.
 *
 * Maps externalId → TrackedCall, emits ToolCallStart/ToolCallProgress,
 * buffers streaming text, exposes immutable views.
 */

export interface TrackedToolCallView {
  externalId: string;
  name: string;
  status: "pending" | "in_progress" | "completed" | "failed";
  args?: string;
  result?: string;
  error?: string;
}

interface TrackedCall {
  externalId: string;
  name: string;
  status: TrackedToolCallView["status"];
  args: string;
  result: string;
  error?: string;
}

export type ToolCallStart = { type: "start"; externalId: string; name: string; args?: string };
export type ToolCallProgress = {
  type: "progress";
  externalId: string;
  argsDelta?: string;
  resultDelta?: string;
  status?: TrackedToolCallView["status"];
};

export class ToolCallTracker {
  private calls = new Map<string, TrackedCall>();
  private listeners: Array<(event: ToolCallStart | ToolCallProgress) => void> = [];

  /** Start tracking a new tool call. */
  start(externalId: string, name: string, args?: string): void {
    const call: TrackedCall = {
      externalId,
      name,
      status: "in_progress",
      args: args ?? "",
      result: "",
    };
    this.calls.set(externalId, call);
    this.emit({ type: "start", externalId, name, args });
  }

  /** Append streaming text to args or result. */
  appendStreamText(externalId: string, kind: "args" | "result", delta: string): void {
    const call = this.calls.get(externalId);
    if (!call) return;
    if (kind === "args") call.args += delta;
    else call.result += delta;
    this.emit({
      type: "progress",
      externalId,
      ...(kind === "args" ? { argsDelta: delta } : { resultDelta: delta }),
    });
  }

  /** Update progress (e.g. mark completed or failed). */
  progress(externalId: string, update: { status?: TrackedToolCallView["status"]; result?: string; error?: string }): void {
    const call = this.calls.get(externalId);
    if (!call) return;
    if (update.status) call.status = update.status;
    if (update.result !== undefined) call.result = update.result;
    if (update.error !== undefined) call.error = update.error;
    this.emit({ type: "progress", externalId, status: call.status });
  }

  /** Get immutable view of a tracked call. */
  view(externalId: string): TrackedToolCallView | undefined {
    const call = this.calls.get(externalId);
    if (!call) return undefined;
    return {
      externalId: call.externalId,
      name: call.name,
      status: call.status,
      args: call.args || undefined,
      result: call.result || undefined,
      error: call.error,
    };
  }

  /** Get all tracked calls. */
  getAll(): TrackedToolCallView[] {
    return Array.from(this.calls.values()).map((c) => ({
      externalId: c.externalId,
      name: c.name,
      status: c.status,
      args: c.args || undefined,
      result: c.result || undefined,
      error: c.error,
    }));
  }

  /** Subscribe to tool call events. */
  subscribe(listener: (event: ToolCallStart | ToolCallProgress) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private emit(event: ToolCallStart | ToolCallProgress): void {
    for (const l of this.listeners) l(event);
  }

  /** Clear all tracked calls (e.g. on session reset). */
  clear(): void {
    this.calls.clear();
  }
}
