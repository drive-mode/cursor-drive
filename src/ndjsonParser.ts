export interface CliStreamEvent {
  type: "user" | "assistant" | "tool_call" | "text_delta" | "error" | "unknown";
  raw: Record<string, unknown>;
  text?: string;
  toolName?: string;
}

export class NdjsonParser {
  private buffer = "";

  feed(chunk: string): Record<string, unknown>[] {
    this.buffer += chunk;
    const lines = this.buffer.split("\n");
    this.buffer = lines.pop() ?? "";
    const results: Record<string, unknown>[] = [];
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        results.push(JSON.parse(trimmed) as Record<string, unknown>);
      } catch {
        console.warn("[NdjsonParser] Skipping malformed line:", trimmed.slice(0, 80));
      }
    }
    return results;
  }
}

export function mapToCliStreamEvent(raw: Record<string, unknown>): CliStreamEvent {
  const msgType = raw["type"] as string | undefined;
  const role = raw["role"] as string | undefined;

  let type: CliStreamEvent["type"];
  if (msgType === "tool_call" || msgType === "tool_use") {
    type = "tool_call";
  } else if (msgType === "text_delta" || msgType === "content_block_delta") {
    type = "text_delta";
  } else if (msgType === "error") {
    type = "error";
  } else if (role === "user" || msgType === "user") {
    type = "user";
  } else if (role === "assistant" || msgType === "assistant") {
    type = "assistant";
  } else {
    type = "unknown";
  }

  let text: string | undefined;
  const content = raw["content"];
  if (typeof content === "string") {
    text = content;
  } else if (typeof raw["text"] === "string") {
    text = raw["text"] as string;
  } else if (typeof raw["delta"] === "object" && raw["delta"] !== null) {
    const delta = raw["delta"] as Record<string, unknown>;
    if (typeof delta["text"] === "string") { text = delta["text"] as string; }
  }

  let toolName: string | undefined;
  if (typeof raw["name"] === "string") { toolName = raw["name"] as string; }
  else if (typeof raw["tool_name"] === "string") { toolName = raw["tool_name"] as string; }

  return { type, raw, text, toolName };
}
