import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("parcelproof renders at /parcelproof", async ({ page }) => {
  await page.goto("/parcelproof");
  await expect(page).toHaveTitle(/ParcelProof/);
  await expect(
    page.getByRole("heading", { name: "ParcelProof — carrier invoice DIM-weight & surcharge audit" }),
  ).toBeVisible();
});

test("parcelproof audits the overcharge example and shows the claimable money", async ({ page }) => {
  await page.goto("/parcelproof");
  // The page loads its worked example; auditing is always explicit.
  await page.getByRole("button", { name: "Audit invoice", exact: true }).click();

  // A divisor swap ($1.00), an ineligible AHS-Dimension ($29.50) and a late-delivery refund ($41.00).
  await expect(page.getByText("$71.50")).toBeVisible();
  await expect(page.getByText("pp-dim-divisor").first()).toBeVisible();
  await expect(page.getByText("pp-sur-ahs-dimension").first()).toBeVisible();
  await expect(page.getByText("pp-svc-late").first()).toBeVisible();
  /// The evidence and the fix travel with every finding, and the clock is stated per line.
  await expect(page.getByText(/Trigger: divisor 139 was applied/).first()).toBeVisible();
  await expect(page.getByText("Line ledger — billed vs recomputed, and the clock")).toBeVisible();
  await expect(page.getByText(/audited as of 2026-09-18/)).toBeVisible();
});

test("parcelproof audits a clean invoice to zero flags", async ({ page }) => {
  await page.goto("/parcelproof");
  await page.getByRole("button", { name: "Load clean example" }).click();
  await page.getByRole("button", { name: "Audit invoice", exact: true }).click();

  await expect(page.getByText("No rule in the implemented set failed.")).toBeVisible();
  await expect(page.getByText("clean", { exact: true })).toBeVisible();
  // Zero recoverable money and zero expired money, with no unpriced or unauditable line.
  await expect(page.getByText("$0.00").first()).toBeVisible();
  await expect(page.getByText("3 lines audited")).toBeVisible();
  await expect(page.getByRole("button", { name: /Download dispute CSV/ })).toHaveCount(0);
});

test("parcelproof separates expired money from claimable money", async ({ page }) => {
  await page.goto("/parcelproof");
  await page.getByRole("button", { name: "Load dispute-clock example" }).click();
  await page.getByRole("button", { name: "Audit invoice", exact: true }).click();

  await expect(page.getByText("$2.00").first()).toBeVisible(); // claimable (two lines at $1.00)
  await expect(page.getByText("pp-clk-expiring").first()).toBeVisible();
  await expect(page.getByText("pp-clk-expired").first()).toBeVisible();
  await expect(page.getByText("expired · -18d left").first()).toBeVisible();
  await expect(page.getByText("2026-08-31").first()).toBeVisible();
});

test("parcelproof refuses a broken export instead of pricing it", async ({ page }) => {
  await page.goto("/parcelproof");
  await page.getByRole("button", { name: "Load a broken export" }).click();
  await page.getByRole("button", { name: "Audit invoice", exact: true }).click();

  await expect(page.getByText(/pp-field-missing at shipmentRecords\.zone/)).toBeVisible();
  await expect(page.getByText(/Nothing was audited/)).toBeVisible();
});

test("parcelproof exposes the dispute packet once there are findings", async ({ page }) => {
  await page.goto("/parcelproof");
  await page.getByRole("button", { name: "Audit invoice", exact: true }).click();
  await expect(page.getByRole("button", { name: /Download dispute CSV/ })).toBeVisible();
});

test("parcelproof rule page renders its preset target", async ({ page }) => {
  await page.goto("/parcelproof/calc/usps-dim-divisor-2026");
  await expect(
    page.getByRole("heading", { name: /USPS DIM divisor 2026 — 166 → 139 on 2026-07-12/ }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Audit invoice", exact: true })).toBeVisible();
});

test("parcelproof dispute-window page renders for FedEx", async ({ page }) => {
  await page.goto("/parcelproof/calc/fedex-21-day-dispute-window");
  await expect(page.getByRole("heading", { name: /FedEx 21-day dispute window/ })).toBeVisible();
  await page.getByRole("button", { name: "Audit invoice", exact: true }).click();
  await expect(page.getByText("pp-clk-expired").first()).toBeVisible();
});

test("parcelproof passes WCAG 2.1 AA accessibility (axe)", async ({ page }) => {
  await page.goto("/parcelproof");
  await page.getByRole("button", { name: "Audit invoice", exact: true }).click();
  await expect(page.getByText("pp-dim-divisor").first()).toBeVisible();
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(results.violations).toEqual([]);
});
