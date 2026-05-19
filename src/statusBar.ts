import * as vscode from "vscode";
import { DriveModeManager } from "./driveMode.js";
import { OperatorRegistry } from "./operatorRegistry.js";

export function createDriveStatusBar(
  mgr: DriveModeManager,
  operatorRegistry?: OperatorRegistry
): vscode.Disposable {
  const item = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    100
  );
  item.command = "cursorDrive.setSubMode";

  function render(): void {
    const cfg = vscode.workspace.getConfiguration("cursorDrive.statusBar");
    const showModeLabel = cfg.get<boolean>("showModeLabel", true);
    const activeBackground = cfg.get<string>("activeBackground", "");

    if (mgr.active) {
      const foreground = operatorRegistry?.getForeground();
      const backgroundCount = operatorRegistry
        ? operatorRegistry.getActive().filter((o) => o.status === "background").length
        : 0;
      const backgroundSuffix = backgroundCount > 0 ? ` (+${backgroundCount})` : "";
      const operatorSuffix = foreground
        ? ` | ${foreground.name}${backgroundSuffix}`
        : backgroundCount > 0 ? ` (+${backgroundCount})` : "";

      const inAgentMode = mgr.cursorMode === "agent";
      const hideModeForAgent = !showModeLabel && inAgentMode;
      const modeLabel = mgr.cursorMode === "off" ? "Off" : mgr.cursorMode.charAt(0).toUpperCase() + mgr.cursorMode.slice(1);
      const text = hideModeForAgent
        ? `$(play-circle) Drive${operatorSuffix}`
        : `$(play-circle) Drive › ${modeLabel}${operatorSuffix}`;
      item.text = text;
      item.backgroundColor = activeBackground
        ? activeBackground.startsWith("#")
          ? (activeBackground as unknown as vscode.ThemeColor)
          : new vscode.ThemeColor(activeBackground)
        : new vscode.ThemeColor("statusBarItem.prominentBackground");
      const toggleKey = process.platform === "darwin" ? "Cmd+Shift+D" : "Ctrl+Shift+D";
      item.tooltip = `Drive — click to change mode or operator (${toggleKey})`;
    } else {
      item.text = "$(circle-slash) Drive";
      item.backgroundColor = undefined;
      const toggleKeyOff = process.platform === "darwin" ? "Cmd+Shift+D" : "Ctrl+Shift+D";
      item.tooltip = `Drive — click to activate (${toggleKeyOff})`;
    }
  }

  render();
  item.show();

  const subscriptions: vscode.Disposable[] = [
    mgr.onDidChange(() => render()),
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("cursorDrive.statusBar")) render();
    }),
  ];
  if (operatorRegistry) {
    subscriptions.push(operatorRegistry.onDidChange(() => render()));
  }

  return {
    dispose(): void {
      subscriptions.forEach((subscription) => subscription.dispose());
      item.dispose();
    },
  };
}
