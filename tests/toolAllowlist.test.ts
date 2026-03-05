import {
  checkPermission,
  getAllowedCapabilities,
  getEffectivePreset,
  checkPermissionForOperator,
  getEffectivePresetForOperator,
  getAllowedCapabilitiesForOperator,
} from "../src/toolAllowlist";
import type { OperatorContext } from "../src/operatorRegistry";

const mockShowWarningMessage = jest.fn();

jest.mock("vscode", () => ({
  workspace: {
    getConfiguration: jest.fn((section?: string) => ({
      get: jest.fn((key: string, fallback: unknown) => {
        // Default preset is standard; no overrides.
        if (key === "default") { return "standard"; }
        if (key === "overrides") { return {}; }
        return fallback;
      }),
    })),
  },
  window: {
    showWarningMessage: (...args: unknown[]) => mockShowWarningMessage(...args),
  },
}));

describe("toolAllowlist", () => {
  beforeEach(() => { jest.clearAllMocks(); });

  describe("standard preset", () => {
    it("allows fileRead", () => {
      expect(checkPermission("Alpha", "fileRead")).toBe(true);
    });

    it("allows fileWrite", () => {
      expect(checkPermission("Alpha", "fileWrite")).toBe(true);
    });

    it("allows terminalExecute", () => {
      expect(checkPermission("Alpha", "terminalExecute")).toBe(true);
    });

    it("denies webSearch", () => {
      expect(checkPermission("Alpha", "webSearch")).toBe(false);
      expect(mockShowWarningMessage).toHaveBeenCalled();
    });
  });

  describe("getEffectivePreset", () => {
    it("returns standard for agent with no override", () => {
      expect(getEffectivePreset("Alpha")).toBe("standard");
    });
  });

  describe("getAllowedCapabilities", () => {
    it("returns standard capabilities", () => {
      const caps = getAllowedCapabilities("Alpha");
      expect(caps).toContain("fileRead");
      expect(caps).toContain("fileWrite");
      expect(caps).not.toContain("webSearch");
    });
  });

  describe("operator-aware API", () => {
    function makeOp(name: string, preset: "readonly" | "standard" | "full", depth = 0): OperatorContext {
      return {
        id: `op-${name}`,
        name,
        voice: undefined,
        task: "test",
        status: "active",
        createdAt: Date.now(),
        memory: [],
        visibility: "shared",
        depth,
        permissionPreset: preset,
      };
    }

    it("getEffectivePresetForOperator uses registry preset when no config override", () => {
      expect(getEffectivePresetForOperator(makeOp("Alpha", "standard"))).toBe("standard");
      expect(getEffectivePresetForOperator(makeOp("UnknownOp", "readonly", 1))).toBe("readonly");
    });

    it("checkPermissionForOperator allows capabilities matching preset", () => {
      const op = makeOp("Alpha", "standard");
      expect(checkPermissionForOperator(op, "fileRead")).toBe(true);
      expect(checkPermissionForOperator(op, "fileWrite")).toBe(true);
    });

    it("checkPermissionForOperator denies capabilities above preset", () => {
      const op = makeOp("Beta", "readonly", 1);
      expect(checkPermissionForOperator(op, "fileWrite")).toBe(false);
      expect(mockShowWarningMessage).toHaveBeenCalled();
    });

    it("checkPermissionForOperator includes depth in warning message", () => {
      const op = makeOp("Gamma", "readonly", 2);
      checkPermissionForOperator(op, "terminalExecute");
      expect(mockShowWarningMessage).toHaveBeenCalledWith(
        expect.stringContaining("depth: 2")
      );
    });

    it("getAllowedCapabilitiesForOperator returns correct set for readonly", () => {
      const op = makeOp("Delta", "readonly");
      const caps = getAllowedCapabilitiesForOperator(op);
      expect(caps).toContain("fileRead");
      expect(caps).not.toContain("fileWrite");
      expect(caps).not.toContain("webSearch");
    });

    it("getAllowedCapabilitiesForOperator returns full set for full preset", () => {
      const op = makeOp("Alpha", "full");
      const caps = getAllowedCapabilitiesForOperator(op);
      expect(caps).toContain("webSearch");
      expect(caps).toContain("fileWrite");
    });
  });

  describe("getEffectivePresetForOperator — deny-wins config override", () => {
    it("config override restricting below registry preset is applied", () => {
      const vscode = require("vscode") as { workspace: { getConfiguration: jest.Mock } };
      vscode.workspace.getConfiguration.mockReturnValue({
        get: jest.fn((key: string) => {
          if (key === "overrides") { return { Alpha: "readonly" }; }
          return undefined;
        }),
      });
      const op = { id: "op-1", name: "Alpha", voice: undefined, task: "t", status: "active" as const,
        createdAt: 0, memory: [], visibility: "shared" as const, depth: 0, permissionPreset: "standard" as const };
      expect(getEffectivePresetForOperator(op)).toBe("readonly");
    });

    it("config override cannot grant MORE than registry preset", () => {
      const vscode = require("vscode") as { workspace: { getConfiguration: jest.Mock } };
      vscode.workspace.getConfiguration.mockReturnValue({
        get: jest.fn((key: string) => {
          if (key === "overrides") { return { Alpha: "full" }; }
          return undefined;
        }),
      });
      // Registry preset is readonly — override tries to grant "full", should be denied
      const op = { id: "op-1", name: "Alpha", voice: undefined, task: "t", status: "active" as const,
        createdAt: 0, memory: [], visibility: "shared" as const, depth: 0, permissionPreset: "readonly" as const };
      expect(getEffectivePresetForOperator(op)).toBe("readonly");
    });

    it("config override at same level as registry preset is a no-op", () => {
      const vscode = require("vscode") as { workspace: { getConfiguration: jest.Mock } };
      vscode.workspace.getConfiguration.mockReturnValue({
        get: jest.fn((key: string) => {
          if (key === "overrides") { return { Alpha: "standard" }; }
          return undefined;
        }),
      });
      const op = { id: "op-1", name: "Alpha", voice: undefined, task: "t", status: "active" as const,
        createdAt: 0, memory: [], visibility: "shared" as const, depth: 0, permissionPreset: "standard" as const };
      expect(getEffectivePresetForOperator(op)).toBe("standard");
    });
  });

  describe("readonly preset via override", () => {
    beforeEach(() => {
      const vscode = require("vscode") as { workspace: { getConfiguration: jest.Mock } };
      vscode.workspace.getConfiguration.mockReturnValue({
        get: jest.fn((key: string) => {
          if (key === "default") { return "standard"; }
          if (key === "overrides") { return { Beta: "readonly" }; }
          return undefined;
        }),
      });
    });

    it("denies fileWrite for readonly agent Beta", () => {
      expect(checkPermission("Beta", "fileWrite")).toBe(false);
    });

    it("allows fileRead for readonly agent Beta", () => {
      expect(checkPermission("Beta", "fileRead")).toBe(true);
    });
  });
});
