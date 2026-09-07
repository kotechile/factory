import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const EDITORIAL_SECRET = process.env.EDITORIAL_SECRET || "factory_editorial_2026";

test.beforeEach(async ({ context }) => {
  // /pressflow is behind an editorial passcode gate (commit a608eef). The gate
  // authenticates against the `pressflow_auth` cookie whose value must equal
  // EDITORIAL_SECRET (server default "factory_editorial_2026" when unset).
  await context.addCookies([
    {
      name: "pressflow_auth",
      value: EDITORIAL_SECRET,
      domain: "127.0.0.1",
      path: "/",
      httpOnly: true,
    },
  ]);
});

test("pressflow renders at /pressflow with workbench and preview", async ({ page }) => {
  await page.goto("/pressflow");
  await expect(page.getByRole("heading", { name: "PressFlow" })).toBeVisible();
  await expect(page.getByText("Editorial Factory Suite")).toBeVisible();
  await expect(page.getByRole("button", { name: "Load Sample" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "LinkedIn Format Generator & Publisher" })).toBeVisible();
});

test("pressflow formats post variants dynamically", async ({ page }) => {
  await page.goto("/pressflow");
  await expect(page.getByRole("button", { name: "📌 3-Bullet Framework" })).toBeVisible();
  await expect(page.getByRole("button", { name: "⚡ Contrarian Hook" })).toBeVisible();
  await expect(page.getByRole("button", { name: "📖 Story & Lessons" })).toBeVisible();
});

test("pressflow passes WCAG 2.1 AA accessibility (axe)", async ({ page }) => {
  await page.goto("/pressflow");
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(results.violations).toEqual([]);
});
