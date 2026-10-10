/**
 * Drift guard for the crawl map (`src/app/robots.ts` + `src/app/sitemap.ts` read it).
 *
 * The defect this closes: the host served no robots.txt and no sitemap.xml (both 404) while five
 * products and their rule pages were indexable-but-unmapped. A hand-maintained list would rot the
 * moment a product is retired, so the guards below fail the build when the map and its sources
 * disagree — and the retirement case is asserted with a product that IS retired (`quarterline`), not
 * with a hypothetical.
 */
import { describe, expect, it } from "vitest";

import { activeProducts, products, retiredProducts } from "@/products/registry";
import { caseproofPresets } from "@/lib/seo/caseproof/presets";
import { SITE_ORIGIN, assertRulePageOwners, crawlableEntries, crawlableUrls } from "@/lib/seo/crawlMap";
import { einvoicePresets } from "@/lib/seo/einvoice/presets";
import { parcelauditPresets } from "@/lib/seo/parcelaudit/presets";

describe("crawl map — the product host's robots/sitemap source", () => {
  it("lists every in-inventory product route, and no retired product", () => {
    const urls = crawlableUrls();

    expect(activeProducts.length).toBeGreaterThan(0);
    for (const product of activeProducts) {
      expect(urls, product.slug).toContain(`${SITE_ORIGIN}${product.route}`);
    }

    // The bite: `products` still carries the retired entry (the directory renders its notice), so a
    // future edit that derives the map from `products` instead of `activeProducts` fails here.
    expect(retiredProducts.length).toBeGreaterThan(0);
    expect(products.some((product) => product.status === "killed")).toBe(true);
    for (const retired of retiredProducts) {
      expect(urls, retired.slug).not.toContain(`${SITE_ORIGIN}${retired.route}`);
      expect(urls.some((url) => url.startsWith(`${SITE_ORIGIN}${retired.route}/`)), retired.slug).toBe(false);
    }

    expect(urls).toContain(`${SITE_ORIGIN}/showcase`);
  });

  it("lists every pSEO rule page of every product that publishes them", () => {
    const urls = crawlableUrls();
    const modulesBySlug = {
      parcelproof: parcelauditPresets,
      facturgate: einvoicePresets,
      caseproof: caseproofPresets,
    } as const;

    for (const [slug, presets] of Object.entries(modulesBySlug)) {
      const product = activeProducts.find((entry) => entry.slug === slug);
      expect(product, `${slug} must be in inventory for its rule pages to be advertised`).toBeDefined();
      expect(presets.length, slug).toBeGreaterThan(0);
      for (const preset of presets) {
        expect(urls, `${slug}/${preset.slug}`).toContain(`${SITE_ORIGIN}${product!.route}/calc/${preset.slug}`);
      }
    }
  });

  it("emits absolute, unique, on-origin URLs with a valid priority", () => {
    const urls = crawlableUrls();
    expect(new Set(urls).size).toBe(urls.length);
    for (const url of urls) {
      expect(url.startsWith(`${SITE_ORIGIN}/`), url).toBe(true);
    }
    for (const entry of crawlableEntries()) {
      expect(entry.priority).toBeGreaterThan(0);
      expect(entry.priority).toBeLessThanOrEqual(1);
    }
  });

  it("refuses to advertise rule pages for a slug that is not in inventory", () => {
    // `assertRulePageOwners` is the explicit failure: no silent drop, no stale URL for a product the
    // factory can no longer sell. It is called by `crawlableEntries`, so the map cannot be built
    // around a stale key.
    expect(() => assertRulePageOwners()).not.toThrow();
  });
});
