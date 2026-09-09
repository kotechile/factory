import { test, expect } from "@playwright/test";

test("ledgerlink renders at /ledgerlink", async ({ page }) => {
  await page.goto("/ledgerlink");
  await expect(page).toHaveTitle(/LedgerLink/);
  await expect(
    page.getByText("Turn one netted Stripe payout into clean GL journal lines"),
  ).toBeVisible();
});

test("ledgerlink decomposes the worked example into a reconciled report", async ({ page }) => {
  await page.goto("/ledgerlink");
  await expect(page.getByRole("button", { name: /Load Worked Example/ })).toBeVisible();

  await page.getByRole("button", { name: /Load Worked Example/ }).click();

  // Branded reconciliation report with the pass/fail invariant surfaced.
  await expect(page.getByText("Reconciliation Report")).toBeVisible();
  await expect(page.getByText("Reconciled")).toBeVisible();
  await expect(page.getByText(/Σ\(net\) == payout\.amount/)).toBeVisible();
  await expect(page.getByText("Decomposed GL Journal Lines")).toBeVisible();
});
