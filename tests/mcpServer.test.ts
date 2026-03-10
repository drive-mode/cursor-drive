import * as http from "http";
import { EventEmitter } from "events";
import { DriveMcpServer } from "../src/mcpServer";
import { OperatorRegistry } from "../src/operatorRegistry";
import { AGENT_SCREEN_APP_RESOURCE_URI } from "../src/agentScreenApp";
import * as vscode from "vscode";

jest.mock("../src/tts", () => ({
  speak: jest.fn(),
  stop: jest.fn(),
  getSpokenHistory: jest.fn(() => []),
}));

const mockPostEvent = jest.fn();
const mockLogActivity = jest.fn();
const mockLogFile = jest.fn();
const mockLogDecision = jest.fn();
jest.mock("../src/agentScreen", () => ({
  AgentScreenPanel: {
    getInstance: jest.fn(() => ({
      postEvent: mockPostEvent,
      logActivity: mockLogActivity,
      logFile: mockLogFile,
      logDecision: mockLogDecision,
    })),
  },
}));

const mockRunCursorCliStreaming = jest.fn();
const mockLaunchAgent = jest.fn();
const mockGetAgentStatus = jest.fn();
const mockGetAgentConversation = jest.fn();
const mockGetAgentArtifacts = jest.fn();
const mockGetArtifactDownloadUrl = jest.fn();
jest.mock("../src/cloudAgentClient", () => ({
  launchAgent: (...args: unknown[]) => mockLaunchAgent(...args),
  getAgentStatus: (...args: unknown[]) => mockGetAgentStatus(...args),
  getAgentConversation: (...args: unknown[]) => mockGetAgentConversation(...args),
  getAgentArtifacts: (...args: unknown[]) => mockGetAgentArtifacts(...args),
  getArtifactDownloadUrl: (...args: unknown[]) => mockGetArtifactDownloadUrl(...args),
  CloudAgentError: class CloudAgentError extends Error {
    constructor(m: string, public status: number, public endpoint: string) {
      super(m);
      this.name = "CloudAgentError";
    }
  },
}));
jest.mock("../src/cursorCliRunner", () => ({
  ...jest.requireActual("../src/cursorCliRunner"),
  runCursorCliStreaming: (...args: unknown[]) => mockRunCursorCliStreaming(...args),
  isCursorCliAvailable: jest.fn().mockResolvedValue(true),
  runCursorCli: jest.fn().mockResolvedValue({ stdout: "done", stderr: "", exitCode: 0 }),
}));

function makeDriveMgr() {
  let active = false;
  let subMode = "agent" as const;
  return {
    get active() { return active; },
    get subMode() { return subMode; },
    setActive: (a: boolean) => { active = a; },
    setSubMode: (m: typeof subMode) => { subMode = m; },
  };
}

function makeSessionMemory() {
  return {
    buildContextString: () => "",
    addTurn: (_summary: string) => { /* no-op in tests */ },
  };
}

const MCP_PROTOCOL_VERSION = "2025-03-26";

async function initializeMcpSession(port: number): Promise<string> {
  const response = await fetch(`http://127.0.0.1:${port}/mcp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 0,
      method: "initialize",
      params: {
        protocolVersion: MCP_PROTOCOL_VERSION,
        capabilities: {},
        clientInfo: {
          name: "jest",
          version: "1.0.0",
        },
      },
    }),
  });

  expect(response.status).toBe(200);
  const sessionId = response.headers.get("mcp-session-id");
  expect(sessionId).toBeTruthy();
  await response.text();
  return sessionId as string;
}

async function callMcpTool(
  port: number,
  sessionId: string,
  toolName: string,
  args: Record<string, unknown>
): Promise<{ content: Array<{ text: string }>; isError?: boolean }> {
  const response = await fetch(`http://127.0.0.1:${port}/mcp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      "Mcp-Session-Id": sessionId,
      "Mcp-Protocol-Version": MCP_PROTOCOL_VERSION,
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 99,
      method: "tools/call",
      params: { name: toolName, arguments: args },
    }),
  });
  const text = await response.text();
  // MCP responses are SSE-formatted: each JSON-RPC message is prefixed with "data: "
  const dataLines = text.split("\n")
    .filter((l) => l.startsWith("data: "))
    .map((l) => l.slice("data: ".length).trim())
    .filter(Boolean);
  for (const line of dataLines) {
    try {
      const parsed = JSON.parse(line);
      if (parsed?.result !== undefined) { return parsed.result; }
      if (parsed?.error !== undefined) {
        return { content: [{ text: String(parsed.error.message ?? parsed.error) }], isError: true };
      }
    } catch { /* skip non-JSON lines */ }
  }
  return { content: [{ text: text }], isError: true };
}

describe("DriveMcpServer", () => {
  const BASE_PORT = 17991 + Math.floor(Math.random() * 10000);
  let portCounter = 0;
  function nextPort() { return BASE_PORT + portCounter++; }
  let server: DriveMcpServer;

  beforeEach(() => {
    jest.clearAllMocks();
    (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
      get: jest.fn((_k: string, fallback: unknown) => fallback),
    });
  });

  afterEach(async () => {
    if (server) {
      await server.stop();
    }
  });

  it("starts and stops on a free port", async () => {
    const port = nextPort();
    const driveMgr = makeDriveMgr();
    const operatorRegistry = new OperatorRegistry();
    const sessionMemory = makeSessionMemory();

    server = new DriveMcpServer({
      port,
      driveMgr,
      operatorRegistry,
      sessionMemory,
    });
    await server.start();
    expect(server.getPort()).toBe(port);
    await server.stop();
  });

  it("returns 200 from /health with status ok", async () => {
    const port = nextPort();
    const driveMgr = makeDriveMgr();
    const operatorRegistry = new OperatorRegistry();
    const sessionMemory = makeSessionMemory();

    server = new DriveMcpServer({
      port,
      driveMgr,
      operatorRegistry,
      sessionMemory,
    });
    await server.start();

    const body = await new Promise<string>((resolve, reject) => {
      const req = http.request(
        { host: "127.0.0.1", port, path: "/health", method: "GET" },
        (res) => {
          let data = "";
          res.on("data", (chunk) => { data += chunk; });
          res.on("end", () => resolve(data));
        }
      );
      req.on("error", reject);
      req.end();
    });

    const json = JSON.parse(body);
    expect(json.status).toBe("ok");
    expect(json.name).toBe("cursor-drive");
    expect(json.port).toBe(port);
  });

  it("POST /tasks spawns operator when sent valid JSON body", async () => {
    const port = nextPort();
    const driveMgr = makeDriveMgr();
    const operatorRegistry = new OperatorRegistry();
    const sessionMemory = makeSessionMemory();

    server = new DriveMcpServer({
      port,
      driveMgr,
      operatorRegistry,
      sessionMemory,
    });
    await server.start();

    const result = await fetch(`http://127.0.0.1:${port}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Refactor auth module" }),
    });
    expect(result.status).toBe(201);
    const json = await result.json();
    expect(json.status).toBe("working");
    expect(json.task).toBe("Refactor auth module");
    expect(json.operatorId).toBeDefined();
    expect(operatorRegistry.activeCount()).toBe(1);
  });

  it("POST /tasks passes role to operator when provided", async () => {
    const port = nextPort();
    const driveMgr = makeDriveMgr();
    const operatorRegistry = new OperatorRegistry();
    const sessionMemory = makeSessionMemory();

    server = new DriveMcpServer({
      port,
      driveMgr,
      operatorRegistry,
      sessionMemory,
    });
    await server.start();

    const result = await fetch(`http://127.0.0.1:${port}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Review auth module", role: "reviewer" }),
    });
    expect(result.status).toBe(201);
    const json = await result.json();
    expect(json.role).toBe("reviewer");
    expect(json.status).toBe("working");

    const ops = operatorRegistry.list();
    expect(ops[0].role).toBe("reviewer");
  });

  it("POST /tasks ignores invalid role", async () => {
    const port = nextPort();
    const driveMgr = makeDriveMgr();
    const operatorRegistry = new OperatorRegistry();
    const sessionMemory = makeSessionMemory();

    server = new DriveMcpServer({
      port,
      driveMgr,
      operatorRegistry,
      sessionMemory,
    });
    await server.start();

    const result = await fetch(`http://127.0.0.1:${port}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Do something", role: "hacker" }),
    });
    expect(result.status).toBe(201);
    const json = await result.json();
    expect(json.role).toBeUndefined();
  });

  it("GET /tasks/:taskId returns operatorName and role in JSON response", async () => {
    const port = nextPort();
    const driveMgr = makeDriveMgr();
    const operatorRegistry = new OperatorRegistry();
    const sessionMemory = makeSessionMemory();

    server = new DriveMcpServer({
      port,
      driveMgr,
      operatorRegistry,
      sessionMemory,
    });
    await server.start();

    const createResult = await fetch(`http://127.0.0.1:${port}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Test task", role: "tester" }),
    });
    const created = await createResult.json();

    const getResult = await fetch(`http://127.0.0.1:${port}/tasks/${created.id}`);
    expect(getResult.status).toBe(200);
    const json = await getResult.json();
    expect(json.operatorName).toBeDefined();
    expect(json.role).toBe("tester");
    expect(json.id).toBe(created.id);
    expect(json.status).toBe("working");
  });

  it("GET /tasks/:taskId returns SSE stream when Accept: text/event-stream", async () => {
    const port = nextPort();
    const driveMgr = makeDriveMgr();
    const operatorRegistry = new OperatorRegistry();
    const sessionMemory = makeSessionMemory();

    server = new DriveMcpServer({
      port,
      driveMgr,
      operatorRegistry,
      sessionMemory,
    });
    await server.start();

    const createResult = await fetch(`http://127.0.0.1:${port}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "SSE test task", role: "implementer" }),
    });
    const created = await createResult.json();

    const events = await new Promise<string[]>((resolve, reject) => {
      const collected: string[] = [];
      const req = http.request(
        {
          host: "127.0.0.1",
          port,
          path: `/tasks/${created.id}`,
          method: "GET",
          headers: { Accept: "text/event-stream" },
        },
        (res) => {
          expect(res.headers["content-type"]).toBe("text/event-stream");
          expect(res.headers["cache-control"]).toBe("no-cache");

          res.on("data", (chunk) => {
            const lines = chunk.toString().split("\n").filter((l: string) => l.startsWith("data: "));
            for (const line of lines) {
              collected.push(line.replace("data: ", ""));
            }
          });
          res.on("end", () => resolve(collected));

          setTimeout(() => {
            operatorRegistry.emitProgress(created.operatorId, "halfway done");
            setTimeout(() => {
              operatorRegistry.dismiss(created.operatorId);
            }, 50);
          }, 50);
        }
      );
      req.on("error", reject);
      req.end();
    });

    expect(events.length).toBeGreaterThanOrEqual(2);

    const initial = JSON.parse(events[0]);
    expect(initial.id).toBe(created.id);
    expect(initial.status).toBe("working");
    expect(initial.role).toBe("implementer");
    expect(initial.operatorName).toBeDefined();

    const progressEvent = events.find((e) => JSON.parse(e).type === "operatorProgress");
    expect(progressEvent).toBeDefined();
    expect(JSON.parse(progressEvent!).message).toBe("halfway done");

    const completedEvent = events.find((e) => JSON.parse(e).type === "operatorCompleted");
    expect(completedEvent).toBeDefined();
  });

  it("GET /tasks/:taskId SSE closes immediately for already-completed tasks", async () => {
    const port = nextPort();
    const driveMgr = makeDriveMgr();
    const operatorRegistry = new OperatorRegistry();
    const sessionMemory = makeSessionMemory();

    server = new DriveMcpServer({
      port,
      driveMgr,
      operatorRegistry,
      sessionMemory,
    });
    await server.start();

    const createResult = await fetch(`http://127.0.0.1:${port}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Cancel me" }),
    });
    const created = await createResult.json();

    await fetch(`http://127.0.0.1:${port}/tasks/${created.id}/cancel`, {
      method: "POST",
    });

    const events = await new Promise<string[]>((resolve, reject) => {
      const collected: string[] = [];
      const req = http.request(
        {
          host: "127.0.0.1",
          port,
          path: `/tasks/${created.id}`,
          method: "GET",
          headers: { Accept: "text/event-stream" },
        },
        (res) => {
          res.on("data", (chunk) => {
            const lines = chunk.toString().split("\n").filter((l: string) => l.startsWith("data: "));
            for (const line of lines) {
              collected.push(line.replace("data: ", ""));
            }
          });
          res.on("end", () => resolve(collected));
        }
      );
      req.on("error", reject);
      req.end();
    });

    expect(events.length).toBe(1);
    const initial = JSON.parse(events[0]);
    // Cancel sets record to "canceled" then dismiss sets operator to "completed";
    // GET handler sees op.status==="completed" and overrides record to "completed"
    expect(initial.status).toBe("completed");
  });

  it("GET /tasks/:taskId SSE streams operatorError and closes", async () => {
    const port = nextPort();
    const driveMgr = makeDriveMgr();
    const operatorRegistry = new OperatorRegistry();
    const sessionMemory = makeSessionMemory();

    server = new DriveMcpServer({
      port,
      driveMgr,
      operatorRegistry,
      sessionMemory,
    });
    await server.start();

    const createResult = await fetch(`http://127.0.0.1:${port}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Error test" }),
    });
    const created = await createResult.json();

    const events = await new Promise<string[]>((resolve, reject) => {
      const collected: string[] = [];
      const req = http.request(
        {
          host: "127.0.0.1",
          port,
          path: `/tasks/${created.id}`,
          method: "GET",
          headers: { Accept: "text/event-stream" },
        },
        (res) => {
          res.on("data", (chunk) => {
            const lines = chunk.toString().split("\n").filter((l: string) => l.startsWith("data: "));
            for (const line of lines) {
              collected.push(line.replace("data: ", ""));
            }
          });
          res.on("end", () => resolve(collected));

          setTimeout(() => {
            operatorRegistry.emitError(created.operatorId, "something broke");
          }, 50);
        }
      );
      req.on("error", reject);
      req.end();
    });

    expect(events.length).toBeGreaterThanOrEqual(2);
    const errorEvent = events.find((e) => JSON.parse(e).type === "operatorError");
    expect(errorEvent).toBeDefined();
    expect(JSON.parse(errorEvent!).error).toBe("something broke");
  });

  it("GET /tasks/:taskId SSE streams operatorEscalated events", async () => {
    const port = nextPort();
    const driveMgr = makeDriveMgr();
    const operatorRegistry = new OperatorRegistry();
    const sessionMemory = makeSessionMemory();

    server = new DriveMcpServer({
      port,
      driveMgr,
      operatorRegistry,
      sessionMemory,
    });
    await server.start();

    const createResult = await fetch(`http://127.0.0.1:${port}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Escalation test" }),
    });
    const created = await createResult.json();

    const events = await new Promise<string[]>((resolve, reject) => {
      const collected: string[] = [];
      const req = http.request(
        {
          host: "127.0.0.1",
          port,
          path: `/tasks/${created.id}`,
          method: "GET",
          headers: { Accept: "text/event-stream" },
        },
        (res) => {
          res.on("data", (chunk) => {
            const lines = chunk.toString().split("\n").filter((l: string) => l.startsWith("data: "));
            for (const line of lines) {
              collected.push(line.replace("data: ", ""));
            }
          });
          res.on("end", () => resolve(collected));

          setTimeout(() => {
            operatorRegistry.escalate(created.operatorId, "need help", "warning");
            setTimeout(() => {
              operatorRegistry.dismiss(created.operatorId);
            }, 50);
          }, 50);
        }
      );
      req.on("error", reject);
      req.end();
    });

    const escalatedEvent = events.find((e) => JSON.parse(e).type === "operatorEscalated");
    expect(escalatedEvent).toBeDefined();
    const parsed = JSON.parse(escalatedEvent!);
    expect(parsed.reason).toBe("need help");
    expect(parsed.severity).toBe("warning");
  });

  it("agent card has streaming: true and supportedStates", async () => {
    const port = nextPort();
    const driveMgr = makeDriveMgr();
    const operatorRegistry = new OperatorRegistry();
    const sessionMemory = makeSessionMemory();

    server = new DriveMcpServer({
      port,
      driveMgr,
      operatorRegistry,
      sessionMemory,
    });
    await server.start();

    const result = await fetch(`http://127.0.0.1:${port}/.well-known/agent.json`);
    expect(result.status).toBe(200);
    const card = await result.json();
    expect(card.capabilities.streaming).toBe(true);
    expect(card.supportedStates).toContain("input_required");
    expect(card.supportedStates).toContain("submitted");
    expect(card.supportedStates).toContain("working");
    expect(card.supportedStates).toContain("completed");
    expect(card.supportedStates).toContain("failed");
    expect(card.supportedStates).toContain("canceled");
  });

  it("cursor_cli_run_streaming is registered as an MCP tool", async () => {
    const port = nextPort();
    const driveMgr = makeDriveMgr();
    const operatorRegistry = new OperatorRegistry();
    const sessionMemory = makeSessionMemory();

    server = new DriveMcpServer({ port, driveMgr, operatorRegistry, sessionMemory });
    await server.start();
    const sessionId = await initializeMcpSession(port);

    // Use tools/list which returns immediately (no streaming needed)
    const responseBody = await new Promise<string>((resolve, reject) => {
      const req = http.request(
        {
          host: "127.0.0.1",
          port,
          path: "/mcp",
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json, text/event-stream",
            "Mcp-Session-Id": sessionId,
            "Mcp-Protocol-Version": MCP_PROTOCOL_VERSION,
          },
        },
        (res) => {
          let data = "";
          res.on("data", (chunk) => { data += chunk; });
          res.on("end", () => resolve(data));
        }
      );
      req.on("error", reject);
      req.end(JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list", params: {} }));
    });

    // Response may be SSE lines or JSON — find a data line with tool list
    const lines = responseBody.split("\n").filter((l) => l.startsWith("data:") || l.startsWith("{"));
    expect(lines.length).toBeGreaterThan(0);

    const allText = responseBody;
    expect(allText).toContain("cursor_cli_run_streaming");
  }, 10_000);

  it("agent_screen_activity returns _meta.ui.resourceUri and JSON payload when getEnableApps is true", async () => {
    const port = nextPort();
    const driveMgr = makeDriveMgr();
    const operatorRegistry = new OperatorRegistry();
    const sessionMemory = makeSessionMemory();

    server = new DriveMcpServer({
      port,
      driveMgr,
      operatorRegistry,
      sessionMemory,
      getEnableApps: () => true,
    });
    await server.start();
    const sessionId = await initializeMcpSession(port);

    const result = await callMcpTool(port, sessionId, "agent_screen_activity", {
      operator_name: "Alpha",
      text: "Reading src/auth.ts",
    });

    expect(result.isError).not.toBe(true);
    const content = result.content as Array<{ type?: string; text: string }>;
    expect(content).toHaveLength(1);
    expect(content[0].text).toBeDefined();
    const payload = JSON.parse(content[0].text);
    expect(payload).toEqual({ kind: "activity", op: "Alpha", text: "Reading src/auth.ts" });

    const resultWithMeta = result as { _meta?: { ui?: { resourceUri?: string } } };
    expect(resultWithMeta._meta?.ui?.resourceUri).toBe(AGENT_SCREEN_APP_RESOURCE_URI);
  });

  it("agent_screen_activity returns plain ok when getEnableApps is false", async () => {
    const port = nextPort();
    const driveMgr = makeDriveMgr();
    const operatorRegistry = new OperatorRegistry();
    const sessionMemory = makeSessionMemory();

    server = new DriveMcpServer({
      port,
      driveMgr,
      operatorRegistry,
      sessionMemory,
      getEnableApps: () => false,
    });
    await server.start();
    const sessionId = await initializeMcpSession(port);

    const result = await callMcpTool(port, sessionId, "agent_screen_activity", {
      operator_name: "Alpha",
      text: "Reading src/auth.ts",
    });

    expect(result.isError).not.toBe(true);
    const content = result.content as Array<{ type?: string; text: string }>;
    expect(content[0].text).toBe("ok");
    const resultWithMeta = result as { _meta?: unknown };
    expect(resultWithMeta._meta).toBeUndefined();
  });

  it("agent_screen_file returns _meta.ui.resourceUri and JSON payload when getEnableApps is true", async () => {
    const port = nextPort();
    const driveMgr = makeDriveMgr();
    const operatorRegistry = new OperatorRegistry();
    const sessionMemory = makeSessionMemory();

    server = new DriveMcpServer({
      port,
      driveMgr,
      operatorRegistry,
      sessionMemory,
      getEnableApps: () => true,
    });
    await server.start();
    const sessionId = await initializeMcpSession(port);

    const result = await callMcpTool(port, sessionId, "agent_screen_file", {
      operator_name: "Beta",
      file_path: "src/mcpServer.ts",
    });

    expect(result.isError).not.toBe(true);
    const payload = JSON.parse((result.content as Array<{ text: string }>)[0].text);
    expect(payload).toEqual({ kind: "file", op: "Beta", file_path: "src/mcpServer.ts" });
    const resultWithMeta = result as { _meta?: { ui?: { resourceUri?: string } } };
    expect(resultWithMeta._meta?.ui?.resourceUri).toBe(AGENT_SCREEN_APP_RESOURCE_URI);
  });

  it("agent_screen_decision returns _meta.ui.resourceUri and JSON payload when getEnableApps is true", async () => {
    const port = nextPort();
    const driveMgr = makeDriveMgr();
    const operatorRegistry = new OperatorRegistry();
    const sessionMemory = makeSessionMemory();

    server = new DriveMcpServer({
      port,
      driveMgr,
      operatorRegistry,
      sessionMemory,
      getEnableApps: () => true,
    });
    await server.start();
    const sessionId = await initializeMcpSession(port);

    const result = await callMcpTool(port, sessionId, "agent_screen_decision", {
      operator_name: "Gamma",
      text: "Chose token bucket for rate limiting",
    });

    expect(result.isError).not.toBe(true);
    const payload = JSON.parse((result.content as Array<{ text: string }>)[0].text);
    expect(payload).toEqual({ kind: "decision", op: "Gamma", text: "Chose token bucket for rate limiting" });
    const resultWithMeta = result as { _meta?: { ui?: { resourceUri?: string } } };
    expect(resultWithMeta._meta?.ui?.resourceUri).toBe(AGENT_SCREEN_APP_RESOURCE_URI);
  });

  it("cursor_cli_run_streaming MCP tool calls postEvent for each cliStream data event", async () => {
    const port = nextPort();
    const driveMgr = makeDriveMgr();
    const operatorRegistry = new OperatorRegistry();
    const sessionMemory = makeSessionMemory();

    const fakeRunner = new EventEmitter();
    mockRunCursorCliStreaming.mockImplementation(() => fakeRunner);
    mockPostEvent.mockClear();

    server = new DriveMcpServer({ port, driveMgr, operatorRegistry, sessionMemory });
    await server.start();
    const sessionId = await initializeMcpSession(port);

    // Start MCP tool call (don't await yet)
    const mcpResponsePromise = new Promise<string>((resolve, reject) => {
      const req = http.request(
        {
          host: "127.0.0.1",
          port,
          path: "/mcp",
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json, text/event-stream",
            "Mcp-Session-Id": sessionId,
            "Mcp-Protocol-Version": MCP_PROTOCOL_VERSION,
          },
        },
        (res) => {
          let data = "";
          res.on("data", (chunk) => { data += chunk; });
          res.on("end", () => resolve(data));
        }
      );
      req.on("error", reject);
      req.end(JSON.stringify({
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: { name: "cursor_cli_run_streaming", arguments: { prompt: "stream test" } },
      }));
    });

    // Wait for server to receive and start processing the request
    await new Promise((r) => setTimeout(r, 300));

    // Emit events — server should have attached listeners by now
    fakeRunner.emit("data", { type: "text_delta", text: "abc", toolName: undefined, raw: {} });
    fakeRunner.emit("data", { type: "tool_call", text: undefined, toolName: "bash", raw: {} });
    fakeRunner.emit("data", { type: "error", text: "oops", toolName: undefined, raw: {} });
    fakeRunner.emit("close", 0);

    await mcpResponsePromise;

    expect(mockPostEvent).toHaveBeenCalledWith(expect.objectContaining({ type: "cliStream", cliStreamType: "text_delta", text: "abc" }));
    expect(mockPostEvent).toHaveBeenCalledWith(expect.objectContaining({ type: "cliStream", cliStreamType: "tool_call", cliToolName: "bash" }));
    expect(mockPostEvent).toHaveBeenCalledWith(expect.objectContaining({ type: "cliStream", cliStreamType: "error", text: "oops" }));
  }, 10_000);

  it("POST /run with Accept: text/event-stream emits SSE events in order and ends with done", async () => {
    const port = nextPort();
    const driveMgr = makeDriveMgr();
    const operatorRegistry = new OperatorRegistry();
    const sessionMemory = makeSessionMemory();

    const fakeRunner = new EventEmitter();
    mockRunCursorCliStreaming.mockImplementation(() => fakeRunner);

    server = new DriveMcpServer({ port, driveMgr, operatorRegistry, sessionMemory });
    await server.start();

    // Start the SSE request but don't await it yet
    const collected: string[] = [];
    let sseContentType = "";
    let sseCacheControl = "";
    const eventsPromise = new Promise<void>((resolve, reject) => {
      const req = http.request(
        {
          host: "127.0.0.1",
          port,
          path: "/run",
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "text/event-stream",
          },
        },
        (res) => {
          sseContentType = res.headers["content-type"] ?? "";
          sseCacheControl = res.headers["cache-control"] ?? "";
          res.on("data", (chunk) => {
            const lines = chunk.toString().split("\n").filter((l: string) => l.startsWith("data: "));
            for (const line of lines) {
              collected.push(line.replace("data: ", "").trim());
            }
          });
          res.on("end", () => resolve());
        }
      );
      req.on("error", reject);
      req.end(JSON.stringify({ prompt: "stream me" }));
    });

    // Wait for server to process the request and attach listeners to fakeRunner
    await new Promise((r) => setTimeout(r, 300));

    // Emit events — listeners should be attached by now
    fakeRunner.emit("data", { type: "assistant", text: "first", toolName: undefined, raw: {} });
    fakeRunner.emit("data", { type: "tool_call", text: undefined, toolName: "bash", raw: {} });
    fakeRunner.emit("close", 0);

    await eventsPromise;

    expect(sseContentType).toBe("text/event-stream");
    expect(sseCacheControl).toBe("no-cache");
    expect(collected.length).toBeGreaterThanOrEqual(3);

    const dataEvents = collected.slice(0, -1).map((e) => JSON.parse(e));
    const doneEvent = JSON.parse(collected[collected.length - 1]);

    expect(dataEvents[0]).toMatchObject({ type: "assistant", text: "first" });
    expect(dataEvents[1]).toMatchObject({ type: "tool_call", toolName: "bash" });
    expect(doneEvent).toMatchObject({ type: "done", exitCode: 0 });
  }, 10_000);

  it("GET /mcp probe and subsequent MCP requests avoid transport 500 loops", async () => {
    const port = nextPort();
    const driveMgr = makeDriveMgr();
    const operatorRegistry = new OperatorRegistry();
    const sessionMemory = makeSessionMemory();

    server = new DriveMcpServer({ port, driveMgr, operatorRegistry, sessionMemory });
    await server.start();

    const preInitProbe = await fetch(`http://127.0.0.1:${port}/mcp`, {
      method: "GET",
      headers: { Accept: "text/event-stream" },
    });
    expect(preInitProbe.status).not.toBe(500);
    await preInitProbe.text();

    const sessionId = await initializeMcpSession(port);
    const firstList = await fetch(`http://127.0.0.1:${port}/mcp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
        "Mcp-Session-Id": sessionId,
        "Mcp-Protocol-Version": MCP_PROTOCOL_VERSION,
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: 11, method: "tools/list", params: {} }),
    });
    expect(firstList.status).toBe(200);
    const firstBody = await firstList.text();
    expect(firstBody).toContain("tools");

    const secondList = await fetch(`http://127.0.0.1:${port}/mcp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
        "Mcp-Session-Id": sessionId,
        "Mcp-Protocol-Version": MCP_PROTOCOL_VERSION,
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: 12, method: "tools/list", params: {} }),
    });
    expect(secondList.status).toBe(200);
    const secondBody = await secondList.text();
    expect(secondBody).toContain("tools");
  });

  it("multiple MCP clients can initialize without Server already initialized", async () => {
    const port = nextPort();
    const driveMgr = makeDriveMgr();
    const operatorRegistry = new OperatorRegistry();
    const sessionMemory = makeSessionMemory();

    server = new DriveMcpServer({ port, driveMgr, operatorRegistry, sessionMemory });
    await server.start();

    const [sessionId1, sessionId2, sessionId3] = await Promise.all([
      initializeMcpSession(port),
      initializeMcpSession(port),
      initializeMcpSession(port),
    ]);

    expect(sessionId1).toBeTruthy();
    expect(sessionId2).toBeTruthy();
    expect(sessionId3).toBeTruthy();
    expect(new Set([sessionId1, sessionId2, sessionId3]).size).toBe(3);

    const [r1, r2, r3] = await Promise.all([
      callMcpTool(port, sessionId1, "tts_speak", { text: "one" }),
      callMcpTool(port, sessionId2, "tts_speak", { text: "two" }),
      callMcpTool(port, sessionId3, "tts_speak", { text: "three" }),
    ]);
    expect(r1.isError).toBeFalsy();
    expect(r2.isError).toBeFalsy();
    expect(r3.isError).toBeFalsy();
  });

  it("POST /run without SSE Accept header falls back to JSON response", async () => {
    const port = nextPort();
    const driveMgr = makeDriveMgr();
    const operatorRegistry = new OperatorRegistry();
    const sessionMemory = makeSessionMemory();

    server = new DriveMcpServer({ port, driveMgr, operatorRegistry, sessionMemory });
    await server.start();

    const result = await fetch(`http://127.0.0.1:${port}/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "hello" }),
    });
    expect(result.status).toBe(200);
    const json = await result.json();
    expect(json.stdout).toBe("done");
    expect(json.exitCode).toBe(0);
  });

  it("cursor_cli_run is denied when foreground operator lacks terminalExecute", async () => {
    const port = nextPort();
    const driveMgr = makeDriveMgr();
    const operatorRegistry = new OperatorRegistry();
    const sessionMemory = makeSessionMemory();

    server = new DriveMcpServer({ port, driveMgr, operatorRegistry, sessionMemory });
    await server.start();

    // Spawn a readonly operator and make it foreground
    operatorRegistry.spawn("ReadonlyOp", "review task", { preset: "readonly" });

    const sessionId = await initializeMcpSession(port);
    const response = await callMcpTool(port, sessionId, "cursor_cli_run", {
      prompt: "run some terminal command",
    });

    expect(response.isError).toBe(true);
    expect(response.content[0].text).toContain("Permission denied");
    expect(response.content[0].text).toContain("terminalExecute");
  });

  it("cursor_cli_run succeeds when foreground operator has terminalExecute (standard preset)", async () => {
    const port = nextPort();
    const driveMgr = makeDriveMgr();
    const operatorRegistry = new OperatorRegistry();
    const sessionMemory = makeSessionMemory();

    server = new DriveMcpServer({ port, driveMgr, operatorRegistry, sessionMemory });
    await server.start();

    // Spawn a standard operator (has terminalExecute)
    operatorRegistry.spawn("StandardOp", "build task", { preset: "standard" });

    const sessionId = await initializeMcpSession(port);
    const response = await callMcpTool(port, sessionId, "cursor_cli_run", {
      prompt: "fix the bug in src/auth.ts",
    });

    // Should not be permission-denied (runCursorCli is mocked to return { stdout: "done" })
    expect(response.content[0].text).not.toContain("Permission denied");
  });

  it("cursor_cli_run_streaming is denied when foreground operator lacks terminalExecute", async () => {
    const port = nextPort();
    const driveMgr = makeDriveMgr();
    const operatorRegistry = new OperatorRegistry();
    const sessionMemory = makeSessionMemory();

    server = new DriveMcpServer({ port, driveMgr, operatorRegistry, sessionMemory });
    await server.start();

    operatorRegistry.spawn("ReadonlyOp", "review task", { preset: "readonly" });

    const sessionId = await initializeMcpSession(port);
    const response = await callMcpTool(port, sessionId, "cursor_cli_run_streaming", {
      prompt: "run some terminal command",
    });

    expect(response.isError).toBe(true);
    expect(response.content[0].text).toContain("Permission denied");
    expect(response.content[0].text).toContain("terminalExecute");
  });

  it("cursor_cli_run proceeds without permission check when no foreground operator", async () => {
    const port = nextPort();
    const driveMgr = makeDriveMgr();
    const operatorRegistry = new OperatorRegistry(); // empty — no foreground
    const sessionMemory = makeSessionMemory();

    server = new DriveMcpServer({ port, driveMgr, operatorRegistry, sessionMemory });
    await server.start();

    const sessionId = await initializeMcpSession(port);
    const response = await callMcpTool(port, sessionId, "cursor_cli_run", {
      prompt: "fix the bug",
    });

    // No operator → no permission check → proceeds normally (mocked to succeed)
    expect(response.content[0].text).not.toContain("Permission denied");
  });

  it("cloud_agent_launch is registered when getApiKey and promptAndStoreApiKey provided", async () => {
    const port = nextPort();
    const driveMgr = makeDriveMgr();
    const operatorRegistry = new OperatorRegistry();
    const sessionMemory = makeSessionMemory();

    server = new DriveMcpServer({
      port,
      driveMgr,
      operatorRegistry,
      sessionMemory,
      getApiKey: () => Promise.resolve("test-key"),
      promptAndStoreApiKey: () => Promise.resolve(undefined),
      getCloudAgentsApiBaseUrl: () => "https://api.cursor.com",
    });
    await server.start();
    const sessionId = await initializeMcpSession(port);

    const responseBody = await new Promise<string>((resolve, reject) => {
      const req = http.request(
        {
          host: "127.0.0.1",
          port,
          path: "/mcp",
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json, text/event-stream",
            "Mcp-Session-Id": sessionId,
            "Mcp-Protocol-Version": MCP_PROTOCOL_VERSION,
          },
        },
        (res) => {
          let data = "";
          res.on("data", (chunk) => { data += chunk; });
          res.on("end", () => resolve(data));
        }
      );
      req.on("error", reject);
      req.end(JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list", params: {} }));
    });

    expect(responseBody).toContain("cloud_agent_launch");
    expect(responseBody).toContain("cloud_agent_status");
  });

  it("cloud_agent_launch calls launchAgent and posts cloudAgentStatus to AgentScreen", async () => {
    const port = nextPort();
    const driveMgr = makeDriveMgr();
    const operatorRegistry = new OperatorRegistry();
    operatorRegistry.spawn("FullOp", "cloud task", { preset: "full" });
    const sessionMemory = makeSessionMemory();
    mockLaunchAgent.mockResolvedValueOnce({
      agentId: "bc_test123",
      status: "creating",
      dashboardUrl: "https://cursor.com/agents?id=bc_test123",
      prUrl: undefined,
    });
    mockGetAgentStatus.mockResolvedValue({ status: "finished", prUrl: "https://github.com/org/repo/pull/1", summary: "Done" });
    mockGetAgentConversation.mockResolvedValue({ messages: [{ role: "user", text: "Add README" }, { role: "assistant", text: "Added README" }] });
    mockPostEvent.mockClear();

    server = new DriveMcpServer({
      port,
      driveMgr,
      operatorRegistry,
      sessionMemory,
      getApiKey: () => Promise.resolve("test-key"),
      promptAndStoreApiKey: () => Promise.resolve(undefined),
      getCloudAgentsApiBaseUrl: () => "https://api.cursor.com",
    });
    await server.start();
    const sessionId = await initializeMcpSession(port);

    const response = await callMcpTool(port, sessionId, "cloud_agent_launch", {
      repository: "org/repo",
      prompt: "Add README",
    });

    expect(response.isError).not.toBe(true);
    const parsed = JSON.parse(response.content[0].text);
    expect(parsed.agent_id).toBe("bc_test123");
    expect(parsed.status).toBe("creating");
    expect(mockLaunchAgent).toHaveBeenCalledWith(
      expect.objectContaining({ repository: "org/repo", prompt: "Add README" }),
      expect.objectContaining({ apiKey: "test-key", apiBaseUrl: "https://api.cursor.com" })
    );
    expect(mockPostEvent).toHaveBeenCalledWith(expect.objectContaining({
      type: "cloudAgentStatus",
      cloudAgentId: "bc_test123",
      cloudStatus: "creating",
    }));
  });

  // Skipped: requires 11s real wait for poll interval; artifact logic covered by cloudAgentClient + agentScreen tests
  it.skip("cloud_agent_launch fetches artifacts and posts cloudAgentArtifact when status is finished", async () => {
    const port = nextPort();
    const driveMgr = makeDriveMgr();
    const operatorRegistry = new OperatorRegistry();
    operatorRegistry.spawn("FullOp", "cloud task", { preset: "full" });
    const sessionMemory = makeSessionMemory();
    mockLaunchAgent.mockResolvedValueOnce({
      agentId: "bc_artifacts",
      status: "creating",
      dashboardUrl: undefined,
      prUrl: undefined,
    });
    mockGetAgentStatus.mockResolvedValue({ status: "finished", prUrl: "https://github.com/org/repo/pull/2", summary: "Done" });
    mockGetAgentConversation.mockResolvedValue({ messages: [] });
    mockGetAgentArtifacts.mockResolvedValueOnce({
      artifacts: [
        { absolutePath: "/opt/cursor/artifacts/demo.mp4", sizeBytes: 67890, updatedAt: "2024-01-15T11:03:10.000Z" },
      ],
    });
    mockGetArtifactDownloadUrl.mockResolvedValueOnce({
      url: "https://cloud-agent-artifacts.s3.us-east-1.amazonaws.com/presigned-demo.mp4",
    });
    mockPostEvent.mockClear();

    server = new DriveMcpServer({
      port,
      driveMgr,
      operatorRegistry,
      sessionMemory,
      getApiKey: () => Promise.resolve("test-key"),
      promptAndStoreApiKey: () => Promise.resolve(undefined),
      getCloudAgentsApiBaseUrl: () => "https://api.cursor.com",
    });
    await server.start();
    const sessionId = await initializeMcpSession(port);

    const response = await callMcpTool(port, sessionId, "cloud_agent_launch", {
      repository: "org/repo",
      prompt: "Add README",
    });

    expect(response.isError).not.toBe(true);

    await new Promise((r) => setTimeout(r, 11_000));

    expect(mockGetAgentArtifacts).toHaveBeenCalledWith("bc_artifacts", expect.objectContaining({ apiKey: "test-key" }));
    expect(mockGetArtifactDownloadUrl).toHaveBeenCalledWith(
      "bc_artifacts",
      "/opt/cursor/artifacts/demo.mp4",
      expect.objectContaining({ apiKey: "test-key" })
    );
    expect(mockPostEvent).toHaveBeenCalledWith(expect.objectContaining({
      type: "cloudAgentArtifact",
      cloudAgentId: "bc_artifacts",
      artifactType: "video",
      artifactUrl: "https://cloud-agent-artifacts.s3.us-east-1.amazonaws.com/presigned-demo.mp4",
      artifactLabel: "demo.mp4",
    }));
  }, 15_000);

  it("cloud_agent_launch is denied when operator lacks webSearch (full preset)", async () => {
    const port = nextPort();
    const driveMgr = makeDriveMgr();
    const operatorRegistry = new OperatorRegistry();
    operatorRegistry.spawn("StandardOp", "task", { preset: "standard" });
    const sessionMemory = makeSessionMemory();

    server = new DriveMcpServer({
      port,
      driveMgr,
      operatorRegistry,
      sessionMemory,
      getApiKey: () => Promise.resolve("test-key"),
      promptAndStoreApiKey: () => Promise.resolve(undefined),
    });
    await server.start();
    const sessionId = await initializeMcpSession(port);

    const response = await callMcpTool(port, sessionId, "cloud_agent_launch", {
      repository: "org/repo",
      prompt: "Add README",
    });

    expect(response.isError).toBe(true);
    expect(response.content[0].text).toContain("Permission denied");
    expect(response.content[0].text).toContain("webSearch");
    expect(mockLaunchAgent).not.toHaveBeenCalled();
  });

  it("cloud_agent_status returns status and posts to AgentScreen", async () => {
    const port = nextPort();
    const driveMgr = makeDriveMgr();
    const operatorRegistry = new OperatorRegistry();
    operatorRegistry.spawn("FullOp", "task", { preset: "full" });
    const sessionMemory = makeSessionMemory();
    mockGetAgentStatus.mockResolvedValueOnce({
      status: "running",
      prUrl: undefined,
      summary: "Working on it",
    });
    mockPostEvent.mockClear();

    server = new DriveMcpServer({
      port,
      driveMgr,
      operatorRegistry,
      sessionMemory,
      getApiKey: () => Promise.resolve("test-key"),
      promptAndStoreApiKey: () => Promise.resolve(undefined),
    });
    await server.start();
    const sessionId = await initializeMcpSession(port);

    const response = await callMcpTool(port, sessionId, "cloud_agent_status", {
      agent_id: "bc_xyz",
    });

    expect(response.isError).not.toBe(true);
    const parsed = JSON.parse(response.content[0].text);
    expect(parsed.status).toBe("running");
    expect(parsed.summary).toBe("Working on it");
    expect(mockGetAgentStatus).toHaveBeenCalledWith("bc_xyz", expect.objectContaining({ apiKey: "test-key" }));
    expect(mockPostEvent).toHaveBeenCalledWith(expect.objectContaining({
      type: "cloudAgentStatus",
      cloudAgentId: "bc_xyz",
      cloudStatus: "running",
    }));
  });

  it("POST /pipeline returns pipeline result when Drive active", async () => {
    const port = nextPort();
    const driveMgr = makeDriveMgr();
    driveMgr.setActive(true);
    const operatorRegistry = new OperatorRegistry();
    const sessionMemory = makeSessionMemory();

    server = new DriveMcpServer({
      port,
      driveMgr,
      operatorRegistry,
      sessionMemory,
    });
    await server.start();

    const body = await new Promise<string>((resolve, reject) => {
      const req = http.request(
        {
          host: "127.0.0.1",
          port,
          path: "/pipeline",
          method: "POST",
          headers: { "Content-Type": "application/json" },
        },
        (res) => {
          expect(res.statusCode).toBe(200);
          let data = "";
          res.on("data", (chunk) => { data += chunk; });
          res.on("end", () => resolve(data));
        }
      );
      req.on("error", reject);
      req.write(JSON.stringify({ prompt: "add a login page" }));
      req.end();
    });

    const json = JSON.parse(body);
    expect(json.ok).toBe(true);
    expect(json.prompt).toContain("login");
    expect(json.route).toBeDefined();
    expect(json.model).toBeDefined();
  });
});
