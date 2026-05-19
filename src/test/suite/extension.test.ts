/**
 * Integration tests for Cursor Drive extension.
 * Run inside Extension Development Host via `npm run test:integration` or Extension Test Runner.
 */

import * as assert from "assert";
import * as vscode from "vscode";

suite("Cursor Drive Extension Test Suite", () => {
  suiteSetup(async function () {
    this.timeout(20000);
    // Extension activates on startup; ensure we're in a workspace
    const folders = vscode.workspace.workspaceFolders;
    if (!folders || folders.length === 0) {
      throw new Error("No workspace folder open; integration tests require a workspace.");
    }
  });

  test("Extension is activated", async () => {
    const ext = vscode.extensions.getExtension("drive-mode.cursor-drive");
    assert.ok(ext, "Cursor Drive extension should be installed");
    assert.strictEqual(ext.isActive, true, "Extension should be active");
  });

  test("cursorDrive.toggle command is registered", async () => {
    const commands = await vscode.commands.getCommands();
    const driveCommands = commands.filter((c) => c.startsWith("cursorDrive."));
    assert.ok(
      driveCommands.includes("cursorDrive.toggle"),
      `cursorDrive.toggle should be registered. Found: ${driveCommands.join(", ")}`
    );
  });

  test("cursorDrive.showAgentScreen command is registered", async () => {
    const commands = await vscode.commands.getCommands();
    assert.ok(
      commands.includes("cursorDrive.showAgentScreen"),
      "cursorDrive.showAgentScreen should be registered"
    );
  });

  test("cursorDrive.toggle can be executed", async () => {
    await assert.doesNotReject(
      Promise.resolve(vscode.commands.executeCommand("cursorDrive.toggle")),
      "cursorDrive.toggle should execute without throwing"
    );
    // Toggle back to restore state
    await vscode.commands.executeCommand("cursorDrive.toggle");
  });

  test("cursorDrive configuration is readable", () => {
    const config = vscode.workspace.getConfiguration("cursorDrive");
    assert.ok(config, "cursorDrive config should exist");
    const defaultSubMode = config.get<string>("defaultSubMode");
    assert.ok(
      ["plan", "agent", "ask", "debug"].includes(defaultSubMode ?? ""),
      `defaultSubMode should be valid: ${defaultSubMode}`
    );
  });

  test("cursorDrive.diagnose command is registered", async () => {
    const commands = await vscode.commands.getCommands();
    assert.ok(
      commands.includes("cursorDrive.diagnose"),
      "cursorDrive.diagnose should be registered"
    );
  });
});
