import { test } from "@playwright/test";

// Captures a stable full-page screenshot for the Gemini vision-QA step
// (scripts/visual-qa.mjs). Path is deterministic (not platform-suffixed like
// toHaveScreenshot snapshots).
test("capture QA screenshot", async ({ page }) => {
  await page.goto("/");
  await page.screenshot({ path: "test-results/quarterline-qa.png", fullPage: true });
});
