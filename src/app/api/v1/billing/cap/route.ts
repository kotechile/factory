import { type NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe/client";
import { isStripeConfigured } from "@/lib/stripe/mode";
import { customerIdFrom, getMonthlyCap, setMonthlyCap } from "@/lib/billing/ledger";

/**
 * GET/POST /api/v1/billing/cap — read or set a customer's monthly spending cap (V1.2/V1.4).
 *
 * Same capability model as the summary endpoint (a real `cus_…` the customer holds). The cap is
 * what the metered agent path is enforced against, so setting it to 0 blocks all spend.
 */

const CUSTOMER_ID_PATTERN = /^cus_[A-Za-z0-9]+$/;
const MAX_CAP_USD = 100_000;

type Resolved = { ok: true; customerId: string } | { ok: false; response: NextResponse };

async function resolveVerifiedCustomerId(rawInput: string | null | undefined): Promise<Resolved> {
  const customerId = (rawInput || "").trim();
  if (!customerId) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Missing customer id. Pass ?customer_id=cus_… or the x-customer-id header." },
        { status: 401 },
      ),
    };
  }
  if (!CUSTOMER_ID_PATTERN.test(customerId)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "customer_id must be a Stripe customer id (cus_…)." },
        { status: 400 },
      ),
    };
  }
  if (!isStripeConfigured()) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Billing is not configured on this deploy." },
        { status: 500 },
      ),
    };
  }
  try {
    const customer = await getStripe().customers.retrieve(customerId);
    if ((customer as { deleted?: boolean }).deleted) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: "That Stripe customer no longer exists." },
          { status: 404 },
        ),
      };
    }
  } catch (err) {
    if ((err as { code?: string }).code === "resource_missing") {
      return {
        ok: false,
        response: NextResponse.json({ error: "No such Stripe customer." }, { status: 404 }),
      };
    }
    throw err;
  }
  return { ok: true, customerId };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const resolved = await resolveVerifiedCustomerId(
      searchParams.get("customer_id") || customerIdFrom(req),
    );
    if (!resolved.ok) return resolved.response;

    const capUsd = await getMonthlyCap(resolved.customerId);
    return NextResponse.json({ customer_id: resolved.customerId, cap_usd: capUsd });
  } catch (err) {
    console.error("[billing] cap read failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Billing cap read failed" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { customer_id?: string; monthly_cap_usd?: unknown };
    const resolved = await resolveVerifiedCustomerId(body.customer_id ?? customerIdFrom(req));
    if (!resolved.ok) return resolved.response;

    const raw = body.monthly_cap_usd;
    if (typeof raw !== "number" || !Number.isFinite(raw)) {
      return NextResponse.json(
        { error: "monthly_cap_usd must be a number of US dollars (0 to 100000)." },
        { status: 400 },
      );
    }
    if (raw < 0 || raw > MAX_CAP_USD) {
      return NextResponse.json(
        { error: `monthly_cap_usd must be between 0 and ${MAX_CAP_USD}.` },
        { status: 400 },
      );
    }

    const capUsd = await setMonthlyCap(resolved.customerId, raw);
    return NextResponse.json({ customer_id: resolved.customerId, cap_usd: capUsd });
  } catch (err) {
    console.error("[billing] cap write failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Billing cap write failed" },
      { status: 500 },
    );
  }
}
