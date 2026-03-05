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
});
