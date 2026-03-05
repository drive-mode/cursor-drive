import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/browser",
  snapshotDir: "tests/browser/screenshots/baseline",
  reporter: [["html", { open: "never" }]],
  timeout: 30_000,
  use: {
    baseURL: "http://localhost:8000",
    browserName: "chromium",
    trace: "on-first-retry",
  },
  webServer: undefined, // Assume serve-web is already running
});
