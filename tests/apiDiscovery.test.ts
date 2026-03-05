import { discoverAPIs, formatReport, DiscoveryReport } from "../src/apiDiscovery";
import * as vscode from "vscode";

// Access the mock to configure per-test behavior
const mockCommands = vscode.commands as unknown as {
  getCommands: jest.Mock;
};
const mockLm = vscode.lm as unknown as {
  selectChatModels: jest.Mock;
};

describe("discoverAPIs", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCommands.getCommands.mockResolvedValue([]);
    mockLm.selectChatModels.mockResolvedValue([]);
  });

  it("returns a report with timestamp and host identity", async () => {
    const report = await discoverAPIs();
    expect(report.timestamp).toBeDefined();
    expect(typeof report.timestamp).toBe("string");
    expect(report.hostIdentity).toBeDefined();
    expect(report.hostIdentity.appName).toBe("TestHost");
    expect(report.hostIdentity.version).toBe("1.85.0");
  });

  it("detects non-Cursor host from mock env", async () => {
    const report = await discoverAPIs();
    // Mock env has uriScheme "vscode" and appName "TestHost" — not Cursor
    expect(report.hostIdentity.isCursor).toBe(false);
  });

  it("enumerates top-level vscode namespaces", async () => {
    const report = await discoverAPIs();
    expect(Array.isArray(report.vscodeNamespaces)).toBe(true);
    // The mock has at least lm, window, workspace, commands, env, version
    expect(report.vscodeNamespaces).toContain("lm");
    expect(report.vscodeNamespaces).toContain("window");
    expect(report.vscodeNamespaces).toContain("commands");
  });

  it("builds a namespaceTypeMap for top-level entries", async () => {
    const report = await discoverAPIs();
    expect(report.namespaceTypeMap["vscode.lm"]).toBe("object");
    expect(report.namespaceTypeMap["vscode.commands"]).toBe("object");
  });

  it("probes vscode.lm and reports selectChatModels result", async () => {
    mockLm.selectChatModels.mockResolvedValue([]);
    const report = await discoverAPIs();

    expect(report.vscodeLm.exists).toBe(true);
    expect(report.vscodeLm.selectChatModelsResult).toBeDefined();
    expect(report.vscodeLm.selectChatModelsResult!.success).toBe(true);
    expect(report.vscodeLm.selectChatModelsResult!.modelCount).toBe(0);
  });

  it("reports models when selectChatModels returns results", async () => {
    mockLm.selectChatModels.mockResolvedValue([
      { id: "model-1", name: "GPT-4o", family: "gpt-4o" },
      { id: "model-2", name: "Claude Sonnet", family: "claude-sonnet" },
    ]);

    const report = await discoverAPIs();
    expect(report.vscodeLm.selectChatModelsResult!.modelCount).toBe(2);
    expect(report.vscodeLm.selectChatModelsResult!.models).toHaveLength(2);
    expect(report.vscodeLm.selectChatModelsResult!.models[0].id).toBe("model-1");
    expect(report.vscodeLm.selectChatModelsResult!.models[1].family).toBe("claude-sonnet");
  });

  it("handles selectChatModels error gracefully", async () => {
    mockLm.selectChatModels.mockRejectedValue(new Error("API not supported"));

    const report = await discoverAPIs();
    expect(report.vscodeLm.selectChatModelsResult!.success).toBe(false);
    expect(report.vscodeLm.selectChatModelsResult!.error).toContain("API not supported");
  });

  it("reports vscode.cursor as not found when it does not exist", async () => {
    // The mock does not have a "cursor" property on the vscode object
    const report = await discoverAPIs();
    expect(report.vscodeCursor.exists).toBe(false);
    expect(report.vscodeCursor.properties).toHaveLength(0);
  });

  it("enumerates commands filtered by prefix", async () => {
    mockCommands.getCommands.mockResolvedValue([
      "cursor.action.generateInTerminal",
      "cursor.newChat",
      "cursorDrive.toggle",
      "cursorDrive.diagnose",
      "editor.action.formatDocument",
      "workbench.action.openSettings",
    ]);

    const report = await discoverAPIs();
    expect(report.commands.total).toBe(6);
    expect(report.commands.cursorSpecific).toEqual([
      "cursor.action.generateInTerminal",
      "cursor.newChat",
    ]);
    expect(report.commands.driveSpecific).toEqual([
      "cursorDrive.diagnose",
      "cursorDrive.toggle",
    ]);
  });
});

describe("formatReport", () => {
  const sampleReport: DiscoveryReport = {
    timestamp: "2026-02-22T12:00:00.000Z",
    hostIdentity: {
      appName: "Cursor",
      appRoot: "/opt/cursor",
      uriScheme: "cursor",
      version: "2.5.0",
      isCursor: true,
    },
    vscodeNamespaces: ["commands", "env", "lm", "window", "workspace"],
    vscodeCursor: {
      exists: true,
      properties: [
        { path: "vscode.cursor.mcp", type: "object" },
        { path: "vscode.cursor.mcp.registerServer", type: "function" },
      ],
    },
    vscodeLm: {
      exists: true,
      properties: [
        { path: "vscode.lm.selectChatModels", type: "function" },
      ],
      selectChatModelsResult: {
        success: true,
        modelCount: 0,
        models: [],
      },
    },
    vscodeChat: {
      exists: true,
      properties: [
        { path: "vscode.chat.createChatParticipant", type: "function" },
      ],
    },
    commands: {
      total: 500,
      cursorSpecific: ["cursor.newChat", "cursor.action.generateInTerminal"],
      driveSpecific: ["cursorDrive.toggle"],
    },
    namespaceTypeMap: {
      "vscode.commands": "object",
      "vscode.lm": "object",
    },
  };

  it("includes host identity in output", () => {
    const output = formatReport(sampleReport);
    expect(output).toContain("Cursor");
    expect(output).toContain("2.5.0");
    expect(output).toContain("Is Cursor:  YES");
  });

  it("lists vscode namespaces", () => {
    const output = formatReport(sampleReport);
    expect(output).toContain("commands (object)");
    expect(output).toContain("lm (object)");
    expect(output).toContain("Total: 5");
  });

  it("shows vscode.cursor properties", () => {
    const output = formatReport(sampleReport);
    expect(output).toContain("vscode.cursor.mcp (object)");
    expect(output).toContain("vscode.cursor.mcp.registerServer (function)");
  });

  it("shows vscode.lm probe result", () => {
    const output = formatReport(sampleReport);
    expect(output).toContain("selectChatModels() → OK, 0 model(s)");
  });

  it("shows cursor-specific commands", () => {
    const output = formatReport(sampleReport);
    expect(output).toContain("cursor.newChat");
    expect(output).toContain("cursor.action.generateInTerminal");
  });

  it("marks NOT FOUND when vscode.cursor is missing", () => {
    const modified = {
      ...sampleReport,
      vscodeCursor: { exists: false, properties: [] },
    };
    const output = formatReport(modified);
    expect(output).toContain("NOT FOUND — vscode.cursor namespace does not exist");
  });

  it("shows model details when models are present", () => {
    const withModels: DiscoveryReport = {
      ...sampleReport,
      vscodeLm: {
        exists: true,
        properties: [],
        selectChatModelsResult: {
          success: true,
          modelCount: 2,
          models: [
            { id: "gpt-4o", name: "GPT-4o", family: "gpt-4o" },
            { id: "claude-sonnet", name: "Claude", family: "claude-sonnet" },
          ],
        },
      },
    };
    const output = formatReport(withModels);
    expect(output).toContain("2 model(s)");
    expect(output).toContain("gpt-4o");
    expect(output).toContain("claude-sonnet");
  });

  it("shows error when selectChatModels fails", () => {
    const withError: DiscoveryReport = {
      ...sampleReport,
      vscodeLm: {
        exists: true,
        properties: [],
        selectChatModelsResult: {
          success: false,
          modelCount: 0,
          models: [],
          error: "Not implemented",
        },
      },
    };
    const output = formatReport(withError);
    expect(output).toContain("FAILED");
    expect(output).toContain("Not implemented");
  });
});
