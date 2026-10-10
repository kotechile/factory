import type { MetadataRoute } from "next";

import { SITE_ORIGIN } from "@/lib/seo/crawlMap";

/**
 * Served at `/robots.txt`. It exists because the host answered **404** for it, which left every
 * product page and rule page unmapped (owner-approved build, 2026-10-10). The map itself is derived
 * in `src/lib/seo/crawlMap.ts` from the registry and the products' own preset modules.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // The JSON API and the customer billing portal are not content — nothing under /api/ belongs
        // in an index. /embed/ stays allowed: third parties embed those widgets on their own pages.
        disallow: ["/api/"],
      },
    ],
    sitemap: `${SITE_ORIGIN}/sitemap.xml`,
    host: SITE_ORIGIN,
  };
}
