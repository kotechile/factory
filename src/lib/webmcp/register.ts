import {
  type SelfEmployment2026Input,
  type SelfEmployment2026Output,
} from "@/lib/calc/selfEmployment2026";
import type { EinvoiceReport, VatIdCheck } from "@/lib/calc/einvoice";
import type { CsvAuditResult, WeightResolution } from "@/lib/calc/parcelaudit";
import type {
  ReconcileStripePayoutInput,
  StripeReconOutput,
} from "@/lib/calc/stripeRecon";
import type { WebMCPToolDefinition } from "./types";

/** name/description/JSON-Schema of a tool, without its runtime handler. */
export type WebMCPToolSummary = Pick<
  WebMCPToolDefinition,
  "name" | "description" | "parameters"
>;



/**
 * Routes a browser WebMCP tax tool through the metered /api/agent/calculate path so the
 * agent tier is metered (track("agent_query") + Stripe metered usage) instead of computing
 * purely client-side. This is a server-backed call: a failure surfaces an explicit error
 * (no silent client-side fallback).
 */
async function runMeteredAgentCalculation(
  toolName: string,
  params: SelfEmployment2026Input,
): Promise<SelfEmployment2026Output> {
  const response = await fetch("/api/agent/calculate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-webmcp-tool": toolName,
    },
    body: JSON.stringify(params),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Agent calculation failed (${response.status}): ${text}`);
  }
  const json = (await response.json()) as {
    success?: boolean;
    data?: SelfEmployment2026Output;
    error?: string;
  };
  if (!json?.success || !json?.data) {
    throw new Error(json?.error || "Agent calculation failed: invalid response");
  }
  return json.data;
}


/**
 * WebMCP tool: calculate_qbi_deduction
 * Evaluates 2026 Section 199A Qualified Business Income deduction under OBBBA (Pub. L. 119-21).
 */
export const calculateQbiDeductionTool: WebMCPToolDefinition<
  SelfEmployment2026Input,
  {
    qualifiedBusinessIncome: number;
    qbiRate: number;
    qbiDeduction: number;
    qbiTaxSavings: number;
    isSstb: boolean;
    qbiPhaseRatio: number;
    w2UbiaLimit: number;
    trapCheck: SelfEmployment2026Output["trapCheck"];
    taxableIncomeBeforeQbi: number;
    taxYear: number;
  }
> = {
  name: "calculate_qbi_deduction",
  description:
    "Calculates the exact 2026 Section 199A QBI deduction under enacted law (OBBBA Pub. L. 119-21 at 20% rate, Rev. Proc. 2025-32 thresholds $201,750/$403,500, and SSTB/W-2/UBIA limits).",
  parameters: {
    type: "object",
    properties: {
      grossIncome: {
        type: "number",
        description: "Gross Schedule C / 1099 revenue.",
      },
      businessExpenses: {
        type: "number",
        description: "Deductible business expenses.",
      },
      filingStatus: {
        type: "string",
        description: "Filing status: 'single', 'married_filing_jointly', 'married_filing_separately', 'head_of_household'.",
        enum: ["single", "married_filing_jointly", "married_filing_separately", "head_of_household"],
      },
      isSstb: {
        type: "boolean",
        description: "Whether the business is a Specified Service Trade or Business (law, health, consulting, financial services, etc.).",
      },
      w2WagesPaidByBusiness: {
        type: "number",
        description: "W-2 wages paid by the business to employees for W-2/UBIA limitation.",
      },
      ubia: {
        type: "number",
        description: "Unadjusted basis immediately after acquisition of qualified business property.",
      },
      w2Wages: {
        type: "number",
        description: "Individual's outside W-2 wages.",
      },
      retirementContributions: {
        type: "number",
        description: "Deductible SEP-IRA / Solo 401(k) contributions.",
      },
      sehi: {
        type: "number",
        description: "Self-employed health insurance deduction.",
      },
      otherTaxableIncome: {
        type: "number",
        description: "Other taxable income impacting overall taxable income threshold.",
      },
    },
    required: ["grossIncome"],
  },
  handler: async (params: SelfEmployment2026Input) => {
    const result = await runMeteredAgentCalculation("calculate_qbi_deduction", params);
    return {
      qualifiedBusinessIncome: result.qualifiedBusinessIncome,
      qbiRate: result.qbiRate,
      qbiDeduction: result.qbiDeduction,
      qbiTaxSavings: result.qbiTaxSavings,
      isSstb: result.isSstb,
      qbiPhaseRatio: result.qbiPhaseRatio,
      w2UbiaLimit: result.w2UbiaLimit,
      trapCheck: result.trapCheck,
      taxableIncomeBeforeQbi: result.taxableIncomeBeforeQbi,
      taxYear: result.taxYear,
    };
  },
};

/**
 * WebMCP tool: calculate_quarterly_estimate
 * Computes 2026 SE tax, income tax, and quarterly estimated tax payments (including Q3 Sept 15 deadline).
 */
export const calculateQuarterlyEstimateTool: WebMCPToolDefinition<
  SelfEmployment2026Input,
  {
    netBusinessProfit: number;
    totalSelfEmploymentTax: number;
    federalIncomeTax: number;
    totalTaxLiability: number;
    overallEffectiveRate: number;
    estimatedPayments: SelfEmployment2026Output["estimatedPayments"];
    scorecard: SelfEmployment2026Output["scorecard"];
    taxYear: number;
  }
> = {
  name: "calculate_quarterly_estimate",
  description:
    "Computes 2026 self-employment tax, progressive income tax, and quarterly estimated tax installments with safe-harbor protection (highlighting Q3 Sept 15 deadline).",
  parameters: {
    type: "object",
    properties: {
      grossIncome: {
        type: "number",
        description: "Gross Schedule C / 1099 revenue.",
      },
      businessExpenses: {
        type: "number",
        description: "Deductible business expenses.",
      },
      filingStatus: {
        type: "string",
        description: "Filing status: 'single', 'married_filing_jointly', 'married_filing_separately', 'head_of_household'.",
        enum: ["single", "married_filing_jointly", "married_filing_separately", "head_of_household"],
      },
      priorYearAgi: {
        type: "number",
        description: "2025 Prior-year Adjusted Gross Income (AGI) for safe-harbor calculation.",
      },
      priorYearTax: {
        type: "number",
        description: "2025 Prior-year total tax liability for safe-harbor rule (100% or 110%).",
      },
      w2Wages: {
        type: "number",
        description: "W-2 wages received (reduces available Social Security $184,500 wage base).",
      },
      age: {
        type: "number",
        description: "Age of taxpayer (evaluates $6,000 OBBBA senior deduction if 65+).",
      },
      isTippedOccupation: {
        type: "boolean",
        description: "Flag for tipped occupation under OBBBA 'No Tax on Tips'.",
      },
      qualifiedTips: {
        type: "number",
        description: "Qualified tips eligible for up to $25k deduction.",
      },
    },
    required: ["grossIncome"],
  },
  handler: async (params: SelfEmployment2026Input) => {
    const result = await runMeteredAgentCalculation("calculate_quarterly_estimate", params);
    return {
      netBusinessProfit: result.netBusinessProfit,
      totalSelfEmploymentTax: result.totalSelfEmploymentTax,
      federalIncomeTax: result.federalIncomeTax,
      totalTaxLiability: result.totalTaxLiability,
      overallEffectiveRate: result.overallEffectiveRate,
      estimatedPayments: result.estimatedPayments,
      scorecard: result.scorecard,
      taxYear: result.taxYear,
    };
  },
};

/**
 * Registers a WebMCP tool on navigator.modelContext in browser runtime.
 */
export function registerWebMCPTool<
  TInput = Record<string, unknown>,
  TOutput = unknown,
>(tool: WebMCPToolDefinition<TInput, TOutput>): boolean {
  if (typeof window === "undefined" || !navigator.modelContext?.registerTool) {
    return false;
  }

  try {
    navigator.modelContext.registerTool({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
      handler: async (params: Record<string, unknown>) => {
        return await tool.handler(params as TInput);
      },
    });
    return true;
  } catch (error) {
    console.error(`Failed to register WebMCP tool: ${tool.name}`, error);
    return false;
  }
}



/**
 * LedgerLink WebMCP tool: reconcile_stripe_payout
 * Decomposes a netted Stripe payout into GL journal lines that sum to the payout
 * net exactly. Routes through the metered /api/agent/calculate path.
 */
async function runLedgerlinkAgentCalculation(
  params: ReconcileStripePayoutInput,
): Promise<StripeReconOutput> {
  const response = await fetch("/api/agent/calculate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-webmcp-tool": "reconcile_stripe_payout",
    },
    body: JSON.stringify(params),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Agent calculation failed (${response.status}): ${text}`);
  }
  const json = (await response.json()) as {
    success?: boolean;
    data?: StripeReconOutput;
    error?: string;
  };
  if (!json?.success || !json?.data) {
    throw new Error(json?.error || "Agent calculation failed: invalid response");
  }
  return json.data;
}

export const reconcileStripePayoutTool: WebMCPToolDefinition<
  ReconcileStripePayoutInput,
  StripeReconOutput
> = {
  name: "reconcile_stripe_payout",
  description:
    "Reconciles a netted Stripe payout into categorized GL journal lines that sum to the payout net exactly (Σ net == payout.amount). Accepts a customer read-only Stripe restricted key or a pasted Stripe JSON export; never uses the factory account.",
  parameters: {
    type: "object",
    properties: {
      account_id: {
        type: "string",
        description: "Stripe account id whose payout is being reconciled.",
      },
      period: {
        type: "string",
        description:
          "Payout period, e.g. '2026-08' or a Stripe created range 'start:end'.",
      },
      payout_id: {
        type: "string",
        description: "Optional specific Stripe payout id to reconcile.",
      },
      stripe_restricted_key: {
        type: "string",
        description:
          "Customer read-only Stripe restricted key (rk_…). Required unless export_json is supplied.",
      },
      export_json: {
        type: "string",
        description:
          "Pasted/uploaded Stripe JSON export (payout + balance_transactions). Required unless stripe_restricted_key is supplied.",
      },
    },
    required: ["account_id", "period"],
  },
  handler: async (params: ReconcileStripePayoutInput) => {
    return await runLedgerlinkAgentCalculation(params);
  },
};

/**
 * FacturGate (EU e-invoice) tools. Like LedgerLink these are server-backed metered calls: the
 * browser tool posts to /api/agent/calculate, which runs the deterministic engine, records the
 * agent_query event and reports metered usage. A failure surfaces an explicit error — there is no
 * client-side fallback that would hide a rejection.
 */
async function runFacturgateAgentCall<TResult>(toolName: string, params: unknown): Promise<TResult> {
  const response = await fetch("/api/agent/calculate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-webmcp-tool": toolName,
    },
    body: JSON.stringify(params),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Agent call failed (${response.status}): ${text}`);
  }
  const json = (await response.json()) as {
    success?: boolean;
    data?: TResult;
    error?: string;
  };
  if (!json?.success || !json?.data) {
    throw new Error(json?.error || "Agent call failed: invalid response");
  }
  return json.data;
}

export interface ValidateEinvoiceParams {
  /** An existing CII / UBL 2.1 document to validate as-is. */
  xml?: string;
  /** Canonical invoice model as a JSON string: { seller, buyer, invoice }. */
  invoice?: string;
  target_country?: string;
  target_format?: string;
}

export interface ConvertInvoiceToFacturxParams {
  /** Canonical invoice model as a JSON string: { seller, buyer, invoice }. */
  invoice: string;
  target_country?: string;
  target_format?: string;
}

export interface CheckEuVatIdParams {
  vat_id: string;
  country: string;
}

export const validateEinvoiceTool: WebMCPToolDefinition<ValidateEinvoiceParams, EinvoiceReport> = {
  name: "validate_einvoice",
  description:
    "Pre-send compliance gate for EU e-invoices (EN 16931 + CIUS-FR): returns the exact findings (rule id, severity, field path, fix) with blocking vs advisory severity, a 0-100 readiness score, and the totals reconciliation with the drift delta. Accepts a canonical invoice model or an existing CII/UBL 2.1 document. No rule is reported as passing unless it is implemented (see coverage).",
  parameters: {
    type: "object",
    properties: {
      xml: {
        type: "string",
        description:
          "An existing CII (CrossIndustryInvoice) or UBL 2.1 Invoice document to validate as-is. Supply this or `invoice`.",
      },
      invoice: {
        type: "string",
        description:
          "Canonical invoice model as a JSON string: { seller, buyer, invoice, targetFormat, targetCountry }.",
      },
      target_country: {
        type: "string",
        description:
          "Rule set / rounding regime to validate against. Defaults to FR (CIUS-FR overlay).",
        enum: ["FR", "PL", "BE", "DE"],
      },
      target_format: {
        type: "string",
        description: "Artifact the document is destined for. Defaults to facturx.",
        enum: ["facturx", "cii", "ubl"],
      },
    },
    required: [],
  },
  handler: (params) => runFacturgateAgentCall<EinvoiceReport>("validate_einvoice", params),
};

export const convertInvoiceToFacturxTool: WebMCPToolDefinition<
  ConvertInvoiceToFacturxParams,
  EinvoiceReport
> = {
  name: "convert_invoice_to_facturx",
  description:
    "Converts a canonical invoice model into a compliant artifact at the EN 16931 profile (CII/Factur-X body or UBL 2.1 with the Peppol BIS 3.0 ProfileID), returning the corrected XML, the change list (every finding with its rule id and fix) and the reconciled totals. Refuses to emit a document that has blocking findings or an unmappable field.",
  parameters: {
    type: "object",
    properties: {
      invoice: {
        type: "string",
        description:
          "Canonical invoice model as a JSON string: { seller, buyer, invoice, targetFormat, targetCountry }.",
      },
      target_country: {
        type: "string",
        description: "Rule set / rounding regime for the emitted document. Defaults to FR.",
        enum: ["FR", "PL", "BE", "DE"],
      },
      target_format: {
        type: "string",
        description: "facturx (default, CII at EN 16931), cii (standalone CII) or ubl (UBL 2.1).",
        enum: ["facturx", "cii", "ubl"],
      },
    },
    required: ["invoice"],
  },
  handler: (params) => runFacturgateAgentCall<EinvoiceReport>("convert_invoice_to_facturx", params),
};

export const checkEuVatIdTool: WebMCPToolDefinition<CheckEuVatIdParams, VatIdCheck> = {
  name: "check_eu_vat_id",
  description:
    "Checks an EU VAT identifier offline: national format and (where implemented) the published checksum — FR VAT-key formula, DE MOD 11,10, BE mod 97, PL NIP, NL mod 11, IT Luhn. Reports formatValid/checksumValid explicitly and never claims a VIES status it did not query. An unknown country is a failure, not a pass.",
  parameters: {
    type: "object",
    properties: {
      vat_id: {
        type: "string",
        description: "The VAT identifier as written, e.g. 'FR83404833048' or 'BE 0123.456.749'.",
      },
      country: {
        type: "string",
        description: "ISO 3166-1 alpha-2 country code of the identifier (e.g. FR, DE, BE, PL, NL).",
      },
    },
    required: ["vat_id", "country"],
  },
  handler: (params) => runFacturgateAgentCall<VatIdCheck>("check_eu_vat_id", params),
};

/**
 * ParcelProof (carrier invoice audit) tools. Server-backed and metered like LedgerLink/FacturGate:
 * the browser tool posts to /api/agent/calculate so the deterministic engine runs in-process on the
 * server, the agent_query event is recorded and metered usage is reported. A failure surfaces an
 * explicit error carrying the rule id — there is no client-side fallback.
 */
async function runParcelproofAgentCall<TResult>(toolName: string, params: unknown): Promise<TResult> {
  const response = await fetch("/api/agent/calculate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-webmcp-tool": toolName,
    },
    body: JSON.stringify(params),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Agent call failed (${response.status}): ${text}`);
  }
  const json = (await response.json()) as {
    success?: boolean;
    data?: TResult;
    error?: string;
  };
  if (!json?.success || !json?.data) {
    throw new Error(json?.error || "Agent call failed: invalid response");
  }
  return json.data;
}

export interface AuditCarrierInvoiceParams {
  /** Shipment records CSV: order_id,tracking,carrier,service,ship_date,length,width,height,actual_weight_lb,zone,… */
  shipment_records: string;
  /** Carrier invoice lines CSV: tracking,invoice_date,carrier,service,billed_weight_lb,zone,base_charge_usd,surcharges,total_usd */
  invoice_lines: string;
  /** Optional contract rate card CSV: carrier,service,zone,min_weight_lb,max_weight_lb,rate_usd */
  rate_card?: string;
  /** "Today" for the dispute clock, ISO 8601. Defaults to the server's UTC date when omitted. */
  as_of_date?: string;
  /** Optional carrier filter (ups | fedex | usps); other lines are reported out-of-scope, not skipped. */
  carrier?: string;
}

export interface ComputeBillableWeightParams {
  carrier: string;
  service: string;
  /** ISO 8601 ship date — the divisor depends on it (USPS 166 → 139 on 2026-07-12). */
  ship_date: string;
  length: number;
  width: number;
  height: number;
  actual_weight_lb: number;
}

export const auditCarrierInvoiceTool: WebMCPToolDefinition<
  AuditCarrierInvoiceParams,
  CsvAuditResult
> = {
  name: "audit_carrier_invoice",
  description:
    "Audits a UPS/FedEx/USPS parcel invoice against the shipment records behind it: recomputes billable weight per line from the carrier × service × ship-date divisor (USPS 166 → 139 on 2026-07-12) with the round-up rule and cubic-inch thresholds, re-evaluates accessorial eligibility (AHS-Dimension, AHS-Weight, oversize, residential, address correction) naming the trigger that failed, checks the service-commitment refund and the per-line dispute window (UPS ≈30 / FedEx ≈21 days), and returns a per-line recovery ledger plus a dispute CSV. A line whose amount cannot be proven is reported unverifiable, never guessed.",
  parameters: {
    type: "object",
    properties: {
      shipment_records: {
        type: "string",
        description:
          "Shipment records as CSV text: order_id,tracking,carrier,service,ship_date,length,width,height,actual_weight_lb,zone,declared_value_usd,residential,address_correction,promised_date,delivered_at",
      },
      invoice_lines: {
        type: "string",
        description:
          "Carrier invoice lines as CSV text: tracking,invoice_date,carrier,service,billed_weight_lb,zone,base_charge_usd,surcharges,total_usd (surcharges as code:amount pairs separated by ';').",
      },
      rate_card: {
        type: "string",
        description:
          "Your contract rate card as CSV text: carrier,service,zone,min_weight_lb,max_weight_lb,rate_usd. Omit it and every line is reported unverifiable-rate (the weight proof still holds) instead of being priced from a guessed rate.",
      },
      as_of_date: {
        type: "string",
        description:
          "ISO 8601 date used as 'today' for the dispute clock and money-back windows. Defaults to the server's UTC date.",
      },
      carrier: {
        type: "string",
        description: "Optional carrier filter.",
        enum: ["ups", "fedex", "usps"],
      },
    },
    required: ["shipment_records", "invoice_lines"],
  },
  handler: (params) => runParcelproofAgentCall<CsvAuditResult>("audit_carrier_invoice", params),
};

export const computeBillableWeightTool: WebMCPToolDefinition<
  ComputeBillableWeightParams,
  WeightResolution
> = {
  name: "compute_billable_weight",
  description:
    "Computes the billable weight a UPS/FedEx/USPS domestic parcel shipment incurs: max(actual, ceil(L)×ceil(W)×ceil(H)/divisor) with the divisor resolved by carrier × service × ship date (USPS 166 before 2026-07-12, then 139; UPS/FedEx 139) and the carrier's cubic-inch threshold applied (FedEx Ground / USPS: only above 1,728 cu in). Returns the divisor used, whether dimensional weight applied, the rounded dimensions and the billing basis. Use it to quote landed cost correctly; an unmapped service or an out-of-range ship date is an explicit error, never a default divisor.",
  parameters: {
    type: "object",
    properties: {
      carrier: {
        type: "string",
        description: "Carrier the parcel ships on.",
        enum: ["ups", "fedex", "usps"],
      },
      service: {
        type: "string",
        description: "Service level, which selects the divisor table entry.",
        enum: [
          "ups_ground",
          "ups_air",
          "ups_express_saver",
          "fedex_ground",
          "fedex_home_delivery",
          "fedex_express",
          "usps_ground_advantage",
          "usps_priority_mail",
          "usps_priority_mail_express",
          "usps_parcel_select",
        ],
      },
      ship_date: {
        type: "string",
        description: "ISO 8601 ship date (YYYY-MM-DD): the divisor in force depends on it.",
      },
      length: { type: "number", description: "Package length in inches (fractions round up)." },
      width: { type: "number", description: "Package width in inches (fractions round up)." },
      height: { type: "number", description: "Package height in inches (fractions round up)." },
      actual_weight_lb: { type: "number", description: "Scale weight in pounds." },
    },
    required: ["carrier", "service", "ship_date", "length", "width", "height", "actual_weight_lb"],
  },
  handler: (params) => runParcelproofAgentCall<WeightResolution>("compute_billable_weight", params),
};

/**
 * CaseProof (buyer-side warehouse-automation case audit) tools. Server-backed and metered like the
 * others: the browser tool posts the case to /api/agent/calculate, which validates it, runs the
 * deterministic engine in-process, records the agent_query event and reports metered usage. A case
 * the engine cannot audit comes back as an explicit error carrying the rule id — there is no
 * client-side fallback and no partially-audited case.
 */
async function runCaseProofAgentCall<TResult>(toolName: string, params: unknown): Promise<TResult> {
  const response = await fetch("/api/agent/calculate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-webmcp-tool": toolName,
    },
    body: JSON.stringify(params),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Agent call failed (${response.status}): ${text}`);
  }
  const json = (await response.json()) as {
    success?: boolean;
    data?: TResult;
    error?: string;
  };
  if (!json?.success || !json?.data) {
    throw new Error(json?.error || "Agent call failed: invalid response");
  }
  return json.data;
}

export interface CaseProofAgentParams {
  /**
   * The case as a JSON string: `{ baseline, finance, options[], label?, quoteCsv? }`. The shape is
   * documented in `src/lib/calc/caseproof/types.ts`; an unreadable case is an explicit error naming
   * the field, never a default.
   */
  case: string;
}

export const auditAutomationCaseTool: WebMCPToolDefinition<CaseProofAgentParams, unknown> = {
  name: "audit_automation_case",
  description:
    "Audits a warehouse-automation business case from the buyer's side: re-runs the vendor's own quoted numbers through the same engine as the buyer's, prices labour at the fully loaded rate (payroll burden, benefits, overtime premium, turnover replacement), adds the cost lines a quote omits (integration, facility work, maintenance, training, ramp and downtime at the contracted availability), applies §179 then bonus depreciation by tax year, and returns payback in months, IRR, NPV at the hurdle rate, the break-even of every assumption the case depends on, the inputs that moved the vendor's number, and the ranked list to confirm in writing. A cost line the case does not state is reported unstated and blocks a pass verdict — nothing is defaulted.",
  parameters: {
    type: "object",
    properties: {
      case: {
        type: "string",
        description:
          "The case as a JSON string: { baseline: { ordersPerDay, linesPerOrder, operatingDaysPerYear, shifts, staffByFunction[], hourlyWage, paidHoursPerFtePerYear, payrollBurdenPct?, benefitsPct?, overtimeHoursPerWeek?, turnoverPct?, costPerHireCents?, errorRatePct?, costPerErrorCents?, peakFactor?, vendorAssumedHourlyRate? }, finance: { horizonYears, hurdleRatePct, taxRatePct, inServiceTaxYear, section179ElectionCents?, financingRatePct?, financingMonths? }, options: [{ id, vendor, model: capex|lease|raas, capex?, lease?, raas?, integrationCostCents?, facilityCostCents?, trainingCostCents?, softwareAnnualCents?, maintenancePctOfCapex?, maintenanceAnnualCents?, labourImpact: { fteRemoved, disposition: cash_out|redeploy, rampMonths }, errorReductionPct?, throughputClaim?: { picksPerHour, basis, availabilityPct? }, vendorClaim?, quoteCsv? }] }. Money is integer cents; percentages are percentage points.",
      },
    },
    required: ["case"],
  },
  handler: (params) => runCaseProofAgentCall<unknown>("audit_automation_case", params),
};

export const compareAutomationBidsTool: WebMCPToolDefinition<CaseProofAgentParams, unknown> = {
  name: "compare_automation_bids",
  description:
    "Normalizes 2–3 competing warehouse-automation bids onto one after-tax cash model — a capex purchase, a lease and a per-unit subscription can be ranked side by side — and returns the NPV ranking at the buyer's hurdle rate, the cost per order and per line for each bid, the point at which the ranking flips as the peak-season premium, the maintenance load or the hurdle rate moves, and the sensitivity grid (volume −10/−20/−30%, capex +15%, maintenance +25%). A ranking that flips inside a scenario is reported as such.",
  parameters: {
    type: "object",
    properties: {
      case: {
        type: "string",
        description:
          "The case as a JSON string with 2 or 3 bids in `options` (same shape as audit_automation_case). Each bid may carry the vendor's quote line items as CSV in `quoteCsv`.",
      },
    },
    required: ["case"],
  },
  handler: (params) => runCaseProofAgentCall<unknown>("compare_automation_bids", params),
};

export const afterTaxPaybackTool: WebMCPToolDefinition<CaseProofAgentParams, unknown> = {
  name: "after_tax_payback",
  description:
    "The after-tax payback primitive for one automation bid: payback in months measured from the t=0 outlay, NPV at the buyer's hurdle rate, IRR, the upfront outlay, and the depreciation schedule by tax year (§179 with its phase-out, then bonus depreciation, then straight-line). Use it when you only need the tax timing and the payback, not the full assumption audit.",
  parameters: {
    type: "object",
    properties: {
      case: {
        type: "string",
        description:
          "The case as a JSON string with exactly one bid in `options`; the first bid is used (same shape as audit_automation_case).",
      },
    },
    required: ["case"],
  },
  handler: (params) => runCaseProofAgentCall<unknown>("after_tax_payback", params),
};

/**
 * Canonical surface of the factory's WebMCP tools — name, description and JSON Schema.
 *
 * Single source of truth: the agent allowlist (./agentTools.ts) and the published
 * agent-discovery listing (./manifest.ts) both read from it, so a tool name can never be
 * advertised or accepted without a real definition here. Add a tool by adding its
 * definition above and listing it here + in src/products/registry.ts.
 */
export const WEBMCP_TOOL_SUMMARIES: WebMCPToolSummary[] = [
  calculateQbiDeductionTool,
  calculateQuarterlyEstimateTool,
  reconcileStripePayoutTool,
  validateEinvoiceTool,
  convertInvoiceToFacturxTool,
  checkEuVatIdTool,
  auditCarrierInvoiceTool,
  computeBillableWeightTool,
  auditAutomationCaseTool,
  compareAutomationBidsTool,
  afterTaxPaybackTool,
].map(({ name, description, parameters }) => ({ name, description, parameters }));

/**
 * Registers all factory WebMCP tools in the current browser session.
 */
export function registerDefaultWebMCPTools(): void {
  registerWebMCPTool(calculateQbiDeductionTool);
  registerWebMCPTool(calculateQuarterlyEstimateTool);
  registerWebMCPTool(reconcileStripePayoutTool);
  registerWebMCPTool(validateEinvoiceTool);
  registerWebMCPTool(convertInvoiceToFacturxTool);
  registerWebMCPTool(checkEuVatIdTool);
  registerWebMCPTool(auditCarrierInvoiceTool);
  registerWebMCPTool(computeBillableWeightTool);
  registerWebMCPTool(auditAutomationCaseTool);
  registerWebMCPTool(compareAutomationBidsTool);
  registerWebMCPTool(afterTaxPaybackTool);
}



