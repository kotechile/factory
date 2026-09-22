import { test, expect } from "@playwright/test";

// Captures stable full-page screenshots for the Gemini vision-QA step
// (scripts/visual-qa.mjs). Paths are deterministic (not platform-suffixed like
// toHaveScreenshot snapshots).
test("capture QuarterLine QA screenshot", async ({ page }) => {
  await page.goto("/quarterline");
  await page.screenshot({ path: "test-results/quarterline-qa.png", fullPage: true });
});

// FacturGate is captured in its richest state: a validated, converted FR document (score card,
// findings area, reconciliation, emitted artifact and the coverage disclosure).
test("capture FacturGate QA screenshot", async ({ page }) => {
  await page.goto("/facturgate");
  await page.getByRole("button", { name: /Load valid FR example/ }).click();
  await page.getByRole("button", { name: /Validate & convert/ }).click();
  await expect(page.getByText("100/100")).toBeVisible();
  await page.screenshot({ path: "test-results/facturgate-qa.png", fullPage: true });
});

// ParcelProof is captured in its richest state: an audited invoice with money on it (recovery
// summary, findings with triggers, the line ledger and the dispute packet button).
test("capture ParcelProof QA screenshot", async ({ page }) => {
  await page.goto("/parcelproof");
  await page.getByRole("button", { name: "Audit invoice", exact: true }).click();
  await expect(page.getByText("$71.50")).toBeVisible();
  await page.screenshot({ path: "test-results/parcelproof-qa.png", fullPage: true });
});

// CaseProof is captured in its richest state: an audited case with money and a chain on it (the
// verdict, the vendor-vs-buyer chain, the loaded-rate table, the cash flow and the ranked list).
test("capture CaseProof QA screenshot", async ({ page }) => {
  await page.goto("/caseproof");
  await page.getByRole("button", { name: "Audit the case" }).click();
  await expect(page.getByText("41 months · 3.4 yr").first()).toBeVisible();
  await page.screenshot({ path: "test-results/caseproof-qa.png", fullPage: true });
});

// Deterministic font check — vision models cannot reliably distinguish monospace
// from sans at small sizes, so this is asserted programmatically instead.
test("numbers use a monospace font", async ({ page }) => {
  await page.goto("/quarterline");
  const el = page.locator(".font-mono").first();
  await expect(el).toBeVisible();
  const fontFamily = await el.evaluate((node) => getComputedStyle(node).fontFamily);
  expect(fontFamily.toLowerCase()).toContain("mono");
});

// Deterministic padding check — vision models flag 16px input padding as "flush",
// so the minimum is asserted programmatically instead. Currency inputs use a "$"
// prefix + comma mask (type="text", inputMode="decimal") with pl-8.
test("currency inputs have adequate horizontal padding", async ({ page }) => {
  await page.goto("/quarterline");
  const input = page.locator('input[inputmode="decimal"]').first();
  await expect(input).toBeVisible();
  const paddingLeft = await input.evaluate((node) => parseFloat(getComputedStyle(node).paddingLeft));
  expect(paddingLeft).toBeGreaterThanOrEqual(12);
});
