import { test, expect } from "@playwright/test";

test.describe("Agent Screen visual regression", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
    await page.waitForTimeout(8000); // Extension activation
  });

  test("Agent Screen panel opens and matches baseline", async ({ page }) => {
    // Open Agent Screen via keybinding (Ctrl+Shift+S)
    await page.keyboard.press("Control+Shift+s");
    await page.waitForTimeout(2000); // Panel render

    // Wait for panel title "Drive — Agent Screen" or Agent Screen text in panel
    const drivePanel = page.getByText(/Drive.*Agent Screen|Agent Screen/);
    await expect(drivePanel).toBeVisible({ timeout: 5000 });

    // Full-page screenshot for visual regression (includes Agent Screen panel)
    await expect(page).toHaveScreenshot("agentscreen-panel.png");
  });
});
