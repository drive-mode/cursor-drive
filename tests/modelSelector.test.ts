import * as vscode from "vscode";
import {
  selectModelForTier,
  selectCheapModel,
  tierForMode,
  describeModel,
} from "../src/modelSelector";

const cancelToken = { isCancellationRequested: false, onCancellationRequested: jest.fn() };

const makeModel = (id: string, family: string, name: string) =>
  ({ id, family, name } as unknown as vscode.LanguageModelChat);

describe("selectModelForTier", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns undefined when cancelled", async () => {
    const cancelled = { isCancellationRequested: true, onCancellationRequested: jest.fn() };
    const result = await selectModelForTier("routing", cancelled);
    expect(result).toBeUndefined();
  });

  it("returns undefined when no models available", async () => {
    (vscode.lm.selectChatModels as jest.Mock).mockResolvedValue([]);
    expect(await selectModelForTier("routing", cancelToken)).toBeUndefined();
  });

  it("returns undefined when selectChatModels throws", async () => {
    (vscode.lm.selectChatModels as jest.Mock).mockRejectedValue(new Error("API unavailable"));
    expect(await selectModelForTier("routing", cancelToken)).toBeUndefined();
  });

  it("picks preferred routing model (gpt-4o-mini) over others", async () => {
    const mini = makeModel("gpt-4o-mini", "gpt-4o-mini", "GPT-4o Mini");
    const sonnet = makeModel("claude-sonnet", "claude-sonnet", "Claude Sonnet");
    (vscode.lm.selectChatModels as jest.Mock).mockResolvedValue([sonnet, mini]);
    const result = await selectModelForTier("routing", cancelToken);
    expect(result).toBe(mini);
  });

  it("picks preferred planning model (claude-sonnet) over execution fallback", async () => {
    const sonnet = makeModel("claude-sonnet", "claude-sonnet", "Claude Sonnet");
    const haiku = makeModel("claude-haiku", "claude-haiku", "Claude Haiku");
    // haiku is routing-preferred; sonnet is planning-preferred — planning tier should pick sonnet
    (vscode.lm.selectChatModels as jest.Mock).mockResolvedValue([haiku, sonnet]);
    const result = await selectModelForTier("planning", cancelToken);
    expect(result).toBe(sonnet);
  });

  it("falls back to first available when no preference matches", async () => {
    const unknown = makeModel("some-model", "some-model", "Some Model");
    (vscode.lm.selectChatModels as jest.Mock).mockResolvedValue([unknown]);
    const result = await selectModelForTier("routing", cancelToken);
    expect(result).toBe(unknown);
  });
});

describe("selectCheapModel", () => {
  it("delegates to routing tier", async () => {
    const mini = makeModel("gpt-4o-mini", "gpt-4o-mini", "GPT-4o Mini");
    (vscode.lm.selectChatModels as jest.Mock).mockResolvedValue([mini]);
    expect(await selectCheapModel(cancelToken)).toBe(mini);
  });
});

describe("tierForMode", () => {
  it("plan → planning", () => expect(tierForMode("plan")).toBe("planning"));
  it("run → execution", () => expect(tierForMode("run")).toBe("execution"));
  it("collab → execution", () => expect(tierForMode("collab")).toBe("execution"));
  it("direct → execution", () => expect(tierForMode("direct")).toBe("execution"));
});

describe("describeModel", () => {
  it("returns fallback when model is undefined", () => {
    expect(describeModel(undefined, "routing")).toContain("no model available");
  });

  it("includes model name and tier label", () => {
    const model = makeModel("gpt-4o-mini", "gpt-4o-mini", "GPT-4o Mini");
    const desc = describeModel(model, "routing");
    expect(desc).toContain("GPT-4o Mini");
    expect(desc).toContain("cheap routing");
  });

  it("labels planning tier correctly", () => {
    const model = makeModel("gpt-4o", "gpt-4o", "GPT-4o");
    expect(describeModel(model, "planning")).toContain("planning");
  });
});
