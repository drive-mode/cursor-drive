import * as os from "os";
import * as fs from "fs/promises";
import * as path from "path";
import { buildProjectGraphSnapshot } from "../../src/governance/projectGraph.js";
import { ProjectGraphSnapshotSchema } from "../../src/governance/schemas.js";

async function makeTempWorkspace(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "drive-governance-ws-"));
  await fs.mkdir(path.join(dir, "src"), { recursive: true });
  await fs.mkdir(path.join(dir, "tests"), { recursive: true });
  await fs.writeFile(path.join(dir, "src", "dep.ts"), "export const dep = 1;\n", "utf8");
  await fs.writeFile(
    path.join(dir, "src", "extension.ts"),
    "import { dep } from './dep.js';\nexport const x = dep;\n",
    "utf8"
  );
  await fs.writeFile(
    path.join(dir, "tests", "x.test.ts"),
    "import { x } from '../src/extension.js';\ntest('x', () => { expect(x).toBe(1); });\n",
    "utf8"
  );
  await fs.writeFile(path.join(dir, "package.json"), "{\"name\":\"x\"}\n", "utf8");
  return dir;
}

describe("governance/projectGraph", () => {
  it("produces a schema-valid scaffold snapshot", async () => {
    const root = await makeTempWorkspace();
    const snapshot = await buildProjectGraphSnapshot(root);
    const parsed = ProjectGraphSnapshotSchema.parse(snapshot);
    expect(parsed.nodes.length).toBeGreaterThan(0);
    expect(parsed.edges.length).toBeGreaterThan(0);
    expect(parsed.partial).toBe(false);

    const hasImportEdge = parsed.edges.some((e) => e.type === "import");
    const hasTestOfEdge = parsed.edges.some((e) => e.type === "testOf");
    expect(hasImportEdge).toBe(true);
    expect(hasTestOfEdge).toBe(true);
  });
});

