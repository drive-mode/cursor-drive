import * as vscode from "vscode";
import { selectTierModel } from "../src/modelUtils";

const cancelToken = { isCancellationRequested: false, onCancellationRequested: jest.fn() } as vscode.CancellationToken;

const model = (id: string, family = id, name = id): vscode.LanguageModelChat =>
  ({ id, family, name } as unknown as vscode.LanguageModelChat);

describe("selectTierModel", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns undefined when token is already cancelled", async () => {
    const cancelled = { isCancellationRequested: true, onCancellationRequested: jest.fn() } as vscode.CancellationToken;
    await expect(selectTierModel("routing", cancelled)).resolves.toBeUndefined();
    expect(vscode.lm.selectChatModels).not.toHaveBeenCalled();
  });

  it("returns undefined when model discovery throws", async () => {
    (vscode.lm.selectChatModels as jest.Mock).mockRejectedValue(new Error("no models"));
    await expect(selectTierModel("execution", cancelToken)).resolves.toBeUndefined();
  });

  it("selects preferred routing model when available", async () => {
    const sonnet = model("claude-sonnet");
    const mini = model("gpt-4o-mini");
    (vscode.lm.selectChatModels as jest.Mock).mockResolvedValue([sonnet, mini]);

    const selected = await selectTierModel("routing", cancelToken);
    expect(selected).toBe(mini);
  });

  it("selects preferred planning model when available", async () => {
    const haiku = model("claude-haiku");
    const planning = model("claude-3-5-sonnet");
    (vscode.lm.selectChatModels as jest.Mock).mockResolvedValue([haiku, planning]);

    const selected = await selectTierModel("planning", cancelToken);
    expect(selected).toBe(planning);
  });

  it("selects preferred reasoning model when available", async () => {
    const execution = model("gpt-4o");
    const reasoning = model("o1-preview");
    (vscode.lm.selectChatModels as jest.Mock).mockResolvedValue([execution, reasoning]);

    const selected = await selectTierModel("reasoning", cancelToken);
    expect(selected).toBe(reasoning);
  });

  it("falls back to first model when no preference matches", async () => {
    const first = model("unknown-model-a");
    const second = model("unknown-model-b");
    (vscode.lm.selectChatModels as jest.Mock).mockResolvedValue([first, second]);

    const selected = await selectTierModel("execution", cancelToken);
    expect(selected).toBe(first);
  });
});
