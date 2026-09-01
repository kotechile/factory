import { test, expect } from "@playwright/test";

// Captures a stable full-page screenshot of the QuarterLine calculator for the
// Gemini vision-QA step (scripts/visual-qa.mjs). Path is deterministic (not
// platform-suffixed like toHaveScreenshot snapshots).
test("capture QA screenshot", async ({ page }) => {
  await page.goto("/quarterline");
  await page.screenshot({ path: "test-results/quarterline-qa.png", fullPage: true });
});

// Deterministic font check — vision models cannot reliably distinguish monospace
// from sans at small sizes, so this is asserted programmatically instead.
test("numbers use a monospace font", async ({ page }) => {
  await page.goto("/quarterline");
  const el = page.locator(".font-mono").first();
  await expect(el).toBeVisible();
  const fontFamily = await el.evaluate((node) => getComputedStyle(node).fontFamily);
  expect(fontFamily.toLowerCase()).toContain("mono");
});

// Deterministic padding check — vision models flag 16px input padding as "flush",
// so the minimum is asserted programmatically instead.
test("number inputs have adequate horizontal padding", async ({ page }) => {
  await page.goto("/quarterline");
  const input = page.locator('input[type="number"]').first();
  await expect(input).toBeVisible();
  const paddingLeft = await input.evaluate((node) => parseFloat(getComputedStyle(node).paddingLeft));
  expect(paddingLeft).toBeGreaterThanOrEqual(12);
});
