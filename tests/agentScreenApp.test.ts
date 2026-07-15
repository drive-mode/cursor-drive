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

    it("contains Live / Activity / Files / Decisions / Sync / Artifacts panels", () => {
      const html = buildAgentScreenAppHtml();
      expect(html).toContain('data-testid="panel-live"');
      expect(html).toContain('data-testid="panel-activity"');
      expect(html).toContain('data-testid="panel-files"');
      expect(html).toContain('data-testid="panel-decisions"');
      expect(html).toContain('data-testid="panel-sync"');
      expect(html).toContain('data-testid="panel-artifacts"');
      expect(html).toContain('data-testid="tab-sync"');
      expect(html).toContain('data-testid="tab-artifacts"');
      expect(html).toContain('id="activity-feed"');
      expect(html).toContain('id="live-feed"');
      expect(html).toContain('id="sync-empty"');
      expect(html).toContain('id="artifacts-empty"');
      expect(html).toContain('data-testid="plan-section"');
      expect(html).toContain('data-testid="operator-badge"');
      expect(html).toContain("__driveScreen");
      expect(html).toContain("renderSyncSnapshot");
      expect(html).toContain("cloudAgentArtifact");
    });

    it("does not reference acquireVsCodeApi", () => {
      const html = buildAgentScreenAppHtml();
      expect(html).not.toContain("acquireVsCodeApi");
    });

    it("uses blob URL when bundle provided (CSP-compliant, no external script)", () => {
      const html = buildAgentScreenAppHtml("/* minimal bundle */");
      expect(html).toContain("createObjectURL");
      expect(html).toContain("Blob");
      expect(html).not.toContain("esm.sh");
    });

    it("reports App version 0.4.0", () => {
      const html = buildAgentScreenAppHtml();
      expect(html).toContain("version: '0.4.0'");
    });
  });
});
