import { test, expect, type Page } from "@playwright/test";

/**
 * Captures the review images for the Gemini vision-QA step (scripts/visual-qa.mjs).
 *
 * TILES, NOT ONE SHRUNK PAGE (owner call, 2026-10-05: "approve tiles"). The reviewer used to be handed a
 * single full-page capture — 1280x6495 for ParcelProof — which the vision model downsamples by ~4x before
 * it looks at anything. That is where hallucinated "text overlapping" verdicts come from: it could not read
 * the page, so it guessed, and the gate failed a page that measures clean.
 *
 * Each capture is now cut into viewport-height bands (1280x900, the width the deterministic layout specs
 * assert at) taken from the full-page render, so every band reaches the model at full resolution and no
 * band contains an element that only exists because of scrolling (a sticky header is captured once, in its
 * document position — not repeated over content in every band).
 *
 * Bounded cost: at most MAX_TILES bands per product, evenly strided, with the last band landing on the
 * bottom of the page. A taller page is therefore sampled rather than covered band-for-band, and the
 * measured invariants (table fit, contrast, fonts, axe) stay with the deterministic specs — see
 * skills/ui_component_standards.md §9 and its 2026-10-05 edge case.
 */
const TILE_WIDTH = 1280;
const TILE_HEIGHT = 900;
const MAX_TILES = 6;

async function captureTiles(page: Page, product: string) {
  // The capture viewport is fixed so the bands match the layout the specs assert at.
  await page.setViewportSize({ width: TILE_WIDTH, height: TILE_HEIGHT });
  const total = await page.evaluate(() =>
    Math.max(document.documentElement.scrollHeight, document.body.scrollHeight),
  );
  const bands = Math.max(1, Math.ceil(total / TILE_HEIGHT));
  const count = Math.min(bands, MAX_TILES);
  // Even stride across the page's scrollable range, so the bottom band always shows the page's end.
  const stride = count === 1 ? 0 : (total - TILE_HEIGHT) / (count - 1);

  for (let i = 0; i < count; i++) {
    const y = Math.round(Math.min(Math.max(0, i * stride), Math.max(0, total - TILE_HEIGHT)));
    await page.screenshot({
      path: `test-results/${product}-qa-${i + 1}.png`,
      fullPage: true,
      clip: { x: 0, y, width: TILE_WIDTH, height: Math.min(TILE_HEIGHT, total - y) },
    });
  }
  console.log(`visual-qa capture: ${product} — ${count} tile(s) from a ${total}px page`);
}

// FacturGate is captured in its richest state: a validated, converted FR document (score card,
// findings area, reconciliation, emitted artifact and the coverage disclosure).
test("capture FacturGate QA tiles", async ({ page }) => {
  await page.goto("/facturgate");
  await page.getByRole("button", { name: /Load valid FR example/ }).click();
  await page.getByRole("button", { name: /Validate & convert/ }).click();
  await expect(page.getByText("100/100")).toBeVisible();
  await captureTiles(page, "facturgate");
});

// ParcelProof is captured in its richest state: an audited invoice with money on it (recovery
// summary, findings with triggers, the line ledger and the dispute packet button).
test("capture ParcelProof QA tiles", async ({ page }) => {
  await page.goto("/parcelproof");
  await page.getByRole("button", { name: "Audit invoice", exact: true }).click();
  await expect(page.getByText("$71.50")).toBeVisible();
  await captureTiles(page, "parcelproof");

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
test("capture CaseProof QA tiles", async ({ page }) => {
  await page.goto("/caseproof");
  await page.getByRole("button", { name: "Audit the case" }).click();
  await expect(page.getByText("41 months · 3.4 yr").first()).toBeVisible();
  await captureTiles(page, "caseproof");
});

// SpendProof is captured in its richest state: a reconciled period with money on it, the close
// WITHHELD, the findings (with their rule ids) and the per-bucket trail.
test("capture SpendProof QA tiles", async ({ page }) => {
  await page.goto("/spendproof");
  await page.getByRole("button", { name: "Reconcile the period" }).click();
  await expect(page.getByText("CLOSE WITHHELD")).toBeVisible();
  await expect(page.getByText("$2.70").first()).toBeVisible();
  await captureTiles(page, "spendproof");

  // Same deterministic font check as ParcelProof's money figure: a vision model cannot reliably
  // distinguish monospace from sans at small sizes, so the audited number is asserted in code.
  const money = page.getByText("$2.70").first();
  const isMonospace = await money.evaluate((node) => {
    for (let el = node as HTMLElement | null; el; el = el.parentElement) {
      if (getComputedStyle(el).fontFamily.toLowerCase().includes("mono")) return true;
    }
    return false;
  });
  expect(isMonospace).toBe(true);
});

// The "currency inputs have adequate horizontal padding" check that used to live here is deleted, not
// moved: the only surface it could observe was QuarterLine's currency field, which is out of service
// with the product. Padding is enforced by the design-token step (`npm run check:tokens`) and the
// vision-QA prompt explicitly does not judge padding.
