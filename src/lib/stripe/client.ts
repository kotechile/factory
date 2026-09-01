import Stripe from "stripe";

let stripeInstance: Stripe | null = null;

/**
 * Returns a singleton instance of the Stripe client.
 * Throws explicit error if STRIPE_SECRET_KEY is not defined.
 */
export function getStripe(): Stripe {
  if (stripeInstance) {
    return stripeInstance;
  }

  const apiKey = process.env.STRIPE_SECRET_KEY;
  if (!apiKey) {
    throw new Error(
      "Missing STRIPE_SECRET_KEY environment variable. Ensure it is set in your environment.",
    );
  }

  stripeInstance = new Stripe(apiKey, {
    appInfo: {
      name: "software-factory-core",
      version: "0.1.0",
    },
  });

  return stripeInstance;
}
