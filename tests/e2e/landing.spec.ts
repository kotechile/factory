import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("directory renders the factory showcase at /showcase", async ({ page }) => {
  await page.goto("/showcase");
  await expect(page).toHaveTitle(/Factory Showcase/);
  await expect(page.getByRole("heading", { name: "Factory Showcase" })).toBeVisible();
  await expect(page.getByText("QuarterLine").first()).toBeVisible();
});

test("root / redirects to giniloh.com", async ({ page }) => {
  const response = await page.goto("/");
  expect(response?.status()).toBe(200);
  expect(page.url()).toContain("giniloh.com");
});

test("quarterline calculator renders at /quarterline", async ({ page }) => {
  await page.goto("/quarterline");
  await expect(page).toHaveTitle(/QuarterLine/);
  await expect(page.getByText("QuarterLine").first()).toBeVisible();
});

test("directory passes WCAG 2.1 AA accessibility (axe)", async ({ page }) => {
  await page.goto("/showcase");
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(results.violations).toEqual([]);
});

test("directory visual snapshot", async ({ page }) => {
  await page.goto("/showcase");
  await expect(page).toHaveScreenshot("landing.png", { fullPage: true });
});

