import * as vscode from "vscode";
import { createDriveModeManager } from "../src/driveMode";

function makeContext(initial: Record<string, unknown> = {}): vscode.ExtensionContext {
  const state = new Map<string, unknown>(Object.entries(initial));
  return {
    workspaceState: {
      get: jest.fn((key: string, fallback?: unknown) =>
        state.has(key) ? state.get(key) : fallback
      ),
      update: jest.fn((key: string, value: unknown) => {
        state.set(key, value);
        return Promise.resolve();
      }),
    },
  } as unknown as vscode.ExtensionContext;
}

describe("createDriveModeManager", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("defaults to inactive agent mode", () => {
    const ctx = makeContext();
    const mgr = createDriveModeManager(ctx);

    expect(mgr.active).toBe(false);
    expect(mgr.subMode).toBe("agent");
  });

  it("loads persisted debug mode", () => {
    const ctx = makeContext({ "drive.active": true, "drive.subMode": "debug" });
    const mgr = createDriveModeManager(ctx);

    expect(mgr.active).toBe(true);
    expect(mgr.subMode).toBe("debug");
  });

  it("applies configured default sub-mode when toggled on", () => {
    (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
      get: jest.fn((key: string) => (key === "defaultSubMode" ? "debug" : undefined)),
    });

    const ctx = makeContext();
    const mgr = createDriveModeManager(ctx);
    mgr.toggle();

    expect(mgr.active).toBe(true);
    expect(mgr.subMode).toBe("debug");
  });

  it("persists state to workspaceState on setActive and setSubMode", () => {
    const ctx = makeContext();
    const mgr = createDriveModeManager(ctx);

    mgr.setActive(true);
    expect(ctx.workspaceState.update).toHaveBeenCalledWith("drive.active", true);

    mgr.setSubMode("plan");
    expect(ctx.workspaceState.update).toHaveBeenCalledWith("drive.subMode", "plan");
  });

  it("emits change events when state mutates", () => {
    const ctx = makeContext();
    const mgr = createDriveModeManager(ctx);
    const listener = jest.fn();
    mgr.onDidChange(listener);

    mgr.setActive(true);
    mgr.setSubMode("plan");
    mgr.setSubMode("debug");

    expect(listener).toHaveBeenCalledTimes(3);
  });
});
