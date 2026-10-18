/**
 * The product host's crawlable inventory — DERIVED from the registry and the products' own pSEO
 * preset modules, never hand-listed.
 *
 * Why this module exists (owner-approved build, 2026-10-10): the product host's `/robots.txt` and
 * `/sitemap.xml` both answered **404**, so every product page and every rule page was indexable but
 * unmapped — the only way to reach one was to already know its URL. Google's own index showed the
 * cost: `/showcase` was indexed, while `/spendproof` and `/ledgerlink` came back "URL is unknown to
 * Google".
 *
 * Deriving it is what keeps it honest. A product retired in the registry drops out of the map (and
 * so do its rule pages), a new product appears the moment its entry lands, and a new preset appears
 * because its module is listed here. Nothing needs to remember to edit a static list, and
 * `crawlMap.test.ts` fails the build when the map and those sources disagree.
 *
 * No `lastModified` is emitted: the map does not know when a page really changed, and a fabricated
 * date is worse than an absent one (factory rule: never fabricate a signal).
 */
import { activeProducts } from "@/products/registry";
import { parcelauditPresets } from "@/lib/seo/parcelaudit/presets";
import { caseproofPresets } from "@/lib/seo/caseproof/presets";
import { einvoicePresets } from "@/lib/seo/einvoice/presets";
import { siteOrigin } from "@/lib/site-origin";

/** Sitemap hint vocabulary (Next's MetadataRoute uses the same strings). */
export type ChangeFrequency = "daily" | "weekly" | "monthly";

/**
 * The origin this deploy serves from — ONE value, resolved from configuration (src/lib/site-origin.ts)
 * so a URL in the map can never name a host other than the one answering. It is a constant per build:
 * NEXT_PUBLIC_APP_URL is inlined at build time, so a domain move takes a redeploy (Coolify does that on
 * every push) and never a source edit in fifteen files.
 */
export const SITE_ORIGIN = siteOrigin();

/** Public static routes: the directory a visitor (and a crawler) reaches a product from. */
const STATIC_ROUTES: readonly {
  path: string;
  changeFrequency: ChangeFrequency;
  priority: number;
}[] = [{ path: "/showcase", changeFrequency: "daily", priority: 0.9 }];

/**
 * Each product's rule pages, keyed by the product's own slug. The pages are served under
 * `<product.route>/calc/<preset.slug>` (`src/app/<product>/calc/[slug]/page.tsx`). A product with no
 * preset module simply contributes its own route.
 */
const RULE_PAGES: Record<string, readonly { slug: string }[]> = {
  parcelproof: parcelauditPresets,
  facturgate: einvoicePresets,
  caseproof: caseproofPresets,
};

export interface CrawlEntry {
  url: string;
  changeFrequency: ChangeFrequency;
  priority: number;
}

/**
 * A stale key here is a silent hole: it would advertise rule pages for a product that is no longer
 * in inventory (or drop them without a word). Throwing is the explicit failure the repo's rules ask
 * for — the same reason the checkout route rejects a retired slug instead of defaulting.
 */
export function assertRulePageOwners(): void {
  const inInventory = new Set(activeProducts.map((product) => product.slug));
  for (const slug of Object.keys(RULE_PAGES)) {
    if (!inInventory.has(slug)) {
      throw new Error(
        `crawlMap: RULE_PAGES names "${slug}", which is not an in-inventory product. A retired ` +
          `product's rule pages must not be advertised — remove the entry when the product is retired.`,
      );
    }
  }
}

export function crawlableEntries(): CrawlEntry[] {
  assertRulePageOwners();

  const entries: CrawlEntry[] = STATIC_ROUTES.map(({ path, changeFrequency, priority }) => ({
    url: `${SITE_ORIGIN}${path}`,
    changeFrequency,
    priority,
  }));

  for (const product of activeProducts) {
    entries.push({
      url: `${SITE_ORIGIN}${product.route}`,
      changeFrequency: "weekly",
      // A `beta` product is sellable but not launched: it stays crawlable and sorts lower.
      priority: product.status === "live" ? 0.9 : 0.5,
    });

    for (const preset of RULE_PAGES[product.slug] ?? []) {
      entries.push({
        url: `${SITE_ORIGIN}${product.route}/calc/${preset.slug}`,
        changeFrequency: "monthly",
        priority: 0.7,
      });
    }
  }

  return entries;
}

export function crawlableUrls(): string[] {
  return crawlableEntries().map((entry) => entry.url);
}
