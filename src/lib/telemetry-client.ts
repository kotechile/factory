"use client";

// Client-side growth telemetry: attaches a stable per-visitor session identifier so the
// Day 7/14/30 kill-scale gates can be evaluated on DISTINCT sessions (>=50 unique sessions)
// instead of raw page_view event counts. The id is a UUID persisted in a `ql_session_id`
// cookie (1 year) so repeat visits within the gate window still count as one visitor/session.
// Best-effort: never throws; failures are logged loudly, not swallowed.
//
// Internal-traffic marker (src/lib/traffic-class.ts): this browser is marked INTERNAL when it
// carries the `factory_internal=1` cookie, or when the current URL names it —
// `https://apps.aichieve.net/showcase?factory_internal=1`. That is how any of our own browsers
// (the owner's included) is excluded from the visitor count: visit once, the cookie persists for a
// year, and every event this page posts from then on says `internal`. Nothing is guessed.

const SESSION_COOKIE = "ql_session_id";
const INTERNAL_COOKIE = "factory_internal";
const INTERNAL_PARAM = "factory_internal";
const INTERNAL_HEADER = "x-factory-internal";
const SESSION_TTL_S = 60 * 60 * 24 * 365; // 1 year

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : null;
}

function writeCookie(name: string, value: string, ttlSeconds: number) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${ttlSeconds}; samesite=lax`;
}

/** Returns the stable per-visitor session id, generating + persisting it on first use. */
export function getSessionId(): string {
  if (typeof window === "undefined") return "";
  const existing = readCookie(SESSION_COOKIE);
  if (existing) return existing;
  const id =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  writeCookie(SESSION_COOKIE, id, SESSION_TTL_S);
  return id;
}

/**
 * True when this browser is marked as internal traffic. A `?factory_internal=1` in the current URL
 * marks it permanently (cookie, 1 year) — the server decides the class from that cookie or from the
 * request header this module adds; the query param itself is never trusted by the server.
 */
export function isInternalBrowser(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const url = new URL(window.location.href);
    if (url.searchParams.get(INTERNAL_PARAM) === "1") {
      writeCookie(INTERNAL_COOKIE, "1", SESSION_TTL_S);
      return true;
    }
  } catch {
    // A malformed location is not worth breaking telemetry over; fall back to the cookie.
  }
  return readCookie(INTERNAL_COOKIE) === "1";
}

/**
 * Posts a growth event to /api/events. Every event carries `session_id` in its payload so
 * growth-check.mjs can tally distinct sessions/visitors for the kill/scale gates, and carries the
 * internal marker on the request (never in the body) when this browser is one of ours.
 * `product` is omitted when undefined (the server resolves the default).
 */
export function trackEvent(
  event: string,
  payload: Record<string, unknown> = {},
  product?: string,
) {
  const sessionId = getSessionId();
  const internal = isInternalBrowser();
  return fetch("/api/events", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(internal ? { [INTERNAL_HEADER]: "1" } : {}),
    },
    body: JSON.stringify({
      event,
      product,
      payload: { session_id: sessionId, ...payload },
    }),
  }).catch((err) => console.error("[telemetry] client track failed:", err));
}
