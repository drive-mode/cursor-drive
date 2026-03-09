/**
 * Minimal vscode API mock for Jest unit tests.
 * Only stubs the surface used by the modules under test.
 */

export const lm = {
  selectChatModels: jest.fn().mockResolvedValue([]),
};

export const LanguageModelChatMessage = {
  User: (text: string) => ({ type: "user" as const, text }),
  Assistant: (text: string) => ({ type: "assistant" as const, text }),
};

export class CancellationTokenSource {
  token = { isCancellationRequested: false, onCancellationRequested: jest.fn() };
  cancel() { this.token.isCancellationRequested = true; }
  dispose() { }
}

export const window = {
  showInformationMessage: jest.fn(),
  showWarningMessage: jest.fn(),
  showErrorMessage: jest.fn(),
  showQuickPick: jest.fn(),
  showInputBox: jest.fn(),
  setStatusBarMessage: jest.fn(() => ({ dispose: jest.fn() })),
  createStatusBarItem: jest.fn(() => ({
    text: "",
    tooltip: "",
    command: undefined,
    backgroundColor: undefined,
    show: jest.fn(),
    hide: jest.fn(),
    dispose: jest.fn(),
  })),
  createOutputChannel: jest.fn((name: string, opts?: { log?: boolean }) => ({
    appendLine: jest.fn(),
    clear: jest.fn(),
    show: jest.fn(),
    dispose: jest.fn(),
    ...(opts?.log && {
      trace: jest.fn(),
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    }),
  })),
  createWebviewPanel: jest.fn(() => ({
    webview: {
      html: "",
      postMessage: jest.fn().mockResolvedValue(true),
      onDidReceiveMessage: jest.fn(() => ({ dispose: jest.fn() })),
      cspSource: "vscode-resource:",
    },
    onDidDispose: jest.fn(() => ({ dispose: jest.fn() })),
    reveal: jest.fn(),
    dispose: jest.fn(),
  })),
  registerWebviewViewProvider: jest.fn(() => ({ dispose: jest.fn() })),
};

export const workspace = {
  workspaceFolders: [] as Array<{ uri: { fsPath: string } }>,
  getConfiguration: jest.fn(() => ({
    get: jest.fn(),
  })),
  onDidChangeConfiguration: jest.fn(() => ({ dispose: jest.fn() })),
  fs: {
    stat: jest.fn(),
    writeFile: jest.fn().mockResolvedValue(undefined),
  },
};

export const commands = {
  registerCommand: jest.fn(),
  executeCommand: jest.fn(),
  getCommands: jest.fn().mockResolvedValue([]),
};

export const env = {
  appName: "TestHost",
  appRoot: "/test/app",
  uriScheme: "vscode",
  openExternal: jest.fn().mockResolvedValue(true),
};

export enum ViewColumn {
  Active = -1,
  Beside = -2,
  One = 1,
  Two = 2,
  Three = 3,
}

export const version = "1.85.0";

export const EventEmitter = class {
  private listeners: Array<(e: unknown) => void> = [];
  event = (listener: (e: unknown) => void) => {
    this.listeners.push(listener);
    return { dispose: () => { } };
  };
  fire(e: unknown) { this.listeners.forEach((l) => l(e)); }
  dispose() { }
};

export enum StatusBarAlignment { Left = 1, Right = 2 }
export enum ExtensionKind { UI = 1, Workspace = 2 }
export enum ExtensionMode { Development = 1, Production = 2, Test = 3 }

export class ThemeColor {
  constructor(public id: string) { }
}

export const Uri = {
  file: (filePath: string) => ({ fsPath: filePath, toString: () => `file://${filePath}` }),
  parse: (value: string) => ({ toString: () => value, fsPath: value }),
  joinPath: (...parts: Array<{ fsPath?: string } | string>) => {
    const normalized = parts
      .map((part) => (typeof part === "string" ? part : part.fsPath ?? ""))
      .filter(Boolean)
      .join("/")
      .replace(/\/{2,}/g, "/");
    return { fsPath: normalized, toString: () => normalized };
  },
};
