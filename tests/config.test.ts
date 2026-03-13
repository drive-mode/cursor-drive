/**
 * Config shape tests. src/config.ts does not exist — modules use
 * vscode.workspace.getConfiguration directly. These tests assert the config
 * keys and defaults expected by pipeline, driveMode, and agentScreen.
 */

import * as vscode from "vscode";

jest.mock("vscode", () => {
  const base = jest.requireActual<typeof import("../__mocks__/vscode")>("vscode");
  return {
    ...base,
    workspace: {
      ...base.workspace,
      getConfiguration: jest.fn(),
    },
  };
});

const mockGetConfiguration = vscode.workspace.getConfiguration as jest.Mock;

describe("config shape (pipeline, driveMode, agentScreen)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("cursorDrive returns object with expected keys and defaults", () => {
    const defaults: Record<string, unknown> = {
      wakeWord: "drive mode",
      defaultSubMode: "agent",
      syncNativeMode: true,
    };
    mockGetConfiguration.mockReturnValue({
      get: jest.fn((key: string, fallback: unknown) => defaults[key] ?? fallback),
    });

    const cfg = vscode.workspace.getConfiguration("cursorDrive");
    expect(cfg).toBeDefined();
    expect(typeof cfg.get).toBe("function");

    expect(cfg.get<string>("wakeWord", "drive mode")).toBe("drive mode");
    expect(cfg.get<string>("defaultSubMode", "agent")).toBe("agent");
    expect(cfg.get<boolean>("syncNativeMode", true)).toBe(true);
  });

  it("cursorDrive.agentScreen returns object with expected keys and defaults", () => {
    const defaults: Record<string, unknown> = {
      showPlanProgress: true,
      displayMode: "tab",
    };
    mockGetConfiguration.mockReturnValue({
      get: jest.fn((key: string, fallback: unknown) => defaults[key] ?? fallback),
    });

    const cfg = vscode.workspace.getConfiguration("cursorDrive.agentScreen");
    expect(cfg).toBeDefined();
    expect(typeof cfg.get).toBe("function");

    expect(cfg.get<boolean>("showPlanProgress", true)).toBe(true);
    expect(cfg.get<string>("displayMode", "tab")).toBe("tab");
  });

  it("returns defaults when values are missing", () => {
    mockGetConfiguration.mockReturnValue({
      get: jest.fn((_key: string, fallback: unknown) => fallback),
    });

    const cfg = vscode.workspace.getConfiguration("cursorDrive");
    expect(cfg.get<string>("wakeWord", "drive mode")).toBe("drive mode");
    expect(cfg.get<string>("defaultSubMode", "agent")).toBe("agent");

    const agentCfg = vscode.workspace.getConfiguration("cursorDrive.agentScreen");
    expect(agentCfg.get<boolean>("showPlanProgress", true)).toBe(true);
    expect(agentCfg.get<string>("displayMode", "tab")).toBe("tab");
  });
});
