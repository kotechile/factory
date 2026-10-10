import type { MetadataRoute } from "next";

import { crawlableEntries } from "@/lib/seo/crawlMap";

/**
 * Served at `/sitemap.xml`. The URL set is derived in `src/lib/seo/crawlMap.ts` — the registry's
 * in-inventory products plus each product's own pSEO preset modules — so a retired product is absent
 * by construction rather than by someone remembering to delete a line (the host answered 404 for this
 * route until 2026-10-10, which is why none of the product pages were crawlable).
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return crawlableEntries().map((entry) => ({
    url: entry.url,
    changeFrequency: entry.changeFrequency,
    priority: entry.priority,
  }));
}
