import { NextRequest, NextResponse } from "next/server";
import {
  selfEmployment2026Engine,
  calculateSelfEmployment2026,
  type SelfEmployment2026Input,
} from "@/lib/calc/selfEmployment2026";
import {
  reconcileStripePayout,
  normalizeStripeExport,
  type StripeReconInput,
  type StripeReconOutput,
} from "@/lib/calc/stripeRecon";
import { fetchPayoutBundleWithKey } from "@/lib/stripe/ledgerlink";
import { reportMeteredUsage } from "@/lib/stripe/meter";
import { track } from "@/lib/telemetry";

interface LedgerlinkAgentInput {
  account_id?: string;
  period?: string;
  payout_id?: string;
  stripe_restricted_key?: string;
  export_json?: string;
}

async function runLedgerlinkReconciliation(
  input: LedgerlinkAgentInput,
): Promise<StripeReconOutput> {
  // SCOPE GUARD: LedgerLink must NEVER fall back to the factory's own Stripe key.
  // The engine is fed either a customer read-only restricted key OR a pasted
  // Stripe JSON export. If neither is provided, fail loudly — no silent fallback.
  if (input.export_json && typeof input.export_json === "string" && input.export_json.trim()) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(input.export_json);
    } catch (err) {
      throw new Error(
        `export_json is not valid JSON: ${err instanceof Error ? err.message : "parse failure"}`,
      );
    }
    const normalized = normalizeStripeExport(parsed);
    return reconcileStripePayout(normalized.payout, normalized.balanceTransactions);
  }

  if (input.stripe_restricted_key && input.stripe_restricted_key.trim()) {
    const bundle = await fetchPayoutBundleWithKey({
      stripeRestrictedKey: input.stripe_restricted_key,
      accountId: input.account_id,
      payoutId: input.payout_id,
      period: input.period,
    });
    const engineInput: StripeReconInput = {
      payout: bundle.payout,
      balanceTransactions: bundle.balanceTransactions,
    };
    const validation = stripeReconEngineValidate(engineInput);
    if (!validation.valid) {
      throw new Error(`Reconciliation input invalid: ${validation.errors?.join("; ")}`);
    }
    return reconcileStripePayout(bundle.payout, bundle.balanceTransactions);
  }

  throw new Error(
    "LedgerLink needs EITHER a pasted Stripe export (export_json) or a customer read-only restricted key (stripe_restricted_key). No factory key fallback — nothing to reconcile.",
  );
}

// Local validate to avoid importing the engine object (keeps named exports tidy).
function stripeReconEngineValidate(input: StripeReconInput) {
  const errors: string[] = [];
  if (!input?.payout || typeof input.payout.amount !== "number" || Number.isNaN(input.payout.amount)) {
    errors.push("payout.amount must be a valid number.");
  }
  if (!Array.isArray(input?.balanceTransactions)) {
    errors.push("balanceTransactions must be an array.");
  }
  return { valid: errors.length === 0, errors: errors.length ? errors : undefined };
}

export async function POST(req: NextRequest) {
  try {
    const toolName = req.headers.get("x-webmcp-tool") || "calculate_qbi_deduction";

    // --- LedgerLink: reconcile_stripe_payout (metered WebMCP tool) ---
    if (toolName === "reconcile_stripe_payout") {
      const input: LedgerlinkAgentInput = await req.json();
      const result = await runLedgerlinkReconciliation(input);

      await track("agent_query", { tool: "reconcile_stripe_payout" }, "ledgerlink");

      const customerId =
        req.headers.get("x-stripe-customer-id") || req.headers.get("x-customer-id");
      let meteredUsageReported = false;
      let meterEventId: string | undefined;
      if (customerId && process.env.STRIPE_SECRET_KEY) {
        try {
          const meterResult = await reportMeteredUsage({
            customerId,
            eventName: "agent_reconciliation",
            value: 1, // 1 query @ $0.25
          });
          meteredUsageReported = meterResult.success;
          meterEventId = meterResult.eventId;
        } catch (meterErr) {
          console.error("Failed to record metered usage:", meterErr);
        }
      }

      return NextResponse.json({
        success: true,
        data: result,
        metering: {
          meteredUsageReported,
          meterEventId,
          costPerQueryUsd: 0.25,
        },
        computedAt: new Date().toISOString(),
      });
    }

    // --- QuarterLine: legacy self-employment / QBI tools ---
    const input: SelfEmployment2026Input = await req.json();

    const validation = selfEmployment2026Engine.validate(input);
    if (!validation.valid) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.errors },
        { status: 400 },
      );
    }

    const result = calculateSelfEmployment2026(input);

    // Record the agent query for the growth kill/scale gates (best-effort).
    await track("agent_query", { tool: toolName });

    // If request contains Stripe Customer ID for agent billing, report $0.25 metered usage
    const customerId =
      req.headers.get("x-stripe-customer-id") ||
      req.headers.get("x-customer-id");

    let meteredUsageReported = false;
    let meterEventId: string | undefined;

    if (customerId && process.env.STRIPE_SECRET_KEY) {
      try {
        const meterResult = await reportMeteredUsage({
          customerId,
          eventName: "agent_tax_calculation",
          value: 1, // 1 query @ $0.25
        });
        meteredUsageReported = meterResult.success;
        meterEventId = meterResult.eventId;
      } catch (meterErr) {
        console.error("Failed to record metered usage:", meterErr);
      }
    }

    return NextResponse.json({
      success: true,
      data: result,
      metering: {
        meteredUsageReported,
        meterEventId,
        costPerQueryUsd: 0.25,
      },
      computedAt: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Agent calculation failure";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
