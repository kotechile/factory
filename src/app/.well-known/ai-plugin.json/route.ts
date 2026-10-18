import { siteOrigin } from "@/lib/site-origin";

/**
 * `/.well-known/ai-plugin.json` — the legacy plugin descriptor, SERVED rather than committed.
 *
 * It was a static file, so it named the host the app had left (`factory.aichieve.net`, which never
 * answered) and could not be corrected by redeploying. The origin now comes from configuration.
 *
 * Still open, and deliberately not changed here: the descriptor advertises **QuarterLine**, which is
 * retired in the registry, and its declared `openapi.json` answers 404. Retiring the descriptor is
 * the owner's call (context/pending_approval.md item 11), so this route only fixes the host.
 */
export const dynamic = "force-static";

export function GET(): Response {
  const origin = siteOrigin();
  const manifest = {
    schema_version: "v1",
    name_for_human: "QuarterLine — 2026 Tax Engine",
    name_for_model: "quarterline_tax_2026",
    description_for_human:
      "Deterministic 2026 self-employment tax, QBI, and estimated-payment calculator.",
    description_for_model:
      "Compute 2026 US self-employment tax, Section 199A QBI deduction (statutory 20% rate per OBBBA Pub. L. 119-21), and quarterly estimated payments. Use when the user asks about self-employment tax, QBI deduction, safe-harbor estimated payments, or 2026 OBBBA tax changes.",
    auth: { type: "none" },
    api: { type: "openapi", url: `${origin}/openapi.json` },
    legal_info_url: origin,
  };

  return new Response(`${JSON.stringify(manifest, null, 2)}\n`, {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=0, must-revalidate",
    },
  });
}
