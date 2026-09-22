import Stripe from "stripe";
import { getStripeMode, stripeSecretKey, type StripeMode } from "./mode";

/**
 * Stripe clients, cached PER MODE. The cache is keyed by mode rather than held in a single
 * slot so that flipping STRIPE_MODE (or a test swapping env) can never hand back a client
 * built from the other mode's key.
 */
const clients: Partial<Record<StripeMode, Stripe>> = {};

/**
 * Returns the Stripe client for the configured mode (STRIPE_MODE=test|live).
 * Throws an explicit error if the mode or its key is missing/mismatched — no silent fallback.
 */
export function getStripe(): Stripe {
  const mode = getStripeMode();
  const cached = clients[mode];
  if (cached) {
    return cached;
  }

  const client = new Stripe(stripeSecretKey(), {
    appInfo: {
      name: "software-factory-core",
      version: "0.1.0",
    },
  });

  clients[mode] = client;
  return client;
}

/** Drops the cached clients. Only needed by tests that swap the mode mid-process. */
export function resetStripeClient(): void {
  delete clients.test;
  delete clients.live;
}
