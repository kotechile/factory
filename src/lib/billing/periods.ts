/**
 * Pure billing arithmetic — no I/O, no env reads at import time, so it is unit-testable.
 * The Supabase/Stripe wiring lives in ./ledger.ts.
 *
 * Model (context/recon_proposals/2026-10-03_factory_billing_v1.md §3–§4):
 *  - usage is billed in a calendar month (UTC);
 *  - a customer has a monthly spend cap (default from env, customer-editable);
 *  - the cap is checked BEFORE a metered tool runs and the call is recorded AFTER it succeeds.
 */

/** Used when neither the customer's own cap nor BILLING_DEFAULT_MONTHLY_CAP_USD is set. */
export const FALLBACK_MONTHLY_CAP_USD = 50;

export interface CapsDocEntry {
  monthly_cap_usd: number;
  updated_at: string;
}

/** The `billing_caps` document stored in factory_config (one row, whole-doc rewrite). */
export type CapsDoc = Record<string, CapsDocEntry>;

/** The UTC calendar month containing `now`: [start, end). `end` is the reset instant. */
export function currentPeriod(now: Date = new Date()): { start: Date; end: Date } {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0));
  return { start, end };
}

/**
 * The customer's monthly cap in USD: their own entry wins, else the deploy default, else
 * FALLBACK_MONTHLY_CAP_USD. An explicit 0 is honoured (0 = a hard block).
 */
export function resolveMonthlyCap(
  caps: CapsDoc | null | undefined,
  customerId: string,
  env: Record<string, string | undefined> = {},
): number {
  const entry = caps?.[customerId];
  if (entry && Number.isFinite(entry.monthly_cap_usd) && entry.monthly_cap_usd >= 0) {
    return entry.monthly_cap_usd;
  }
  const raw = Number(env.BILLING_DEFAULT_MONTHLY_CAP_USD);
  return Number.isFinite(raw) && raw >= 0 ? raw : FALLBACK_MONTHLY_CAP_USD;
}

export interface LedgerRow {
  created_at: string;
  payload?: Record<string, unknown> | null;
}

export interface UsageHistoryItem {
  at: string;
  tool: string;
  cost_usd: number;
  meter_event_id: string | null;
}

export interface UsageSummary {
  queries: number;
  amountUsd: number;
  history: UsageHistoryItem[];
}

function toCents(usd: unknown): number {
  return typeof usd === "number" && Number.isFinite(usd) ? Math.round(usd * 100) : 0;
}

/**
 * USD → integer cents, for the Stripe meter's `value` in the "cents" model
 * (src/lib/stripe/meter.ts). Returns 0 for a non-finite or non-positive price so the caller can
 * refuse to report a meaningless amount; it never returns a fraction of a cent.
 */
export function costToCents(usd: number): number {
  if (!Number.isFinite(usd) || usd <= 0) return 0;
  return Math.round(usd * 100);
}

/**
 * Rolls ledger rows into a period summary. Money is summed in integer cents so repeated
 * $0.25 charges cannot accumulate floating-point drift, and the returned amount is a clean
 * 2-decimal figure.
 */
export function summarizeUsage(rows: LedgerRow[]): UsageSummary {
  let cents = 0;
  const history: UsageHistoryItem[] = [];
  for (const row of rows) {
    const payload = (row.payload ?? {}) as Record<string, unknown>;
    const rowCents = toCents(payload.cost_usd);
    cents += rowCents;
    history.push({
      at: row.created_at,
      tool: typeof payload.tool === "string" ? payload.tool : "unknown",
      cost_usd: rowCents / 100,
      meter_event_id: typeof payload.meter_event_id === "string" ? payload.meter_event_id : null,
    });
  }
  return { queries: rows.length, amountUsd: cents / 100, history };
}

/** Cap minus usage, floored at 0 and rounded to cents. */
export function remainingUsd(usageUsd: number, capUsd: number): number {
  return Math.max(0, Math.round((capUsd - usageUsd) * 100) / 100);
}

/** Share of the cap consumed, clamped to [0, 1]; a 0 cap is reported as fully consumed. */
export function capFraction(usageUsd: number, capUsd: number): number {
  if (capUsd <= 0) return 1;
  return Math.min(1, Math.max(0, usageUsd / capUsd));
}
