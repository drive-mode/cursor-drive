import { extractTangentNameAndTask } from "../src/tangentNameExtractor";

jest.mock("vscode", () => {
  const base = jest.requireActual<typeof import("../__mocks__/vscode")>("vscode");
  return { ...base };
});

jest.mock("../src/modelSelector", () => ({
  selectCheapModel: jest.fn().mockResolvedValue(undefined),
}));

describe("extractTangentNameAndTask", () => {
  describe("regex extraction (Tier 0)", () => {
    it("extracts name and task with em-dash separator", async () => {
      const result = await extractTangentNameAndTask("Beta — explore clerk integration");
      expect(result.name).toBe("Beta");
      expect(result.task).toBe("explore clerk integration");
    });

    it("extracts name and task with colon separator", async () => {
      const result = await extractTangentNameAndTask("Gamma: build the login page");
      expect(result.name).toBe("Gamma");
      expect(result.task).toBe("build the login page");
    });

    it("extracts name and task with hyphen separator", async () => {
      const result = await extractTangentNameAndTask("Delta - refactor auth module");
      expect(result.name).toBe("Delta");
      expect(result.task).toBe("refactor auth module");
    });

    it("extracts name and task with 'call it' prefix", async () => {
      const result = await extractTangentNameAndTask("call it Beta — refactor auth");
      expect(result.name).toBe("Beta");
      expect(result.task).toBe("refactor auth");
    });

    it("handles multi-word names with separator", async () => {
      const result = await extractTangentNameAndTask("The Godly Knight — save the kingdom");
      expect(result.name).toBe("The Godly Knight");
      expect(result.task).toBe("save the kingdom");
    });
  });

  describe("model fallback (Tier 1)", () => {
    it("returns full text as task when no separator found and model unavailable", async () => {
      const result = await extractTangentNameAndTask("explore the clerk integration");
      expect(result.name).toBeUndefined();
      expect(result.task).toBe("explore the clerk integration");
    });

    it("returns full text as task for plain text without name", async () => {
      const result = await extractTangentNameAndTask("research rate limiting patterns");
      expect(result.name).toBeUndefined();
      expect(result.task).toBe("research rate limiting patterns");
    });
  });

  describe("edge cases", () => {
    it("handles empty task after separator gracefully", async () => {
      // No task after separator — regex won't match, falls to model (returns full text)
      const result = await extractTangentNameAndTask("Beta —");
      // Regex requires non-empty task after separator, so this falls through to model
      expect(result.task).toBeTruthy();
    });

    it("handles whitespace-only input", async () => {
      const result = await extractTangentNameAndTask("   ");
      expect(result.task).toBe("");
    });
  });
});
