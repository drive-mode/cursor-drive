import * as os from "os";
import * as fs from "fs/promises";
import * as path from "path";
import { buildProjectGraphSnapshot } from "../../src/governance/projectGraph.js";
import { computeEntropyReport } from "../../src/governance/entropy.js";
import { EntropyReportSchema } from "../../src/governance/schemas.js";

async function makeWorkspace(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "drive-entropy-ws-"));
  await fs.mkdir(path.join(dir, "src"), { recursive: true });
  await fs.mkdir(path.join(dir, "tests"), { recursive: true });

  await fs.writeFile(path.join(dir, "src", "dep.ts"), "export const dep = 1;\n", "utf8");
  await fs.writeFile(path.join(dir, "src", "dup1.ts"), "export const same = 123;\n", "utf8");
  await fs.writeFile(path.join(dir, "src", "dup2.ts"), "export const same = 123;\n", "utf8");
  await fs.writeFile(path.join(dir, "src", "unused.ts"), "export const unused = true;\n", "utf8");
  await fs.writeFile(
    path.join(dir, "src", "extension.ts"),
    "import { dep } from './dep.js';\nimport { same } from './dup1.js';\nexport const x = dep + same;\n// TODO: remove\n",
    "utf8"
  );
  await fs.writeFile(
    path.join(dir, "tests", "extension.test.ts"),
    "import { x } from '../src/extension.js';\ntest('x', () => { expect(x).toBe(124); });\n",
    "utf8"
  );
  await fs.writeFile(path.join(dir, "package.json"), "{\"name\":\"x\"}\n", "utf8");
  return dir;
}

describe("governance/entropy", () => {
  it("computes entropy metrics and schema-valid report", async () => {
    const root = await makeWorkspace();
    const snapshot = await buildProjectGraphSnapshot(root);
    const report = await computeEntropyReport(snapshot, root);
    const parsed = EntropyReportSchema.parse(report);

    expect(parsed.score).toBeGreaterThanOrEqual(0);
    expect(parsed.score).toBeLessThanOrEqual(100);
    expect(parsed.metrics.deadCodeRatio).toBeGreaterThan(0);
    expect(parsed.metrics.redundancyIndex).toBeGreaterThan(0);
    expect(parsed.metrics.testGapIndex).toBeGreaterThan(0);
    expect(parsed.metrics.todoDensity).toBeGreaterThan(0);

    const categories = new Set(parsed.findings.map((f) => f.category));
    expect(categories.has("dead_code")).toBe(true);
    expect(categories.has("redundancy")).toBe(true);
  });
});

