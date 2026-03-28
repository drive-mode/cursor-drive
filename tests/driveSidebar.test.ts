import * as vscode from "vscode";
import { DriveSidebarProvider, DRIVE_SIDEBAR_VIEW_ID } from "../src/driveSidebar";

describe("DriveSidebarProvider", () => {
  const extensionUri = vscode.Uri.file("/test/ext");

  it("exports correct view ID", () => {
    expect(DRIVE_SIDEBAR_VIEW_ID).toBe("cursorDrive.panel");
  });

  it("resolves webview view with HTML", () => {
    const provider = new DriveSidebarProvider(extensionUri);
    const webviewView = {
      webview: {
        options: {} as vscode.WebviewOptions,
        html: "",
        postMessage: jest.fn().mockResolvedValue(undefined),
        onDidReceiveMessage: jest.fn(() => ({ dispose: jest.fn() })),
        cspSource: "vscode-resource:",
      },
      onDidDispose: jest.fn(() => ({ dispose: jest.fn() })),
      onDidChangeVisibility: jest.fn(() => ({ dispose: jest.fn() })),
      visible: true,
    } as unknown as vscode.WebviewView;

    provider.resolveWebviewView(
      webviewView,
      {} as vscode.WebviewViewResolveContext,
      new vscode.CancellationTokenSource().token
    );

    expect(webviewView.webview.html).toContain("<!DOCTYPE html>");
    expect(webviewView.webview.html).toContain("Drive");
    expect(webviewView.webview.html).toContain("btn-toggle");
    expect(webviewView.webview.options.enableScripts).toBe(true);
  });

  it("updateState does not throw when view is undefined", () => {
    const provider = new DriveSidebarProvider(extensionUri);
    expect(() => provider.updateState()).not.toThrow();
  });

  it("persists sidebar config updates to workspace target", () => {
    const provider = new DriveSidebarProvider(extensionUri);
    const updateMock = jest.fn().mockResolvedValue(undefined);
    (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
      get: jest.fn((_k: string, fallback: unknown) => fallback),
      update: updateMock,
    });

    const webviewView = {
      webview: {
        options: {} as vscode.WebviewOptions,
        html: "",
        postMessage: jest.fn().mockResolvedValue(undefined),
        onDidReceiveMessage: jest.fn((handler: (msg: { type: string; key?: string; value?: string }) => void) => {
          handler({ type: "updateConfig", key: "mcp.port", value: "7892" });
          return { dispose: jest.fn() };
        }),
        cspSource: "vscode-resource:",
      },
      onDidDispose: jest.fn(() => ({ dispose: jest.fn() })),
      onDidChangeVisibility: jest.fn(() => ({ dispose: jest.fn() })),
      visible: true,
    } as unknown as vscode.WebviewView;

    provider.resolveWebviewView(
      webviewView,
      {} as vscode.WebviewViewResolveContext,
      new vscode.CancellationTokenSource().token
    );

    expect(updateMock).toHaveBeenCalledWith("mcp.port", 7892, undefined);
  });
});
