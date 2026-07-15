import * as assert from "assert";
import * as vscode from "vscode";

const EXTENSION_ID = "drive-mode.cursor-drive";

suite("Extension Host smoke", () => {
  test("activates and registers core Drive commands", async () => {
    const ext = vscode.extensions.getExtension(EXTENSION_ID);
    assert.ok(ext, `extension ${EXTENSION_ID} should be present`);

    await ext.activate();
    assert.ok(ext.isActive, "extension should be active after activate()");

    const commands = await vscode.commands.getCommands(true);
    assert.ok(commands.includes("cursorDrive.toggle"), "cursorDrive.toggle should be registered");
    assert.ok(
      commands.includes("cursorDrive.showAgentScreen"),
      "cursorDrive.showAgentScreen should be registered"
    );
  });
});
