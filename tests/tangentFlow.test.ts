import {
  resolvePendingTangentConfirm,
  hasPendingTangentConfirm,
  confirmTangentAgent,
} from "../src/tangentFlow";
import type { OperatorContext } from "../src/operatorRegistry";

const mockSpeak = jest.fn();
jest.mock("../src/tts", () => ({ speak: (...args: unknown[]) => mockSpeak(...args) }));

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

function makeOperator(overrides: Partial<OperatorContext> = {}): OperatorContext {
  return {
    id: "op-test-1",
    name: "Beta",
    voice: undefined,
    task: "test task",
    status: "active",
    createdAt: Date.now(),
    memory: [],
    visibility: "shared",
    depth: 0,
    permissionPreset: "standard",
    ...overrides,
  };
}

describe("tangentFlow", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("resolvePendingTangentConfirm", () => {
    it("returns false when no pending confirmation", () => {
      expect(resolvePendingTangentConfirm()).toBe(false);
    });
  });

  describe("hasPendingTangentConfirm", () => {
    it("returns false when no pending confirmation", () => {
      expect(hasPendingTangentConfirm()).toBe(false);
    });
  });

  describe("confirmTangentAgent", () => {
    it("returns confirmed with task when user clicks Confirm", async () => {
      const vscode = require("vscode") as { window: { showInformationMessage: jest.Mock } };
      vscode.window.showInformationMessage = jest.fn().mockResolvedValue("Confirm");

      const op = makeOperator();
      const result = await confirmTangentAgent(op, "refactor auth");

      expect(result.confirmed).toBe(true);
      if (result.confirmed) {
        expect(result.task).toBe("refactor auth");
      }
      expect(mockSpeak).toHaveBeenCalledWith(
        expect.stringContaining("Beta")
      );
    });

    it("returns cancelled when user clicks Cancel", async () => {
      const vscode = require("vscode") as { window: { showInformationMessage: jest.Mock } };
      vscode.window.showInformationMessage = jest.fn().mockResolvedValue("Cancel");

      const op = makeOperator();
      const result = await confirmTangentAgent(op, "refactor auth");

      expect(result.confirmed).toBe(false);
      if (!result.confirmed) {
        expect(result.reason).toBe("cancelled");
      }
    });

    it("returns cancelled when user dismisses modal (undefined)", async () => {
      const vscode = require("vscode") as { window: { showInformationMessage: jest.Mock } };
      vscode.window.showInformationMessage = jest.fn().mockResolvedValue(undefined);

      const op = makeOperator();
      const result = await confirmTangentAgent(op, "refactor auth");

      expect(result.confirmed).toBe(false);
      if (!result.confirmed) {
        expect(result.reason).toBe("cancelled");
      }
    });

    it("allows editing task and returns confirmed with new task", async () => {
      const vscode = require("vscode") as {
        window: {
          showInformationMessage: jest.Mock;
          showInputBox: jest.Mock;
        };
      };
      // First call: Edit Tasks; second call (after edit): Confirm
      vscode.window.showInformationMessage = jest.fn()
        .mockResolvedValueOnce("Edit Tasks")
        .mockResolvedValueOnce("Confirm");
      vscode.window.showInputBox = jest.fn().mockResolvedValue("updated task");

      const updateTask = jest.fn();
      const op = makeOperator();
      const result = await confirmTangentAgent(op, "original task", { updateTask });

      expect(result.confirmed).toBe(true);
      if (result.confirmed) {
        expect(result.task).toBe("updated task");
      }
      expect(updateTask).toHaveBeenCalledWith("updated task");
    });

    it("returns edited_cancelled when user dismisses edit input box", async () => {
      const vscode = require("vscode") as {
        window: {
          showInformationMessage: jest.Mock;
          showInputBox: jest.Mock;
        };
      };
      vscode.window.showInformationMessage = jest.fn().mockResolvedValue("Edit Tasks");
      vscode.window.showInputBox = jest.fn().mockResolvedValue(undefined);

      const op = makeOperator();
      const result = await confirmTangentAgent(op, "original task");

      expect(result.confirmed).toBe(false);
      if (!result.confirmed) {
        expect(result.reason).toBe("edited_cancelled");
      }
    });

    it("speaks intro message with operator name", async () => {
      const vscode = require("vscode") as { window: { showInformationMessage: jest.Mock } };
      vscode.window.showInformationMessage = jest.fn().mockResolvedValue("Confirm");

      const op = makeOperator({ name: "Gamma" });
      await confirmTangentAgent(op, "explore API");

      expect(mockSpeak).toHaveBeenCalledWith(
        expect.stringContaining("Gamma")
      );
      expect(mockSpeak).toHaveBeenCalledWith(
        expect.stringContaining("explore API")
      );
    });
  });
});
