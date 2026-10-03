import { type NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isStripeConfigured } from "@/lib/stripe/mode";
import { reportMeteredUsage } from "@/lib/stripe/meter";
import {
  type CapsDoc,
  type UsageSummary,
  costToCents,
  currentPeriod,
  resolveMonthlyCap,
  summarizeUsage,
} from "./periods";

/**
 * The usage ledger (V1.2 + V1.3 of context/recon_proposals/2026-10-03_factory_billing_v1.md).
 *
 * Storage is the EXISTING `public.events` table — no migration is required and none is
 * available through PostgREST anyway (see skills/stripe_gating_workflow.md §11 and
 * supabase-persistence §7). A metered call writes one row:
 *
 *   event='agent_usage', product=<tool's product>,
 *   payload={customer_id, tool, cost_usd, meter_event_id}
 *
 * and the period rollup reads those rows back with a jsonb containment filter. Stripe Meter
 * Events remain the billing source of truth; this ledger is the customer-facing read model and
 * the thing the cap is enforced against.
 */

export const USAGE_EVENT = "agent_usage";

/** The factory_config key holding the per-customer caps document. */
export const CAPS_KEY = "billing_caps";

/**
 * Rows the in-process rollup will read before refusing. PostgREST cannot SUM, so the period
 * total is computed in Node; past this bound the route fails loud rather than under-reporting
 * usage (which would silently under-enforce the cap — rule 5).
 */
const MAX_LEDGER_ROWS = 5000;

/** The Stripe customer id a caller presents, or null. Never verified here — see the note on trust. */
export function customerIdFrom(req: NextRequest): string | null {
  const raw = req.headers.get("x-stripe-customer-id") || req.headers.get("x-customer-id");
  const trimmed = raw?.trim();
  return trimmed ? trimmed : null;
}

async function readCapsDoc(): Promise<CapsDoc> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("factory_config")
    .select("value")
    .eq("key", CAPS_KEY)
    .maybeSingle();
  if (error) throw new Error(`billing caps read failed: ${error.message}`);
  const value = (data as { value?: string } | null)?.value;
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? (parsed as CapsDoc) : {};
  } catch {
    throw new Error(`factory_config['${CAPS_KEY}'] is not valid JSON; refusing to guess the caps.`);
  }
}

async function writeCapsDoc(doc: CapsDoc): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("factory_config")
    .upsert({ key: CAPS_KEY, value: JSON.stringify(doc), updated_at: new Date().toISOString() }, {
      onConflict: "key",
    });
  if (error) throw new Error(`billing caps write failed: ${error.message}`);
}

export async function getMonthlyCap(customerId: string): Promise<number> {
  return resolveMonthlyCap(await readCapsDoc(), customerId, process.env);
}

export async function setMonthlyCap(customerId: string, capUsd: number): Promise<number> {
  const doc = await readCapsDoc();
  const value = Math.round(capUsd * 100) / 100;
  doc[customerId] = { monthly_cap_usd: value, updated_at: new Date().toISOString() };
  await writeCapsDoc(doc);
  return value;
}

export interface PeriodUsage {
  periodStart: string;
  periodEnd: string;
  summary: UsageSummary;
}

export async function getPeriodUsage(customerId: string): Promise<PeriodUsage> {
  const supabase = createAdminClient();
  const { start, end } = currentPeriod();
  const { data, error, count } = await supabase
    .from("events")
    .select("created_at, payload", { count: "exact" })
    .eq("event", USAGE_EVENT)
    .contains("payload", { customer_id: customerId })
    .gte("created_at", start.toISOString())
    .lt("created_at", end.toISOString())
    .order("created_at", { ascending: false })
    .limit(MAX_LEDGER_ROWS);
  if (error) throw new Error(`usage ledger read failed: ${error.message}`);

  const rows = (data ?? []) as { created_at: string; payload: Record<string, unknown> | null }[];
  if (typeof count === "number" && count > rows.length) {
    throw new Error(
      `usage ledger holds ${count} rows for this period but only ${rows.length} were read; ` +
        `in-process aggregation is capped at ${MAX_LEDGER_ROWS}. Add an aggregate view before relying on the cap.`,
    );
  }
  return {
    periodStart: start.toISOString(),
    periodEnd: end.toISOString(),
    summary: summarizeUsage(rows),
  };
}

export interface UsageEntry {
  tool: string;
  costUsd: number;
  meterEventId?: string;
  /** The product the tool belongs to (e.g. "ledgerlink"), for per-product reporting. */
  product: string;
}

/**
 * Writes one ledger row. Deliberately NOT best-effort like `track()`: a swallowed failure here
 * would let the cap under-count on the next call. Callers surface the failure explicitly.
 */
export async function recordUsage(customerId: string, entry: UsageEntry): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("events").insert({
    event: USAGE_EVENT,
    product: entry.product || "billing",
    payload: {
      customer_id: customerId,
      tool: entry.tool,
      cost_usd: entry.costUsd,
      meter_event_id: entry.meterEventId ?? null,
    },
  });
  if (error) throw new Error(`usage ledger insert failed: ${error.message}`);
}

/**
 * Pre-flight cap gate for a metered tool.
 *
 * Returns a NextResponse to short-circuit with, or null to proceed.
 *
 * TRUST NOTE: the customer id is caller-supplied (the published manifest marks it optional, so
 * anonymous calls stay free and unbilled). This cap therefore protects a customer who *is*
 * identified against their own runaway agent spend — it is not an authentication boundary, and a
 * caller that omits the header is simply not billed. Closing that is a separate, contract-changing
 * step (required identity + manifest auth update), tracked in the PRD as D4.
 */
export async function billingCapGuard(req: NextRequest): Promise<NextResponse | null> {
  const customerId = customerIdFrom(req);
  if (!customerId) return null;

  let capUsd: number;
  let usage: PeriodUsage;
  try {
    capUsd = await getMonthlyCap(customerId);
    usage = await getPeriodUsage(customerId);
  } catch (err) {
    // Rule 5 / stripe_gating_workflow §8: a billing-DB failure must never silently allow (or
    // silently deny) a paid call — it is an explicit 500.
    console.error("[billing] cap check failed:", err);
    return NextResponse.json(
      {
        error:
          "Billing check unavailable — refusing to run a metered tool rather than risk an uncapped charge. Retry shortly.",
      },
      { status: 500 },
    );
  }

  if (usage.summary.amountUsd >= capUsd) {
    return NextResponse.json(
      {
        error:
          `Monthly spending cap reached ($${capUsd.toFixed(2)}). The cap resets at ` +
          `${usage.periodEnd}. Raise it from the billing page to continue.`,
        capUsd,
        usageUsd: usage.summary.amountUsd,
        periodStart: usage.periodStart,
        periodEnd: usage.periodEnd,
      },
      { status: 402 },
    );
  }
  return null;
}

export interface MeteringResult {
  meteredUsageReported: boolean;
  meterEventId?: string;
  usageRecorded: boolean;
  /** The amount reported to the Stripe meter, in integer cents (0 when nothing was reported). */
  meteredValueCents: number;
}

/**
 * Post-success billing for one metered call: report the Stripe meter event, then write the ledger
 * row. Anonymous calls (no customer id) do nothing. Neither failure aborts the response — the tool
 * already ran — but both are reported on the response and logged, so a failure is never silent.
 */
export async function billSuccessfulCall(
  req: NextRequest,
  entry: { tool: string; costUsd: number; product: string },
): Promise<MeteringResult> {
  const customerId = customerIdFrom(req);
  const meteredValueCents = costToCents(entry.costUsd);
  if (!customerId) {
    return { meteredUsageReported: false, usageRecorded: false, meteredValueCents };
  }

  let meteredUsageReported = false;
  let meterEventId: string | undefined;
  if (isStripeConfigured()) {
    if (meteredValueCents <= 0) {
      // A non-positive price would report value 0 and quietly bill nothing.
      console.error(
        `[billing] refusing to report a non-positive metered amount for tool '${entry.tool}' (cost ${entry.costUsd}).`,
      );
    } else {
      try {
        const meterResult = await reportMeteredUsage({ customerId, valueCents: meteredValueCents });
        meteredUsageReported = meterResult.success;
        meterEventId = meterResult.eventId;
      } catch (meterErr) {
        console.error("Failed to record metered usage:", meterErr);
      }
    }
  }

  let usageRecorded = false;
  try {
    await recordUsage(customerId, {
      tool: entry.tool,
      costUsd: entry.costUsd,
      meterEventId,
      product: entry.product,
    });
    usageRecorded = true;
  } catch (ledgerErr) {
    console.error("[billing] usage ledger write failed (cap will under-count this call):", ledgerErr);
  }

  return { meteredUsageReported, meterEventId, usageRecorded, meteredValueCents };
}
