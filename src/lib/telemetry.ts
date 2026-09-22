import { createAdminClient } from "@/lib/supabase";
import { defaultInventoryProduct } from "@/products/registry";

/**
 * Attribution for a caller that names no product: the first product still `live` in the registry.
 * This was the literal "quarterline", which outlived that product's retirement and kept writing
 * events under a retired product (see context/pending_approval.md item 8).
 */
const DEFAULT_PRODUCT = defaultInventoryProduct?.slug ?? "factory";

/**
 * Records a growth/analytics event to Supabase `events` for the kill/scale gates.
 * Server-side only (uses the service-role client). Telemetry is best-effort:
 * it must never break the product, but failures are logged loudly, not swallowed.
 */
export async function track(
  event: string,
  payload: Record<string, unknown> = {},
  product: string = DEFAULT_PRODUCT,
): Promise<void> {
  try {
    const supabase = createAdminClient();
    // Unique-visitor instrumentation: the client attaches a `session_id` to every event's
    // payload (see src/lib/telemetry-client.ts) so the Day-7/14/30 gates can count DISTINCT
    // sessions rather than raw page_view rows. We promote it to the dedicated `session_id`
    // column (added by supabase/migrations/0002_events_session_id.sql); if that migration has
    // NOT been applied yet, we degrade to payload-only so telemetry never breaks.
    const sessionId = typeof payload?.session_id === "string" ? payload.session_id : null;
    const row: Record<string, unknown> = { event, product, payload };
    if (sessionId) row.session_id = sessionId;

    const { error } = await supabase.from("events").insert(row);
    if (error) {
      const msg = error.message ?? "";
      if (
        sessionId &&
        /session_id|column .*(does not exist|not exist)|undefined column/i.test(msg)
      ) {
        // session_id column absent (migration 0002 pending) — retry payload-only insert.
        const retry = await supabase.from("events").insert({ event, product, payload });
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
