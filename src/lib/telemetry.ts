import { createAdminClient } from "@/lib/supabase";

const PRODUCT = "quarterline";

/**
 * Records a growth/analytics event to Supabase `events` for the kill/scale gates.
 * Server-side only (uses the service-role client). Telemetry is best-effort:
 * it must never break the product, but failures are logged loudly, not swallowed.
 */
export async function track(
  event: string,
  payload: Record<string, unknown> = {},
): Promise<void> {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("events")
      .insert({ event, product: PRODUCT, payload });
    if (error) {
      console.error(`[telemetry] insert failed for "${event}":`, error.message);
    }
  } catch (err) {
    console.error(`[telemetry] track failed for "${event}":`, err);
  }
}
