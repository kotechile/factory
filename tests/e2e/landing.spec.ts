import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { presets } from "../../src/lib/seo/presets";

test("directory renders the factory showcase at /showcase", async ({ page }) => {
  await page.goto("/showcase");
  await expect(page).toHaveTitle(/Factory Showcase/);
  await expect(page.getByRole("heading", { name: "Factory Showcase" })).toBeVisible();
  await expect(page.getByText("QuarterLine").first()).toBeVisible();
});

test("root / redirects to giniloh.com", async ({ page }) => {
  const response = await page.goto("/");
  expect(response?.status()).toBe(200);
  expect(page.url()).toContain("giniloh.com");
});

// QuarterLine is retired (owner call, 2026-10-05). The route serves the retirement notice, not the
// calculator: a working-looking calculator with an export CTA that can only 400 is a dead end, and the
// record of the retirement is what a visitor needs. The entry's copy is derived from the registry.
test("retired QuarterLine serves its retirement notice at /quarterline", async ({ page }) => {
  await page.goto("/quarterline");
  await expect(page).toHaveTitle(/QuarterLine.*Retired/);
  await expect(page.getByRole("heading", { name: "QuarterLine is retired" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Browse the live micro-tools/ })).toHaveAttribute(
    "href",
    "/showcase",
  );
  // The calculator is gone, and with it the dead-end export path: no currency input, no $9 export.
  await expect(page.locator('input[inputmode="decimal"]')).toHaveCount(0);
  await expect(page.getByText(/Export Report/)).toHaveCount(0);
});

test("retirement notice passes WCAG 2.1 AA accessibility (axe)", async ({ page }) => {
  await page.goto("/quarterline");
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(results.violations).toEqual([]);
});

// The guard on the retirement: every slug the product ever published must permanently redirect to the
// directory. Re-mounting a `/quarterline/calc/*` route (or dropping the config redirect) turns this red.
test("every published quarterline preset slug permanently redirects to the directory", async ({
  page,
}) => {
  expect(presets.length).toBeGreaterThan(0);

  // Pin the redirect as PERMANENT on one slug (a 302 would leave the retired pages in the index).
  const first = await page.request.get(`/quarterline/calc/${presets[0].slug}`, {
    maxRedirects: 0,
  });
  expect([301, 308]).toContain(first.status());
  expect(first.headers()["location"]).toContain("/showcase");

  // And every published slug lands on the showcase, not on a calculator.
  for (const preset of presets) {
    await page.goto(`/quarterline/calc/${preset.slug}`);
    expect(page.url(), preset.slug).toContain("/showcase");
  }

  // An unknown slug under the retired prefix redirects too — no 404 and no calculator.
  await page.goto("/quarterline/calc/not-a-real-preset");
  expect(page.url()).toContain("/showcase");

  // The pre-subpath form of the same URLs redirects in ONE hop (it used to chain through the preset route).
  const legacy = await page.request.get(`/calc/${presets[0].slug}`, { maxRedirects: 0 });
  expect([301, 308]).toContain(legacy.status());
  expect(legacy.headers()["location"]).toContain("/showcase");
});

// Item 10(c): the countdown embed used to link at the retired product. It stays served (a third-party
// embed must not 404) but now points at the live inventory.
test("countdown embed points at the live inventory, not the retired product", async ({ page }) => {
  await page.goto("/embed/countdown");
  const cta = page.getByRole("link", { name: /Browse the live tools/ });
  await expect(cta).toHaveAttribute("href", "https://apps.giniloh.com/showcase");
  await expect(page.locator('a[href*="quarterline"]')).toHaveCount(0);
});

test("directory passes WCAG 2.1 AA accessibility (axe)", async ({ page }) => {
  await page.goto("/showcase");
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(results.violations).toEqual([]);
});

test("directory visual snapshot", async ({ page }) => {
  await page.goto("/showcase");
  await expect(page).toHaveScreenshot("landing.png", { fullPage: true });
});
