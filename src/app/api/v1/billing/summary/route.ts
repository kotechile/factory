import { type NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe/client";
import { isStripeConfigured } from "@/lib/stripe/mode";
import { customerIdFrom, getMonthlyCap, getPeriodUsage } from "@/lib/billing/ledger";
import { capFraction, remainingUsd } from "@/lib/billing/periods";

/**
 * GET /api/v1/billing/summary — a customer's own period usage and cap (V1.3).
 *
 * Identity is the same capability the billing portal uses: the Stripe customer id the customer
 * holds in their emailed link (`?customer_id=cus_…` or the `x-customer-id` header), and the id is
 * checked to be a REAL Stripe customer so a guess cannot read a ledger. There is no login system
 * yet — when one ships, this endpoint should read the session instead.
 */

const CUSTOMER_ID_PATTERN = /^cus_[A-Za-z0-9]+$/;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const customerId = (searchParams.get("customer_id") || customerIdFrom(req) || "").trim();

    if (!customerId) {
      return NextResponse.json(
        { error: "Missing customer id. Pass ?customer_id=cus_… or the x-customer-id header." },
        { status: 401 },
      );
    }
    if (!CUSTOMER_ID_PATTERN.test(customerId)) {
      return NextResponse.json(
        { error: "customer_id must be a Stripe customer id (cus_…)." },
        { status: 400 },
      );
    }
    if (!isStripeConfigured()) {
      return NextResponse.json(
        { error: "Billing is not configured on this deploy." },
        { status: 500 },
      );
    }

    try {
      const customer = await getStripe().customers.retrieve(customerId);
      if ((customer as { deleted?: boolean }).deleted) {
        return NextResponse.json({ error: "That Stripe customer no longer exists." }, { status: 404 });
      }
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code === "resource_missing") {
        return NextResponse.json({ error: "No such Stripe customer." }, { status: 404 });
      }
      throw err;
    }

    const capUsd = await getMonthlyCap(customerId);
    const { periodStart, periodEnd, summary } = await getPeriodUsage(customerId);

    return NextResponse.json({
      customer_id: customerId,
      period_start: periodStart,
      period_end: periodEnd,
      queries: summary.queries,
      usage_usd: summary.amountUsd,
      cap_usd: capUsd,
      remaining_usd: remainingUsd(summary.amountUsd, capUsd),
      cap_fraction: capFraction(summary.amountUsd, capUsd),
      history: summary.history,
    });
  } catch (err) {
    console.error("[billing] summary failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Billing summary failed" },
      { status: 500 },
    );
  }
}
