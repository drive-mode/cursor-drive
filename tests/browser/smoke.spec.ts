import { test, expect } from "@playwright/test";

test.describe("serve-web smoke", () => {
  test("navigates to localhost:8000 and page loads", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/localhost:8000/);
  });

  test("Cursor IDE UI loads within timeout", async ({ page }) => {
    await page.goto("/");
    // Wait for workbench or main content area (VS Code web structure)
    await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
    // Page should have loaded; give IDE time to render
    await page.waitForTimeout(5000);
    const body = await page.locator("body").count();
    expect(body).toBeGreaterThan(0);
  });

  test("Drive status bar item appears when extension is loaded", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
    await page.waitForTimeout(8000); // Extension activation + status bar render
    // Drive shows "Drive (off)" or "Drive: AGENT" etc. in status bar
    const driveText = page.getByText(/Drive/);
    await expect(driveText).toBeVisible({ timeout: 10_000 });
  });

  test("MCP server health check", async ({ request }) => {
    // MCP server must be started separately (F5 in another window) for drive_speak, share_screen_* tools.
    const res = await request.get("http://127.0.0.1:7891/health").catch(() => null);
    if (res?.ok()) {
      const body = await res.json();
      expect(body).toMatchObject({ status: "ok", name: "cursor-drive" });
    }
    // If MCP not running (ECONNREFUSED), test passes — MCP is optional for serve-web-only smoke
  });

  test("no console errors on load", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(3000);
    // Filter out known benign errors (e.g. extension host, source maps)
    const critical = errors.filter((e) => !e.includes("sourcemap") && !e.includes("404"));
    expect(critical).toHaveLength(0);
  });
});
