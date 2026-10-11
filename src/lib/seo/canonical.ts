/**
 * Canonicals for the surfaces this host advertises — absolute, and validated against the crawl map.
 *
 * Why (owner-approved, 2026-10-10): the product pages declared no canonical at all, and the 24 rule pages
 * declared a RELATIVE one (`href="/parcelproof/calc/…"`), because the root layout never set `metadataBase`.
 * A relative canonical is not a canonical: it is ignored, so every one of those pages was leaving the
 * choice of preferred URL to Google while Search Console reported "User-declared canonical: None".
 *
 * The path must be a URL the crawl map advertises (`src/lib/seo/crawlMap.ts`). That is the point: the set
 * of pages allowed to declare themselves canonical is exactly the set we publish in the sitemap, so a new
 * page cannot quietly canonicalise a route nobody can discover, and a capitalised path (a 404 on this
 * case-sensitive host) fails the build instead of shipping.
 */
import type { Metadata } from "next";

import { SITE_ORIGIN, crawlableUrls } from "./crawlMap";

/** Paths of every advertised URL, derived once from the same source the sitemap reads. */
const CRAWLABLE_PATHS: readonly string[] = crawlableUrls().map((url) => new URL(url).pathname);

/**
 * The metadata a page spreads in to declare itself the canonical URL for its own path.
 *
 * Absolute by construction — `alternates.canonical` is emitted as the full production URL rather than
 * relying on `metadataBase` to resolve it, so no rendering path can produce a relative `href` again.
 */
export function canonicalMetadata(path: string): Metadata {
  if (!path.startsWith("/")) {
    throw new Error(`canonical: "${path}" must be an absolute path starting with "/"`);
  }
  if (path !== path.toLowerCase()) {
    throw new Error(
      `canonical: "${path}" contains a capital letter — this host's routes are case-sensitive and a ` +
        `capitalised path answers 404 (the reader sitemap shipped five of those).`,
    );
  }
  if (!CRAWLABLE_PATHS.includes(path)) {
    throw new Error(
      `canonical: "${path}" is not in the crawl map (src/lib/seo/crawlMap.ts). Only an advertised page may ` +
        `declare itself canonical — add it to the map, or do not canonicalise it.`,
    );
  }
  return { alternates: { canonical: `${SITE_ORIGIN}${path}` } };
}

/** Exposed for the guard tests: the paths allowed to declare a canonical. */
export const canonicalPaths: readonly string[] = CRAWLABLE_PATHS;
