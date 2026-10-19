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
import {
  ExtractionUnavailableError,
  SpendProofFieldError,
  extractStructuredFields,
  parseDocumentToText,
  parseLedgerCsv,
  reconcileInvoice,
  resolveExtractionCredentials,
  toInvoiceFromExtraction,
  type ExtractionCredentials,
  type ExtractionTransport,
} from "@/lib/calc/spendproof";
import {
  RatchetProofExtractionUnavailableError as RatchetExtractionUnavailableError,
  RatchetProofFieldError,
  auditDemandBilling,
  extractBills as extractRatchetProofBills,
  extractTariff as extractRatchetProofTariff,
  parseBillsCsv as parseRatchetProofBillsCsv,
  parseIntervalFile as parseRatchetProofInterval,
  parseTariffJson as parseRatchetProofTariffJson,
  resolveExtractionCredentials as resolveRatchetProofCredentials,
  type BillRecord as RatchetProofBillRecord,
  type ExtractionCredentials as RatchetProofCredentials,
  type PeakHistoryEntry,
  type Tariff as RatchetProofTariff,
} from "@/lib/calc/ratchetproof";
import { fetchPayoutBundleWithKey } from "@/lib/stripe/ledgerlink";
import { siteOrigin } from "@/lib/site-origin";
import { billSuccessfulCall, billingCapGuard } from "@/lib/billing/ledger";
import { agentRateForTool, agentRatesForProduct } from "@/products/pricing";
import { track } from "@/lib/telemetry";
import { classifyRequest } from "@/lib/traffic-class";
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

/**
 * Agent-tier rates. Sourced from the single pricing catalog (src/products/pricing.ts) so the price
 * the API charges and the price every page displays cannot drift apart; the catalog's drift test
 * fails the build if a tool is missing a rate.
 */
const FACTURGATE_PRICE_USD = agentRatesForProduct("facturgate");

// Metering no longer uses a per-tool event name: Stripe binds a meter to ONE event name, so every
// tool reports under one meter with `value` = the charge in cents (src/lib/stripe/meter.ts).

/** ParcelProof rates, from the pricing catalog. */
const PARCELAUDIT_PRICE_USD = agentRatesForProduct("parcelproof");

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

/** CaseProof rates, from the pricing catalog ($0.50 per agent call on the audit tier). */
const CASEPROOF_PRICE_USD = agentRatesForProduct("caseproof");

/**
 * SpendProof rates, from the pricing catalog — the factory's LLM/parse-backed class, priced in the
 * higher band because the extraction layer pays a real per-call cost (parse + generate + retries).
 */
const SPENDPROOF_PRICE_USD = agentRatesForProduct("spendproof");

/** RatchetProof rates, from the pricing catalog. */
const RATCHETPROOF_PRICE_USD = agentRatesForProduct("ratchetproof");

/**
 * The network boundary for the extraction layer, supplied by the route (the engine folder holds no
 * `fetch`, so the deterministic core stays fixture-testable offline).
 */
const serviceExtractionTransport: ExtractionTransport = async (request) => {
  const response = await fetch(request.url, {
    method: request.method,
    headers: request.headers,
    body: request.body,
  });
  return { ok: response.ok, status: response.status, text: () => response.text() };
};

/**
 * Resolves the extraction credentials, or returns the explicit refusal to send.
 *
 * SpendProof is the first product whose pipeline needs a model key, and the deploy carries none
 * until the owner adds one (a document-parse key is needed only when a DOCUMENT is sent; this tool's
 * `invoice` is text, so it needs no parse service at all). This is the loud door: no stub, no
 * fabricated field, no degraded substitute (rule 5). It runs BEFORE the cap gate and before any
 * `track()` / metering, so an unconfigured deploy never looks like a served call.
 */
function resolveSpendProofCredentials():
  | { ok: true; credentials: ExtractionCredentials }
  | { ok: false; body: Record<string, unknown> } {
  try {
    return { ok: true, credentials: resolveExtractionCredentials() };
  } catch (error) {
    if (!(error instanceof ExtractionUnavailableError)) throw error;
    return {
      ok: false,
      body: {
        error: error.message,
        code: error.code,
        ruleId: error.ruleId,
        missing: error.missing,
      },
    };
  }
}

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
    // Internal-traffic marker (src/lib/traffic-class.ts): a metered call made by our own suite or a
    // post-deploy probe is `internal`, so the agent_query gate leg keeps reading real demand. Decided
    // from the request, once, and passed to every track() call below.
    const traffic = classifyRequest(req);

    // No silent fallback (factory rule 5): an unadvertised tool name is an explicit 400,
    // never a quiet run of the default engine. The allowlist and the published listing
    // (/.well-known/mcp.json) are both generated from src/lib/webmcp/register.ts and are
    // held in sync by src/lib/webmcp/manifest.test.ts.
    if (!isSupportedAgentTool(requestedTool)) {
      const baseUrl = siteOrigin();
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
      // Cap gate runs BEFORE the tool (V1.2): an over-cap call is a 402 and the engine never runs.
      const capped = await billingCapGuard(req);
      if (capped) return capped;

      const input: LedgerlinkAgentInput = await req.json();
      const result = await runLedgerlinkReconciliation(input);

      await track("agent_query", { tool: "reconcile_stripe_payout" }, "ledgerlink", traffic);

      const metering = await billSuccessfulCall(req, {
        tool: "reconcile_stripe_payout",
        costUsd: agentRateForTool("reconcile_stripe_payout"),
        product: "ledgerlink",
      });

      return NextResponse.json({
        success: true,
        data: result,
        metering: {
          meteredUsageReported: metering.meteredUsageReported,
          meterEventId: metering.meterEventId,
          usageRecorded: metering.usageRecorded,
          meteredCents: metering.meteredValueCents,
          costPerQueryUsd: 0.25,
        },
        computedAt: new Date().toISOString(),
      });
    }

    // --- FacturGate: validate_einvoice / convert_invoice_to_facturx / check_eu_vat_id ---
    if (toolName in FACTURGATE_PRICE_USD) {
      // Cap gate runs BEFORE the tool (V1.2).
      const capped = await billingCapGuard(req);
      if (capped) return capped;

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

      await track("agent_query", { tool: toolName }, "facturgate", traffic);

      const metering = await billSuccessfulCall(req, {
        tool: toolName,
        costUsd: result.costPerQueryUsd,
        product: "facturgate",
      });

      return NextResponse.json({
        success: true,
        data: result.data,
        metering: {
          meteredUsageReported: metering.meteredUsageReported,
          meterEventId: metering.meterEventId,
          usageRecorded: metering.usageRecorded,
          meteredCents: metering.meteredValueCents,
          costPerQueryUsd: result.costPerQueryUsd,
        },
        computedAt: new Date().toISOString(),
      });
    }

    // --- ParcelProof: audit_carrier_invoice / compute_billable_weight ---
    if (toolName in PARCELAUDIT_PRICE_USD) {
      // Cap gate runs BEFORE the tool (V1.2).
      const capped = await billingCapGuard(req);
      if (capped) return capped;

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

      await track("agent_query", { tool: toolName }, "parcelproof", traffic);

      const metering = await billSuccessfulCall(req, {
        tool: toolName,
        costUsd: result.costPerQueryUsd,
        product: "parcelproof",
      });

      return NextResponse.json({
        success: true,
        data: result.data,
        metering: {
          meteredUsageReported: metering.meteredUsageReported,
          meterEventId: metering.meterEventId,
          usageRecorded: metering.usageRecorded,
          meteredCents: metering.meteredValueCents,
          costPerQueryUsd: result.costPerQueryUsd,
        },
        computedAt: new Date().toISOString(),
      });
    }

    // --- CaseProof: audit_automation_case / compare_automation_bids / after_tax_payback ---
    if (toolName in CASEPROOF_PRICE_USD) {
      // Cap gate runs BEFORE the tool (V1.2).
      const capped = await billingCapGuard(req);
      if (capped) return capped;

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

      await track("agent_query", { tool: toolName }, "caseproof", traffic);

      const metering = await billSuccessfulCall(req, {
        tool: toolName,
        costUsd: costPerQueryUsd,
        product: "caseproof",
      });

      return NextResponse.json({
        success: true,
        data,
        metering: {
          meteredUsageReported: metering.meteredUsageReported,
          meterEventId: metering.meterEventId,
          usageRecorded: metering.usageRecorded,
          meteredCents: metering.meteredValueCents,
          costPerQueryUsd,
        },
        computedAt: new Date().toISOString(),
      });
    }

    // --- RatchetProof: audit_demand_billing (an LLM/parse-backed extraction layer in front of the
    // deterministic billed-demand engine). The engine's numbers never come from a model; the reader
    // only fills declared tariff/bill fields, and an unstated clause blocks that month.
    //
    // The key is required ONLY when a document actually has to be read: a declared tariff JSON and a
    // bills CSV are structured input, so that path runs with no credential at all. When a document IS
    // sent, an unconfigured deploy is an explicit 503 naming the variable — before the cap gate and
    // before any telemetry, never a stub.
    if (toolName in RATCHETPROOF_PRICE_USD) {
      const body = (await req.json()) as {
        interval?: unknown;
        tariff?: unknown;
        bills?: unknown;
        seed_history?: unknown;
      };
      const intervalText =
        typeof body.interval === "string" && body.interval.trim() ? body.interval : null;
      const tariffText =
        typeof body.tariff === "string" && body.tariff.trim() ? body.tariff : null;
      const billsText = typeof body.bills === "string" && body.bills.trim() ? body.bills : null;
      if (!intervalText || !tariffText || !billsText) {
        return NextResponse.json(
          {
            error:
              "`interval` (the meter export), `tariff` (the clause set or the tariff text) and `bills` (the bill figures or bill text) are all required. Nothing was audited.",
            ruleId: "rp-field-invalid",
            fieldPath: !intervalText ? "interval" : !tariffText ? "tariff" : "bills",
          },
          { status: 400 },
        );
      }

      const tariffIsDeclared = tariffText.trim().startsWith("{");
      const billsIsCsv = /(^|\n)\s*"?month"?\s*,/i.test(billsText);
      let credentials: RatchetProofCredentials | null = null;
      if (!tariffIsDeclared || !billsIsCsv) {
        try {
          credentials = resolveRatchetProofCredentials();
        } catch (credentialError) {
          if (credentialError instanceof RatchetExtractionUnavailableError) {
            return NextResponse.json(
              {
                error: credentialError.message,
                code: credentialError.code,
                ruleId: credentialError.ruleId,
                missing: credentialError.missing,
              },
              { status: 503 },
            );
          }
          throw credentialError;
        }
      }

      // Cap gate runs BEFORE the (possibly paid) extraction.
      const capped = await billingCapGuard(req);
      if (capped) return capped;

      let data: unknown;
      const costPerQueryUsd = RATCHETPROOF_PRICE_USD[toolName] ?? 1.5;
      try {
        const parsedIntervals = parseRatchetProofInterval(intervalText);

        let tariff: RatchetProofTariff;
        if (tariffIsDeclared) {
          tariff = parseRatchetProofTariffJson(tariffText);
        } else {
          const extracted = await extractRatchetProofTariff({
            document: { text: tariffText, name: "tariff" },
            credentials: credentials as RatchetProofCredentials,
            transport: serviceExtractionTransport,
          });
          tariff = extracted.tariff;
        }

        let bills: RatchetProofBillRecord[];
        if (billsIsCsv) {
          bills = parseRatchetProofBillsCsv(billsText);
        } else {
          const extracted = await extractRatchetProofBills({
            document: { text: billsText, name: "bills" },
            billCount: Array.isArray(body.seed_history) ? body.seed_history.length + 1 : 12,
            credentials: credentials as RatchetProofCredentials,
            transport: serviceExtractionTransport,
          });
          bills = extracted.bills;
        }

        const seedHistory: PeakHistoryEntry[] = Array.isArray(body.seed_history)
          ? (body.seed_history as { month?: unknown; peak_kw?: unknown }[]).map((entry) => {
              if (typeof entry?.month !== "string" || typeof entry?.peak_kw !== "number") {
                throw new RatchetProofFieldError(
                  "rp-history-window",
                  "seed_history",
                  "Each `seed_history` entry must be { month: 'YYYY-MM', peak_kw: number }. Nothing was audited.",
                );
              }
              return { month: entry.month, peakKwMilli: Math.round(entry.peak_kw * 1000) };
            })
          : [];

        const report = auditDemandBilling({
          tariff,
          meters: parsedIntervals.meters,
          bills,
          seedHistory,
        });
        data = {
          report,
          format: parsedIntervals.format,
          unmappedColumns: parsedIntervals.unmappedColumns,
          note: "Every figure was computed by the deterministic engine; a document reader filled declared fields only, and an unreadable or unstated clause blocked the month it affects.",
        };
      } catch (toolError) {
        if (toolError instanceof RatchetExtractionUnavailableError) {
          return NextResponse.json(
            {
              error: toolError.message,
              code: toolError.code,
              ruleId: toolError.ruleId,
              missing: toolError.missing,
            },
            { status: 503 },
          );
        }
        if (toolError instanceof RatchetProofFieldError) {
          return NextResponse.json(
            { error: toolError.message, ruleId: toolError.ruleId, fieldPath: toolError.fieldPath },
            { status: 400 },
          );
        }
        return NextResponse.json(
          {
            error:
              toolError instanceof Error ? toolError.message : "RatchetProof request failed",
          },
          { status: 400 },
        );
      }

      await track("agent_query", { tool: toolName }, "ratchetproof", traffic);

      const metering = await billSuccessfulCall(req, {
        tool: toolName,
        costUsd: costPerQueryUsd,
        product: "ratchetproof",
      });

      return NextResponse.json({
        success: true,
        data,
        metering: {
          meteredUsageReported: metering.meteredUsageReported,
          meterEventId: metering.meterEventId,
          usageRecorded: metering.usageRecorded,
          meteredCents: metering.meteredValueCents,
          costPerQueryUsd,
        },
        computedAt: new Date().toISOString(),
      });
    }

    // --- SpendProof: reconcile_ai_invoice (an LLM/parse-backed extraction layer in front of the
    // deterministic engine). The extraction reads the invoice document into the DECLARED field set;
    // the reconciliation itself is the deterministic engine, and no number in its report comes from
    // the model. An unconfigured deploy is an explicit 503 naming the missing env vars, before the
    // cap gate and before any telemetry — never a stub, a fabricated field or a degraded substitute.
    if (toolName in SPENDPROOF_PRICE_USD) {
      const resolved = resolveSpendProofCredentials();
      if (!resolved.ok) {
        return NextResponse.json(resolved.body, { status: 503 });
      }

      // Cap gate runs BEFORE the tool (V1.2).
      const capped = await billingCapGuard(req);
      if (capped) return capped;

      const body = (await req.json()) as {
        invoice?: unknown;
        ledger?: unknown;
        tolerance_bps?: unknown;
      };

      let data: unknown;
      const costPerQueryUsd = SPENDPROOF_PRICE_USD[toolName] ?? 1.5;
      try {
        const documentText = requiredString(body.invoice, "invoice");
        const ledgerCsv = requiredString(body.ledger, "ledger");
        const ledgerIngest = parseLedgerCsv(ledgerCsv);

        const parsedText = await parseDocumentToText({
          document: { text: documentText, name: "provider-invoice" },
          credentials: resolved.credentials,
          transport: serviceExtractionTransport,
        });
        const record = await extractStructuredFields({
          documentText: parsedText,
          credentials: resolved.credentials,
          transport: serviceExtractionTransport,
        });
        const extracted = toInvoiceFromExtraction(record);
        if (extracted.blocked || !extracted.invoice) {
          // An unreadable region or an unstated field withholds the verdict (rule 5) — with the
          // blocking finding named, never a reconciled guess.
          return NextResponse.json(
            {
              error:
                "The invoice could not be read as declared fields, so the verdict is withheld and nothing was reconciled.",
              ruleId: extracted.findings[0]?.ruleId,
              findings: extracted.findings,
              labels: extracted.labels,
            },
            { status: 422 },
          );
        }

        const report = reconcileInvoice({
          invoice: extracted.invoice,
          ledger: ledgerIngest.ledger,
          ...(typeof body.tolerance_bps === "number" ? { toleranceBps: body.tolerance_bps } : {}),
        });
        data = {
          report,
          extraction: {
            labels: extracted.labels,
            unreadableRegions: record.unreadableRegions,
            note: "Every field above was read off the invoice and is labelled; the report's numbers were computed by the deterministic engine.",
          },
        };
      } catch (toolError) {
        if (toolError instanceof SpendProofFieldError) {
          // An unreadable ledger or a malformed cell: explicit, with the rule id and field path.
          return NextResponse.json(
            { error: toolError.message, ruleId: toolError.ruleId, fieldPath: toolError.fieldPath },
            { status: 400 },
          );
        }
        return NextResponse.json(
          { error: toolError instanceof Error ? toolError.message : "SpendProof request failed" },
          { status: 400 },
        );
      }

      await track("agent_query", { tool: toolName }, "spendproof", traffic);

      const metering = await billSuccessfulCall(req, {
        tool: toolName,
        costUsd: costPerQueryUsd,
        product: "spendproof",
      });

      return NextResponse.json({
        success: true,
        data,
        metering: {
          meteredUsageReported: metering.meteredUsageReported,
          meterEventId: metering.meterEventId,
          usageRecorded: metering.usageRecorded,
          meteredCents: metering.meteredValueCents,
          costPerQueryUsd,
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
    // Cap gate runs BEFORE the tool (V1.2).
    const capped = await billingCapGuard(req);
    if (capped) return capped;

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
    await track("agent_query", { tool: toolName }, undefined, traffic);

    // Metered usage for a caller that presents a Stripe customer id, priced from the catalog.
    const metering = await billSuccessfulCall(req, {
      tool: toolName,
      costUsd: agentRateForTool(toolName),
      product: "factory",
    });

    return NextResponse.json({
      success: true,
      data: result,
      metering: {
        meteredUsageReported: metering.meteredUsageReported,
        meterEventId: metering.meterEventId,
        usageRecorded: metering.usageRecorded,
        meteredCents: metering.meteredValueCents,
        costPerQueryUsd: 0.25,
      },
      computedAt: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Agent calculation failure";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
