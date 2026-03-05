import { getGateResult, getSteeringStats, type GateAction } from "../src/approvalGates";

jest.mock("vscode", () => {
  const base = jest.requireActual<typeof import("../__mocks__/vscode")>("vscode");
  return {
    ...base,
    workspace: {
      ...base.workspace,
      getConfiguration: jest.fn(() => ({
        get: jest.fn((_key: string, fallback: unknown) => fallback),
      })),
      onDidChangeConfiguration: jest.fn(),
    },
  };
});

describe("Graduated Steering Policies", () => {
  describe("log action", () => {
    it("matches default log patterns (sudo, npm publish, git push)", () => {
      const result = getGateResult("sudo apt-get install");
      expect(result.action).toBe("log");
      expect(result.pattern).toContain("sudo");
    });

    it("git push triggers log action", () => {
      const result = getGateResult("git push origin main");
      expect(result.action).toBe("log");
    });

    it("npm publish triggers log action", () => {
      const result = getGateResult("npm publish --access public");
      expect(result.action).toBe("log");
    });
  });

  describe("gate priority: block > warn > log > allow", () => {
    it("rm -rf triggers block (not log or warn)", () => {
      const result = getGateResult("rm -rf /tmp/stuff");
      expect(result.action).toBe("block");
    });

    it("force push triggers warn (not log)", () => {
      const result = getGateResult("force push to main");
      expect(result.action).toBe("warn");
    });

    it("safe text triggers allow", () => {
      const result = getGateResult("add a login page");
      expect(result.action).toBe("allow");
    });
  });
});

describe("Steering Stats", () => {
  it("tracks total checks and action counts", () => {
    const before = getSteeringStats();
    const initialTotal = before.totalChecks;

    getGateResult("safe text");
    getGateResult("rm -rf /");
    getGateResult("sudo apt-get");

    const after = getSteeringStats();
    expect(after.totalChecks).toBe(initialTotal + 3);
    expect(after.actionCounts.allow).toBeGreaterThanOrEqual(1);
    expect(after.actionCounts.block).toBeGreaterThanOrEqual(1);
    expect(after.actionCounts.log).toBeGreaterThanOrEqual(1);
  });

  it("tracks per-operator action counts", () => {
    const opId = "test-operator-1";
    getGateResult("safe text", opId);
    getGateResult("rm -rf /tmp", opId);

    const stats = getSteeringStats();
    const opStats = stats.operatorActionCounts.get(opId);
    expect(opStats).toBeDefined();
    expect(opStats!.allow).toBeGreaterThanOrEqual(1);
    expect(opStats!.block).toBeGreaterThanOrEqual(1);
  });

  it("records recent blocks", () => {
    getGateResult("rm -rf /dangerous");
    const stats = getSteeringStats();
    expect(stats.recentBlocks.length).toBeGreaterThan(0);
    const lastBlock = stats.recentBlocks[stats.recentBlocks.length - 1];
    expect(lastBlock.pattern).toBeDefined();
    expect(lastBlock.timestamp).toBeGreaterThan(0);
  });
});
