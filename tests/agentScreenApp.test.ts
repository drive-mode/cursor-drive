import { buildAgentScreenAppHtml, AGENT_SCREEN_APP_RESOURCE_URI } from "../src/agentScreenApp";

describe("agentScreenApp", () => {
  describe("AGENT_SCREEN_APP_RESOURCE_URI", () => {
    it("is the ui:// cursor-drive agent-screen URI", () => {
      expect(AGENT_SCREEN_APP_RESOURCE_URI).toBe("ui://cursor-drive/agent-screen");
    });
  });

  describe("buildAgentScreenAppHtml", () => {
    it("returns valid HTML with DOCTYPE and html root", () => {
      const html = buildAgentScreenAppHtml();
      expect(html).toMatch(/^\s*<!DOCTYPE html>/i);
      expect(html).toContain("<html");
      expect(html).toContain("</html>");
    });

    it("contains activity-feed and panel elements for MCP App", () => {
      const html = buildAgentScreenAppHtml();
      expect(html).toContain('id="activity-feed"');
      expect(html).toContain('id="panel-activity"');
      expect(html).toContain('id="panel-files"');
      expect(html).toContain('id="panel-decisions"');
    });

    it("does not reference acquireVsCodeApi", () => {
      const html = buildAgentScreenAppHtml();
      expect(html).not.toContain("acquireVsCodeApi");
    });

    it("includes data-testid for panel-activity", () => {
      const html = buildAgentScreenAppHtml();
      expect(html).toContain('data-testid="panel-activity"');
    });

    it("uses blob URL when bundle provided (CSP-compliant, no external script)", () => {
      const html = buildAgentScreenAppHtml("/* minimal bundle */");
      expect(html).toContain("createObjectURL");
      expect(html).toContain("Blob");
      expect(html).not.toContain("esm.sh");
    });
  });
});
