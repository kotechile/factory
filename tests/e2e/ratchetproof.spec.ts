import { test, expect } from "@playwright/test";
import { axeScan } from "./a11y";

test("ratchetproof renders at /ratchetproof", async ({ page }) => {
  await page.goto("/ratchetproof");
  await expect(page).toHaveTitle(/RatchetProof/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Find the floor your electric bill charges you for" }),
  ).toBeVisible();
  await expect(page.getByText("RatchetProof").first()).toBeVisible();
});

test("ratchetproof reproduces the four-month 75% ratchet to the cent", async ({ page }) => {
  await page.goto("/ratchetproof");
  await page.getByRole("button", { name: "Run the audit" }).click();

  await expect(page.getByText("AUDIT COMPLETE")).toBeVisible();
  // The carry-over is $750 + $1,500 + $2,250; the shave counterfactual is $2,250 (unique on the page).
  await expect(page.getByText("$2,250.00").first()).toBeVisible();
  await expect(page.getByText("$4,500.00").last()).toBeVisible();
  // Every audited month is on the page, with the ratchet binding on three of them.
  for (const month of ["2026-01", "2026-02", "2026-03", "2026-04"]) {
    await expect(page.getByText(month).first()).toBeVisible();
  }
  await expect(page.getByText("ratchet").first()).toBeVisible();
  // The April bill prints 775 kW against 750 recomputed: a real variance finding.
  await expect(page.getByText("rp-billed-variance").first()).toBeVisible();
  await expect(page.getByText("$375.00").first()).toBeVisible();
});

test("ratchetproof reports the Saturday spike the tariff does not bill", async ({ page }) => {
  await page.goto("/ratchetproof");
  await page.getByRole("button", { name: "Run the audit" }).click();
  await expect(page.getByText("AUDIT COMPLETE")).toBeVisible();
  // 1,400 kW on a Saturday is the biggest interval in the file and sets nothing.
  await expect(page.getByText("1,400.0 kW").first()).toBeVisible();
  await expect(page.getByText("2026-02-07T18:00:00Z").first()).toBeVisible();
  // The floor event is January's 1,000 kW interval, with both meters stacked into it.
  await expect(page.getByText("2026-01-14T19:00:00Z").first()).toBeVisible();
  await expect(page.getByText("620.0 kW").first()).toBeVisible();
});

test("ratchetproof blocks a month whose ratchet clause is unstated", async ({ page }) => {
  await page.goto("/ratchetproof");
  await page.getByRole("button", { name: "Unstated ratchet clause" }).click();
  await page.getByRole("button", { name: "Run the audit" }).click();

  await expect(page.getByText("AUDIT BLOCKED")).toBeVisible();
  await expect(page.getByText("rp-tariff-unstated").first()).toBeVisible();
  // No billed number is published for a blocked month.
  await expect(page.getByText("withheld").first()).toBeVisible();
  await expect(page.getByText("AUDIT COMPLETE")).toHaveCount(0);
});

test("ratchetproof refuses an interval gap instead of interpolating it", async ({ page }) => {
  await page.goto("/ratchetproof");
  await page.getByRole("button", { name: "An interval gap" }).click();
  await page.getByRole("button", { name: "Run the audit" }).click();

  // Next's route announcer is also role="alert"; scope to the page's own error panel.
  const alert = page.locator('div[role="alert"]').filter({ hasText: "rp-interval-gap" });
  await expect(alert).toBeVisible();
  await expect(alert.getByText("rp-interval-gap")).toBeVisible();
  await expect(alert.getByText(/never interpolated/)).toBeVisible();
});

test("ratchetproof bills every month on its own peak under a no-ratchet tariff", async ({ page }) => {
  await page.goto("/ratchetproof");
  await page.getByRole("button", { name: "No ratchet (the null)" }).click();
  await page.getByRole("button", { name: "Run the audit" }).click();
  await expect(page.getByText("AUDIT COMPLETE")).toBeVisible();
  await expect(page.getByText("$0.00").first()).toBeVisible();
  await expect(page.getByText(/month peak/).first()).toBeVisible();
});

test("ratchetproof exposes the finding set, the pricing block and the agent surface", async ({ page }) => {
  await page.goto("/ratchetproof");
  await page.getByRole("button", { name: "Run the audit" }).click();
  await expect(page.getByRole("button", { name: /Download the finding set/ })).toBeVisible();

  // The pricing block reads the catalog — the same number the API charges.
  await expect(page.getByRole("heading", { name: "Pricing" })).toBeVisible();
  await expect(page.getByText("$9.00 one-off")).toBeVisible();
  await expect(page.getByRole("cell", { name: "$1.50 per successful call" })).toBeVisible();
  await expect(page.getByText("audit_demand_billing").first()).toBeVisible();
  await expect(page.getByRole("link", { name: /Manage Billing & API Keys/ })).toBeVisible();
});

test("ratchetproof passes WCAG 2.1 AA accessibility (axe)", async ({ page }) => {
  await page.goto("/ratchetproof");
  await page.getByRole("button", { name: "Run the audit" }).click();
  await expect(page.getByText("AUDIT COMPLETE")).toBeVisible();
  const results = await axeScan(page).analyze();
  expect(results.violations).toEqual([]);
});
