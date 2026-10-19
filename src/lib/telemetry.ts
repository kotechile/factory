import { createAdminClient } from "@/lib/supabase";
import { defaultInventoryProduct } from "@/products/registry";
import type { TrafficClass } from "@/lib/traffic-class";

/**
 * Attribution for a caller that names no product: the first product still `live` in the registry.
 * This was the literal "quarterline", which outlived that product's retirement and kept writing
 * events under a retired product (see context/pending_approval.md item 8).
 */
const DEFAULT_PRODUCT = defaultInventoryProduct?.slug ?? "factory";

/**
 * The internal-traffic marker's column (supabase/migrations/0004_events_traffic_class.sql).
 * A pre-marker row carries NULL, which is the honest answer: we cannot attribute it.
 */
export const TRAFFIC_CLASS_COLUMN = "traffic_class";

/**
 * Set once an insert PROVES the column is missing (migration 0004 not applied in this project).
 * Process-lifetime, so the pending migration is logged loudly once instead of on every event, and
 * later inserts skip the column — the class still lands in `payload` (see buildEventRow), so the
 * metric is honest either way. A redeploy re-detects.
 */
let trafficClassColumnReady = true;

/**
 * Builds one `events` row. Exported so the marker's contract is testable without a database: the
 * class is decided by the SERVER (`traffic` argument), mirrored into `payload.traffic_class` so it
 * survives while migration 0004 is still pending, and a caller-supplied `traffic_class` in the
 * payload is overwritten rather than trusted.
 */
export function buildEventRow(
  event: string,
  payload: Record<string, unknown>,
  product: string,
  traffic: TrafficClass,
  sessionId: string | null,
): Record<string, unknown> {
  const row: Record<string, unknown> = {
    event,
    product,
    payload: { ...payload, [TRAFFIC_CLASS_COLUMN]: traffic },
    [TRAFFIC_CLASS_COLUMN]: traffic,
  };
  if (sessionId) row.session_id = sessionId;
  return row;
}

/**
 * Records a growth/analytics event to Supabase `events` for the kill/scale gates.
 * Server-side only (uses the service-role client). Telemetry is best-effort:
 * it must never break the product, but failures are logged loudly, not swallowed.
 *
 * `traffic` is the classification of the CALLING request (src/lib/traffic-class.ts) — our browser
 * suites, probes and the owner's own browser are `internal`, everyone else is a `visitor`. It
 * defaults to `visitor` so a producer that forgets the marker over-counts rather than hides demand.
 */
export async function track(
  event: string,
  payload: Record<string, unknown> = {},
  product: string = DEFAULT_PRODUCT,
  traffic: TrafficClass = "visitor",
): Promise<void> {
  try {
    const supabase = createAdminClient();
    // Unique-visitor instrumentation: the client attaches a `session_id` to every event's
    // payload (see src/lib/telemetry-client.ts) so the Day-7/14/30 gates can count DISTINCT
    // sessions rather than raw page_view rows. We promote it to the dedicated `session_id`
    // column (added by supabase/migrations/0002_events_session_id.sql).
    const sessionId = typeof payload?.session_id === "string" ? payload.session_id : null;
    const row = buildEventRow(event, payload, product, traffic, sessionId);
    if (!trafficClassColumnReady) delete row[TRAFFIC_CLASS_COLUMN];

    const { error } = await supabase.from("events").insert(row);
    if (error) {
      const msg = error.message ?? "";
      // Strip ONLY the column the error names: a pending migration must not cost the other one
      // (the first attempt at this shipped that bug — a missing `traffic_class` silently dropped
      // `session_id` too, so the unique-session metric went blind while the row still looked fine).
      const missingSession = !!sessionId && /session_id/i.test(msg);
      // NOT gated on the flag: two events can be in flight together, so the flag may already have
      // been flipped by the sibling call whose error we are racing — gating on it sent that call to
      // the "unrelated error" branch and dropped its row (observed in the e2e run).
      const missingTraffic = new RegExp(TRAFFIC_CLASS_COLUMN, "i").test(msg);
      if (missingSession || missingTraffic) {
        if (missingTraffic) trafficClassColumnReady = false;
        const pending: string[] = [];
        if (missingSession) pending.push("0002_events_session_id.sql");
        if (missingTraffic) pending.push("0004_events_traffic_class.sql");
        // Loud, not silent: the exact migration an operator has to run in the Supabase SQL editor.
        console.warn(
          `[telemetry] migration pending (${pending.join(", ")}) — retrying "${event}" without that column; the value stays in payload`,
        );
        const fallback: Record<string, unknown> = { ...row };
        if (missingSession) delete fallback.session_id;
        if (missingTraffic) delete fallback[TRAFFIC_CLASS_COLUMN];
        const retry = await supabase.from("events").insert(fallback);
        if (retry.error) {
          console.error(`[telemetry] insert failed for "${event}" (column fallback):`, retry.error.message);
        }
      } else {
        console.error(`[telemetry] insert failed for "${event}":`, error.message);
      }
    }
  } catch (err) {
    console.error(`[telemetry] track failed for "${event}":`, err);
  }
}
