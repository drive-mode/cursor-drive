import * as vscode from "vscode";
import { optimizePrompt } from "../src/promptOptimizer";
import { selectCheapModel } from "../src/modelSelector";

jest.mock("../src/modelSelector", () => ({
  selectCheapModel: jest.fn(),
}));

describe("optimizePrompt", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
      get: jest.fn((key: string, fallback: unknown) => {
        if (key === "promptOptimizer.enabled") return true;
        if (key === "promptOptimizer.autoApprove") return false;
        return fallback;
      }),
    });
  });

  it("returns original when optimizer disabled", async () => {
    (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
      get: jest.fn((key: string, fallback: unknown) =>
        key === "promptOptimizer.enabled" ? false : fallback
      ),
    });
    const result = await optimizePrompt("uhh like add a login page please");
    expect(result.prompt).toBe("uhh like add a login page please");
    expect(result.wasOptimized).toBe(false);
    expect(selectCheapModel).not.toHaveBeenCalled();
  });

  it("returns original when skipOptimizer is true", async () => {
    const result = await optimizePrompt("add a login page", { skipOptimizer: true });
    expect(result.prompt).toBe("add a login page");
    expect(result.wasOptimized).toBe(false);
    expect(selectCheapModel).not.toHaveBeenCalled();
  });

  it("returns original when no model available", async () => {
    selectCheapModel.mockResolvedValue(undefined);
    const result = await optimizePrompt("uhh like add a really long prompt that would trigger the optimizer because it has filler words and exceeds the short clean threshold");
    expect(result.wasOptimized).toBe(false);
    expect(result.prompt).toContain("uhh");
  });

  it("returns optimized when model returns different text and autoApprove", async () => {
    (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
      get: jest.fn((key: string, fallback: unknown) => {
        if (key === "promptOptimizer.enabled") return true;
        if (key === "promptOptimizer.autoApprove") return true;
        return fallback;
      }),
    });
    const mockModel = {
      sendRequest: jest.fn().mockResolvedValue({
        text: (async function* () { yield "Add a login page with email/password form."; })(),
      }),
    };
    selectCheapModel.mockResolvedValue(mockModel);

    const result = await optimizePrompt("uhh like add a login page please");
    expect(result.wasOptimized).toBe(true);
    expect(result.prompt).toBe("Add a login page with email/password form.");
    expect(result.original).toBe("uhh like add a login page please");
  });

  it("returns original when user cancels QuickPick", async () => {
    (vscode.window.showQuickPick as jest.Mock).mockResolvedValue(undefined);
    const mockModel = {
      sendRequest: jest.fn().mockResolvedValue({
        text: (async function* () { yield "Add a login page."; })(),
      }),
    };
    selectCheapModel.mockResolvedValue(mockModel);

    const result = await optimizePrompt("uhh like add a login page please");
    expect(result.wasOptimized).toBe(false);
    expect(result.prompt).toBe("uhh like add a login page please");
  });

  it("returns original when user chooses original in QuickPick", async () => {
    (vscode.window.showQuickPick as jest.Mock).mockResolvedValue({ value: "original" });
    const mockModel = {
      sendRequest: jest.fn().mockResolvedValue({
        text: (async function* () { yield "Add a login page."; })(),
      }),
    };
    selectCheapModel.mockResolvedValue(mockModel);

    const result = await optimizePrompt("uhh like add a login page please");
    expect(result.wasOptimized).toBe(false);
    expect(result.prompt).toBe("uhh like add a login page please");
  });
});
