import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe/client";
import { peekStripeMode, stripeWebhookSecret } from "@/lib/stripe/mode";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/resend/email";
import { products } from "@/products/registry";
import type Stripe from "stripe";

export async function POST(req: NextRequest) {
  const mode = peekStripeMode();

  // The signing secret is mode-paired: a sandbox events endpoint cannot be verified with a
  // live endpoint's secret, and vice versa. Resolving it here fails loudly on a misconfigured
  // deploy instead of silently 400-ing every real event.
  let webhookSecret: string | undefined;
  try {
    webhookSecret = stripeWebhookSecret();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Stripe mode is misconfigured.";
    console.error(`[stripe-webhook] ${message}`);
    return NextResponse.json({ error: message }, { status: 500 });
  }

  if (!webhookSecret) {
    const expected =
      mode === "unset" ? "STRIPE_WEBHOOK_SECRET_<MODE>" : `STRIPE_WEBHOOK_SECRET_${mode.toUpperCase()}`;
    console.error(`[stripe-webhook] ${expected} is not configured on the server.`);
    return NextResponse.json(
      { error: `${expected} is not configured on the server.`, mode },
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
    // Log the mode only — never key material. The mode is what tells you which events endpoint
    // (and therefore which signing secret) this request came from when a mismatch happens.
    console.error(`Webhook signature verification failed in ${mode} mode: ${message}`);
    return NextResponse.json(
      {
        error: `Webhook signature verification failed: ${message}`,
        mode,
      },
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

        // Send transactional email with self-service cancellation / access instructions
        if (userEmail) {
          const isSub = session.mode === "subscription";
          const appSlug = session.metadata?.app || "factory";
          const registeredProduct = products.find((p) => p.slug === appSlug);
          const appDisplayName = session.metadata?.appName || registeredProduct?.name || "Factory Pro";
          const appPath = appSlug === "factory" ? "" : appSlug;

          const subject = isSub
            ? `Your ${appDisplayName} Subscription & Access`
            : `Your ${appDisplayName} Report / Export is Ready`;

          const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "https://apps.giniloh.com").replace(/\/$/, "");
          const portalUrl = customerId
            ? `${baseUrl}/api/portal?customer_id=${customerId}`
            : `${baseUrl}/api/portal?session_id=${session.id}`;

          const appUrl = appPath
            ? `${baseUrl}/${appPath}?session_id=${session.id}&status=success`
            : `${baseUrl}/?session_id=${session.id}&status=success`;

          const subtitleNote =
            appSlug === "quarterline"
              ? "Governed by One Big Beautiful Bill Act (Pub. L. 119-21) & IRS Rev. Proc. 2025-32."
              : "Deterministic core verified by Autonomous Product & Software Factory.";

          const html = isSub
            ? `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; line-height: 1.5;">
              <h2 style="color: #0f172a; border-bottom: 2px solid #2563eb; padding-bottom: 8px;">Welcome to ${appDisplayName}</h2>
              <p>Thank you for subscribing to <strong>${appDisplayName} Pro</strong>.</p>
              <p>Your subscription unlocks unlimited deterministic calculations, audit workpapers, and export capabilities.</p>
              
              <div style="margin: 24px 0;">
                <a href="${appUrl}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                  Access ${appDisplayName} Workspace
                </a>
              </div>

              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 16px; margin-top: 24px; font-size: 13px; color: #64748b;">
                <strong style="color: #0f172a;">Subscription & Billing Management:</strong>
                <p style="margin: 6px 0;">You have full control over your subscription. To cancel or update your payment method with 1 click, visit your self-service billing portal:</p>
                <p style="margin: 10px 0;"><a href="${portalUrl}" style="color: #2563eb; font-weight: bold; text-decoration: underline;">Manage or Cancel Subscription</a></p>
                <p style="margin-top: 12px; font-size: 12px;">Need help? You can also reply directly to this email and our support team will handle it immediately.</p>
              </div>
            </div>
            `
            : `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; line-height: 1.5;">
              <h2 style="color: #0f172a; border-bottom: 2px solid #2563eb; padding-bottom: 8px;">Your ${appDisplayName} Export is Ready</h2>
              <p>Thank you for your purchase from <strong>${appDisplayName}</strong>.</p>
              
              <div style="margin: 24px 0;">
                <a href="${appUrl}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                  Download / View Export
                </a>
              </div>

              <p style="font-size: 13px; color: #64748b; margin-top: 24px;">
                ${subtitleNote}
              </p>
            </div>
            `;

          try {
            await sendEmail({
              to: userEmail,
              subject,
              html,
            });
          } catch (emailErr) {
            console.warn("Could not send customer confirmation email (possibly unverified domain in Resend):", emailErr);
            // In testing mode, also forward to registered account email so founder receives every alert
            try {
              await sendEmail({
                to: "kotechile@gmail.com",
                subject: `[Order Alert - ${isSub ? "Subscription" : "Sale"}] ${subject}`,
                html: `<p><strong>Order placed by:</strong> ${userEmail}</p>${html}`,
              });
            } catch {
              // Ignore fallback errors
            }
          }
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

        // Match by exact subscription ID first
        let { data } = await supabase
          .from("subscriptions")
          .update(updateData)
          .eq("stripe_subscription_id", subscription.id)
          .select();

        // Fall back to customer ID or user ID
        if ((!data || data.length === 0) && customerId) {
          const res = await supabase.from("subscriptions").update(updateData).eq("stripe_customer_id", customerId).select();
          data = res.data;
        }
        if ((!data || data.length === 0) && userId) {
          const res = await supabase.from("subscriptions").update(updateData).eq("user_id", userId).select();
          data = res.data;
        }

        // If no row exists yet, insert it
        if (!data || data.length === 0) {
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

        // Match by exact subscription ID first
        let { data } = await supabase
          .from("subscriptions")
          .update(updateData)
          .eq("stripe_subscription_id", subscription.id)
          .select();

        // Fall back to customer ID or user ID
        if ((!data || data.length === 0) && customerId) {
          const res = await supabase.from("subscriptions").update(updateData).eq("stripe_customer_id", customerId).select();
          data = res.data;
        }
        if ((!data || data.length === 0) && userId) {
          const res = await supabase.from("subscriptions").update(updateData).eq("user_id", userId).select();
          data = res.data;
        }

        // If no row exists yet, insert it as canceled
        if (!data || data.length === 0) {
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
