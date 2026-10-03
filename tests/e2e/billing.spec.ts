import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("billing portal renders at /billing with plans and portal form", async ({ page }) => {
  await page.goto("/billing");
  await expect(page).toHaveTitle(/Factory Billing Portal/);
  await expect(
    page.getByRole("heading", { name: "Deterministic Pricing for Agents & Teams" }),
  ).toBeVisible();

  // Primary pricing cards
  await expect(page.getByText("Agent Metered Pass")).toBeVisible();
  await expect(page.getByText("Factory Pro Suite")).toBeVisible();
  await expect(page.getByText("Manage Account")).toBeVisible();

  // Pricing matrix
  await expect(page.getByText("Factory Tool Pricing Matrix")).toBeVisible();
  await expect(page.getByText("reconcile_stripe_payout")).toBeVisible();
});

test("billing portal passes WCAG 2.1 AA accessibility (axe)", async ({ page }) => {
  await page.goto("/billing");
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(results.violations).toEqual([]);
});
