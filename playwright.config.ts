import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  // ONE baseline per snapshot, rendered on the platform that actually runs the gate (Linux).
  // Playwright's default template appends `-{platform}`, which silently split every snapshot into
  // a linux and a darwin file: the 2026-10-04 showcase redesign then only refreshed the darwin
  // copy, leaving the linux baseline stale and this host's gate red on a change someone had
  // already visually approved. The deploy target and the only test host are Linux, so a second
  // baseline is a file no run here can ever validate. On macOS, regenerate with
  // `npx playwright test --update-snapshots` — the render differs by font, so a Mac run is
  // expected to need that (macOS compatibility is out of scope for this deployment).
  snapshotPathTemplate: "{testDir}/{testFilePath}-snapshots/{arg}{ext}",
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
