import { describe, expect, it } from "vitest";

import { SITE_ORIGIN, crawlableUrls } from "@/lib/seo/crawlMap";
import { canonicalMetadata, canonicalPaths } from "@/lib/seo/canonical";

/**
 * The canonical contract. The defect these close: no canonical on the product pages, and a RELATIVE one
 * on the 24 rule pages (the root layout never set `metadataBase`), so Search Console read
 * "User-declared canonical: None" and Google chose the preferred URL itself.
 */
describe("canonical metadata", () => {
  it("emits an ABSOLUTE canonical for an advertised path", () => {
    expect(canonicalMetadata("/ledgerlink")).toEqual({
      alternates: { canonical: `${SITE_ORIGIN}/ledgerlink` },
    });
    expect(canonicalMetadata("/showcase").alternates?.canonical).toBe(`${SITE_ORIGIN}/showcase`);
  });

  it("covers every advertised URL — the map and the canonical set are the same set", () => {
    const paths = new Set(canonicalPaths);
    for (const url of crawlableUrls()) {
      expect(paths.has(new URL(url).pathname), url).toBe(true);
    }
    expect(canonicalPaths.length).toBe(new Set(canonicalPaths).size);
  });

  it("refuses a page that is not advertised, so no route invents a canonical", () => {
    expect(() => canonicalMetadata("/billing")).toThrow(/not in the crawl map/);
    expect(() => canonicalMetadata("/embed/countdown")).toThrow(/not in the crawl map/);
  });

  it("refuses a capitalised path — the exact defect the reader sitemap shipped as 404s", () => {
    expect(() => canonicalMetadata("/LedgerLink")).toThrow(/capital letter/);
  });
});
