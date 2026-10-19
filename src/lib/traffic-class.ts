/**
 * Internal-traffic marker (queue item `traffic-marker`, approved by the owner 2026-10-19).
 *
 * Our own browser suites, post-deploy probes, smoke scripts and the owner's own browser write
 * events into the SAME Supabase `events` table as real visitors. Before this module every sweep
 * could only report "0 provably external" — a metric that never moves, and a Day-30 verdict that
 * cannot be scored honestly (see context/pending_approval.md and the edge cases recorded in
 * skills/marketing_engineering_playbook.md).
 *
 * One classifier, decided at the write boundary and carried by every producer:
 *   - an explicit header  `x-factory-internal: 1`      → curl / node / metered-route probes
 *   - a cookie            `factory_internal=1`         → any browser we open (see
 *                                                        src/lib/telemetry-client.ts: visit any
 *                                                        page once with `?factory_internal=1`)
 *   - an automated UA     HeadlessChrome / Playwright / Puppeteer → a browser nobody is watching
 *
 * Everything else is a `visitor`. That default is deliberate: an unmarked request is counted as a
 * real person rather than silently dropped, because the failure this marker exists to prevent is
 * UNDER-counting real demand. Attribution is a classification, never a guess about who someone is,
 * so a request with no signal keeps the honest answer "we cannot tell" out of the metric only when
 * a producer forgot to mark itself — which the pre-marker rows still expose as `unclassified`.
 *
 * No silent fallbacks (factory rule 5): the marker value is a closed set, and neither a payload nor
 * a client may claim a class the server did not decide.
 */

export const INTERNAL_HEADER = "x-factory-internal";
export const INTERNAL_COOKIE = "factory_internal";
export const INTERNAL_QUERY_PARAM = "factory_internal";

/** A browser driven by an automated harness is not a person reading the page. */
export const AUTOMATED_UA_PATTERN =
  /HeadlessChrome|Playwright|Puppeteer|playwright\/|puppeteer\/|PhantomJS/i;

export type TrafficClass = "internal" | "visitor";

/** The only spellings a producer may use to *claim* internal traffic. Anything else is ignored. */
const INTERNAL_VALUES = new Set(["1", "true"]);

export interface TrafficSignals {
  /** Header accessor — `Headers`, `NextRequest.headers`, or a plain `get`. */
  headers?: { get(name: string): string | null };
  /** Raw `Cookie` header value, when the caller has one. */
  cookies?: string | null;
  /** Explicit UA, for callers holding it separately from the headers. */
  userAgent?: string | null;
}

function isInternalValue(value: string | null | undefined): boolean {
  return !!value && INTERNAL_VALUES.has(value.trim().toLowerCase());
}

/** Reads one cookie out of a raw `Cookie` header without pulling in a cookie parser. */
export function readCookie(cookieHeader: string | null | undefined, name: string): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() !== name) continue;
    try {
      return decodeURIComponent(part.slice(eq + 1).trim());
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Classifies one request. Order matters only for cost: the explicit claims are checked first
 * (cheapest and unambiguous), the automated-UA signature last — a headless browser that forgot to
 * set the header is still our own test run, not a visitor.
 */
export function classifyTraffic(signals: TrafficSignals): TrafficClass {
  const header = signals.headers?.get(INTERNAL_HEADER);
  if (isInternalValue(header)) return "internal";

  const cookie =
    readCookie(signals.cookies, INTERNAL_COOKIE) ??
    readCookie(signals.headers?.get("cookie"), INTERNAL_COOKIE);
  if (isInternalValue(cookie)) return "internal";

  const ua = signals.userAgent ?? signals.headers?.get("user-agent");
  if (ua && AUTOMATED_UA_PATTERN.test(ua)) return "internal";

  return "visitor";
}

/** Convenience for a Next route handler: reads headers, cookies and UA off the request. */
export function classifyRequest(request: {
  headers: { get(name: string): string | null };
}): TrafficClass {
  return classifyTraffic({
    headers: request.headers,
    cookies: request.headers.get("cookie"),
    userAgent: request.headers.get("user-agent"),
  });
}
