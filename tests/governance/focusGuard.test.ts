import * as os from "os";
import * as fs from "fs/promises";
import * as path from "path";
import { countActivePlansFromRegistryYaml, evaluateFocusGuard } from "../../src/governance/focusGuard.js";

async function makeWorkspaceWithRegistry(registryYaml: string): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "drive-focus-"));
  await fs.mkdir(path.join(dir, ".cursor", "plans"), { recursive: true });
  await fs.writeFile(path.join(dir, ".cursor", "plans", "registry.yaml"), registryYaml, "utf8");
  return dir;
}

describe("governance/focusGuard", () => {
  it("counts active plans from registry.yaml (todo_empty=false, non-archived, non-project)", async () => {
    const root = await makeWorkspaceWithRegistry(
      [
        "version: 1",
        "plans:",
        "- id: cd-001",
        "  planId: a",
        "  plan_type: task",
        "  todo_empty: false",
        "- id: cd-002",
        "  planId: b",
        "  plan_type: task",
        "  todo_empty: true",
        "- id: cd-003",
        "  planId: c",
        "  plan_type: project",
        "  todo_empty: false",
        "- id: cd-004",
        "  planId: d",
        "  plan_type: task",
        "  todo_empty: false",
        "  archived: true",
        "",
      ].join("\n")
    );
    const active = await countActivePlansFromRegistryYaml(root);
    expect(active).toBe(1);
  });

  it("blocks when thresholds exceeded", () => {
    const d = evaluateFocusGuard(
      { enabled: true, maxActivePlans: 1, maxActiveOperators: 2 },
      { activePlans: 1, activeOperators: 2 }
    );
    expect(d.allowed).toBe(false);
    expect(d.reasons.length).toBeGreaterThan(0);
  });
});

