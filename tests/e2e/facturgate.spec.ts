import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("facturgate renders at /facturgate", async ({ page }) => {
  await page.goto("/facturgate");
  await expect(page).toHaveTitle(/FacturGate/);
  await expect(
    page.getByRole("heading", { name: "FacturGate — EU e-invoice pre-send gate" }),
  ).toBeVisible();
});

test("facturgate scores the loaded FR example 100/100 without findings", async ({ page }) => {
  await page.goto("/facturgate");
  await page.getByRole("button", { name: /Load valid FR example/ }).click();
  await page.getByRole("button", { name: /Validate & score/ }).click();

  await expect(page.getByText("100/100")).toBeVisible();
  await expect(page.getByText("No rule in the implemented set failed.")).toBeVisible();
  // The reconciliation is shown to the cent, with a zero delta.
  await expect(page.getByText("Reconciliation (recomputed from the lines)")).toBeVisible();
  await expect(page.getByText("Delta (computed − declared)")).toBeVisible();
});

test("facturgate blocks the broken example and names the failing rule", async ({ page }) => {
  await page.goto("/facturgate");
  await page.getByRole("button", { name: /Load broken example/ }).click();
  await page.getByRole("button", { name: /Validate & score/ }).click();

  await expect(page.getByText("blocked")).toBeVisible();
  await expect(page.getByText("BR-05").first()).toBeVisible();
  await expect(page.getByText("invoice.currency").first()).toBeVisible();
});

test("facturgate emits the converted EN 16931 artifact", async ({ page }) => {
  await page.goto("/facturgate");
  await page.getByRole("button", { name: /Load valid FR example/ }).click();
  await page.getByRole("button", { name: /Validate & convert/ }).click();

  await expect(page.getByText("Emitted artifact")).toBeVisible();
  await expect(page.getByText(/urn:cen\.eu:en16931:2017#compliant#urn:factur-x\.eu:1p0:en16931/).first()).toBeVisible();
  await expect(page.getByRole("button", { name: /Download/ })).toBeVisible();
});

test("facturgate rule page renders its preset target", async ({ page }) => {
  await page.goto("/facturgate/calc/br-06-seller-name");
  await expect(page.getByRole("heading", { name: /BR-06 \/ BR-07/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Load valid FR example/ })).toBeVisible();
});

test("facturgate country page renders for Poland", async ({ page }) => {
  await page.goto("/facturgate/calc/ksef-fa3-pl");
  await expect(page.getByRole("heading", { name: /Poland \(KSeF\)/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Load valid PL example/ })).toBeVisible();
});

test("facturgate passes WCAG 2.1 AA accessibility (axe)", async ({ page }) => {
  await page.goto("/facturgate");
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(results.violations).toEqual([]);
});
