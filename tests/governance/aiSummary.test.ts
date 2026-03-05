import * as vscode from "vscode";
import { summarizeGovernanceWithModel } from "../../src/governance/aiSummary.js";
import { EntropyReportSchema, TaskLedgerSchema } from "../../src/governance/schemas.js";

jest.mock("../../src/modelSelector", () => ({
  selectCheapModel: jest.fn(),
}));

describe("governance/aiSummary", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns parsed JSON summary from model output", async () => {
    const { selectCheapModel } = require("../../src/modelSelector") as { selectCheapModel: jest.Mock };
    const mockModel = {
      sendRequest: jest.fn().mockResolvedValue({
        text: (async function* () {
          yield JSON.stringify({
            confidence: "high",
            summary: "Entropy is driven by dead code and test gaps.",
            top_risks: ["dead code accumulation"],
            top_actions: ["delete unreachable modules"],
          });
        })(),
      }),
    };
    selectCheapModel.mockResolvedValue(mockModel);

    const entropy = EntropyReportSchema.parse({
      version: 1,
      generatedAt: Date.now(),
      score: 50,
      metrics: {
        deadCodeRatio: 0.2,
        redundancyIndex: 0,
        abstractionDepthIndex: 0,
        depChainLenP95: 1,
        testGapIndex: 0.3,
        churnVolatility: 0,
        todoDensity: 0,
      },
      breakdown: [],
      findings: [],
      warnings: [],
    });
    const ledger = TaskLedgerSchema.parse({ version: 1, generatedAt: Date.now(), tasks: [] });

    const result = await summarizeGovernanceWithModel(entropy, ledger, new vscode.CancellationTokenSource().token as any);
    expect(result?.confidence).toBe("high");
    expect(result?.summary).toContain("Entropy");
    expect(result?.top_actions[0]).toContain("delete");
  });

  it("returns undefined on invalid JSON", async () => {
    const { selectCheapModel } = require("../../src/modelSelector") as { selectCheapModel: jest.Mock };
    const mockModel = {
      sendRequest: jest.fn().mockResolvedValue({
        text: (async function* () { yield "not-json"; })(),
      }),
    };
    selectCheapModel.mockResolvedValue(mockModel);

    const entropy = EntropyReportSchema.parse({
      version: 1,
      generatedAt: Date.now(),
      score: 0,
      metrics: {
        deadCodeRatio: 0,
        redundancyIndex: 0,
        abstractionDepthIndex: 0,
        depChainLenP95: 0,
        testGapIndex: 0,
        churnVolatility: 0,
        todoDensity: 0,
      },
      breakdown: [],
      findings: [],
    });
    const ledger = TaskLedgerSchema.parse({ version: 1, generatedAt: Date.now(), tasks: [] });

    const result = await summarizeGovernanceWithModel(entropy, ledger);
    expect(result).toBeUndefined();
  });
});

