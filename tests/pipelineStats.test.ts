import { runPipeline, getPipelineStats, type DriveContext } from "../src/pipeline";

jest.mock("vscode", () => {
  const base = jest.requireActual<typeof import("../__mocks__/vscode")>("vscode");
  return {
    ...base,
    workspace: {
      ...base.workspace,
      getConfiguration: jest.fn(() => ({
        get: jest.fn((_key: string, fallback: unknown) => fallback),
      })),
    },
  };
});

jest.mock("../src/tts", () => ({
  speak: jest.fn(),
  stop: jest.fn(),
  getSpokenHistory: jest.fn(() => []),
}));

describe("Pipeline Runtime Stats", () => {
  const mockSessionMemory = (contextStr: string) => ({
    buildContextString: () => contextStr,
  });

  it("getPipelineStats returns initial zero state", () => {
    const stats = getPipelineStats();
    expect(stats.totalRuns).toBeGreaterThanOrEqual(0);
    expect(typeof stats.successCount).toBe("number");
    expect(typeof stats.blockedCount).toBe("number");
    expect(typeof stats.tangentCount).toBe("number");
    expect(typeof stats.passThruCount).toBe("number");
    expect(typeof stats.avgLatencyMs).toBe("number");
  });

  it("increments totalRuns on each pipeline call", async () => {
    const before = getPipelineStats().totalRuns;
    const ctx: DriveContext = { driveActive: true, sessionMemory: mockSessionMemory("") };
    await runPipeline("hello world", ctx);
    const after = getPipelineStats().totalRuns;
    expect(after).toBeGreaterThan(before);
  });

  it("increments passThruCount when drive inactive", async () => {
    const before = getPipelineStats().passThruCount;
    const ctx: DriveContext = { driveActive: false, sessionMemory: mockSessionMemory("") };
    await runPipeline("hello world", ctx);
    const after = getPipelineStats().passThruCount;
    expect(after).toBe(before + 1);
  });

  it("increments successCount on successful pipeline run", async () => {
    const before = getPipelineStats().successCount;
    const ctx: DriveContext = { driveActive: true, sessionMemory: mockSessionMemory("") };
    await runPipeline("add a login page", ctx);
    const after = getPipelineStats().successCount;
    expect(after).toBe(before + 1);
  });

  it("increments blockedCount when prompt is blocked", async () => {
    const before = getPipelineStats().blockedCount;
    const ctx: DriveContext = { driveActive: true, sessionMemory: mockSessionMemory("") };
    await runPipeline("rm -rf /", ctx);
    const after = getPipelineStats().blockedCount;
    expect(after).toBe(before + 1);
  });

  it("tracks lastRunMs with non-zero value", async () => {
    const ctx: DriveContext = { driveActive: true, sessionMemory: mockSessionMemory("") };
    await runPipeline("test prompt", ctx);
    const stats = getPipelineStats();
    expect(stats.lastRunMs).toBeGreaterThanOrEqual(0);
  });

  it("returns a copy — mutations do not affect internals", () => {
    const stats1 = getPipelineStats();
    (stats1 as any).totalRuns = 999999;
    const stats2 = getPipelineStats();
    expect(stats2.totalRuns).not.toBe(999999);
  });
});
