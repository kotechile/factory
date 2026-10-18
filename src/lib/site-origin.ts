/**
 * The deploy's public origin — the ONE place a host is decided.
 *
 * The app is served from whatever domain the PaaS attached to it: today `apps.aichieve.net` (the
 * enterprise door). A second door for personal tools would be the same repo deployed again under a
 * different domain. The origin is therefore configuration, never a literal.
 *
 * Why this module exists (defect, measured 2026-10-18): the app moved from `apps.giniloh.com` to
 * `apps.aichieve.net` and 24 hardcoded references stayed behind — the sitemap advertised 30 URLs on
 * a host that 503s, `/showcase` declared a dead canonical, the WebMCP descriptor sent agents to a
 * dead endpoint, and `NEXT_PUBLIC_APP_URL` fed Stripe's success/cancel redirects a dead host. Every
 * one of those was invisible in the tree and wrong the moment DNS moved.
 *
 * `NEXT_PUBLIC_APP_URL` is the variable because the value must resolve in the BROWSER too: a client
 * component renders curl examples and an MCP config that embed the origin. Next inlines
 * `NEXT_PUBLIC_*` at build time, so the literal member expression below is deliberate — a dynamic
 * `process.env[key]` lookup is not inlined and would render `undefined` client-side.
 *
 * No fallback (factory rule 5): a missing or malformed origin throws. A deploy that cannot say where
 * it lives must fail, not advertise somebody else's address.
 */

/** The raw build-time value. `process.env.X` is inlined here — keep it a literal member expression. */
const RAW = process.env.NEXT_PUBLIC_APP_URL;

/** An absolute https origin, optional port, no path, no query. */
const HTTPS_ORIGIN = /^https:\/\/[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)*(?::\d{2,5})?$/;
/** The one exception: a developer's own machine. */
const LOCALHOST = /^http:\/\/localhost(?::\d{2,5})?$/;

/**
 * Validate and normalise an origin. Exported so the rules are testable without touching the env,
 * and so a second caller (a build script) can apply exactly the same rule.
 *
 * A trailing slash is stripped rather than rejected — it is the same origin and every consumer
 * concatenates a path onto it. Anything else that is not a bare origin throws with the reason.
 */
export function resolveSiteOrigin(raw: string | undefined): string {
  const value = (raw ?? "").trim().replace(/\/+$/, "");
  if (!value) {
    throw new Error(
      "NEXT_PUBLIC_APP_URL is not set: the deploy cannot state its own public origin, which the " +
        "canonical, sitemap, robots host, WebMCP descriptor and Stripe redirects all read.",
    );
  }
  if (!HTTPS_ORIGIN.test(value) && !LOCALHOST.test(value)) {
    throw new Error(
      `NEXT_PUBLIC_APP_URL must be an absolute https origin with no path (an http://localhost ` +
        `origin is accepted for local development). Got ${JSON.stringify(raw)}.`,
    );
  }
  return value;
}

/** The origin this deploy serves from, e.g. `https://apps.aichieve.net`. */
export function siteOrigin(): string {
  return resolveSiteOrigin(RAW);
}

/** The bare host of this deploy, e.g. `apps.aichieve.net` — for copy that names the site. */
export function siteHost(): string {
  return siteOrigin().replace(/^https?:\/\//, "");
}

/**
 * An absolute URL on this deploy. The path must be site-relative: a caller passing an absolute URL
 * would produce a second, unconverted origin — the exact bug this module exists to prevent.
 */
export function siteUrl(path: string): string {
  if (!path.startsWith("/") || path.startsWith("//")) {
    throw new Error(`siteUrl() needs a site-relative path starting with '/'. Got ${JSON.stringify(path)}.`);
  }
  return `${siteOrigin()}${path}`;
}
