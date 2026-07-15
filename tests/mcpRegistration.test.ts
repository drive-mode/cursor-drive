import { buildMcpInstallDeepLink } from "../src/mcpRegistration";

describe("buildMcpInstallDeepLink", () => {
  it("includes name=drive and base64 config with the given port", () => {
    const url = "http://127.0.0.1:7891/mcp";
    const uri = buildMcpInstallDeepLink({ name: "drive", url });

    expect(uri.startsWith("cursor://anysphere.cursor-deeplink/mcp/install?")).toBe(true);
    expect(uri).toContain("name=drive");

    const configParam = new URL(uri).searchParams.get("config");
    expect(configParam).toBeTruthy();
    const decoded = Buffer.from(configParam!, "base64").toString("utf8");
    expect(JSON.parse(decoded)).toEqual({ url });
    expect(decoded).toContain("7891");
  });
});
