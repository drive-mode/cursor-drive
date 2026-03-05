import * as fs from "fs/promises";
import * as os from "os";
import * as path from "path";
import { writeJsonAtomic, writeTextAtomic } from "../../src/governance/fsUtils.js";

async function makeTempDir(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), "drive-governance-"));
}

describe("governance/fsUtils", () => {
  it("writeJsonAtomic writes JSON with newline", async () => {
    const dir = await makeTempDir();
    const filePath = path.join(dir, "x", "out.json");
    await writeJsonAtomic(filePath, { a: 1 });
    const text = await fs.readFile(filePath, "utf8");
    expect(text).toContain("\"a\": 1");
    expect(text.endsWith("\n")).toBe(true);
  });

  it("writeTextAtomic writes text verbatim", async () => {
    const dir = await makeTempDir();
    const filePath = path.join(dir, "out.txt");
    await writeTextAtomic(filePath, "hello");
    const text = await fs.readFile(filePath, "utf8");
    expect(text).toBe("hello");
  });
});

