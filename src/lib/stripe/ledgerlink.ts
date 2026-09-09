/**
 * LedgerLink — fetch a customer's Stripe payout bundle using the CUSTOMER'S OWN
 * read-only restricted key (NOT the factory's key — see AGENTS.md scope guard).
 *
 * This is the only I/O layer; the deterministic engine (src/lib/calc/stripeRecon.ts)
 * stays pure and fixture-testable from JSON either way.
 */
import Stripe from "stripe";
import type {
  BalanceTransactionInput,
  PayoutInput,
} from "@/lib/calc/stripeRecon";

export interface LedgerlinkFetchParams {
  /** Customer read-only Stripe restricted key. Required — no factory key fallback. */
  stripeRestrictedKey?: string;
  /** Optional Stripe account id (used for the tool signature; key scopes access). */
  accountId?: string;
  /** Optional specific payout id. Falls back to the newest payout in the period. */
  payoutId?: string;
  /** Period filter: "YYYY-MM" (e.g. "2026-08") or a Stripe created range string. */
  period?: string;
}

export interface StripePayoutBundle {
  payout: PayoutInput;
  balanceTransactions: BalanceTransactionInput[];
}

function makeStripe(key: string): Stripe {
  // A customer restricted key is used directly; the factory STRIPE_SECRET_KEY is
  // never used here. Client-side restricted keys are read-only and scoped to the
  // customer's own account.
  return new Stripe(key, {
    appInfo: { name: "software-factory-core", version: "0.1.0" },
  });
}

function toUnixRange(period?: string): { gte?: number; lte?: number } {
  if (!period) return {};
  const m = period.match(/^(\d{4})-(\d{2})$/);
  if (m) {
    const year = Number(m[1]);
    const month = Number(m[2]); // 1-12
    const start = new Date(Date.UTC(year, month - 1, 1)).getTime() / 1000;
    const end = new Date(Date.UTC(year, month, 1)).getTime() / 1000;
    return { gte: Math.floor(start), lte: Math.floor(end) - 1 };
  }
  // Fall back to treating the string as a Stripe-format created filter.
  const gte = Number(period.split(":")[0]);
  const lte = Number(period.split(":")[1]);
  return {
    gte: Number.isFinite(gte) && gte > 0 ? gte : undefined,
    lte: Number.isFinite(lte) && lte > 0 ? lte : undefined,
  };
}

function normalizePayout(p: Stripe.Payout): PayoutInput {
  return {
    id: p.id,
    amount: p.amount,
    currency: p.currency,
    arrivalDate: p.arrival_date ? new Date(p.arrival_date * 1000).toISOString().slice(0, 10) : undefined,
    status: p.status,
  };
}

function normalizeBalanceTransaction(
  t: Stripe.BalanceTransaction,
  currency: string,
): BalanceTransactionInput {
  return {
    id: t.id,
    type: t.type,
    amount: t.amount,
    fee: t.fee ?? 0,
    net: t.net,
    currency: t.currency || currency,
    created: t.created,
    availableOn: t.available_on,
    source: typeof t.source === "string" ? t.source : undefined,
  };
}

/**
 * Lists the customer's payouts (optionally filtered by payoutId/period) and the
 * balance_transactions that compose the chosen payout.
 */
export async function fetchPayoutBundleWithKey(params: LedgerlinkFetchParams): Promise<StripePayoutBundle> {
  const key = params.stripeRestrictedKey?.trim();
  if (!key) {
    throw new Error("A Stripe read-only restricted key is required (no factory key fallback).");
  }
  if (key.startsWith("sk_")) {
    throw new Error(
      "Provide a restricted key (rk_…) with read-only access; secret/sk_ keys are not accepted by LedgerLink.",
    );
  }
  if (key.startsWith("sk_live_") || key.startsWith("sk_test_")) {
    throw new Error("Provide a restricted key (rk_…) — LedgerLink does not accept secret keys.");
  }

  const stripe = makeStripe(key);
  const range = toUnixRange(params.period);

  const listArgs: Stripe.PayoutListParams = {
    limit: 10,
    ...(range.gte !== undefined || range.lte !== undefined
      ? { created: { ...(range.gte !== undefined ? { gte: range.gte } : {}), ...(range.lte !== undefined ? { lte: range.lte } : {}) } }
      : {}),
  };

  let payouts: Stripe.Payout[];
  try {
    const list = await stripe.payouts.list(listArgs);
    payouts = list.data;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to list payouts.";
    throw new Error(`Could not read payouts with this key: ${message}`);
  }

  const selected = params.payoutId ? payouts.find((p) => p.id === params.payoutId) : payouts[0];
  if (!selected) {
    throw new Error(
      params.payoutId
        ? `Payout ${params.payoutId} not found for this account/period.`
        : "No Stripe payouts found for this account/period.",
    );
  }

  let balanceTransactions: Stripe.BalanceTransaction[];
  try {
    const bt = await stripe.balanceTransactions.list({ payout: selected.id, limit: 100 });
    balanceTransactions = bt.data;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to list balance transactions.";
    throw new Error(`Could not read balance_transactions for ${selected.id}: ${message}`);
  }

  const currency = selected.currency;
  return {
    payout: normalizePayout(selected),
    balanceTransactions: balanceTransactions.map((t) => normalizeBalanceTransaction(t, currency)),
  };
}
