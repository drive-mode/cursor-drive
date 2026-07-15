import { test, expect } from "@playwright/test";
import { buildAgentScreenAppHtml } from "../../src/agentScreenApp";

/**
 * Hostless MCP App UI exercise — no Cursor extension required.
 * Simulates tool-result payloads via window.__driveScreen.applyEvent.
 */
test.describe("MCP App Agent Screen (hostless)", () => {
  test("tabs, activity/file/decision/plan events, and clear", async ({ page }) => {
    // Bundle omitted → hostless path (no esm.sh fetch needed for DOM tests)
    const html = buildAgentScreenAppHtml("export class App { connect(){} }");
    await page.setContent(html, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => typeof (window as unknown as { __driveScreen?: unknown }).__driveScreen !== "undefined");

    await expect(page.getByTestId("agent-screen-title")).toHaveText("Agent Screen");
    await expect(page.getByTestId("panel-live")).toBeVisible();

    await page.getByTestId("tab-activity").click();
    await expect(page.getByTestId("panel-activity")).toBeVisible();

    await page.evaluate(() => {
      const api = (window as unknown as {
        __driveScreen: { applyEvent: (d: unknown) => void };
      }).__driveScreen;
      api.applyEvent({ kind: "activity", op: "Alpha", text: "Reading auth.ts" });
      api.applyEvent({ kind: "file", op: "Alpha", file_path: "src/auth.ts" });
      api.applyEvent({ kind: "decision", op: "Alpha", text: "Use JWT" });
      api.applyEvent({
        kind: "plan",
        plan_name: "Auth refactor",
        completed_count: 1,
        total_count: 4,
        current_todo: "Extract service",
      });
    });

    await expect(page.getByTestId("operator-badge")).toHaveText("Alpha");
    await expect(page.getByTestId("plan-section")).toBeVisible();
    await expect(page.locator("#plan-name")).toHaveText("Auth refactor");
    await expect(page.getByTestId("activity-feed")).toContainText("Reading auth.ts");

    await page.getByTestId("tab-files").click();
    await expect(page.getByTestId("files-feed")).toContainText("src/auth.ts");

    await page.getByTestId("tab-decisions").click();
    await expect(page.getByTestId("decisions-feed")).toContainText("Use JWT");

    await page.getByTestId("btn-clear").click();
    await expect(page.getByTestId("operator-badge")).toHaveText("—");
    await page.getByTestId("tab-activity").click();
    await expect(page.locator("#activity-empty")).toBeVisible();
    await expect(page.getByTestId("activity-feed")).toBeEmpty();
  });

  test("Sync and Artifacts tabs render injected events", async ({ page }) => {
    const html = buildAgentScreenAppHtml("export class App { connect(){} }");
    await page.setContent(html, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => typeof (window as unknown as { __driveScreen?: unknown }).__driveScreen !== "undefined");

    await page.getByTestId("tab-sync").click();
    await expect(page.getByTestId("panel-sync")).toBeVisible();
    await expect(page.getByTestId("sync-empty")).toBeVisible();

    await page.evaluate(() => {
      const api = (window as unknown as {
        __driveScreen: { applyEvent: (d: unknown) => void };
      }).__driveScreen;
      api.applyEvent({
        type: "syncStatus",
        syncSnapshot: {
          userBranch: "main",
          userHeadCommit: "abcdef1234567",
          operators: [
            { operatorName: "Alpha", operatorId: "a1", syncState: "idle", headCommit: "1111111", changedFiles: ["a.ts"] },
          ],
          proposals: [
            { operatorName: "Alpha", operatorId: "a1", status: "pending_review", changedFiles: ["a.ts"] },
          ],
        },
      });
      api.applyEvent({ kind: "proposalUpdate", text: "Alpha opened PR" });
      api.applyEvent({ type: "queueStatus", text: "1 pending" });
    });

    await expect(page.getByTestId("sync-empty")).toBeHidden();
    await expect(page.getByTestId("panel-sync")).toContainText("main@abcdef1");
    await expect(page.getByTestId("panel-sync")).toContainText("Alpha");
    await expect(page.getByTestId("panel-sync")).toContainText("pending_review");
    await expect(page.getByTestId("panel-sync")).toContainText("[Proposal] Alpha opened PR");
    await expect(page.getByTestId("panel-sync")).toContainText("[Queue] 1 pending");

    await page.getByTestId("tab-artifacts").click();
    await expect(page.getByTestId("panel-artifacts")).toBeVisible();
    await expect(page.getByTestId("artifacts-empty")).toBeVisible();

    await page.evaluate(() => {
      const api = (window as unknown as {
        __driveScreen: { applyEvent: (d: unknown) => void };
      }).__driveScreen;
      api.applyEvent({
        kind: "cloudAgentArtifact",
        artifactType: "screenshot",
        artifactUrl: "https://example.com/shot.png",
        artifactLabel: "screenshot.png",
      });
    });

    await expect(page.getByTestId("artifact-item")).toBeVisible();
    await expect(page.getByTestId("artifact-link")).toHaveText("screenshot.png");
    await expect(page.getByTestId("artifact-img")).toHaveAttribute("src", "https://example.com/shot.png");

    await page.getByTestId("btn-clear").click();
    await page.getByTestId("tab-sync").click();
    await expect(page.getByTestId("sync-empty")).toBeVisible();
    await page.getByTestId("tab-artifacts").click();
    await expect(page.getByTestId("artifacts-empty")).toBeVisible();
  });
});
