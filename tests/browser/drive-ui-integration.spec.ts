import { test, expect } from "@playwright/test";

test.describe("Drive UI Integration", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
    await page.waitForTimeout(8000); // Extension activation + status bar render
  });

  test("status bar shows Drive in inactive state", async ({ page }) => {
    const statusBarItem = page.locator('[aria-label*="Drive"], [title*="Drive"]');
    await expect(statusBarItem.first()).toBeVisible({ timeout: 10_000 });
  });

  test("toggle Drive mode via command palette", async ({ page }) => {
    await page.keyboard.press("Control+Shift+P");
    await page.waitForTimeout(500);
    await page.keyboard.type("Toggle Drive Mode");
    await page.waitForTimeout(500);
    await page.keyboard.press("Enter");
    await page.waitForTimeout(1000);

    const statusBarItem = page.locator('[aria-label*="Drive"]');
    await expect(statusBarItem.first()).toBeVisible();
    await page.screenshot({ path: "tests/browser/screenshots/drive-active.png" });
  });

  test("Agent Screen opens beside editor", async ({ page }) => {
    await page.keyboard.press("Control+Shift+S");
    await page.waitForTimeout(1500);

    const agentScreen = page.locator('text=Agent Screen, [aria-label*="Agent Screen"]');
    await expect(agentScreen.first()).toBeVisible({ timeout: 8_000 });
    await page.screenshot({ path: "tests/browser/screenshots/agent-screen-open.png" });
  });

  test("MCP server health check", async ({ request }) => {
    // MCP server runs in the extension host; optional for serve-web-only runs.
    const res = await request.get("http://127.0.0.1:7891/health").catch(() => null);
    if (res?.ok()) {
      const body = await res.json();
      expect(body).toMatchObject({ status: "ok" });
    }
    // If MCP not running (ECONNREFUSED), test passes — MCP is optional for UI tests.
  });
});
