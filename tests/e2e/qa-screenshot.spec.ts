import { test, expect } from "@playwright/test";

// Captures stable full-page screenshots for the Gemini vision-QA step (scripts/visual-qa.mjs).
// Paths are deterministic (not platform-suffixed like toHaveScreenshot snapshots).
//
// QuarterLine has no capture any more: it is retired (2026-10-05) and its calculator no longer renders,
// so the surface the review used to cover does not exist. The retirement notice is covered by the
// deterministic axe + content assertions in landing.spec.ts instead of a vision review.

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

  // Deterministic font check — vision models cannot reliably distinguish monospace from sans at small
  // sizes, so the money figure is asserted programmatically instead. (This check used to run against
  // QuarterLine's calculator; it moves to a live product's audited figure so the coverage is not lost
  // with the retirement.)
  const money = page.getByText("$71.50").first();
  const isMonospace = await money.evaluate((node) => {
    for (let el = node as HTMLElement | null; el; el = el.parentElement) {
      if (getComputedStyle(el).fontFamily.toLowerCase().includes("mono")) return true;
    }
    return false;
  });
  expect(isMonospace).toBe(true);
});

// CaseProof is captured in its richest state: an audited case with money and a chain on it (the
// verdict, the vendor-vs-buyer chain, the loaded-rate table, the cash flow and the ranked list).
test("capture CaseProof QA screenshot", async ({ page }) => {
  await page.goto("/caseproof");
  await page.getByRole("button", { name: "Audit the case" }).click();
  await expect(page.getByText("41 months · 3.4 yr").first()).toBeVisible();
  await page.screenshot({ path: "test-results/caseproof-qa.png", fullPage: true });
});

// The "currency inputs have adequate horizontal padding" check that used to live here is deleted, not
// moved: the only surface it could observe was QuarterLine's currency field, which is out of service
// with the product. Padding is enforced by the design-token step (`npm run check:tokens`) and the
// vision-QA prompt explicitly does not judge padding.
