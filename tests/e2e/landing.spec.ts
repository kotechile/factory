import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("landing renders the QuarterLine product", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/QuarterLine/);
  await expect(page.getByText("QuarterLine").first()).toBeVisible();
});

test("landing passes WCAG 2.1 AA accessibility (axe)", async ({ page }) => {
  await page.goto("/");
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(results.violations).toEqual([]);
});

test("landing visual snapshot", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveScreenshot("landing.png", { fullPage: true });
});
