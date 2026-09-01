import { NextRequest, NextResponse } from "next/server";
import { createCheckoutSession } from "@/lib/stripe/checkout";

function getOrigin(req: NextRequest): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }
  if (process.env.APP_URL) {
    return process.env.APP_URL.replace(/\/$/, "");
  }

  const forwardedHost = req.headers.get("x-forwarded-host");
  const forwardedProto = req.headers.get("x-forwarded-proto") || "https";
  if (forwardedHost && !forwardedHost.includes("0.0.0.0") && !forwardedHost.includes("127.0.0.1")) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  const host = req.headers.get("host");
  if (host && !host.includes("0.0.0.0")) {
    const proto = host.includes("localhost") ? "http" : "https";
    return `${proto}://${host}`;
  }

  const reqOrigin = req.nextUrl.origin;
  if (reqOrigin && !reqOrigin.includes("0.0.0.0")) {
    return reqOrigin;
  }

  return "https://factory.aichieve.net";
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { plan = "pdf_audit_export", userId = "guest_user", email } = body;

    const origin = getOrigin(req);

    const isSubscription = plan === "cpa_monthly";
    const mode = isSubscription ? "subscription" : "payment";

    const lineItems = isSubscription
      ? [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: "QuarterLine Pro — CPA & Accountant Roster",
                description: "Multi-client 2026 OBBBA tax readiness engine & unlimited PDF exports",
                tax_code: "txcd_10202000",
              },
              unit_amount: 2900, // $29/month
              recurring: {
                interval: "month" as const,
              },
            },
            quantity: 1,
          },
        ]
      : [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: "QuarterLine 2026 Tax Readiness Audit Report (PDF)",
                description: "Official Section 199A QBI (20% rate) & Safe-Harbor Certified Audit Export",
                tax_code: "txcd_10000000",
              },
              unit_amount: 900, // $9 one-off
            },
            quantity: 1,
          },
        ];

    // If STRIPE_SECRET_KEY is configured, create live Stripe Checkout Session
    if (process.env.STRIPE_SECRET_KEY) {
      const session = await createCheckoutSession({
        userId,
        userEmail: email,
        mode,
        lineItems,
        successUrl: `${origin}/quarterline?session_id={CHECKOUT_SESSION_ID}&plan=${plan}&status=success`,
        cancelUrl: `${origin}/quarterline?canceled=true`,
        metadata: {
          plan,
          app: "quarterline",
        },
      });

      return NextResponse.json({
        url: session.url,
        sessionId: session.id,
      });
    }

    // In local dev without live Stripe key, provide immediate simulated checkout link
    return NextResponse.json({
      url: `${origin}/quarterline?session_id=simulated_${plan}_${Date.now()}&plan=${plan}&status=success`,
      sessionId: `simulated_${plan}_${Date.now()}`,
      simulated: true,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create checkout session";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
