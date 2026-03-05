import { maybeStopTtsOnInput, handleClarification } from "../src/clarificationHandler";

const mockStop = jest.fn();
const mockGetSpokenHistory = jest.fn();

jest.mock("../src/tts", () => ({
  stop: (...args: unknown[]) => mockStop(...args),
  getSpokenHistory: (...args: unknown[]) => mockGetSpokenHistory(...args),
}));

const mockSelectCheapModel = jest.fn();
jest.mock("../src/modelSelector", () => ({
  selectCheapModel: (...args: unknown[]) => mockSelectCheapModel(...args),
}));

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

describe("clarificationHandler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSpokenHistory.mockReturnValue([]);
  });

  describe("maybeStopTtsOnInput", () => {
    it("calls tts.stop when interruptOnInput is true (default)", () => {
      maybeStopTtsOnInput();
      expect(mockStop).toHaveBeenCalled();
    });

    it("does not call tts.stop when interruptOnInput is false", () => {
      const vscode = require("vscode") as { workspace: { getConfiguration: jest.Mock } };
      vscode.workspace.getConfiguration = jest.fn(() => ({
        get: jest.fn((key: string, fallback: unknown) => {
          if (key === "interruptOnInput") return false;
          return fallback;
        }),
      }));

      maybeStopTtsOnInput();
      expect(mockStop).not.toHaveBeenCalled();
    });
  });

  describe("handleClarification", () => {
    it("returns undefined when spoken history is empty", async () => {
      mockGetSpokenHistory.mockReturnValue([]);
      const result = await handleClarification("some input");
      expect(result).toBeUndefined();
    });

    it("returns undefined when spoken history has only empty strings", async () => {
      mockGetSpokenHistory.mockReturnValue(["", " ", ""]);
      const result = await handleClarification("some input");
      expect(result).toBeUndefined();
    });

    it("returns undefined when no model is available", async () => {
      mockGetSpokenHistory.mockReturnValue(["Agent said something."]);
      mockSelectCheapModel.mockResolvedValue(undefined);

      const result = await handleClarification("user input");
      expect(result).toBeUndefined();
    });

    it("parses model response correctly for continue action", async () => {
      mockGetSpokenHistory.mockReturnValue(["Agent response about auth."]);

      const mockModel = {
        sendRequest: jest.fn().mockResolvedValue({
          text: (async function* () {
            yield JSON.stringify({ action: "continue" });
          })(),
        }),
      };
      mockSelectCheapModel.mockResolvedValue(mockModel);

      const result = await handleClarification("okay thanks");
      expect(result).toEqual({ action: "continue", mergedContent: undefined });
    });

    it("parses model response correctly for modify action with merged content", async () => {
      mockGetSpokenHistory.mockReturnValue(["Agent was working on auth refactor."]);

      const mockModel = {
        sendRequest: jest.fn().mockResolvedValue({
          text: (async function* () {
            yield JSON.stringify({
              action: "modify",
              mergedContent: "Refactor auth and also add tests",
            });
          })(),
        }),
      };
      mockSelectCheapModel.mockResolvedValue(mockModel);

      const result = await handleClarification("also add tests");
      expect(result).toEqual({
        action: "modify",
        mergedContent: "Refactor auth and also add tests",
      });
    });

    it("parses model response correctly for abandon action", async () => {
      mockGetSpokenHistory.mockReturnValue(["Agent was doing something."]);

      const mockModel = {
        sendRequest: jest.fn().mockResolvedValue({
          text: (async function* () {
            yield JSON.stringify({ action: "abandon" });
          })(),
        }),
      };
      mockSelectCheapModel.mockResolvedValue(mockModel);

      const result = await handleClarification("no, forget that");
      expect(result).toEqual({ action: "abandon", mergedContent: undefined });
    });

    it("returns continue on malformed model response", async () => {
      mockGetSpokenHistory.mockReturnValue(["Agent response."]);

      const mockModel = {
        sendRequest: jest.fn().mockResolvedValue({
          text: (async function* () {
            yield "not valid json at all";
          })(),
        }),
      };
      mockSelectCheapModel.mockResolvedValue(mockModel);

      const result = await handleClarification("user says something");
      expect(result).toEqual({ action: "continue" });
    });

    it("defaults unknown action to continue", async () => {
      mockGetSpokenHistory.mockReturnValue(["Agent said things."]);

      const mockModel = {
        sendRequest: jest.fn().mockResolvedValue({
          text: (async function* () {
            yield JSON.stringify({ action: "unknown_action" });
          })(),
        }),
      };
      mockSelectCheapModel.mockResolvedValue(mockModel);

      const result = await handleClarification("test");
      expect(result).toEqual({ action: "continue", mergedContent: undefined });
    });
  });
});
