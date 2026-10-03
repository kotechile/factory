import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe/client";

function getOrigin(req: NextRequest): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }
  const forwardedHost = req.headers.get("x-forwarded-host");
  const forwardedProto = req.headers.get("x-forwarded-proto") || "https";
  if (forwardedHost && !forwardedHost.includes("0.0.0.0") && !forwardedHost.includes("127.0.0.1")) {
    return `${forwardedProto}://${forwardedHost}`;
  }
  return "https://apps.giniloh.com";
}

/**
 * Resolves the customer a billing-portal session may be opened for.
 *
 * SECURITY (2026-10-03): a portal session is a bearer capability into a customer's billing —
 * payment cards, invoices, subscription cancellation. It is therefore resolved ONLY from an
 * explicit, high-entropy reference that the customer already holds in their own emailed link:
 * a Stripe customer id (`cus_…`) or a Checkout session id (`cs_…`).
 *
 * It must NEVER be resolved from an email address, nor from "the newest active subscription".
 * Both are enumerable: either one let any caller open another customer's portal. See
 * context/pending_approval.md (billing v1, defect D1) and
 * context/recon_proposals/2026-10-03_factory_billing_v1.md §1.
 *
 * This is a capability check, not an authentication system — a real login (session-scoped
 * customer) is the v1 follow-up. Until then the emailed link is the credential.
 */
const CUSTOMER_ID_PATTERN = /^cus_[A-Za-z0-9]+$/;

function isCustomerId(value: string | null): value is string {
  return typeof value === "string" && CUSTOMER_ID_PATTERN.test(value.trim());
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    let customerId = searchParams.get("customer_id");
    const sessionId = searchParams.get("session_id");
    const stripe = getStripe();

    if (!isCustomerId(customerId) && sessionId) {
      try {
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        customerId =
          typeof session.customer === "string" ? session.customer : session.customer?.id || null;
      } catch (err) {
        console.warn("Could not retrieve session in portal handler:", err);
      }
    }

    if (!isCustomerId(customerId)) {
      // No usable customer reference in the link. Do NOT guess one (no silent fallback, rule 5):
      // the old code fell back to the newest active subscription, which handed any caller another
      // customer's billing portal.
      return NextResponse.redirect(
        `${getOrigin(req)}/billing?error=missing_customer_reference`,
      );
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${getOrigin(req)}/billing`,
    });

    return NextResponse.redirect(portalSession.url);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create portal session";
    console.error("Stripe portal error:", message);
    return NextResponse.redirect(`${getOrigin(req)}/billing?error=portal_failed`);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId } = body;
    let customerId = typeof body.customerId === "string" ? body.customerId : null;
    const stripe = getStripe();

    if (!isCustomerId(customerId) && sessionId) {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      customerId =
        typeof session.customer === "string" ? session.customer : session.customer?.id || null;
    }

    // A customer is opened only from a `cus_…` capability — never from an email (removed
    // 2026-10-03: `{ email }` resolved any address to its Stripe customer and opened their
    // portal for anyone who typed it).
    if (!isCustomerId(customerId)) {
      return NextResponse.json(
        {
          error:
            "A Stripe customer ID (cus_…) or checkout session ID is required. Open the billing link from your receipt email.",
        },
        { status: 400 },
      );
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${getOrigin(req)}/billing`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create portal session";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
