import { runPipeline, requestCheckpoint, type DriveContext } from "../src/pipeline";

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

jest.mock("../src/tts", () => ({ speak: jest.fn(), stop: jest.fn(), getSpokenHistory: jest.fn(() => []) }));

describe("runPipeline", () => {
  const mockSessionMemory = (contextStr: string) => ({
    buildContextString: () => contextStr,
  });

  describe("hpp-04: Drive-active gate", () => {
    it("skips pipeline when Drive inactive", async () => {
      const ctx: DriveContext = {
        driveActive: false,
        sessionMemory: mockSessionMemory(""),
      };
      const result = await runPipeline("uhh add a login page", ctx);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.prompt).toBe("uhh add a login page");
        expect(result.route.reason).toContain("inactive");
        expect(result.model).toBe("execution");
      }
    });

    it("runs full pipeline when Drive active", async () => {
      const ctx: DriveContext = {
        driveActive: true,
        sessionMemory: mockSessionMemory(""),
      };
      const result = await runPipeline("add a login page", ctx);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.prompt).toContain("login page");
        expect(result.route.mode).toBeDefined();
        expect(result.model).toBeDefined();
      }
    });
  });

  describe("stage order and transforms", () => {
    it("removes filler words when active", async () => {
      const ctx: DriveContext = {
        driveActive: true,
        sessionMemory: mockSessionMemory(""),
      };
      const result = await runPipeline("uhh umm like add a test please", ctx);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.prompt).not.toMatch(/\buhh\b/i);
        expect(result.prompt).not.toMatch(/\bumm\b/i);
        expect(result.prompt).not.toMatch(/\blike\b/i);
        expect(result.prompt).toContain("add");
        expect(result.prompt).toContain("test");
      }
    });
  });

  describe("approval gate", () => {
    it("returns blocked with gate result for dangerous prompts", async () => {
      const ctx: DriveContext = {
        driveActive: true,
        sessionMemory: mockSessionMemory(""),
      };
      const result = await runPipeline("run rm -rf /tmp/test to clean up", ctx);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.blocked).toBe(true);
        expect(result.gateResult).toBeDefined();
        expect(result.gateResult?.action).toBe("block");
        expect(result.gateResult?.pattern).toBeDefined();
      }
    });
  });

  describe("session context", () => {
    it("injects session context when non-empty", async () => {
      const ctx: DriveContext = {
        driveActive: true,
        sessionMemory: mockSessionMemory("Active tasks: refactor auth."),
      };
      const result = await runPipeline("continue with the refactor", ctx);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.prompt).toContain("Active tasks: refactor auth.");
        expect(result.prompt).toContain("continue with the refactor");
      }
    });
  });

  describe("pwm-06: wake word", () => {
    it("activates Drive and strips wake word when inactive", async () => {
      const setActive = jest.fn();
      const ctx: DriveContext = {
        driveActive: false,
        sessionMemory: mockSessionMemory(""),
        setActive,
      };
      const result = await runPipeline("hey drive add a login page", ctx);
      expect(setActive).toHaveBeenCalledWith(true);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.prompt).toContain("add");
        expect(result.prompt).toContain("login");
        expect(result.prompt).not.toContain("hey drive");
      }
    });

    it("speaks acknowledgment and shows status bar message on wake word", async () => {
      const vscode = require("vscode") as {
        window: { setStatusBarMessage: jest.Mock };
      };
      const speak = require("../src/tts").speak as jest.Mock;
      speak.mockClear();

      const ctx: DriveContext = {
        driveActive: false,
        sessionMemory: mockSessionMemory(""),
        setActive: jest.fn(),
      };
      await runPipeline("hey drive refactor auth", ctx);

      expect(speak).toHaveBeenCalledWith("Drive listening. How can I help?");
      expect(vscode.window.setStatusBarMessage).toHaveBeenCalledWith(
        expect.stringContaining("Drive listening"),
        expect.any(Number)
      );
    });

    it("returns early with tangentAck when wake word is submitted alone", async () => {
      const ctx: DriveContext = {
        driveActive: false,
        sessionMemory: mockSessionMemory(""),
        setActive: jest.fn(),
      };
      const result = await runPipeline("hey drive", ctx);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.prompt).toBe("");
        expect(result.tangentAck).toBe("How can I help?");
        expect(result.route.reason).toContain("Wake word only");
      }
    });
  });

  describe("pwm-06: submit word", () => {
    it("strips submit word and skips optimizer", async () => {
      const ctx: DriveContext = {
        driveActive: true,
        sessionMemory: mockSessionMemory(""),
      };
      const result = await runPipeline("add a test send it", ctx);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.prompt).not.toMatch(/send\s+it$/i);
        expect(result.prompt).toContain("add");
      }
    });
  });

  describe("pwm-07: tangent", () => {
    it("spawns operator and returns tangentAck when tangent keyword detected", async () => {
      const vscode = require("vscode") as { workspace: { getConfiguration: jest.Mock } };
      vscode.workspace.getConfiguration.mockReturnValue({
        get: jest.fn((key: string, fallback: unknown) => {
          if (key === "agents.autoConfirmTangent") { return true; }
          return fallback;
        }),
      });
      const spawn = jest.fn().mockReturnValue({ id: "op-1", name: "Beta", task: "refactor auth" });
      const ctx: DriveContext = {
        driveActive: true,
        sessionMemory: mockSessionMemory(""),
        operatorRegistry: { spawn, updateTask: jest.fn(), dismiss: jest.fn() } as unknown as DriveContext["operatorRegistry"],
      };
      const result = await runPipeline("tangent refactor auth", ctx);
      expect(spawn).toHaveBeenCalledWith(undefined, "refactor auth");
      expect(result.ok).toBe(true);
      if (result.ok === true) {
        expect(result.tangentAck).toContain("Beta");
        expect(result.tangentAck).toContain("refactor auth");
        expect(result.prompt).toBe("");
      }
    });
  });

  describe("pipeline checkpoints", () => {
    it("requestCheckpoint returns undefined when user confirms", async () => {
      const vscode = require("vscode") as { window: { showInformationMessage: jest.Mock } };
      vscode.window.showInformationMessage = jest.fn().mockResolvedValue("Proceed");

      const result = await requestCheckpoint("Spawn operator for: task?");
      expect(result).toBeUndefined();
    });

    it("requestCheckpoint returns checkpoint result when user cancels", async () => {
      const vscode = require("vscode") as { window: { showInformationMessage: jest.Mock } };
      vscode.window.showInformationMessage = jest.fn().mockResolvedValue("Cancel");

      const result = await requestCheckpoint("Spawn operator for: dangerous task?");
      expect(result).toEqual({ ok: "checkpoint", reason: "Spawn operator for: dangerous task?" });
    });

    it("tangent with subAgentApproval=true returns checkpoint when user cancels", async () => {
      // Override config to enable subAgentApproval.
      const vscode = require("vscode") as {
        workspace: { getConfiguration: jest.Mock };
        window: { showInformationMessage: jest.Mock };
      };
      vscode.workspace.getConfiguration.mockReturnValue({
        get: jest.fn((key: string, fallback: unknown) => {
          if (key === "agents.subAgentApproval") { return true; }
          if (key === "agents.tangentKeyword") { return "tangent"; }
          return fallback;
        }),
      });
      vscode.window.showInformationMessage = jest.fn().mockResolvedValue("Cancel");

      const spawn = jest.fn();
      const ctx: DriveContext = {
        driveActive: true,
        sessionMemory: mockSessionMemory(""),
        operatorRegistry: { spawn } as unknown as DriveContext["operatorRegistry"],
      };
      const result = await runPipeline("tangent risky operation", ctx);
      expect(spawn).not.toHaveBeenCalled();
      expect(result.ok).toBe("checkpoint");
    });
  });

  describe("approval-gate operatorId threading", () => {
    it("passes foreground operator id to getGateResult for per-operator stats", async () => {
      const vscode = require("vscode") as { workspace: { getConfiguration: jest.Mock } };
      vscode.workspace.getConfiguration.mockReturnValue({
        get: jest.fn((key: string, fallback: unknown) => fallback),
      });

      const fgOp = { id: "op-fg-123", name: "Alpha" };
      const mockRegistry = {
        getForeground: jest.fn().mockReturnValue(fgOp),
        spawn: jest.fn(),
      };

      const ctx: DriveContext = {
        driveActive: true,
        sessionMemory: mockSessionMemory(""),
        operatorRegistry: mockRegistry as unknown as DriveContext["operatorRegistry"],
      };

      await runPipeline("add a login page", ctx);
      expect(mockRegistry.getForeground).toHaveBeenCalled();
    });

    it("block gate uses showErrorMessage, not showWarningMessage", async () => {
      const vscode = require("vscode") as {
        workspace: { getConfiguration: jest.Mock };
        window: { showErrorMessage: jest.Mock; showWarningMessage: jest.Mock };
      };
      vscode.workspace.getConfiguration.mockReturnValue({
        get: jest.fn((key: string, fallback: unknown) => fallback),
      });
      const mockShowErrorMessage = jest.fn();
      const mockShowWarningMessage = jest.fn();
      vscode.window.showErrorMessage = mockShowErrorMessage;
      vscode.window.showWarningMessage = mockShowWarningMessage;

      const ctx: DriveContext = {
        driveActive: true,
        sessionMemory: mockSessionMemory(""),
      };
      const result = await runPipeline("run rm -rf / now", ctx);

      expect(result.ok).toBe(false);
      // Block should use error dialog, not warning
      expect(mockShowErrorMessage).toHaveBeenCalled();
      expect(mockShowWarningMessage).not.toHaveBeenCalled();
    });

    it("warn gate shows warning dialog and blocks when user cancels", async () => {
      const vscode = require("vscode") as {
        workspace: { getConfiguration: jest.Mock };
        window: { showWarningMessage: jest.Mock };
      };
      vscode.workspace.getConfiguration.mockReturnValue({
        get: jest.fn((key: string, fallback: unknown) => fallback),
      });
      const mockShowWarningMessage = jest.fn().mockResolvedValue("Cancel");
      vscode.window.showWarningMessage = mockShowWarningMessage;

      const ctx: DriveContext = {
        driveActive: true,
        sessionMemory: mockSessionMemory(""),
      };
      const result = await runPipeline("please force push this branch", ctx);

      expect(result.ok).toBe(false);
      // Warn dialog shown exactly once (not twice, confirming no double gate call)
      expect(mockShowWarningMessage).toHaveBeenCalledTimes(1);
    });
  });
});
