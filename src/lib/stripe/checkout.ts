import { getStripe } from "./client";
import type Stripe from "stripe";

export interface CreateCheckoutSessionParams {
  userId: string;
  userEmail?: string;
  priceId?: string;
  mode?: "subscription" | "payment";
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
  lineItems?: Stripe.Checkout.SessionCreateParams.LineItem[];
}

/**
 * Creates a Stripe Checkout Session for subscription or one-off payment gating.
 */
export async function createCheckoutSession({
  userId,
  userEmail,
  priceId,
  mode = "subscription",
  successUrl,
  cancelUrl,
  metadata = {},
  lineItems,
}: CreateCheckoutSessionParams): Promise<Stripe.Checkout.Session> {
  const stripe = getStripe();

  const finalLineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = lineItems ?? (
    priceId
      ? [{ price: priceId, quantity: 1 }]
      : [
          mode === "subscription"
            ? {
                price_data: {
                  currency: "usd",
                  product_data: {
                    name: "Factory Pro Subscription",
                    description: "Full access to deterministic tools and export capabilities",
                    tax_code: "txcd_10202000",
                  },
                  unit_amount: 2900, // $29.00 / month
                  recurring: {
                    interval: "month",
                  },
                },
                quantity: 1,
              }
            : {
                price_data: {
                  currency: "usd",
                  product_data: {
                    name: "One-off Export & Report",
                    description: "Single export of branded report / CSV",
                    tax_code: "txcd_10000000",
                  },
                  unit_amount: 900, // $9.00 one-off
                },
                quantity: 1,
              },
        ]
  );

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode,
    line_items: finalLineItems,
    success_url: successUrl,
    cancel_url: cancelUrl,
    client_reference_id: userId,
    customer_email: userEmail,
    metadata: {
      userId,
      ...metadata,
    },
    ...({
      managed_payments: {
        enabled: false,
      },
    } as unknown as Record<string, unknown>),
  };

  if (mode === "subscription") {
    sessionParams.subscription_data = {
      metadata: {
        userId,
        ...metadata,
      },
    };
  }

  return await stripe.checkout.sessions.create(sessionParams);
}
