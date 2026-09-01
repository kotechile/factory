import { NextRequest, NextResponse } from "next/server";
import {
  selfEmployment2026Engine,
  calculateSelfEmployment2026,
  type SelfEmployment2026Input,
} from "@/lib/calc/selfEmployment2026";
import { reportMeteredUsage } from "@/lib/stripe/meter";
import { track } from "@/lib/telemetry";

export async function POST(req: NextRequest) {
  try {
    const input: SelfEmployment2026Input = await req.json();

    const validation = selfEmployment2026Engine.validate(input);
    if (!validation.valid) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.errors },
        { status: 400 },
      );
    }

    const result = calculateSelfEmployment2026(input);

    // Record the agent query for the growth kill/scale gates (best-effort).
    await track("agent_query", { tool: "calculate_self_employment_2026" });

    // If request contains Stripe Customer ID for agent billing, report $0.25 metered usage
    const customerId =
      req.headers.get("x-stripe-customer-id") ||
      req.headers.get("x-customer-id");

    let meteredUsageReported = false;
    let meterEventId: string | undefined;

    if (customerId && process.env.STRIPE_SECRET_KEY) {
      try {
        const meterResult = await reportMeteredUsage({
          customerId,
          eventName: "agent_tax_calculation",
          value: 1, // 1 query @ $0.25
        });
        meteredUsageReported = meterResult.success;
        meterEventId = meterResult.eventId;
      } catch (meterErr) {
        console.error("Failed to record metered usage:", meterErr);
      }
    }

    return NextResponse.json({
      success: true,
      data: result,
      metering: {
        meteredUsageReported,
        meterEventId,
        costPerQueryUsd: 0.25,
      },
      computedAt: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Agent calculation failure";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
