import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("landing renders the factory branding", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle("Autonomous Product & Software Factory");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Autonomous Product",
  );
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
