import * as vscode from "vscode";
import { OperatorRegistry } from "../src/operatorRegistry";
import { createDriveStatusBar } from "../src/statusBar";

describe("createDriveStatusBar", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (vscode.workspace.getConfiguration as jest.Mock).mockImplementation((section: string) => ({
      get: (key: string, defaultValue: unknown) => defaultValue,
    }));
  });

  it("renders off state by default", () => {
    let driveListener: ((state: unknown) => void) | undefined;
    const item = {
      text: "",
      tooltip: "",
      command: undefined,
      backgroundColor: undefined,
      show: jest.fn(),
      dispose: jest.fn(),
    };
    (vscode.window.createStatusBarItem as jest.Mock).mockReturnValue(item);

    const mgr = {
      active: false,
      subMode: "agent",
      onDidChange: (listener: (state: unknown) => void) => {
        driveListener = listener;
        return { dispose: jest.fn() };
      },
    } as unknown as Parameters<typeof createDriveStatusBar>[0];

    createDriveStatusBar(mgr);
    expect(item.text).toContain("Drive (off)");

    // keep listener referenced to satisfy linter/type usage
    expect(typeof driveListener).toBe("function");
  });

  it("renders active mode and foreground operator", () => {
    let driveListener: (() => void) | undefined;
    const item = {
      text: "",
      tooltip: "",
      command: undefined,
      backgroundColor: undefined,
      show: jest.fn(),
      dispose: jest.fn(),
    };
    (vscode.window.createStatusBarItem as jest.Mock).mockReturnValue(item);

    const mgrState = { active: true, subMode: "debug" };
    const mgr = {
      get active() { return mgrState.active; },
      get subMode() { return mgrState.subMode as "debug"; },
      onDidChange: (listener: () => void) => {
        driveListener = listener;
        return { dispose: jest.fn() };
      },
    } as unknown as Parameters<typeof createDriveStatusBar>[0];

    const registry = new OperatorRegistry();
    registry.spawn("Alpha", "Main task");

    createDriveStatusBar(mgr, registry);
    driveListener?.();

    expect(item.text).toContain("Drive > Debug");
    expect(item.text).toContain("Alpha");
  });

  const subModes = ["plan", "agent", "ask", "debug"] as const;
  subModes.forEach((subMode) => {
    it(`renders ${subMode} sub-mode when active`, () => {
      const item = {
        text: "",
        tooltip: "",
        command: undefined,
        backgroundColor: undefined,
        show: jest.fn(),
        dispose: jest.fn(),
      };
      (vscode.window.createStatusBarItem as jest.Mock).mockReturnValue(item);

      const mgrState = { active: true, subMode };
      const mgr = {
        get active() { return mgrState.active; },
        get subMode() { return mgrState.subMode; },
        onDidChange: () => ({ dispose: jest.fn() }),
      } as unknown as Parameters<typeof createDriveStatusBar>[0];

      const registry = new OperatorRegistry();
      registry.spawn("Alpha", "Task");

      createDriveStatusBar(mgr, registry);

      const modeLabel = subMode.charAt(0).toUpperCase() + subMode.slice(1);
      expect(item.text).toContain(`Drive > ${modeLabel}`);
      expect(item.text).toContain("Alpha");
    });
  });

  it("does not show operator section when no operators are registered", () => {
    const item = {
      text: "",
      tooltip: "",
      command: undefined,
      backgroundColor: undefined,
      show: jest.fn(),
      dispose: jest.fn(),
    };
    (vscode.window.createStatusBarItem as jest.Mock).mockReturnValue(item);

    const mgrState = { active: true, subMode: "agent" as const };
    const mgr = {
      get active() { return mgrState.active; },
      get subMode() { return mgrState.subMode; },
      onDidChange: () => ({ dispose: jest.fn() }),
    } as unknown as Parameters<typeof createDriveStatusBar>[0];

    const registry = new OperatorRegistry();

    createDriveStatusBar(mgr, registry);

    expect(item.text).toContain("Drive > Agent");
    expect(item.text).not.toContain("No Operator");
    expect(item.text).not.toContain("|");
  });

  it("renders background operator count when multiple operators", () => {
    const item = {
      text: "",
      tooltip: "",
      command: undefined,
      backgroundColor: undefined,
      show: jest.fn(),
      dispose: jest.fn(),
    };
    (vscode.window.createStatusBarItem as jest.Mock).mockReturnValue(item);

    const mgrState = { active: true, subMode: "agent" as const };
    const mgr = {
      get active() { return mgrState.active; },
      get subMode() { return mgrState.subMode; },
      onDidChange: () => ({ dispose: jest.fn() }),
    } as unknown as Parameters<typeof createDriveStatusBar>[0];

    const registry = new OperatorRegistry();
    registry.spawn("Alpha", "Task A");
    registry.spawn("Beta", "Task B");

    createDriveStatusBar(mgr, registry);

    expect(item.text).toContain("Alpha");
    expect(item.text).toContain("(+1)");
  });
});
