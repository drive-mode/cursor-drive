import * as vscode from "vscode";

jest.mock("say", () => ({
  speak: jest.fn(),
  stop: jest.fn(),
}));

jest.mock("../src/edgeTts", () => ({
  speakEdgeTts: jest.fn().mockResolvedValue(false),
  stopEdgeTts: jest.fn(),
  isEdgeTtsAvailable: jest.fn().mockReturnValue(false),
  registerEdgeTtsAudioPlayer: jest.fn(),
}));

jest.mock("../src/piper", () => ({
  speakPiper: jest.fn().mockReturnValue(false),
  stopPiper: jest.fn(),
  isPiperAvailable: jest.fn().mockReturnValue(false),
}));

type TtsModule = typeof import("../src/tts");
type SayMockModule = { speak: jest.Mock; stop: jest.Mock };

function getSayMock(): SayMockModule {
  return require("say") as SayMockModule;
}

function loadTtsModule(config: Partial<Record<string, unknown>> = {}): TtsModule {
  jest.resetModules();
  const vscodeMock = require("vscode") as typeof import("vscode");
  (vscodeMock.workspace.getConfiguration as jest.Mock).mockReturnValue({
    get: jest.fn((key: string, fallback: unknown) => (key in config ? config[key] : fallback)),
  });
  return require("../src/tts") as TtsModule;
}

describe("tts", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns disabled when config says tts is off", () => {
    const tts = loadTtsModule({ enabled: false });
    const sayMock = getSayMock();
    expect(tts.isEnabled()).toBe(false);
    tts.speak("hello");
    expect(sayMock.stop).not.toHaveBeenCalled();
    expect(sayMock.speak).not.toHaveBeenCalled();
  });

  it("truncates speak output to maxSpokenSentences", () => {
    const tts = loadTtsModule({
      enabled: true,
      maxSpokenSentences: 2,
      speed: 1.25,
      voice: "Alex",
    });
    const sayMock = getSayMock();
    tts.speak("One sentence. Two sentence! Three sentence?");

    expect(sayMock.stop).toHaveBeenCalledTimes(1);
    expect(sayMock.speak).toHaveBeenCalledTimes(1);
    const [spokenText, spokenVoice, spokenSpeed] = sayMock.speak.mock.calls[0];
    expect(spokenText).toContain("One sentence.");
    expect(spokenText).toContain("Two sentence!");
    expect(spokenText).not.toContain("Three sentence?");
    expect(spokenVoice).toBe("Alex");
    expect(spokenSpeed).toBe(1.25);
  });

  it("speakFull sends full trimmed text without sentence truncation", () => {
    const tts = loadTtsModule({ enabled: true, voice: "Default", speed: 1 });
    const sayMock = getSayMock();
    tts.speakFull("  line one. line two. line three.  ");

    expect(sayMock.stop).toHaveBeenCalledTimes(1);
    expect(sayMock.speak).toHaveBeenCalledWith("line one. line two. line three.", "Default", 1, expect.any(Function));
  });

  it("stop proxies directly to say.stop", () => {
    const tts = loadTtsModule({ enabled: true });
    const sayMock = getSayMock();
    tts.stop();
    expect(sayMock.stop).toHaveBeenCalledTimes(1);
  });

  it("caches resolved tts configuration values", () => {
    const tts = loadTtsModule({ enabled: true, speed: 3, voice: "  " });
    const vscodeMock = require("vscode") as typeof import("vscode");
    const cfgA = tts.getTtsConfig();
    const cfgB = tts.getTtsConfig();

    expect(vscodeMock.workspace.getConfiguration).toHaveBeenCalledTimes(1);
    expect(cfgA).toBe(cfgB);
    expect(cfgA.speed).toBe(2);
    expect(cfgA.voice).toBeUndefined();
  });
});
