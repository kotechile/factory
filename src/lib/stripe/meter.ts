import { getStripe } from "./client";

export interface MeterUsageParams {
  customerId: string;
  eventName?: string;
  value?: number;
  timestamp?: Date;
}

export interface MeterUsageResult {
  success: boolean;
  timestamp: number;
  eventId?: string;
}

/**
 * Reports metered usage for the agent tier ($0.25/query).
 * Records an event in Stripe Billing Meter Events.
 */
export async function reportMeteredUsage({
  customerId,
  eventName = "agent_query",
  value = 1,
  timestamp = new Date(),
}: MeterUsageParams): Promise<MeterUsageResult> {
  const stripe = getStripe();
  const unixTimestamp = Math.floor(timestamp.getTime() / 1000);

  const meterEvent = await stripe.billing.meterEvents.create({
    event_name: eventName,
    payload: {
      stripe_customer_id: customerId,
      value: value.toString(),
    },
    timestamp: unixTimestamp,
  });

  return {
    success: true,
    timestamp: unixTimestamp,
    eventId: meterEvent.identifier,
  };
}
