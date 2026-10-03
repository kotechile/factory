import { getStripe } from "./client";

/**
 * Stripe metered billing — the "cents" model.
 *
 * Stripe binds a Billing Meter to ONE event name and a Price to ONE unit amount, so the previous
 * design (a distinct event name per tool, each reporting `value: 1`) could not be invoiced without
 * a meter and a price per tool. Instead, every metered call reports a single event name with
 * `value` = the amount owed **in integer cents**, a meter that SUMS the value, and one Price of
 * $0.01 per unit. A $0.25 query reports 25; a $0.05 query reports 5. Per-tool detail stays in our
 * own usage ledger (`public.events`, payload.tool / payload.cost_usd), which is the customer-facing
 * record; Stripe only needs the money.
 *
 * The event name must match the meter's `event_name` exactly — it is config, so it is overridable
 * with STRIPE_METER_EVENT_NAME rather than baked in.
 */
export const DEFAULT_METER_EVENT_NAME = "factory_agent_usage";

/** The meter event name every metered tool reports under (env-overridable). */
export function meterEventName(): string {
  const raw = process.env.STRIPE_METER_EVENT_NAME?.trim();
  return raw ? raw : DEFAULT_METER_EVENT_NAME;
}

export interface MeterUsageParams {
  customerId: string;
  /** The amount owed for this call, in integer cents (e.g. 25 for $0.25). */
  valueCents: number;
  timestamp?: Date;
  eventName?: string;
}

export interface MeterUsageResult {
  success: boolean;
  timestamp: number;
  eventId?: string;
  valueCents: number;
}

/**
 * Reports metered usage for one agent call. Records a Stripe Billing Meter Event whose value is the
 * charge in cents.
 *
 * Throws on a non-positive or non-integer amount rather than reporting a wrong figure — a silent
 * `value: 0` (or a fractional cent) would quietly under- or mis-bill (AGENTS.md rule 5).
 */
export async function reportMeteredUsage({
  customerId,
  valueCents,
  timestamp = new Date(),
  eventName = meterEventName(),
}: MeterUsageParams): Promise<MeterUsageResult> {
  if (!Number.isInteger(valueCents) || valueCents <= 0) {
    throw new Error(
      `Metered usage value must be a positive integer number of cents; got ${valueCents}.`,
    );
  }

  const stripe = getStripe();
  const unixTimestamp = Math.floor(timestamp.getTime() / 1000);

  const meterEvent = await stripe.billing.meterEvents.create({
    event_name: eventName,
    payload: {
      stripe_customer_id: customerId,
      value: valueCents.toString(),
    },
    timestamp: unixTimestamp,
  });

  return {
    success: true,
    timestamp: unixTimestamp,
    eventId: meterEvent.identifier,
    valueCents,
  };
}
