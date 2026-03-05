import { playChime } from "../src/audioFeedback";

jest.mock("../src/agentScreen", () => ({
  AgentScreenPanel: {
    getInstance: jest.fn(),
  },
}));

jest.mock("../src/tts", () => ({
  speak: jest.fn(),
}));

import { AgentScreenPanel } from "../src/agentScreen";
import { speak } from "../src/tts";

describe("playChime", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("calls panel.playChime(1) when AgentScreen is open and count is 1", () => {
    const mockPlayChime = jest.fn();
    (AgentScreenPanel.getInstance as jest.Mock).mockReturnValue({ playChime: mockPlayChime });

    playChime(1);

    expect(mockPlayChime).toHaveBeenCalledWith(1);
    expect(speak).not.toHaveBeenCalled();
  });

  it("calls panel.playChime(2) when AgentScreen is open and count is 2", () => {
    const mockPlayChime = jest.fn();
    (AgentScreenPanel.getInstance as jest.Mock).mockReturnValue({ playChime: mockPlayChime });

    playChime(2);

    expect(mockPlayChime).toHaveBeenCalledWith(2);
    expect(speak).not.toHaveBeenCalled();
  });

  it("falls back to speak('Drive on') when no AgentScreen panel for count 1", () => {
    (AgentScreenPanel.getInstance as jest.Mock).mockReturnValue(undefined);

    playChime(1);

    expect(speak).toHaveBeenCalledWith("Drive on");
  });

  it("falls back to speak('Drive off') when no AgentScreen panel for count 2", () => {
    (AgentScreenPanel.getInstance as jest.Mock).mockReturnValue(undefined);

    playChime(2);

    expect(speak).toHaveBeenCalledWith("Drive off");
  });
});
