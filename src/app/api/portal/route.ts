import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe/client";
import { createAdminClient } from "@/lib/supabase/admin";

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

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    let customerId = searchParams.get("customer_id");
    const sessionId = searchParams.get("session_id");
    const stripe = getStripe();

    if (!customerId && sessionId) {
      try {
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        customerId = typeof session.customer === "string" ? session.customer : session.customer?.id || null;
      } catch (err) {
        console.warn("Could not retrieve session in portal handler:", err);
      }
    }

    if (!customerId && searchParams.get("email")) {
      try {
        const email = searchParams.get("email")!.trim().toLowerCase();
        const customers = await stripe.customers.list({ email, limit: 1 });
        if (customers.data.length > 0) {
          customerId = customers.data[0].id;
        }
      } catch (err) {
        console.warn("Could not find customer by email in GET:", err);
      }
    }

    if (!customerId) {
      // Look up customer from active subscription in Supabase
      try {
        const supabase = createAdminClient();
        const { data } = await supabase
          .from("subscriptions")
          .select("stripe_customer_id")
          .eq("status", "active")
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (data?.stripe_customer_id) {
          customerId = data.stripe_customer_id;
        }
      } catch (err) {
        console.warn("Could not look up customer in portal handler:", err);
      }
    }

    if (!customerId) {
      return NextResponse.redirect(`${getOrigin(req)}/billing?error=no_customer_found`);
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
    const { sessionId, email } = body;
    let { customerId } = body;
    const stripe = getStripe();

    if (!customerId && sessionId) {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      customerId = typeof session.customer === "string" ? session.customer : session.customer?.id || null;
    }

    if (!customerId && email) {
      try {
        const customers = await stripe.customers.list({
          email: email.trim().toLowerCase(),
          limit: 1,
        });
        if (customers.data.length > 0) {
          customerId = customers.data[0].id;
        }
      } catch (err) {
        console.warn("Could not find customer by email in POST:", err);
      }
    }

    if (!customerId) {
      return NextResponse.json(
        { error: "No customer account found with that ID or email address." },
        { status: 404 },
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
