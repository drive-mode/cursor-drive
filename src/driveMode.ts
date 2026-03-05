import * as vscode from "vscode";

export type SubMode = "plan" | "agent" | "ask" | "debug" | "off";

export interface DriveState {
  active: boolean;
  subMode: SubMode;
}

export interface DriveModeManager extends vscode.Disposable {
  readonly active: boolean;
  readonly subMode: SubMode;
  setActive(active: boolean): void;
  setSubMode(mode: SubMode): void;
  toggle(): void;
  readonly onDidChange: vscode.Event<DriveState>;
}

function isSubMode(value: unknown): value is SubMode {
  return value === "plan" || value === "agent" || value === "ask" || value === "debug" || value === "off";
}

export function createDriveModeManager(ctx: vscode.ExtensionContext): DriveModeManager {
  const emitter = new vscode.EventEmitter<DriveState>();

  let _active: boolean = ctx.workspaceState.get<boolean>("drive.active", false);
  let _subMode: SubMode = (() => {
    const stored = ctx.workspaceState.get<string>("drive.subMode");
    if (isSubMode(stored) && stored !== "off") return stored;
    return "agent";
  })();

  function fire(): void {
    emitter.fire({ active: _active, subMode: _subMode });
  }

  const manager: DriveModeManager = {
    get active() { return _active; },
    get subMode() { return _subMode; },

    setActive(active: boolean): void {
      if (_active === active) { return; }
      _active = active;
      void ctx.workspaceState.update("drive.active", _active);
      fire();
    },

    setSubMode(mode: SubMode): void {
      if (_subMode === mode) { return; }
      _subMode = mode;
      void ctx.workspaceState.update("drive.subMode", _subMode);
      fire();
    },

    toggle(): void {
      if (!_active) {
        // Apply defaultSubMode from config when turning on
        const cfg = vscode.workspace.getConfiguration("cursorDrive");
        const configMode = cfg.get<string>("defaultSubMode");
        if (isSubMode(configMode) && configMode !== "off") {
          _subMode = configMode;
          void ctx.workspaceState.update("drive.subMode", _subMode);
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
