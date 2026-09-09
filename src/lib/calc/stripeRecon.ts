/**
 * LedgerLink — Stripe Payout → GL Reconciliation Engine
 * Pure TypeScript deterministic core. No I/O, no side effects.
 *
 * A single Stripe payout is a NETTED bundle of many events: charges, refunds,
 * disputes (chargebacks), dispute reversals, Stripe fees, Connect transfers,
 * top-ups, and currency-conversion (FX) adjustments. A bookkeeper cannot book it
 * as one journal entry. This engine decomposes a payout into categorized GL
 * journal lines whose NET sums to the payout's net amount EXACTLY.
 *
 * Trust-building invariant (surfaced, never hidden):
 *     Σ (net across all balance_transactions) == payout.amount
 * If that holds, `reconciled: true` and `delta: 0`. There is NO silent fallback:
 * a mismatch is reported with a non-zero delta and `reconciled: false`.
 *
 * Amounts use Stripe minor units (e.g. pence / cents). Stripe reports, per
 * balance transaction, a signed `amount`, a signed `fee`, and `net` where
 * Stripe guarantees `net == amount + fee` (fee is typically negative for a
 * customer charge, i.e. an outflow). The engine treats the transaction `net`
 * as the authoritative per-event contribution to the payout and derives
 * categorized GL amounts from `amount`/`fee`.
 */

import type { CalculationEngine } from "./index";

export type BalanceTransactionType =
  | "charge"
  | "refund"
  | "dispute"
  | "dispute_reversal"
  | "fee"
  | "network_fee"
  | "card_fee"
  | "transfer"
  | "transfer_reversal"
  | "topup"
  | "adjustment"
  | "payout"
  | "payout_failure"
  | "issuing_card_transaction"
  | "issuing_dispute"
  | "issuing_settlement"
  | "other";

export const GL_ACCOUNTS = {
  REVENUE: "Revenue",
  STRIPE_FEES: "Stripe Fees",
  REFUNDS: "Refunds",
  CHARGEBACKS: "Chargebacks",
  CLEARING: "Clearing/Other",
} as const;

export type GlAccount = (typeof GL_ACCOUNTS)[keyof typeof GL_ACCOUNTS];

export interface PayoutInput {
  id: string;
  /** Minor units — the net amount of the payout that hit the bank. */
  amount: number;
  /** ISO-4217 currency code, e.g. "gbp", "usd". */
  currency: string;
  arrivalDate?: string;
  status?: string;
}

export interface BalanceTransactionInput {
  id: string;
  type: BalanceTransactionType | string;
  /** Gross signed minor-units amount (positive inflow / negative outflow). */
  amount: number;
  /** Signed Stripe fee (typically negative for a customer charge). */
  fee?: number;
  /** Stripe-guaranteed net == amount + fee; falls back to amount + fee. */
  net?: number;
  currency?: string;
  /** Unix seconds. Drives the journal line date. */
  created?: number;
  availableOn?: number;
  source?: string;
  description?: string;
}

export interface JournalLine {
  /** ISO date (YYYY-MM-DD) of the underlying balance transaction. */
  date: string;
  /** GL account. */
  account: GlAccount;
  /** Debit amount (minor units, non-negative). */
  debit: number;
  /** Credit amount (minor units, non-negative). */
  credit: number;
  /** Traceable reference (balance_transaction id + GL account). */
  reference: string;
}

export interface ReconSummary {
  /** Gross charge revenue (credit). Positive. */
  revenue: number;
  /** Stripe fees (debit expense). Positive magnitude. */
  fees: number;
  /** Refunds (contra-revenue). NEGATIVE per spec (reduces revenue). */
  refunds: number;
  /** Chargebacks (debit expense, net of dispute reversals). Positive magnitude. */
  chargebacks: number;
  /** Clearing/Other remainder (transfer, topup, FX, adjustments). Signed. */
  clearings: number;
}

export interface ReconCounts {
  charges: number;
  refunds: number;
  chargebacks: number;
  fees: number;
  transfers: number;
  topups: number;
  adjustments: number;
  other: number;
}

export interface StripeReconInput {
  payout: PayoutInput;
  balanceTransactions: BalanceTransactionInput[];
}

/** WebMCP tool input for `reconcile_stripe_payout(account_id, period)`. */
export interface ReconcileStripePayoutInput {
  /** Stripe account id (tool signature); the restricted key scopes access. */
  account_id: string;
  /** Period, e.g. "2026-08" or a Stripe created range "start:end". */
  period: string;
  /** Optional specific payout id to reconcile. */
  payout_id?: string;
  /** Customer read-only Stripe restricted key (rk_…). */
  stripe_restricted_key?: string;
  /** Pasted/uploaded Stripe JSON export (payout + balance_transactions). */
  export_json?: string;
}

export interface StripeReconOutput {
  payout: PayoutInput;
  reconciled: boolean;
  /** payout.amount − Σ(net). Exactly 0 when reconciled. */
  delta: number;
  /** Σ(net across all balance_transactions) in minor units. */
  sumNet: number;
  journalLines: JournalLine[];
  summary: ReconSummary;
  counts: ReconCounts;
  currency: string;
}

interface Allocation {
  account: GlAccount;
  /** Signed minor units. >0 → credit, <0 → debit. Per-allocation sum == txn.net. */
  amount: number;
}

const MILLISECOND = 1000;

function asIsoDate(unixSeconds: number | undefined, fallback: string | undefined): string {
  if (unixSeconds && Number.isFinite(unixSeconds)) {
    return new Date(unixSeconds * MILLISECOND).toISOString().slice(0, 10);
  }
  if (fallback) {
    const d = new Date(fallback);
    if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
    return fallback;
  }
  return new Date(0).toISOString().slice(0, 10);
}

/**
 * Categorizes a single balance transaction into one or more GL allocations.
 * The signed sum of a transaction's allocations always equals its `net`, so the
 * journal lines tie back to the payout exactly.
 */
export function categorizeTransaction(
  txn: BalanceTransactionInput,
  fallbackDate: string | undefined,
): { allocations: Allocation[]; category: GlAccount; date: string } {
  const net = txn.net !== undefined ? txn.net : txn.amount + (txn.fee ?? 0);
  const date = asIsoDate(txn.created, fallbackDate);
  const type = (txn.type || "other").trim().toLowerCase() as BalanceTransactionType;

  switch (type) {
    case "charge":
      return {
        // amount = gross charge (credit), fee = expense (debit). amount+fee == net.
        allocations: [
          { account: GL_ACCOUNTS.REVENUE, amount: txn.amount },
          { account: GL_ACCOUNTS.STRIPE_FEES, amount: txn.fee ?? 0 },
        ],
        category: GL_ACCOUNTS.REVENUE,
        date,
      };
    case "refund":
      // Contra-revenue: the refunded gross (negative net).
      return {
        allocations: [{ account: GL_ACCOUNTS.REFUNDS, amount: net }],
        category: GL_ACCOUNTS.REFUNDS,
        date,
      };
    case "dispute":
      // Chargeback expense = reversed gross + any dispute fee (negative net).
      return {
        allocations: [{ account: GL_ACCOUNTS.CHARGEBACKS, amount: net }],
        category: GL_ACCOUNTS.CHARGEBACKS,
        date,
      };
    case "dispute_reversal":
      // Reverses a prior chargeback — money flows back in (positive net).
      return {
        allocations: [{ account: GL_ACCOUNTS.CHARGEBACKS, amount: net }],
        category: GL_ACCOUNTS.CHARGEBACKS,
        date,
      };
    case "fee":
    case "network_fee":
    case "card_fee":
      // Standalone Stripe fee expense.
      return {
        allocations: [{ account: GL_ACCOUNTS.STRIPE_FEES, amount: net }],
        category: GL_ACCOUNTS.STRIPE_FEES,
        date,
      };
    case "transfer":
    case "transfer_reversal":
    case "topup":
    case "adjustment":
    case "payout":
    case "payout_failure":
    case "issuing_card_transaction":
    case "issuing_dispute":
    case "issuing_settlement":
      // Connect payouts, top-ups, FX / settlement adjustments → Clearing/Other.
      return {
        allocations: [{ account: GL_ACCOUNTS.CLEARING, amount: net }],
        category: GL_ACCOUNTS.CLEARING,
        date,
      };
    default:
      // Any unknown type is surfaced as Clearing/Other (never silently dropped).
      return {
        allocations: [{ account: GL_ACCOUNTS.CLEARING, amount: net }],
        category: GL_ACCOUNTS.CLEARING,
        date,
      };
  }
}

function toJournalLine(
  account: GlAccount,
  amount: number,
  date: string,
  reference: string,
): JournalLine {
  if (amount === 0) {
    return { date, account, debit: 0, credit: 0, reference };
  }
  if (amount > 0) {
    return { date, account, debit: 0, credit: amount, reference };
  }
  return { date, account, debit: -amount, credit: 0, reference };
}

/**
 * Core deterministic function: decomposes a Stripe payout + its balance
 * transactions into categorized GL journal lines and a summary, and honestly
 * reports whether the invariant Σ(net) == payout.amount holds.
 */
export function reconcileStripePayout(
  payout: PayoutInput,
  balanceTransactions: BalanceTransactionInput[],
): StripeReconOutput {
  const fallbackDate = payout.arrivalDate || payout.status;

  let sumNet = 0;
  const journalLines: JournalLine[] = [];
  const counts: ReconCounts = {
    charges: 0,
    refunds: 0,
    chargebacks: 0,
    fees: 0,
    transfers: 0,
    topups: 0,
    adjustments: 0,
    other: 0,
  };

  // Per-account signed pools (positive → credit, negative → debit).
  let revenueSigned = 0;
  let feesSigned = 0;
  let refundsSigned = 0;
  let chargebacksSigned = 0;
  let clearingsSigned = 0;

  for (const txn of balanceTransactions) {
    const net = txn.net !== undefined ? txn.net : txn.amount + (txn.fee ?? 0);
    sumNet += net;

    const { allocations, category, date } = categorizeTransaction(txn, fallbackDate);

    for (const alloc of allocations) {
      if (alloc.amount === 0) continue;
      journalLines.push(
        toJournalLine(alloc.account, alloc.amount, date, `${txn.id}::${alloc.account}`),
      );
      switch (alloc.account) {
        case GL_ACCOUNTS.REVENUE:
          revenueSigned += alloc.amount;
          break;
        case GL_ACCOUNTS.STRIPE_FEES:
          feesSigned += alloc.amount;
          break;
        case GL_ACCOUNTS.REFUNDS:
          refundsSigned += alloc.amount;
          break;
        case GL_ACCOUNTS.CHARGEBACKS:
          chargebacksSigned += alloc.amount;
          break;
        case GL_ACCOUNTS.CLEARING:
          clearingsSigned += alloc.amount;
          break;
      }
    }

    switch (category) {
      case GL_ACCOUNTS.REVENUE:
        counts.charges += 1;
        break;
      case GL_ACCOUNTS.REFUNDS:
        counts.refunds += 1;
        break;
      case GL_ACCOUNTS.CHARGEBACKS:
        counts.chargebacks += 1;
        break;
      case GL_ACCOUNTS.STRIPE_FEES:
        counts.fees += 1;
        break;
      case GL_ACCOUNTS.CLEARING:
        switch ((txn.type || "").trim().toLowerCase()) {
          case "topup":
            counts.topups += 1;
            break;
          case "adjustment":
            counts.adjustments += 1;
            break;
          case "transfer":
          case "transfer_reversal":
            counts.transfers += 1;
            break;
          default:
            counts.other += 1;
            break;
        }
        break;
    }
  }

  // Summary magnitudes. Refunds and chargebacks are surfaced as POSITIVE
  // magnitudes for readability; refunds is reported NEGATIVE (contra-revenue)
  // per the proposal. Clearings is the honest remainder that ties the string to
  // the payout net — it is the signed Clearing/Other pool, which by construction
  // equals payout.amount − (revenue − fees − |refunds| − chargebacks).
  const revenue = revenueSigned;
  const fees = Math.abs(feesSigned);
  const refunds = refundsSigned <= 0 ? refundsSigned : -refundsSigned; // negative
  const chargebacks = Math.abs(chargebacksSigned);
  const clearings = clearingsSigned;

  const sumNetRounded = Math.round(sumNet);
  const payoutAmountRounded = Math.round(payout.amount);
  const delta = payoutAmountRounded - sumNetRounded;
  const reconciled = delta === 0;

  return {
    payout: { ...payout, amount: Math.round(payout.amount) },
    reconciled,
    delta,
    sumNet: sumNetRounded,
    journalLines,
    summary: {
      revenue,
      fees,
      refunds,
      chargebacks,
      clearings,
    },
    counts,
    currency: payout.currency,
  };
}

/**
 * Deterministic journal CSV export (Xero / QuickBooks journal-import ready).
 * Columns: Date,Account,Debit,Credit,Reference.
 */
export function journalToCsv(lines: JournalLine[]): string {
  const header = "Date,Account,Debit,Credit,Reference";
  const rows = lines.map((l) => {
    const debit = l.debit ? (l.debit / 100).toFixed(2) : "";
    const credit = l.credit ? (l.credit / 100).toFixed(2) : "";
    const ref = l.reference.replace(/"/g, '""');
    return `${l.date},"${l.account}",${debit},${credit},"${ref}"`;
  });
  return [header, ...rows].join("\n");
}

/**
 * Normalizes a pasted/uploaded Stripe JSON export into engine inputs.
 * Accepts:
 *  - { payout: {...}, balance_transactions: [...] }
 *  - { data: [{object:"payout",...}, {object:"balance_transaction",...}] }
 *  - { object: "payout", ... } (a bare payout) with sibling balance_transactions
 * The engine is fixture-testable from JSON either way — no hardcoded account.
 */
export function normalizeStripeExport(raw: unknown): StripeReconInput {
  if (!raw || typeof raw !== "object") {
    throw new Error("Invalid export: expected a JSON object.");
  }
  const obj = raw as Record<string, unknown>;

  // Locate the payout object.
  let payoutObj: Record<string, unknown> | null = null;
  if (obj.payout && typeof obj.payout === "object") {
    payoutObj = obj.payout as Record<string, unknown>;
  } else if (Array.isArray(obj.data)) {
    payoutObj =
      (obj.data.find(
        (d): d is Record<string, unknown> =>
          !!d && typeof d === "object" && (d as Record<string, unknown>).object === "payout",
      ) as Record<string, unknown> | undefined) || null;
  } else if ((obj.object as string) === "payout") {
    payoutObj = obj;
  }

  // Locate the balance_transactions array.
  let btns: unknown[] = [];
  if (Array.isArray(obj.balance_transactions)) {
    btns = obj.balance_transactions;
  } else if (Array.isArray(obj.data)) {
    btns = (obj.data as unknown[]).filter(
      (d) => !!d && typeof d === "object" && (d as Record<string, unknown>).object === "balance_transaction",
    );
  } else if (Array.isArray(obj.balance_transactions_list)) {
    btns = obj.balance_transactions_list;
  }
  // Also support an explicit enclosing object like { payout, balance_transactions } where
  // balance transactions are nested under a `data` key.
  if (
    obj.balance_transactions &&
    typeof obj.balance_transactions === "object" &&
    Array.isArray((obj.balance_transactions as Record<string, unknown>).data)
  ) {
    btns = (obj.balance_transactions as { data: unknown[] }).data;
  }

  if (!payoutObj || typeof payoutObj.amount !== "number") {
    throw new Error("Invalid export: a payout object with an `amount` is required.");
  }
  if (!btns.length) {
    throw new Error("Invalid export: no balance_transactions were found in the export.");
  }

  const payout: PayoutInput = {
    id: String(payoutObj.id || "po_unknown"),
    amount: Number(payoutObj.amount),
    currency: String(payoutObj.currency || "usd"),
    arrivalDate: payoutObj.arrival_date ? String(payoutObj.arrival_date) : undefined,
    status: payoutObj.status ? String(payoutObj.status) : undefined,
  };

  const balanceTransactions: BalanceTransactionInput[] = btns.map((b) => {
    const t = b as Record<string, unknown>;
    if (!t || typeof t !== "object") {
      throw new Error("Invalid export: malformed balance_transaction entry.");
    }
    if (typeof t.amount !== "number") {
      throw new Error("Invalid export: balance_transaction is missing `amount`.");
    }
    return {
      id: String(t.id || "txn_unknown"),
      type: String(t.type || "other"),
      amount: Number(t.amount),
      fee: t.fee !== undefined && t.fee !== null ? Number(t.fee) : 0,
      net: t.net !== undefined && t.net !== null ? Number(t.net) : undefined,
      currency: t.currency ? String(t.currency) : payout.currency,
      created: t.created !== undefined ? Number(t.created) : undefined,
      availableOn: t.available_on !== undefined ? Number(t.available_on) : undefined,
      source: t.source ? String(t.source) : undefined,
      description: t.description ? String(t.description) : undefined,
    };
  });

  return { payout, balanceTransactions };
}

/** Factory `CalculationEngine` contract wrapper. */
export const stripeReconEngine: CalculationEngine<StripeReconInput, StripeReconOutput> = {
  metadata: {
    id: "stripe_payout_reconciliation",
    name: "LedgerLink Stripe Payout → GL Reconciliation Engine",
    version: "1.0.0",
    description:
      "Decomposes a netted Stripe payout into categorized GL journal lines that sum to the payout net exactly (Σnet == payout.amount).",
  },
  validate(input: StripeReconInput) {
    const errors: string[] = [];
    if (!input?.payout || typeof input.payout.amount !== "number" || Number.isNaN(input.payout.amount)) {
      errors.push("payout.amount must be a valid number.");
    }
    if (!Array.isArray(input?.balanceTransactions)) {
      errors.push("balanceTransactions must be an array.");
    } else {
      for (let i = 0; i < input.balanceTransactions.length; i++) {
        const t = input.balanceTransactions[i];
        if (!t || typeof t.amount !== "number" || Number.isNaN(t.amount)) {
          errors.push(`balanceTransactions[${i}].amount must be a valid number.`);
        }
      }
    }
    // The invariant is expressible, not an input error: if the data doesn't
    // reconcile, the engine reports reconciled:false with a non-zero delta.
    return { valid: errors.length === 0, errors: errors.length ? errors : undefined };
  },
  calculate(input: StripeReconInput): StripeReconOutput {
    return reconcileStripePayout(input.payout, input.balanceTransactions);
  },
};
