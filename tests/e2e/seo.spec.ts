/**
 * The product host's crawler surfaces, served end to end.
 *
 * Not a unit test of the map (that is `src/lib/seo/crawlMap.test.ts`): these assert the built app
 * actually SERVES `/robots.txt` and `/sitemap.xml`, which is the thing that was missing — both
 * answered 404 while five products and their rule pages were indexable but unmapped
 * (owner-approved build, 2026-10-10).
 */
import { expect, test } from "@playwright/test";

import { activeProducts, retiredProducts } from "../../src/products/registry";
import { SITE_ORIGIN } from "../../src/lib/seo/crawlMap";

test("serves /robots.txt and points crawlers at the sitemap", async ({ page }) => {
  const response = await page.request.get("/robots.txt");
  expect(response.status()).toBe(200);

  const body = await response.text();
  expect(body).toContain("Allow: /");
  expect(body).toContain("Disallow: /api/");
  expect(body).toContain(`Sitemap: ${SITE_ORIGIN}/sitemap.xml`);
});

test("serves /sitemap.xml with every in-inventory product page and no retired one", async ({ page }) => {
  const response = await page.request.get("/sitemap.xml");
  expect(response.status()).toBe(200);

  const body = await response.text();
  expect(body).toContain("<urlset");
  for (const product of activeProducts) {
    expect(body, product.slug).toContain(`${SITE_ORIGIN}${product.route}`);
  }
  expect(body).toContain(`${SITE_ORIGIN}/showcase`);
  for (const retired of retiredProducts) {
    expect(body, retired.slug).not.toContain(`${SITE_ORIGIN}${retired.route}`);
  }
});
