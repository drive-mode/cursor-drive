import { checkPrompt, checkResponse } from "../src/approvalGates";

// Mock vscode
const mockShowWarningMessage = jest.fn();
const mockShowErrorMessage = jest.fn();

jest.mock("vscode", () => ({
  workspace: {
    getConfiguration: jest.fn(() => ({
      get: jest.fn((key: string, fallback: unknown) => {
        if (key === "enabled") { return true; }
        if (key === "warnPatterns") { return []; }
        if (key === "blockPatterns") { return []; }
        return fallback;
      }),
    })),
    onDidChangeConfiguration: jest.fn(() => ({ dispose: jest.fn() })),
  },
  window: {
    showWarningMessage: (...args: unknown[]) => mockShowWarningMessage(...args),
    showErrorMessage: (...args: unknown[]) => mockShowErrorMessage(...args),
  },
}));

describe("approvalGates", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("checkPrompt — block patterns", () => {
    it("blocks 'rm -rf'", async () => {
      mockShowErrorMessage.mockResolvedValue(undefined);
      const allowed = await checkPrompt("run rm -rf /tmp/test to clean up");
      expect(allowed).toBe(false);
      expect(mockShowErrorMessage).toHaveBeenCalled();
    });

    it("blocks 'rmdir /s'", async () => {
      mockShowErrorMessage.mockResolvedValue(undefined);
      const allowed = await checkPrompt("rmdir /s C:\\temp");
      expect(allowed).toBe(false);
    });
  });

  describe("checkPrompt — warn patterns (user proceeds)", () => {
    it("warns on 'force push' and allows when user confirms", async () => {
      mockShowWarningMessage.mockResolvedValue("Proceed");
      const allowed = await checkPrompt("please force push this branch");
      expect(allowed).toBe(true);
      expect(mockShowWarningMessage).toHaveBeenCalled();
    });

    it("warns on 'force push' and blocks when user cancels", async () => {
      mockShowWarningMessage.mockResolvedValue("Cancel");
      const allowed = await checkPrompt("please force push this branch");
      expect(allowed).toBe(false);
    });

    it("warns on 'drop database'", async () => {
      mockShowWarningMessage.mockResolvedValue("Cancel");
      const allowed = await checkPrompt("drop database production now");
      expect(allowed).toBe(false);
      expect(mockShowWarningMessage).toHaveBeenCalled();
    });
  });

  describe("checkPrompt — clean prompts", () => {
    it("allows safe prompts without any dialog", async () => {
      const allowed = await checkPrompt("add unit tests for the auth module");
      expect(allowed).toBe(true);
      expect(mockShowWarningMessage).not.toHaveBeenCalled();
      expect(mockShowErrorMessage).not.toHaveBeenCalled();
    });
  });

  describe("checkResponse — code block scanning", () => {
    it("blocks dangerous commands in code blocks", async () => {
      mockShowErrorMessage.mockResolvedValue(undefined);
      const response = "Here is the cleanup script:\n```bash\nrm -rf /var/data\n```";
      const allowed = await checkResponse(response);
      expect(allowed).toBe(false);
    });

    it("allows clean responses", async () => {
      const response = "Updated `src/auth.ts`. Want details?";
      const allowed = await checkResponse(response);
      expect(allowed).toBe(true);
    });
  });
});
