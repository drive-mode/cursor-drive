/**
 * Config loading tests for src/config.ts (zod-validated readConfig).
 */

import * as vscode from "vscode";
import { readConfig, DriveConfigSchema } from "../src/config";

jest.mock("vscode", () => {
  const base = jest.requireActual<typeof import("./__mocks__/vscode")>("vscode");
  return {
    ...base,
    workspace: {
      ...base.workspace,
      getConfiguration: jest.fn(),
    },
  };
});

const mockGetConfiguration = vscode.workspace.getConfiguration as jest.Mock;

function mockSections(map: Record<string, Record<string, unknown>>) {
  mockGetConfiguration.mockImplementation((section?: string) => {
    const key = section ?? "cursorDrive";
    const short = key.replace(/^cursorDrive\.?/, "") || "";
    const defaults = map[short] ?? map[""] ?? {};
    return {
      get: jest.fn((k: string, fallback: unknown) =>
        Object.prototype.hasOwnProperty.call(defaults, k) ? defaults[k] : fallback
      ),
    };
  });
}

describe("readConfig", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns validated defaults when settings are empty", () => {
    mockSections({
      "": {},
      mcp: {},
      agentScreen: {},
      tts: {},
      operators: {},
      agents: {},
      privacy: {},
      approvalGates: {},
      modeSwitching: {},
      cursorCli: {},
    });

    const cfg = readConfig();
    expect(cfg.defaultSubMode).toBe("agent");
    expect(cfg.mcp.port).toBe(7891);
    expect(cfg.mcp.enableApps).toBe(true);
    expect(cfg.agentScreen.displayMode).toBe("tab");
    expect(cfg.agents.tangentKeyword).toBe("tangent");
    expect(DriveConfigSchema.safeParse(cfg).success).toBe(true);
  });

  it("parses nested mcp / agentScreen overrides", () => {
    mockSections({
      "": { defaultSubMode: "plan", wakeWord: "hey drive" },
      mcp: { port: 7900, enableApps: false },
      agentScreen: { displayMode: "bottomLog", showPlanProgress: false },
      tts: {},
      operators: {},
      agents: { subAgentApproval: true },
      privacy: {},
      approvalGates: {},
      modeSwitching: {},
      cursorCli: {},
    });

    const cfg = readConfig();
    expect(cfg.defaultSubMode).toBe("plan");
    expect(cfg.wakeWord).toBe("hey drive");
    expect(cfg.mcp.port).toBe(7900);
    expect(cfg.mcp.enableApps).toBe(false);
    expect(cfg.agentScreen.displayMode).toBe("bottomLog");
    expect(cfg.agents.subAgentApproval).toBe(true);
  });

  it("throws on invalid enum values", () => {
    mockSections({
      "": { defaultSubMode: "nope" },
      mcp: {},
      agentScreen: {},
      tts: {},
      operators: {},
      agents: {},
      privacy: {},
      approvalGates: {},
      modeSwitching: {},
      cursorCli: {},
    });

    expect(() => readConfig()).toThrow();
  });
});
