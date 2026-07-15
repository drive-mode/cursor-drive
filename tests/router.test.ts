import { route } from "../src/router";

describe("route — slash command overrides", () => {
  it("returns plan for /plan command", () => {
    expect(route({ prompt: "anything", command: "plan" }).mode).toBe("plan");
  });

  it("returns agent for /run command", () => {
    expect(route({ prompt: "anything", command: "run" }).mode).toBe("agent");
  });

  it("returns agent for /drive command", () => {
    expect(route({ prompt: "anything", command: "drive" }).mode).toBe("agent");
  });

  it("returns ask for /ask command", () => {
    expect(route({ prompt: "anything", command: "ask" }).mode).toBe("ask");
  });

  it("returns debug for /debug command", () => {
    expect(route({ prompt: "anything", command: "debug" }).mode).toBe("debug");
  });
});

describe("route — drive sub-mode hints", () => {
  it("plan sub-mode → plan", () => {
    expect(route({ prompt: "anything", driveSubMode: "plan" }).mode).toBe("plan");
  });

  it("agent sub-mode → agent", () => {
    expect(route({ prompt: "anything", driveSubMode: "agent" }).mode).toBe("agent");
  });

  it("ask sub-mode → ask", () => {
    expect(route({ prompt: "anything", driveSubMode: "ask" }).mode).toBe("ask");
  });

  it("direct sub-mode → ask (mapped)", () => {
    expect(route({ prompt: "anything", driveSubMode: "direct" }).mode).toBe("ask");
  });

  it("debug sub-mode → debug", () => {
    expect(route({ prompt: "anything", driveSubMode: "debug" }).mode).toBe("debug");
  });

  it("unrecognised sub-mode falls through to keyword routing", () => {
    const r = route({ prompt: "add a login page", driveSubMode: "unknown" });
    expect(r.mode).toBe("agent");
  });
});

describe("route — keyword-based routing", () => {
  it("detects planning intent from 'plan'", () => {
    expect(route({ prompt: "plan a new auth system" }).mode).toBe("plan");
  });

  it("detects planning intent from 'architecture'", () => {
    expect(route({ prompt: "discuss the architecture" }).mode).toBe("plan");
  });

  it("detects execution intent from 'implement'", () => {
    expect(route({ prompt: "implement the checkout flow" }).mode).toBe("agent");
  });

  it("detects execution intent from 'fix'", () => {
    expect(route({ prompt: "fix the null pointer in auth" }).mode).toBe("agent");
  });

  it("detects debug intent from 'debug'", () => {
    expect(route({ prompt: "debug the login flow" }).mode).toBe("debug");
  });

  it("detects debug intent from 'diagnose'", () => {
    expect(route({ prompt: "diagnose why tests fail" }).mode).toBe("debug");
  });

  it("falls back to ask when no signal", () => {
    expect(route({ prompt: "hello" }).mode).toBe("ask");
  });
});

describe("route — slash command beats sub-mode", () => {
  it("/plan overrides agent sub-mode", () => {
    expect(route({ prompt: "do stuff", command: "plan", driveSubMode: "agent" }).mode).toBe("plan");
  });
});

describe("route — debug keywords before agent keywords", () => {
  it("'debug' keyword routes to debug not agent", () => {
    expect(route({ prompt: "debug the fix" }).mode).toBe("debug");
  });
});

describe("route — reason field is populated", () => {
  it("includes a non-empty reason string", () => {
    const r = route({ prompt: "add tests" });
    expect(typeof r.reason).toBe("string");
    expect(r.reason.length).toBeGreaterThan(0);
  });
});
