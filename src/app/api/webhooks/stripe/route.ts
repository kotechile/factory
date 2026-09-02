import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe/client";
import { createAdminClient } from "@/lib/supabase/admin";
import type Stripe from "stripe";

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json(
      { error: "STRIPE_WEBHOOK_SECRET is not configured on the server." },
      { status: 500 },
    );
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header." },
      { status: 400 },
    );
  }

  let event: Stripe.Event;
  try {
    const rawBody = await req.text();
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Invalid webhook signature";
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${message}` },
      { status: 400 },
    );
  }

  try {
    const supabase = createAdminClient();

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
        const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
        const userEmail = session.customer_details?.email || session.customer_email;
        const userId = session.client_reference_id || session.metadata?.userId || userEmail || customerId || "guest_user";

        if (session.mode === "subscription") {
          await supabase.from("subscriptions").upsert({
            user_id: userId,
            stripe_customer_id: customerId || "unknown",
            stripe_subscription_id: subscriptionId,
            status: "active",
            plan: session.metadata?.plan || "cpa_monthly",
            updated_at: new Date().toISOString(),
          }, {
            onConflict: "user_id",
          });
        } else if (session.mode === "payment") {
          // Record one-off unlocked purchase idempotently
          await supabase.from("purchases").upsert({
            id: session.id,
            user_id: userId,
            stripe_customer_id: customerId || null,
            amount: session.amount_total,
            currency: session.currency,
            status: "completed",
            created_at: new Date().toISOString(),
          }, {
            onConflict: "id",
          });
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id;
        const userId = subscription.metadata?.userId;

        const updateData: Record<string, unknown> = {
          status: subscription.status,
          stripe_subscription_id: subscription.id,
          updated_at: new Date().toISOString(),
        };

        let updated = false;
        if (userId) {
          const { data } = await supabase.from("subscriptions").update(updateData).eq("user_id", userId).select();
          if (data && data.length > 0) updated = true;
        }
        if (!updated && customerId) {
          const { data } = await supabase.from("subscriptions").update(updateData).eq("stripe_customer_id", customerId).select();
          if (data && data.length > 0) updated = true;
        }
        if (!updated) {
          await supabase.from("subscriptions").upsert({
            user_id: userId || customerId || `sub_${subscription.id}`,
            stripe_customer_id: customerId || "unknown",
            stripe_subscription_id: subscription.id,
            status: subscription.status,
            plan: subscription.metadata?.plan || "cpa_monthly",
            updated_at: new Date().toISOString(),
          }, {
            onConflict: "user_id",
          });
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id;
        const userId = subscription.metadata?.userId;

        const updateData = {
          status: "canceled",
          updated_at: new Date().toISOString(),
        };

        let updated = false;
        if (userId) {
          const { data } = await supabase.from("subscriptions").update(updateData).eq("user_id", userId).select();
          if (data && data.length > 0) updated = true;
        }
        if (!updated && customerId) {
          const { data } = await supabase.from("subscriptions").update(updateData).eq("stripe_customer_id", customerId).select();
          if (data && data.length > 0) updated = true;
        }
        if (!updated) {
          await supabase.from("subscriptions").upsert({
            user_id: userId || customerId || `sub_${subscription.id}`,
            stripe_customer_id: customerId || "unknown",
            stripe_subscription_id: subscription.id,
            status: "canceled",
            plan: subscription.metadata?.plan || "cpa_monthly",
            updated_at: new Date().toISOString(),
          }, {
            onConflict: "user_id",
          });
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;

        if (customerId) {
          await supabase
            .from("subscriptions")
            .update({
              status: "past_due",
              updated_at: new Date().toISOString(),
            })
            .eq("stripe_customer_id", customerId);
        }
        break;
      }

      default:
        // Other events received and acknowledged without action
        break;
    }

    return NextResponse.json({ received: true, eventId: event.id }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error processing webhook event";
    return NextResponse.json(
      { error: `Webhook handler error: ${message}` },
      { status: 500 },
    );
  }
}
