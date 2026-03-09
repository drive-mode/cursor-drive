export type RouteMode = "plan" | "agent" | "ask" | "debug";

export type CursorMode = "ask" | "agent" | "plan" | "debug";

export interface RouteDecision {
  mode: RouteMode;
  suggestedMode?: CursorMode;
  reason: string;
}

export function route(cleanContext: {
  prompt: string;
  command?: string;
  driveSubMode?: string;
}): RouteDecision {
  const { prompt, command, driveSubMode } = cleanContext;
  const lower = prompt.toLowerCase().trim();

  // Slash command overrides (highest priority)
  if (command === "plan") {
    return { mode: "plan", reason: "Explicit /plan command" };
  }
  if (command === "run") {
    return { mode: "agent", reason: "Explicit /run command" };
  }
  if (command === "drive") {
    return { mode: "agent", reason: "Explicit /drive—Drive mode" };
  }

  // Drive sub-mode hint (higher priority than keyword routing, lower than slash commands)
  if (driveSubMode !== undefined) {
    switch (driveSubMode) {
      case "plan":
        return { mode: "plan", reason: "Drive sub-mode: plan" };
      case "agent":
        return { mode: "agent", reason: "Drive sub-mode: agent" };
      case "ask":
        return { mode: "ask", reason: "Drive sub-mode: ask" };
      case "direct":
        return { mode: "ask", reason: "Drive sub-mode: direct (mapped to ask)" };
      case "debug":
        return { mode: "debug", reason: "Drive sub-mode: debug" };
      // unrecognised sub-mode falls through to keyword routing
    }
  }

  // Keyword-based routing (clean context only)
  const planKeywords = ["plan", "clarify", "requirements", "design", "architecture", "break down"];
  const agentKeywords = ["add", "implement", "fix", "create", "write", "refactor", "run", "execute"];
  const debugKeywords = ["debug", "diagnose", "trace", "breakpoint", "why does", "why is"];

  if (planKeywords.some((k) => lower.includes(k))) {
    return { mode: "plan", reason: "Prompt suggests planning (contains planning keyword)" };
  }
  if (debugKeywords.some((k) => lower.includes(k))) {
    return { mode: "debug", reason: "Prompt suggests debugging (contains debug keyword)" };
  }
  if (agentKeywords.some((k) => lower.includes(k))) {
    return { mode: "agent", reason: "Prompt suggests execution (contains action keyword)" };
  }

  return { mode: "ask", reason: "No strong signal—ask model pass-through" };
}
