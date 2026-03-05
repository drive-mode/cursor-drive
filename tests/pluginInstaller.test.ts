import * as fs from "fs/promises";
import * as os from "os";
import * as path from "path";
import * as vscode from "vscode";
import {
  DRIVE_HOOK_COMMAND,
  installDrivePluginToWorkspace,
  parseSkillRequires,
  checkSkillRequires,
} from "../src/pluginInstaller";

async function writeFile(filePath: string, contents: string): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, contents, "utf8");
}

describe("installDrivePluginToWorkspace", () => {
  let tempRoot: string;
  let extensionPath: string;
  let workspacePath: string;

  beforeEach(async () => {
    jest.clearAllMocks();
    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "drive-installer-"));
    extensionPath = path.join(tempRoot, "extension");
    workspacePath = path.join(tempRoot, "workspace");

    await writeFile(path.join(extensionPath, "agents", "drive.md"), "# drive");
    await writeFile(path.join(extensionPath, "commands", "tangent.md"), "# tangent");
    await writeFile(path.join(extensionPath, "rules", "drive-modes.mdc"), "# rule");
    await writeFile(
      path.join(extensionPath, "mcp.json"),
      JSON.stringify({ mcpServers: { drive: { url: "http://127.0.0.1:7891/mcp" } } }, null, 2)
    );
    await writeFile(
      path.join(extensionPath, ".cursor", "hooks", "drive-preprocessor.py"),
      "print('ok')\n"
    );

    await fs.mkdir(workspacePath, { recursive: true });
    (vscode.workspace as unknown as { workspaceFolders: Array<{ uri: { fsPath: string } }> }).workspaceFolders = [
      { uri: { fsPath: workspacePath } },
    ];
  });

  afterEach(async () => {
    await fs.rm(tempRoot, { recursive: true, force: true });
  });

  it("throws when no workspace folder is open", async () => {
    (vscode.workspace as unknown as { workspaceFolders: [] }).workspaceFolders = [];
    await expect(
      installDrivePluginToWorkspace({ extensionPath } as vscode.ExtensionContext)
    ).rejects.toThrow("Open a workspace folder");
  });

  it("copies plugin assets and merges mcp/hooks config", async () => {
    await writeFile(
      path.join(workspacePath, ".cursor", "mcp.json"),
      JSON.stringify({ mcpServers: { existing: { url: "http://localhost:9999/mcp" } } }, null, 2)
    );
    await writeFile(
      path.join(workspacePath, ".cursor", "hooks.json"),
      JSON.stringify(
        {
          version: 1,
          hooks: { beforeSubmitPrompt: [{ command: "echo existing hook" }] },
        },
        null,
        2
      )
    );

    const result = await installDrivePluginToWorkspace(
      { extensionPath } as vscode.ExtensionContext
    );

    expect(result.workspaceRoot).toBe(workspacePath);

    await expect(fs.readFile(path.join(workspacePath, ".cursor", "agents", "drive.md"), "utf8"))
      .resolves.toContain("drive");
    await expect(fs.readFile(path.join(workspacePath, ".cursor", "commands", "tangent.md"), "utf8"))
      .resolves.toContain("tangent");
    await expect(fs.readFile(path.join(workspacePath, ".cursor", "rules", "drive-modes.mdc"), "utf8"))
      .resolves.toContain("rule");
    await expect(fs.readFile(path.join(workspacePath, ".cursor", "hooks", "drive-preprocessor.py"), "utf8"))
      .resolves.toContain("ok");

    const mergedMcp = JSON.parse(
      await fs.readFile(path.join(workspacePath, ".cursor", "mcp.json"), "utf8")
    ) as { mcpServers: Record<string, unknown> };
    expect(mergedMcp.mcpServers.existing).toBeDefined();
    expect(mergedMcp.mcpServers.drive).toBeDefined();

    const hooks = JSON.parse(
      await fs.readFile(path.join(workspacePath, ".cursor", "hooks.json"), "utf8")
    ) as { hooks: { beforeSubmitPrompt: Array<{ command: string }> } };
    expect(hooks.hooks.beforeSubmitPrompt.some((entry) => entry.command === DRIVE_HOOK_COMMAND)).toBe(true);
    expect(hooks.hooks.beforeSubmitPrompt.some((entry) => entry.command === "echo existing hook")).toBe(true);
  });

  it("skips skills whose requires are unmet and records them in result", async () => {
    // Create a skill that requires a non-existent binary.
    await writeFile(
      path.join(extensionPath, ".cursor", "skills", "needs-unobtainium", "SKILL.md"),
      [
        "---",
        "name: needs-unobtainium",
        "requires:",
        "  bins: [__drive_nonexistent_bin_xyz__]",
        "---",
        "# Skill body",
      ].join("\n")
    );
    // Create a skill with no requires (should be installed).
    await writeFile(
      path.join(extensionPath, ".cursor", "skills", "no-requires", "SKILL.md"),
      ["---", "name: no-requires", "---", "# Skill body"].join("\n")
    );

    const result = await installDrivePluginToWorkspace(
      { extensionPath } as vscode.ExtensionContext
    );

    expect(result.skippedSkills).toContain("needs-unobtainium");
    expect(result.skippedSkills).not.toContain("no-requires");

    // The gated skill should NOT be installed.
    await expect(
      fs.stat(path.join(workspacePath, ".cursor", "skills", "needs-unobtainium"))
    ).rejects.toThrow();
    // The ungated skill SHOULD be installed.
    await expect(
      fs.readFile(path.join(workspacePath, ".cursor", "skills", "no-requires", "SKILL.md"), "utf8")
    ).resolves.toContain("no-requires");
  });
});

describe("parseSkillRequires", () => {
  it("parses bins, env, and os from inline list syntax", () => {
    const md = [
      "---",
      "name: my-skill",
      "requires:",
      "  bins: [git, node]",
      "  env: [MY_KEY]",
      "  os: [darwin, linux]",
      "---",
      "# body",
    ].join("\n");
    const req = parseSkillRequires(md);
    expect(req.bins).toEqual(["git", "node"]);
    expect(req.env).toEqual(["MY_KEY"]);
    expect(req.os).toEqual(["darwin", "linux"]);
  });

  it("returns empty object for skill with no frontmatter", () => {
    const req = parseSkillRequires("# Just a skill, no frontmatter");
    expect(req.bins ?? []).toHaveLength(0);
    expect(req.env ?? []).toHaveLength(0);
    expect(req.os ?? []).toHaveLength(0);
  });

  it("returns empty object for skill with frontmatter but no requires section", () => {
    const md = ["---", "name: simple", "description: no requires", "---", "# body"].join("\n");
    const req = parseSkillRequires(md);
    expect(req.bins ?? []).toHaveLength(0);
  });
});

describe("checkSkillRequires", () => {
  it("passes when requires is empty", () => {
    expect(checkSkillRequires({})).toHaveLength(0);
  });

  it("reports unmet bin as unmet", () => {
    const unmet = checkSkillRequires({ bins: ["__drive_nonexistent_xyz__"] });
    expect(unmet.length).toBeGreaterThan(0);
    expect(unmet[0]).toContain("__drive_nonexistent_xyz__");
  });

  it("passes bin check for 'node' (should exist in test environment)", () => {
    const unmet = checkSkillRequires({ bins: ["node"] });
    expect(unmet).toHaveLength(0);
  });

  it("reports unset env var as unmet", () => {
    const unmet = checkSkillRequires({ env: ["DRIVE_NONEXISTENT_ENV_VAR_XYZ"] });
    expect(unmet.length).toBeGreaterThan(0);
    expect(unmet[0]).toContain("DRIVE_NONEXISTENT_ENV_VAR_XYZ");
  });

  it("passes os check when current platform is in list", () => {
    const unmet = checkSkillRequires({ os: [process.platform] });
    expect(unmet).toHaveLength(0);
  });

  it("fails os check when platform not in list", () => {
    const unmet = checkSkillRequires({ os: ["__fake_os__"] });
    expect(unmet.length).toBeGreaterThan(0);
  });
});
