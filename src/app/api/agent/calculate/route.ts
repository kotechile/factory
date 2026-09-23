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
import {
  EinvoiceFieldError,
  checkEuVatId,
  convertInvoiceToFacturX,
  validateEinvoice,
  validateEinvoiceXml,
  type EinvoiceInput,
  type TargetCountry,
  type TargetFormat,
} from "@/lib/calc/einvoice";
import {
  ParcelAuditFieldError,
  auditInvoiceCsv,
  computeBillableWeight,
  type Carrier,
  type ServiceCode,
} from "@/lib/calc/parcelaudit";
import {
  CaseProofInputError,
  afterTaxPayback,
  auditCase,
  compareBids,
  readCaseInput,
} from "@/lib/calc/caseproof";
import { fetchPayoutBundleWithKey } from "@/lib/stripe/ledgerlink";
import { reportMeteredUsage } from "@/lib/stripe/meter";
import { isStripeConfigured } from "@/lib/stripe/mode";
import { track } from "@/lib/telemetry";
import {
  DEFAULT_AGENT_TOOL,
  SUPPORTED_AGENT_TOOLS,
  isSupportedAgentTool,
} from "@/lib/webmcp/agentTools";

interface LedgerlinkAgentInput {
  account_id?: string;
  period?: string;
  payout_id?: string;
  stripe_restricted_key?: string;
  export_json?: string;
}

interface FacturgateAgentInput {
  xml?: string;
  invoice?: string | Record<string, unknown>;
  target_country?: string;
  target_format?: string;
  vat_id?: string;
  country?: string;
}

/** PRD §3 agent-tier rates, per tool. */
const FACTURGATE_PRICE_USD: Record<string, number> = {
  validate_einvoice: 0.1,
  convert_invoice_to_facturx: 0.25,
  check_eu_vat_id: 0.05,
};

const FACTURGATE_METER_EVENT: Record<string, string> = {
  validate_einvoice: "agent_einvoice_validation",
  convert_invoice_to_facturx: "agent_einvoice_conversion",
  check_eu_vat_id: "agent_vat_id_check",
};

/** ParcelProof pricing per the PRD §3 agent tier. */
const PARCELAUDIT_PRICE_USD: Record<string, number> = {
  audit_carrier_invoice: 0.25,
  compute_billable_weight: 0.05,
};

const PARCELAUDIT_METER_EVENT: Record<string, string> = {
  audit_carrier_invoice: "agent_parcel_audit",
  compute_billable_weight: "agent_billable_weight",
};

interface ParcelproofAgentInput {
  shipment_records?: unknown;
  invoice_lines?: unknown;
  rate_card?: unknown;
  as_of_date?: unknown;
  carrier?: unknown;
  service?: unknown;
  ship_date?: unknown;
  length?: unknown;
  width?: unknown;
  height?: unknown;
  actual_weight_lb?: unknown;
}

/** CaseProof pricing per PRD §3: $0.50 per agent call on the audit tier. */
const CASEPROOF_PRICE_USD: Record<string, number> = {
  audit_automation_case: 0.5,
  compare_automation_bids: 0.5,
  after_tax_payback: 0.5,
};

const CASEPROOF_METER_EVENT: Record<string, string> = {
  audit_automation_case: "agent_case_audit",
  compare_automation_bids: "agent_case_comparison",
  after_tax_payback: "agent_after_tax_payback",
};

interface CaseProofAgentInput {
  case?: unknown;
}

/**
 * Reads the case an agent sends: a JSON string (the documented shape) or an already-parsed object.
 * A missing or unreadable case is refused with the field named — there is no default case.
 */
function parseCasePayload(value: unknown, toolName: string): unknown {
  if (typeof value === "string") {
    if (!value.trim()) {
      throw new CaseProofInputError(
        "cp-case-empty",
        "case",
        `${toolName} received an empty \`case\`. Nothing was audited.`,
      );
    }
    try {
      return JSON.parse(value);
    } catch (error) {
      throw new CaseProofInputError(
        "cp-case-json",
        "case",
        `\`case\` is not valid JSON: ${error instanceof Error ? error.message : "parse failure"}. Nothing was audited.`,
      );
    }
  }
  if (value && typeof value === "object" && !Array.isArray(value)) return value;
  throw new CaseProofInputError(
    "cp-case-missing",
    "case",
    `${toolName} needs the case in \`case\` (a JSON string or an object) shaped { baseline, finance, options[] }. Nothing was audited.`,
  );
}

function requiredString(value: unknown, name: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`\`${name}\` is required and must be the CSV text to audit.`);
  }
  return value;
}

function requiredNumber(value: unknown, name: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`\`${name}\` is required and must be a finite number.`);
  }
  return value;
}

/**
 * ParcelProof agent tier: audit_carrier_invoice / compute_billable_weight.
 *
 * The deterministic engine runs in-process on the CSV text the agent supplies. `as_of_date`
 * defaults to the server's UTC date (the request default declared in the tool schema, not an
 * inferred value); everything else must be supplied, and an out-of-scope carrier/service or a
 * malformed CSV is an explicit 400 carrying the rule id — never a defaulted divisor.
 */
function runParcelproofTool(
  toolName: string,
  body: ParcelproofAgentInput,
): { data: unknown; costPerQueryUsd: number } {
  if (toolName === "compute_billable_weight") {
    const carrier = requiredString(body.carrier, "carrier") as Carrier;
    const service = requiredString(body.service, "service") as ServiceCode;
    const shipDate = requiredString(body.ship_date, "ship_date");
    const data = computeBillableWeight({
      carrier,
      service,
      shipDate,
      dims: {
        length: requiredNumber(body.length, "length"),
        width: requiredNumber(body.width, "width"),
        height: requiredNumber(body.height, "height"),
      },
      actualWeightLb: requiredNumber(body.actual_weight_lb, "actual_weight_lb"),
    });
    return { data, costPerQueryUsd: PARCELAUDIT_PRICE_USD[toolName] ?? 0.05 };
  }

  const shipmentRecordsCsv = requiredString(body.shipment_records, "shipment_records");
  const invoiceLinesCsv = requiredString(body.invoice_lines, "invoice_lines");
  const rateCardCsv = typeof body.rate_card === "string" ? body.rate_card : undefined;
  const asOfDate =
    typeof body.as_of_date === "string" && body.as_of_date.trim()
      ? body.as_of_date.trim()
      : new Date().toISOString().slice(0, 10);
  const carrier = typeof body.carrier === "string" && body.carrier.trim() ? (body.carrier.trim() as Carrier) : undefined;

  const data = auditInvoiceCsv({
    shipmentRecordsCsv,
    invoiceLinesCsv,
    asOfDate,
    ...(rateCardCsv === undefined ? {} : { rateCardCsv }),
    ...(carrier === undefined ? {} : { carrier }),
  });
  return { data, costPerQueryUsd: PARCELAUDIT_PRICE_USD[toolName] ?? 0.25 };
}

const QUARTERLINE_TOOLS = ["calculate_qbi_deduction", "calculate_quarterly_estimate"];

/** Parses the canonical invoice model an agent sends as a JSON string (or an object). */
function parseCanonicalInvoice(value: unknown, toolName: string): EinvoiceInput {
  if (typeof value === "string") {
    if (!value.trim()) throw new Error(`${toolName} received an empty \`invoice\` payload.`);
    let parsed: unknown;
    try {
      parsed = JSON.parse(value);
    } catch (error) {
      throw new Error(
        `\`invoice\` is not valid JSON: ${error instanceof Error ? error.message : "parse failure"}`,
      );
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("`invoice` must be a JSON object shaped { seller, buyer, invoice, targetCountry?, targetFormat? }.");
    }
    return parsed as EinvoiceInput;
  }
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as EinvoiceInput;
  }
  throw new Error(
    `${toolName} needs the canonical invoice model in \`invoice\` (JSON string or object). Nothing was validated.`,
  );
}

function targetOptions(body: FacturgateAgentInput): { targetCountry?: TargetCountry; targetFormat?: TargetFormat } {
  const options: { targetCountry?: TargetCountry; targetFormat?: TargetFormat } = {};
  if (typeof body.target_country === "string" && body.target_country.trim()) {
    options.targetCountry = body.target_country.trim().toUpperCase() as TargetCountry;
  }
  if (typeof body.target_format === "string" && body.target_format.trim()) {
    options.targetFormat = body.target_format.trim().toLowerCase() as TargetFormat;
  }
  return options;
}

/**
 * FacturGate agent tier: validate_einvoice / convert_invoice_to_facturx / check_eu_vat_id.
 * The deterministic engine runs in-process; an out-of-scope target or an unreadable document is an
 * explicit 400 carrying the rule id — never a silent fallback to a default rule set.
 */
async function runFacturgateTool(
  toolName: string,
  body: FacturgateAgentInput,
): Promise<{ data: unknown; costPerQueryUsd: number }> {
  const options = targetOptions(body);
  let data: unknown;

  if (toolName === "check_eu_vat_id") {
    if (typeof body.vat_id !== "string" || !body.vat_id.trim()) {
      throw new Error("check_eu_vat_id requires `vat_id`.");
    }
    if (typeof body.country !== "string" || !body.country.trim()) {
      throw new Error("check_eu_vat_id requires `country`.");
    }
    data = checkEuVatId(body.vat_id, body.country);
  } else if (toolName === "validate_einvoice" && typeof body.xml === "string" && body.xml.trim()) {
    data = validateEinvoiceXml(body.xml, options);
  } else {
    if (typeof body.xml === "string" && body.xml.trim()) {
      throw new Error(`${toolName} takes a canonical invoice model in \`invoice\`, not an XML document.`);
    }
    const input = parseCanonicalInvoice(body.invoice, toolName);
    data =
      toolName === "convert_invoice_to_facturx"
        ? convertInvoiceToFacturX({ ...input, ...options })
        : validateEinvoice({ ...input, ...options });
  }

  return { data, costPerQueryUsd: FACTURGATE_PRICE_USD[toolName] ?? 0.25 };
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
    const requestedTool = (req.headers.get("x-webmcp-tool") || DEFAULT_AGENT_TOOL).trim();

    // No silent fallback (factory rule 5): an unadvertised tool name is an explicit 400,
    // never a quiet run of the default engine. The allowlist and the published listing
    // (/.well-known/mcp.json) are both generated from src/lib/webmcp/register.ts and are
    // held in sync by src/lib/webmcp/manifest.test.ts.
    if (!isSupportedAgentTool(requestedTool)) {
      const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "https://apps.giniloh.com").replace(/\/$/, "");
      return NextResponse.json(
        {
          error: `Unsupported tool '${requestedTool}'.`,
          supportedTools: SUPPORTED_AGENT_TOOLS,
          manifest: `${baseUrl}/.well-known/mcp.json`,
        },
        { status: 400 },
      );
    }

    const toolName = requestedTool;

    // --- LedgerLink: reconcile_stripe_payout (metered WebMCP tool) ---
    if (toolName === "reconcile_stripe_payout") {
      const input: LedgerlinkAgentInput = await req.json();
      const result = await runLedgerlinkReconciliation(input);

      await track("agent_query", { tool: "reconcile_stripe_payout" }, "ledgerlink");

      const customerId =
        req.headers.get("x-stripe-customer-id") || req.headers.get("x-customer-id");
      let meteredUsageReported = false;
      let meterEventId: string | undefined;
      if (customerId && isStripeConfigured()) {
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

    // --- FacturGate: validate_einvoice / convert_invoice_to_facturx / check_eu_vat_id ---
    if (toolName in FACTURGATE_PRICE_USD) {
      const body = (await req.json()) as FacturgateAgentInput;

      let result: { data: unknown; costPerQueryUsd: number };
      try {
        result = await runFacturgateTool(toolName, body);
      } catch (toolError) {
        if (toolError instanceof EinvoiceFieldError) {
          // An out-of-scope target or an unmappable field: explicit, with the rule id (rule 5).
          return NextResponse.json(
            { error: toolError.message, ruleId: toolError.ruleId, fieldPath: toolError.fieldPath },
            { status: 400 },
          );
        }
        return NextResponse.json(
          { error: toolError instanceof Error ? toolError.message : "FacturGate request failed" },
          { status: 400 },
        );
      }

      await track("agent_query", { tool: toolName }, "facturgate");

      const customerId =
        req.headers.get("x-stripe-customer-id") || req.headers.get("x-customer-id");
      let meteredUsageReported = false;
      let meterEventId: string | undefined;
      if (customerId && isStripeConfigured()) {
        try {
          const meterResult = await reportMeteredUsage({
            customerId,
            eventName: FACTURGATE_METER_EVENT[toolName] ?? "agent_query",
            value: 1,
          });
          meteredUsageReported = meterResult.success;
          meterEventId = meterResult.eventId;
        } catch (meterErr) {
          console.error("Failed to record metered usage:", meterErr);
        }
      }

      return NextResponse.json({
        success: true,
        data: result.data,
        metering: {
          meteredUsageReported,
          meterEventId,
          costPerQueryUsd: result.costPerQueryUsd,
          meterEventName: FACTURGATE_METER_EVENT[toolName],
        },
        computedAt: new Date().toISOString(),
      });
    }

    // --- ParcelProof: audit_carrier_invoice / compute_billable_weight ---
    if (toolName in PARCELAUDIT_PRICE_USD) {
      const body = (await req.json()) as ParcelproofAgentInput;

      let result: { data: unknown; costPerQueryUsd: number };
      try {
        result = runParcelproofTool(toolName, body);
      } catch (toolError) {
        if (toolError instanceof ParcelAuditFieldError) {
          // A malformed CSV cell, an unmapped service or an out-of-range ship date: explicit, with
          // the rule id and the field path (rule 5 — no defaulted divisor, no partial audit).
          return NextResponse.json(
            { error: toolError.message, ruleId: toolError.ruleId, fieldPath: toolError.fieldPath },
            { status: 400 },
          );
        }
        return NextResponse.json(
          { error: toolError instanceof Error ? toolError.message : "ParcelProof request failed" },
          { status: 400 },
        );
      }

      await track("agent_query", { tool: toolName }, "parcelproof");

      const customerId =
        req.headers.get("x-stripe-customer-id") || req.headers.get("x-customer-id");
      let meteredUsageReported = false;
      let meterEventId: string | undefined;
      if (customerId && isStripeConfigured()) {
        try {
          const meterResult = await reportMeteredUsage({
            customerId,
            eventName: PARCELAUDIT_METER_EVENT[toolName] ?? "agent_query",
            value: 1,
          });
          meteredUsageReported = meterResult.success;
          meterEventId = meterResult.eventId;
        } catch (meterErr) {
          console.error("Failed to record metered usage:", meterErr);
        }
      }

      return NextResponse.json({
        success: true,
        data: result.data,
        metering: {
          meteredUsageReported,
          meterEventId,
          costPerQueryUsd: result.costPerQueryUsd,
          meterEventName: PARCELAUDIT_METER_EVENT[toolName],
        },
        computedAt: new Date().toISOString(),
      });
    }

    // --- CaseProof: audit_automation_case / compare_automation_bids / after_tax_payback ---
    if (toolName in CASEPROOF_PRICE_USD) {
      const body = (await req.json()) as CaseProofAgentInput;

      let data: unknown;
      let costPerQueryUsd = CASEPROOF_PRICE_USD[toolName] ?? 0.5;
      try {
        const caseInput = readCaseInput(parseCasePayload(body.case, toolName));
        if (toolName === "audit_automation_case") {
          data = auditCase(caseInput);
        } else if (toolName === "compare_automation_bids") {
          if (caseInput.options.length < 2) {
            throw new CaseProofInputError(
              "cp-compare-options",
              "case.options",
              "`compare_automation_bids` needs at least two bids to compare; the case holds one. Nothing was audited.",
            );
          }
          data = compareBids({
            baseline: caseInput.baseline,
            finance: caseInput.finance,
            options: caseInput.options,
          });
        } else {
          data = afterTaxPayback(caseInput);
        }
        costPerQueryUsd = CASEPROOF_PRICE_USD[toolName] ?? 0.5;
      } catch (toolError) {
        if (toolError instanceof CaseProofInputError) {
          // A malformed case, an uncited tax year, an unsupported model: explicit, with the rule id
          // and the field path (rule 5 — no default case, no partially-audited result).
          return NextResponse.json(
            { error: toolError.message, ruleId: toolError.ruleId, fieldPath: toolError.fieldPath },
            { status: 400 },
          );
        }
        return NextResponse.json(
          { error: toolError instanceof Error ? toolError.message : "CaseProof request failed" },
          { status: 400 },
        );
      }

      await track("agent_query", { tool: toolName }, "caseproof");

      const caseCustomerId =
        req.headers.get("x-stripe-customer-id") || req.headers.get("x-customer-id");
      let caseMetered = false;
      let caseMeterEventId: string | undefined;
      if (caseCustomerId && isStripeConfigured()) {
        try {
          const meterResult = await reportMeteredUsage({
            customerId: caseCustomerId,
            eventName: CASEPROOF_METER_EVENT[toolName] ?? "agent_query",
            value: 1,
          });
          caseMetered = meterResult.success;
          caseMeterEventId = meterResult.eventId;
        } catch (meterErr) {
          console.error("Failed to record metered usage:", meterErr);
        }
      }

      return NextResponse.json({
        success: true,
        data,
        metering: {
          meteredUsageReported: caseMetered,
          meterEventId: caseMeterEventId,
          costPerQueryUsd,
          meterEventName: CASEPROOF_METER_EVENT[toolName],
        },
        computedAt: new Date().toISOString(),
      });
    }

    // A tool advertised in the manifest but not implemented here must not silently fall through to
    // another product's engine.
    if (!QUARTERLINE_TOOLS.includes(toolName)) {
      return NextResponse.json(
        {
          error: `Tool '${toolName}' is advertised but has no implementation in this route.`,
          supportedTools: SUPPORTED_AGENT_TOOLS,
        },
        { status: 501 },
      );
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

    if (customerId && isStripeConfigured()) {
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
