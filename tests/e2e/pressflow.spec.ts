import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("pressflow renders at /pressflow with workbench and preview", async ({ page }) => {
  await page.goto("/pressflow");
  await expect(page.getByRole("heading", { name: "PressFlow" })).toBeVisible();
  await expect(page.getByText("Supabase + LinkedIn Engine")).toBeVisible();
  await expect(page.getByRole("button", { name: "Load Sample" })).toBeVisible();
  await expect(page.getByText("LinkedIn Feed Appearance")).toBeVisible();
});

test("pressflow formats post variants dynamically", async ({ page }) => {
  await page.goto("/pressflow");
  await page.getByRole("button", { name: "Load Sample" }).click();
  await expect(page.getByText("📌 3-Bullet Framework")).toBeVisible();
  await expect(page.getByText("⚡ Contrarian Hook & Breakdown")).toBeVisible();
  await expect(page.getByText("📖 Story & Lessons")).toBeVisible();
});

test("pressflow passes WCAG 2.1 AA accessibility (axe)", async ({ page }) => {
  await page.goto("/pressflow");
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(results.violations).toEqual([]);
});
