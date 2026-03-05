import {
  OperatorRegistry,
  ROLE_TEMPLATES,
  type OperatorRole,
  type EscalationEvent,
} from "../src/operatorRegistry";

describe("Operator Role Templates", () => {
  it("spawns operator with role and applies role-specific default preset", () => {
    const registry = new OperatorRegistry();
    const reviewer = registry.spawn("ReviewBot", "Review auth module", { role: "reviewer" });
    expect(reviewer.role).toBe("reviewer");
    expect(reviewer.permissionPreset).toBe("readonly");
    expect(reviewer.systemHint).toContain("reviewer");
  });

  it("implementer role defaults to standard preset", () => {
    const registry = new OperatorRegistry();
    const impl = registry.spawn("Builder", "Implement feature", { role: "implementer" });
    expect(impl.role).toBe("implementer");
    expect(impl.permissionPreset).toBe("standard");
    expect(impl.systemHint).toContain("implementer");
  });

  it("tester role defaults to standard preset", () => {
    const registry = new OperatorRegistry();
    const tester = registry.spawn("TestBot", "Write tests", { role: "tester" });
    expect(tester.role).toBe("tester");
    expect(tester.permissionPreset).toBe("standard");
    expect(tester.systemHint).toContain("tester");
  });

  it("researcher role defaults to readonly preset", () => {
    const registry = new OperatorRegistry();
    const researcher = registry.spawn("ResearchBot", "Explore codebase", { role: "researcher" });
    expect(researcher.role).toBe("researcher");
    expect(researcher.permissionPreset).toBe("readonly");
  });

  it("planner role defaults to readonly preset", () => {
    const registry = new OperatorRegistry();
    const planner = registry.spawn("PlanBot", "Break down tasks", { role: "planner" });
    expect(planner.role).toBe("planner");
    expect(planner.permissionPreset).toBe("readonly");
  });

  it("explicit preset overrides role default", () => {
    const registry = new OperatorRegistry();
    const reviewer = registry.spawn("ReviewBot", "Review", { role: "reviewer", preset: "standard" });
    expect(reviewer.role).toBe("reviewer");
    expect(reviewer.permissionPreset).toBe("standard");
  });

  it("parent cascade still caps role preset", () => {
    const registry = new OperatorRegistry();
    const parent = registry.spawn("Alpha", "parent task", { preset: "readonly" });
    const child = registry.spawn("Beta", "child impl", {
      parentId: parent.id,
      role: "implementer",
    });
    expect(child.role).toBe("implementer");
    expect(child.permissionPreset).toBe("readonly");
  });

  it("operator without role has undefined role and systemHint", () => {
    const registry = new OperatorRegistry();
    const op = registry.spawn("Alpha", "generic task");
    expect(op.role).toBeUndefined();
    expect(op.systemHint).toBeUndefined();
  });

  it("ROLE_TEMPLATES has all five roles", () => {
    const roles: OperatorRole[] = ["implementer", "reviewer", "tester", "researcher", "planner"];
    for (const role of roles) {
      const template = ROLE_TEMPLATES[role];
      expect(template).toBeDefined();
      expect(template.description).toBeTruthy();
      expect(template.systemHint).toBeTruthy();
      expect(template.defaultPreset).toBeTruthy();
    }
  });

  it("getRoleTemplate static method works", () => {
    const template = OperatorRegistry.getRoleTemplate("reviewer");
    expect(template.defaultPreset).toBe("readonly");
    expect(template.description).toContain("Reviews");
  });
});

describe("Operator Escalation", () => {
  it("escalate emits event and records in memory", () => {
    const registry = new OperatorRegistry();
    const alpha = registry.spawn("Alpha", "task");

    const onEscalated = jest.fn();
    registry.events.on("operatorEscalated", onEscalated);

    const ok = registry.escalate(alpha.id, "Need write permissions", "warning");
    expect(ok).toBe(true);
    expect(onEscalated).toHaveBeenCalledTimes(1);

    const event: EscalationEvent = onEscalated.mock.calls[0][0];
    expect(event.operatorId).toBe(alpha.id);
    expect(event.operatorName).toBe("Alpha");
    expect(event.reason).toBe("Need write permissions");
    expect(event.severity).toBe("warning");
    expect(event.timestamp).toBeGreaterThan(0);

    const op = registry.findByNameOrId(alpha.id);
    expect(op?.memory.some((m) => m.includes("Escalation/warning"))).toBe(true);
  });

  it("escalate with critical severity", () => {
    const registry = new OperatorRegistry();
    const alpha = registry.spawn("Alpha", "task");
    const onEscalated = jest.fn();
    registry.events.on("operatorEscalated", onEscalated);

    registry.escalate(alpha.id, "Unrecoverable error", "critical");
    const event: EscalationEvent = onEscalated.mock.calls[0][0];
    expect(event.severity).toBe("critical");
  });

  it("escalate returns false for unknown operator", () => {
    const registry = new OperatorRegistry();
    expect(registry.escalate("nonexistent", "help")).toBe(false);
  });

  it("escalate defaults to warning severity", () => {
    const registry = new OperatorRegistry();
    const alpha = registry.spawn("Alpha", "task");
    const onEscalated = jest.fn();
    registry.events.on("operatorEscalated", onEscalated);

    registry.escalate(alpha.id, "need help");
    const event: EscalationEvent = onEscalated.mock.calls[0][0];
    expect(event.severity).toBe("warning");
  });
});
