import * as fs from "fs/promises";
import * as path from "path";
import { PersistentMemory } from "../src/persistentMemory";

jest.mock("fs/promises", () => ({
  mkdir: jest.fn().mockResolvedValue(undefined),
  appendFile: jest.fn().mockResolvedValue(undefined),
  writeFile: jest.fn().mockResolvedValue(undefined),
  readFile: jest.fn(),
  readdir: jest.fn(),
}));

const mockFs = fs as jest.Mocked<typeof fs>;

describe("PersistentMemory", () => {
  const workspaceRoot = "/repo";

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it("buildPromptContext loads curated + yesterday + today sections", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-02-26T12:00:00Z"));
    mockFs.readFile.mockImplementation(async (pathLike: fs.PathLike) => {
      const filePath = path.normalize(String(pathLike)).replace(/\\/g, "/");
      if (filePath.endsWith("/.drive/MEMORY.md")) { return "Long-term fact"; }
      if (filePath.endsWith("/.drive/memory/2026-02-25.md")) { return "Yesterday note"; }
      if (filePath.endsWith("/.drive/memory/2026-02-26.md")) { return "Today note"; }
      throw new Error("not found");
    });

    const memory = new PersistentMemory(workspaceRoot);
    const context = await memory.buildPromptContext();

    expect(context).toContain("## Long-term memory");
    expect(context).toContain("Long-term fact");
    expect(context).toContain("## Yesterday (2026-02-25)");
    expect(context).toContain("Yesterday note");
    expect(context).toContain("## Today (2026-02-26)");
    expect(context).toContain("Today note");
  });

  it("appendToDaily creates directory and appends timestamped note", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-02-26T08:09:10Z"));
    const memory = new PersistentMemory(workspaceRoot);

    await memory.appendToDaily("  fixed mcp transport  ", "Alpha");

    expect(mockFs.mkdir).toHaveBeenCalledWith(path.join("/repo", ".drive", "memory"), { recursive: true });
    expect(mockFs.appendFile).toHaveBeenCalledTimes(1);
    const [filePath, text, encoding] = mockFs.appendFile.mock.calls[0];
    expect(path.normalize(String(filePath))).toBe(path.normalize(path.join("/repo", ".drive", "memory", "2026-02-26.md")));
    expect(String(text)).toContain("[2026-02-26 08:09:10] [Alpha] fixed mcp transport");
    expect(encoding).toBe("utf8");
  });

  it("writeCurated overwrites MEMORY.md with trailing newline", async () => {
    const memory = new PersistentMemory(workspaceRoot);
    await memory.writeCurated(" remember this ");

    expect(mockFs.mkdir).toHaveBeenCalledWith(path.join("/repo", ".drive"), { recursive: true });
    expect(mockFs.writeFile).toHaveBeenCalledWith(path.join("/repo", ".drive", "MEMORY.md"), "remember this\n", "utf8");
  });

  it("search ranks matches by token frequency and applies topK", async () => {
    mockFs.readdir.mockResolvedValue(["2026-02-26.md", "2026-02-25.md", "2026-02-24.md"] as unknown as fs.Dirent[]);
    mockFs.readFile.mockImplementation(async (pathLike: fs.PathLike) => {
      const filePath = path.normalize(String(pathLike)).replace(/\\/g, "/");
      if (filePath.endsWith("2026-02-26.md")) { return "auth auth retry logic update"; }
      if (filePath.endsWith("2026-02-25.md")) { return "auth changes"; }
      if (filePath.endsWith("2026-02-24.md")) { return "unrelated"; }
      throw new Error("not found");
    });

    const memory = new PersistentMemory(workspaceRoot);
    const results = await memory.search("auth retry", 2);

    expect(results).toHaveLength(2);
    expect(results[0].date).toBe("2026-02-26");
    expect(results[0].score).toBeGreaterThan(results[1].score);
    expect(results[0].snippet).toContain("auth");
  });

  it("search returns empty when memory directory is unavailable", async () => {
    mockFs.readdir.mockRejectedValue(new Error("missing dir"));
    const memory = new PersistentMemory(workspaceRoot);
    await expect(memory.search("anything", 5)).resolves.toEqual([]);
  });
});
