import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:3100",
    trace: "on-first-retry",
  },
  webServer: {
    // Use port 3100, not 3000: the sibling editorial-factory PressFlow app
    // (node site/server.mjs) defaults to 3000 and was silently reused by
    // reuseExistingServer, making e2e run against the wrong app (2026-09-09
    // collision — see the ui_component_standards.md edge-case). A dedicated
    // port avoids the cross-factory collision entirely.
    command: "npm run start -- -p 3100",
    url: "http://127.0.0.1:3100",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
