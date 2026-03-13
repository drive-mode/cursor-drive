import {
  canSwitchByVoice,
  canSwitchBySemantic,
  requireConfirmation,
  getAllowedModes,
  isAllowedMode,
  canSwitch,
  parseVoiceModeSwitch,
  type SubMode,
} from "../src/modeSwitcher";

jest.mock("vscode", () => ({
  workspace: {
    onDidChangeConfiguration: jest.fn(() => ({ dispose: jest.fn() })),
    getConfiguration: jest.fn(() => ({
      get: jest.fn((key: string, def: unknown) => {
        const cfg: Record<string, unknown> = {
          "modeSwitching.voiceEnabled": true,
          "modeSwitching.semanticEnabled": false,
          "modeSwitching.requireConfirmation": true,
          "modeSwitching.allowedModes": ["plan", "agent", "ask", "debug"],
        };
        return cfg[key] ?? def;
      }),
    })),
  },
}));

describe("modeSwitcher", () => {
  it("canSwitchByVoice returns true by default", () => {
    expect(canSwitchByVoice()).toBe(true);
  });

  it("canSwitchBySemantic returns false by default", () => {
    expect(canSwitchBySemantic()).toBe(false);
  });

  it("requireConfirmation returns true by default", () => {
    expect(requireConfirmation()).toBe(true);
  });

  it("getAllowedModes returns all modes by default", () => {
    expect(getAllowedModes()).toEqual(["plan", "agent", "ask", "debug"]);
  });

  it("isAllowedMode returns true for valid modes", () => {
    expect(isAllowedMode("plan")).toBe(true);
    expect(isAllowedMode("agent")).toBe(true);
  });

  it("canSwitch allows manual always", () => {
    expect(canSwitch("manual", "plan")).toBe(true);
    expect(canSwitch("manual", "agent")).toBe(true);
  });

  it("parseVoiceModeSwitch extracts mode from 'switch to plan mode'", () => {
    const result = parseVoiceModeSwitch("switch to plan mode");
    expect(result).toBeDefined();
    expect(result?.mode).toBe("plan");
    expect(result?.matchedText).toMatch(/plan/);
  });

  it("parseVoiceModeSwitch extracts mode from 'go agent mode'", () => {
    const result = parseVoiceModeSwitch("go agent mode");
    expect(result).toBeDefined();
    expect(result?.mode).toBe("agent");
  });

  it("parseVoiceModeSwitch returns undefined for non-mode text", () => {
    expect(parseVoiceModeSwitch("add a login page")).toBeUndefined();
    expect(parseVoiceModeSwitch("refactor the auth module")).toBeUndefined();
  });
});
