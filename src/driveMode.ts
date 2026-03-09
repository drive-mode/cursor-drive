import * as vscode from "vscode";

export type CursorMode = "ask" | "agent" | "plan" | "debug" | "off";

export interface DriveState {
  active: boolean;
  cursorMode: CursorMode;
}

export interface DriveModeManager extends vscode.Disposable {
  readonly active: boolean;
  readonly cursorMode: CursorMode;
  readonly subMode: CursorMode;
  setActive(active: boolean): void;
  setCursorMode(mode: CursorMode): void;
  setSubMode(mode: CursorMode): void;
  toggle(): void;
  readonly onDidChange: vscode.Event<DriveState>;
}

function isCursorMode(value: unknown): value is CursorMode {
  return value === "plan" || value === "agent" || value === "ask" || value === "debug" || value === "off";
}

export function createDriveModeManager(ctx: vscode.ExtensionContext): DriveModeManager {
  const emitter = new vscode.EventEmitter<DriveState>();

  let _active: boolean = ctx.workspaceState.get<boolean>("drive.active", false);
  let _cursorMode: CursorMode = (() => {
    const stored = ctx.workspaceState.get<string>("drive.subMode");
    if (isCursorMode(stored) && stored !== "off") return stored;
    return "agent";
  })();

  function fire(): void {
    emitter.fire({ active: _active, cursorMode: _cursorMode });
  }

  const manager: DriveModeManager = {
    get active() { return _active; },
    get cursorMode() { return _cursorMode; },
    get subMode() { return _cursorMode; },

    setActive(active: boolean): void {
      if (_active === active) { return; }
      _active = active;
      void ctx.workspaceState.update("drive.active", _active);
      fire();
    },

    setCursorMode(mode: CursorMode): void {
      if (_cursorMode === mode) { return; }
      _cursorMode = mode;
      void ctx.workspaceState.update("drive.subMode", _cursorMode);
      fire();
    },

    setSubMode(mode: CursorMode): void {
      this.setCursorMode(mode);
    },

    toggle(): void {
      if (!_active) {
        const cfg = vscode.workspace.getConfiguration("cursorDrive");
        const configMode = cfg.get<string>("defaultSubMode");
        if (isCursorMode(configMode) && configMode !== "off") {
          _cursorMode = configMode;
          void ctx.workspaceState.update("drive.subMode", _cursorMode);
        }
      }
      _active = !_active;
      void ctx.workspaceState.update("drive.active", _active);
      fire();
    },

    onDidChange: emitter.event,

    dispose(): void {
      emitter.dispose();
    },
  };

  return manager;
}
