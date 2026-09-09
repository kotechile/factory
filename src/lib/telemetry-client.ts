"use client";

// Client-side growth telemetry: attaches a stable per-visitor session identifier so the
// Day 7/14/30 kill-scale gates can be evaluated on DISTINCT sessions (>=50 unique sessions)
// instead of raw page_view event counts. The id is a UUID persisted in a `ql_session_id`
// cookie (1 year) so repeat visits within the gate window still count as one visitor/session.
// Best-effort: never throws; failures are logged loudly, not swallowed.

const SESSION_COOKIE = "ql_session_id";
const SESSION_TTL_S = 60 * 60 * 24 * 365; // 1 year

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : null;
}

function writeSessionCookie(value: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${SESSION_COOKIE}=${encodeURIComponent(value)}; path=/; max-age=${SESSION_TTL_S}; samesite=lax`;
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
  writeSessionCookie(id);
  return id;
}

/**
 * Posts a growth event to /api/events. Every event carries `session_id` in its payload so
 * growth-check.mjs can tally distinct sessions/visitors for the kill/scale gates.
 * `product` is omitted when undefined (server defaults to "quarterline").
 */
export function trackEvent(
  event: string,
  payload: Record<string, unknown> = {},
  product?: string,
) {
  const sessionId = getSessionId();
  return fetch("/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      event,
      product,
      payload: { session_id: sessionId, ...payload },
    }),
  }).catch((err) => console.error("[telemetry] client track failed:", err));
}
