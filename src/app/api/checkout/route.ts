import { NextRequest, NextResponse } from "next/server";
import { createCheckoutSession } from "@/lib/stripe/checkout";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { plan = "pdf_audit_export", userId = "guest_user", email } = body;

    const origin = req.nextUrl.origin || "http://localhost:3000";

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
