import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  async redirects() {
    return [
      {
        // QuarterLine is retired (owner call, 2026-10-05): its 20 programmatic-SEO preset pages are
        // withdrawn rather than left indexable behind a calculator nobody can buy. A config-level 301
        // is the retirement mechanism — the preset route no longer exists in the app, so a re-added
        // route is a visible change, and `tests/e2e/landing.spec.ts` fails if any published preset
        // slug stops redirecting.
        //
        // The slugs themselves stay enumerated in `src/lib/seo/presets.ts` as the record of what was
        // published; that module's only consumer now is the guard test.
        source: "/quarterline/calc/:slug",
        destination: "/showcase",
        permanent: true,
      },
      {
        // Pre-subpath pSEO URLs of the same retired set — straight to the directory (was
        // /quarterline/calc/:slug, which would now be a two-hop chain).
        source: "/calc/:slug",
        destination: "/showcase",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
